"""
Configuração central do sistema DME.
Carrega variáveis de ambiente do arquivo .env na raiz do projeto.
"""

from pathlib import Path
from functools import lru_cache

from dotenv import load_dotenv
import os

# Carrega o .env da raiz do projeto (dois níveis acima de backend/)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)


class Settings:
    """Configurações carregadas das variáveis de ambiente."""

    # ── JWT ───────────────────────────────────────────
    JWT_SECRET: str = os.getenv("JWT_SECRET", "INSEGURO-troque-isso")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))

    # ── Cookie ────────────────────────────────────────
    COOKIE_NAME: str = "dme_token"
    COOKIE_HTTPONLY: bool = True
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    COOKIE_SAMESITE: str = "lax"
    COOKIE_MAX_AGE: int = JWT_EXPIRE_MINUTES * 60

    # ── Ambiente ──────────────────────────────────────
    DEV_MODE: bool = os.getenv("DEV_MODE", "true").lower() == "true"

    def validate(self) -> None:
        import logging
        logger = logging.getLogger("dme.config")

        if self.JWT_SECRET == "INSEGURO-troque-isso":
            msg = "JWT_SECRET não configurada (gere com: openssl rand -hex 32)"
            if self.DEV_MODE:
                logger.warning(f"[DEV] Configuração ausente: {msg}")
            else:
                raise RuntimeError(f"Configuração incompleta. Verifique o arquivo .env:\n  - {msg}")


@lru_cache()
def get_settings() -> Settings:
    """Retorna a instância de Settings (cacheada)."""
    return Settings()
