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
        await _run_migrations(_pool)
        logger.info("Pool PostgreSQL inicializado")
    except Exception as exc:
        _pool = None
        logger.error(f"Falha ao conectar ao PostgreSQL: {exc}")


# Migrações idempotentes — rodam a cada boot, seguras de re-executar.
_MIGRATIONS = [
    "ALTER TABLE militares ADD COLUMN IF NOT EXISTS patente_anterior VARCHAR(64)",
    "ALTER TABLE usuarios ALTER COLUMN status TYPE VARCHAR(32)",
    "ALTER TABLE militares ALTER COLUMN status TYPE VARCHAR(32)",
    "ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_status_check",
    "ALTER TABLE usuarios ADD CONSTRAINT usuarios_status_check CHECK (status IN ('ativo', 'pendente', 'pendente_missao', 'pendente_aprovacao', 'desativado', 'banido'))",
    "ALTER TABLE militares DROP CONSTRAINT IF EXISTS militares_status_check",
    "ALTER TABLE militares ADD CONSTRAINT militares_status_check CHECK (status IN ('ativo', 'pendente', 'pendente_missao', 'pendente_aprovacao', 'desativado', 'banido'))",
]


async def _run_migrations(pool: AsyncConnectionPool) -> None:
    async with pool.connection() as conn:
        for sql in _MIGRATIONS:
            try:
                await conn.execute(sql)
            except Exception as exc:
                logger.warning("Migração ignorada (%s): %s", sql[:60], exc)
        await conn.commit()


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        logger.info("Pool PostgreSQL encerrado")


def get_pool() -> AsyncConnectionPool | None:
    return _pool
