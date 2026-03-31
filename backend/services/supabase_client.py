"""
Cliente Supabase server-side.
Usa a service_role key para acesso completo ao banco.
Este cliente NUNCA deve ser exposto ao frontend.
"""

import logging
from functools import lru_cache
from supabase import create_client, Client
from fastapi import HTTPException

from backend.config import get_settings

logger = logging.getLogger("dme.supabase")


@lru_cache()
def get_supabase() -> Client:
    """Cria e retorna o cliente Supabase (instância única)."""
    settings = get_settings()

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise HTTPException(
            status_code=503,
            detail="Banco de dados não configurado. Adicione SUPABASE_URL e SUPABASE_SERVICE_KEY no arquivo .env",
        )

    try:
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    except Exception as e:
        logger.error(f"Falha ao conectar ao Supabase: {e}")
        raise HTTPException(
            status_code=503,
            detail="Não foi possível conectar ao banco de dados. Verifique as credenciais no .env",
        )
