"""
Router de autenticação.
Endpoints: login, register, logout, me.
"""

import logging
from fastapi import APIRouter, HTTPException, Request, Depends, status
from fastapi.responses import JSONResponse

from backend.config import get_settings
from backend.models.auth import LoginRequest, RegisterRequest, AuthResponse, UserInfo
from backend.services.auth_service import hash_password, verify_password, create_jwt
from backend.services.local_store import get_store
from backend.dependencies import get_current_user, ADMINS_FIXOS

logger = logging.getLogger("dme.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── POST /api/auth/login ─────────────────────────────
@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    """
    Autentica o usuário e seta o cookie JWT httpOnly.
    Usa o store local em memória.
    """
    settings = get_settings()
    store = get_store()

    # 1. Busca o usuário
    user = store.get_militar(body.nick)
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")

    # 2. Verifica a senha
    senha_hash = user.get("senha_hash", "")
    if not senha_hash:
        raise HTTPException(status_code=401, detail="Senha não configurada para este usuário")

    if not verify_password(body.password, senha_hash):
        raise HTTPException(status_code=401, detail="Senha incorreta")

    # 3. Checa status
    user_status = (user.get("status") or "ativo").lower()
    if user_status != "ativo":
        mensagens = {
            "pendente": "Sua conta está aguardando aprovação de um administrador.",
            "desativado": "Sua conta foi desativada. Entre em contato com a administração.",
            "banido": "Sua conta foi banida. Entre em contato se achar que houve engano.",
        }
        detail = mensagens.get(user_status, "Acesso negado. Conta não está ativa.")
        raise HTTPException(status_code=403, detail=detail)

    # 4. Gera JWT e seta cookie
    is_admin = body.nick.lower() in ADMINS_FIXOS or user.get("role") == "admin"
    role = "admin" if is_admin else "user"
    token = create_jwt(body.nick, role)

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

    logger.info(f"Login OK: {body.nick} (role={role})")
    return response


# ── POST /api/auth/register ──────────────────────────
@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterRequest):
    """
    Registra um novo militar no store local.
    Em dev, o status já é 'ativo' para facilitar testes.
    """
    store = get_store()

    # 1. Verifica duplicidade
    if store.get_militar(body.nick):
        raise HTTPException(status_code=409, detail="Este nome de usuário já está em uso")

    # 2. Hash da senha e insere
    store.insert_militar({
        "nick": body.nick,
        "email": body.email,
        "senha_hash": hash_password(body.password),
        "patente": "Recruta",
        "corpo": "militar",
        "status": "ativo",  # ativo direto em dev (sem aprovação)
        "role": "user",
        "tag": "DME",
        "created_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    })

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
