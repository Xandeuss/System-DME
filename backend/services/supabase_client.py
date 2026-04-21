"""
Módulo removido — o sistema usa local_store.py no lugar do Supabase.
Este arquivo existe apenas para evitar ImportError em código legado.
"""

raise ImportError(
    "supabase_client.py foi removido. Use backend.services.local_store.get_store() no lugar."
)
