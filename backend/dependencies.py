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
            centros=["corregedoria", "centro_instrucao"],
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
    role_jwt = payload.get("role", "user")
    centros_jwt = payload.get("centros", [])

    pool = get_pool()
    if pool:
        try:
            async with pool.connection() as conn:
                # 1. Buscar status e role na tabela 'usuarios'
                cur = await conn.execute(
                    "SELECT status, role FROM usuarios WHERE LOWER(nick) = LOWER(%s)",
                    (nick,),
                )
                row_user = await cur.fetchone()
                
                if row_user:
                    user_status, role_db = row_user
                    
                    # Se não estiver ativo, barramos o acesso mesmo com JWT válido
                    if (user_status or "ativo").lower() != "ativo":
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Conta desativada ou banida",
                        )
                    
                    # 2. Buscar dados RPG na tabela 'militares'
                    cur = await conn.execute(
                        "SELECT nick, patente, corpo FROM militares WHERE LOWER(nick) = LOWER(%s)",
                        (nick,),
                    )
                    row_mil = await cur.fetchone()
                    
                    if row_mil:
                        nick_db, patente, corpo = row_mil
                        is_admin = (role_db == "admin")
                        return UserInfo(
                            nick=nick_db,
                            patente=patente or "Recruta",
                            corpo=corpo or "militar",
                            status=user_status,
                            role="admin" if is_admin else "user",
                            centros=centros_jwt,
                        )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"[AUTH] Erro ao buscar dados do usuário: {exc}")

    # Token válido mas sem registro completo no banco
    return UserInfo(
        nick=nick,
        role=role_jwt,
        centros=centros_jwt,
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
