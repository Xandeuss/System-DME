"""
Router de autenticação.
Endpoints: login, register, logout, me.
"""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse

from backend.config import get_settings
from backend.models.auth import LoginRequest, RegisterRequest, AuthResponse, UserInfo
from backend.services.auth_service import hash_password, verify_password, create_jwt
from backend.services.listagem_service import patente_ordem, detectar_corpo
from backend.db.pool import get_pool
from backend.dependencies import get_current_user, ADMINS_FIXOS

logger = logging.getLogger("dme.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── POST /api/auth/login ─────────────────────────────
@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    """Autentica o usuário contra o PostgreSQL e seta o cookie JWT."""
    settings = get_settings()
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    async with pool.connection() as conn:
        cur = await conn.execute(
            "SELECT nick, senha_hash, status, role FROM militares WHERE LOWER(nick) = LOWER(%s)",
            (body.nick,),
        )
        row = await cur.fetchone()

    if not row:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")

    nick_db, senha_hash, user_status, role_db = row

    if not senha_hash:
        raise HTTPException(status_code=401, detail="Senha não configurada para este usuário")

    if not verify_password(body.password, senha_hash):
        raise HTTPException(status_code=401, detail="Senha incorreta")

    user_status = (user_status or "ativo").lower()
    if user_status != "ativo":
        mensagens = {
            "pendente": "Sua conta está aguardando aprovação de um administrador.",
            "desativado": "Sua conta foi desativada. Entre em contato com a administração.",
            "banido": "Sua conta foi banida. Entre em contato se achar que houve engano.",
        }
        detail = mensagens.get(user_status, "Acesso negado. Conta não está ativa.")
        raise HTTPException(status_code=403, detail=detail)

    is_admin = body.nick.lower() in ADMINS_FIXOS or role_db == "admin"
    role = "admin" if is_admin else "user"
    token = create_jwt(nick_db, role)

    response = JSONResponse(content={"ok": True, "message": "Login realizado com sucesso"})
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.COOKIE_MAX_AGE,
        path="/",
    )

    logger.info(f"Login OK: {nick_db} (role={role})")
    return response


# ── POST /api/auth/register ──────────────────────────
@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterRequest):
    """
    Registra um novo militar diretamente no PostgreSQL.
    Se já existir um registro "shell" (criado por requerimento de entrada),
    completa os dados de conta (email, senha) e mantém status/patente.
    """
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    patente_inicial = "Recruta"
    corpo_inicial = detectar_corpo(patente_inicial)
    senha = hash_password(body.password)
    now = datetime.now(timezone.utc)

    async with pool.connection() as conn:
        cur = await conn.execute(
            "SELECT nick, senha_hash FROM militares WHERE LOWER(nick) = LOWER(%s)",
            (body.nick,),
        )
        existente = await cur.fetchone()

        if existente and existente[1]:
            raise HTTPException(status_code=409, detail="Este nome de usuário já está em uso")

        if existente:
            # Shell record criado por requerimento de entrada — completa dados de conta
            await conn.execute(
                """
                UPDATE militares
                   SET email = %s, senha_hash = %s
                 WHERE LOWER(nick) = LOWER(%s)
                """,
                (body.email, senha, body.nick),
            )
        else:
            await conn.execute(
                """
                INSERT INTO militares
                    (nick, email, senha_hash, patente, patente_ordem, corpo, status, role, tag, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, 'ativo', 'user', 'DME', %s)
                """,
                (
                    body.nick, body.email, senha,
                    patente_inicial, patente_ordem(patente_inicial), corpo_inicial, now,
                ),
            )
        await conn.commit()

    logger.info(f"Registro OK: {body.nick} (status=ativo)")
    return AuthResponse(ok=True, message="Cadastro realizado com sucesso! Você já pode fazer login.")


# ── POST /api/auth/logout ────────────────────────────
@router.post("/logout", response_model=AuthResponse)
async def logout():
    """Remove o cookie JWT, encerrando a sessão."""
    settings = get_settings()
    response = JSONResponse(content={"ok": True, "message": "Logout realizado"})
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path="/",
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )
    return response


# ── GET /api/auth/me ─────────────────────────────────
@router.get("/me", response_model=UserInfo)
async def me(user: UserInfo = Depends(get_current_user)):
    """Retorna os dados do usuário autenticado."""
    return user
