"""
Dependencies do FastAPI para autenticação.
Usadas como Depends() nas rotas que precisam de usuário logado.
"""

from fastapi import Request, HTTPException, status

from backend.config import get_settings
from backend.services.auth_service import decode_jwt
from backend.services.supabase_client import get_supabase
from backend.models.auth import UserInfo

# Nicks que são sempre admin, independente do banco
ADMINS_FIXOS = {"xandelicado", "rafacv", "ronaldo"}


async def get_current_user(request: Request) -> UserInfo:
    """
    Dependency que extrai e valida o JWT do cookie httpOnly.
    Retorna um UserInfo ou levanta 401.
    """
    settings = get_settings()
    token = request.cookies.get(settings.COOKIE_NAME)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado",
        )

    payload = decode_jwt(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
        )

    nick = payload["sub"]
    role = payload.get("role", "user")

    # Busca dados atualizados do Supabase
    try:
        sb = get_supabase()
        result = sb.table("militares").select("*").eq("nick", nick).maybe_single().execute()
        user_data = result.data
    except Exception:
        user_data = None

    if user_data:
        # Admin fixo sempre sobrescreve
        is_admin = nick.lower() in ADMINS_FIXOS or role == "admin"

        return UserInfo(
            nick=user_data.get("nick", nick),
            patente=user_data.get("patente", "Recruta"),
            corpo=user_data.get("corpo", "militar"),
            status=user_data.get("status", "ativo"),
            role="admin" if is_admin else "user",
        )

    # Usuário não encontrado no banco mas tem token válido
    return UserInfo(
        nick=nick,
        role="admin" if nick.lower() in ADMINS_FIXOS else role,
    )


async def get_current_admin(request: Request) -> UserInfo:
    """
    Dependency que exige que o usuário seja admin.
    Usa get_current_user internamente e checa a role.
    """
    user = await get_current_user(request)
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores",
        )
    return user
