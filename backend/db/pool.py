"""
Pool de conexões psycopg3 (async).
Inicializado no lifespan do FastAPI (main.py).
"""

import logging
from psycopg_pool import AsyncConnectionPool
from backend.config import get_settings

logger = logging.getLogger("dme.db")

_pool: AsyncConnectionPool | None = None


async def init_pool() -> None:
    global _pool
    settings = get_settings()
    dsn = settings.DATABASE_URL
    if not dsn:
        logger.warning("DATABASE_URL não configurada — persistência PostgreSQL desativada")
        return
    try:
        _pool = AsyncConnectionPool(conninfo=dsn, min_size=2, max_size=10, open=False)
        await _pool.open()
        logger.info("Pool PostgreSQL inicializado")
    except Exception as exc:
        _pool = None
        logger.error(f"Falha ao conectar ao PostgreSQL: {exc}")


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        logger.info("Pool PostgreSQL encerrado")


def get_pool() -> AsyncConnectionPool | None:
    return _pool
