"""
Utilitário de cache em memória simples com TTL (Time-To-Live).
"""

import time
from typing import Any, Optional, Dict

class MemoryCache:
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    def set(self, key: str, value: Any, ttl: int = 300):
        """Armazena um valor por 'ttl' segundos (padrão 5 min)."""
        self._cache[key] = {
            "value": value,
            "expires": time.time() + ttl
        }

    def get(self, key: str) -> Optional[Any]:
        """Retorna o valor se não estiver expirado, senão None."""
        item = self._cache.get(key)
        if not item:
            return None
        
        if time.time() > item["expires"]:
            del self._cache[key]
            return None
            
        return item["value"]

    def invalidate(self, key_prefix: str = ""):
        """Remove itens do cache que começam com o prefixo."""
        if not key_prefix:
            self._cache.clear()
        else:
            keys_to_del = [k for k in self._cache.keys() if k.startswith(key_prefix)]
            for k in keys_to_del:
                del self._cache[k]

# Instância global do cache
cache = MemoryCache()
