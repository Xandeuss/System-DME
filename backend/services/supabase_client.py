"""
Cliente Supabase server-side.
Usa a service_role key para acesso completo ao banco.
Este cliente NUNCA deve ser exposto ao frontend.
"""

from functools import lru_cache
from supabase import create_client, Client

from backend.config import get_settings


@lru_cache()
def get_supabase() -> Client:
    """Cria e retorna o cliente Supabase (instância única)."""
    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
