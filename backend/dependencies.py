"""
Dependencies do FastAPI para autenticação.
Usadas como Depends() nas rotas que precisam de usuário logado.
"""

import logging
from fastapi import Request, HTTPException, status

from backend.config import get_settings
from backend.services.auth_service import decode_jwt
from backend.db.pool import get_pool
from backend.models.auth import UserInfo

logger = logging.getLogger("dme.deps")

# Nicks que são sempre admin, independente do banco
ADMINS_FIXOS = {"xandelicado", "rafacv", "ronaldo"}


async def get_current_user(request: Request) -> UserInfo:
    """
    Dependency que extrai e valida o JWT do cookie httpOnly.
    Retorna um UserInfo ou levanta 401.
    """
    settings = get_settings()

    if settings.DEV_MODE:
        return UserInfo(
            nick="dev",
            patente="Comandante-Geral",
            corpo="militar",
            status="ativo",
            role="admin",
        )

    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        logger.warning(f"[AUTH] 401 em {request.url.path}: cookie '{settings.COOKIE_NAME}' ausente")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado",
        )

    payload = decode_jwt(token)
    if payload is None:
        logger.warning(f"[AUTH] 401 em {request.url.path}: JWT inválido/expirado")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
        )

    nick = payload["sub"]
    role = payload.get("role", "user")
    is_admin_fixo = nick.lower() in ADMINS_FIXOS

    pool = get_pool()
    if pool:
        try:
            async with pool.connection() as conn:
                cur = await conn.execute(
                    "SELECT nick, patente, corpo, status, role FROM militares WHERE LOWER(nick) = LOWER(%s)",
                    (nick,),
                )
                row = await cur.fetchone()
            if row:
                nick_db, patente, corpo, user_status, role_db = row
                is_admin = is_admin_fixo or role == "admin" or role_db == "admin"
                return UserInfo(
                    nick=nick_db,
                    patente=patente or "Recruta",
                    corpo=corpo or "militar",
                    status=user_status or "ativo",
                    role="admin" if is_admin else "user",
                )
        except Exception as exc:
            logger.error(f"[AUTH] Erro ao buscar militar no PostgreSQL: {exc}")

    # Token válido mas militar não encontrado (ex: admin fixo sem registro)
    return UserInfo(
        nick=nick,
        role="admin" if is_admin_fixo else role,
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
