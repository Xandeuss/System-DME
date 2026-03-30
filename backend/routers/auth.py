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
from backend.services.supabase_client import get_supabase
from backend.dependencies import get_current_user, ADMINS_FIXOS

logger = logging.getLogger("dme.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── POST /api/auth/login ─────────────────────────────
@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    """
    Autentica o usuário e seta o cookie JWT httpOnly.
    Fluxo:
      1. Busca o militar no Supabase pelo nick
      2. Verifica a senha com bcrypt
      3. Checa se o status é 'ativo'
      4. Gera JWT e seta como cookie httpOnly
    """
    settings = get_settings()
    sb = get_supabase()

    # 1. Busca o usuário
    try:
        result = sb.table("militares").select("*").eq("nick", body.nick).maybe_single().execute()
        user = result.data
    except Exception as e:
        logger.error(f"Erro ao buscar usuário {body.nick}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao consultar o banco")

    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")

    # 2. Verifica a senha
    senha_hash = user.get("senha_hash", "")
    if not senha_hash:
        # Usuário antigo sem hash — aceita a senha antiga e migra o hash
        # (compatibilidade com senhas "123456" do sistema legado)
        senha_legado = user.get("senha", "123456")
        if body.password != senha_legado:
            raise HTTPException(status_code=401, detail="Senha incorreta")

        # Migra: grava o hash da senha que o usuário digitou
        novo_hash = hash_password(body.password)
        try:
            sb.table("militares").update({"senha_hash": novo_hash}).eq("nick", body.nick).execute()
            logger.info(f"Senha migrada para bcrypt: {body.nick}")
        except Exception as e:
            logger.warning(f"Falha ao migrar hash de {body.nick}: {e}")
    else:
        # Caminho normal: verifica com bcrypt
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
    Registra um novo militar.
    Fluxo:
      1. Verifica se o nick já existe
      2. Faz hash da senha
      3. Insere no Supabase com status 'pendente'
    """
    sb = get_supabase()

    # 1. Verifica duplicidade
    try:
        result = sb.table("militares").select("nick").eq("nick", body.nick).maybe_single().execute()
        if result.data:
            raise HTTPException(status_code=409, detail="Este nome de usuário já está em uso")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao verificar nick {body.nick}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao consultar o banco")

    # 2. Hash da senha
    senha_hash = hash_password(body.password)

    # 3. Insere
    novo_militar = {
        "nick": body.nick,
        "email": body.email,
        "senha_hash": senha_hash,
        "patente": "Recruta",
        "corpo": "militar",
        "status": "pendente",
        "role": "user",
    }

    try:
        sb.table("militares").insert(novo_militar).execute()
    except Exception as e:
        logger.error(f"Erro ao registrar {body.nick}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao realizar cadastro")

    logger.info(f"Registro OK: {body.nick} (status=pendente)")
    return AuthResponse(ok=True, message="Cadastro realizado! Aguarde aprovação de um administrador.")


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
    """
    Retorna os dados do usuário autenticado.
    O frontend usa isso em vez de localStorage.getItem('dme_username').
    """
    return user
