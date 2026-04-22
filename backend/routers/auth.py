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
from backend.dependencies import get_current_user

logger = logging.getLogger("dme.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── POST /api/auth/login ─────────────────────────────
@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    """Autentica o usuário contra a tabela 'usuarios' e seta o cookie JWT."""
    settings = get_settings()
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    async with pool.connection() as conn:
        # A. Buscar dados de autenticação
        cur = await conn.execute(
            "SELECT nick, senha_hash, status, role FROM usuarios WHERE LOWER(nick) = LOWER(%s)",
            (body.nick,),
        )
        row = await cur.fetchone()

        if not row:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")

        nick_db, senha_hash, user_status, role_db = row

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

        # B. Buscar centros vinculados (Autorização)
        cur = await conn.execute(
            "SELECT centro FROM usuario_centros WHERE LOWER(nick) = LOWER(%s)",
            (nick_db,),
        )
        centros_rows = await cur.fetchall()
        centros = [r[0] for r in centros_rows]

    # Role é definida estritamente pelo banco de dados
    role = "admin" if role_db == "admin" else "user"
    
    # Injeta 'centros' no JWT
    token = create_jwt(nick_db, role, centros)

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

    logger.info(f"Login OK: {nick_db} (role={role}, centros={centros})")
    return response


# ── POST /api/auth/register ──────────────────────────
@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterRequest):
    """
    Registra um novo usuário no sistema.
    Cria registro na tabela 'usuarios' e verifica se deve criar/atualizar 'militares'.
    """
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    patente_inicial = "Recruta"
    corpo_inicial = detectar_corpo(patente_inicial)
    senha = hash_password(body.password)
    now = datetime.now(timezone.utc)

    async with pool.connection() as conn:
        # 1. Verificar se usuário já existe
        cur = await conn.execute(
            "SELECT nick FROM usuarios WHERE LOWER(nick) = LOWER(%s)",
            (body.nick,),
        )
        if await cur.fetchone():
            raise HTTPException(status_code=409, detail="Este nome de usuário já está em uso")

        # 2. Criar em 'usuarios'
        await conn.execute(
            """
            INSERT INTO usuarios (nick, email, senha_hash, role, status, created_at)
            VALUES (%s, %s, %s, 'user', 'ativo', %s)
            """,
            (body.nick, body.email, senha, now),
        )

        # 3. Sincronizar com 'militares'
        # Verifica se já existe um registro shell (criado por requerimento)
        cur = await conn.execute(
            "SELECT nick FROM militares WHERE LOWER(nick) = LOWER(%s)",
            (body.nick,),
        )
        existente = await cur.fetchone()

        if not existente:
            await conn.execute(
                """
                INSERT INTO militares (nick, patente, patente_ordem, corpo, tag, created_at)
                VALUES (%s, %s, %s, %s, 'DME', %s)
                """,
                (
                    body.nick, patente_inicial, patente_ordem(patente_inicial), 
                    corpo_inicial, now,
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
