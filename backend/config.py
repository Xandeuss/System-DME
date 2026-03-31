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

    # ── Supabase ──────────────────────────────────────
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

    # ── JWT ───────────────────────────────────────────
    JWT_SECRET: str = os.getenv("JWT_SECRET", "INSEGURO-troque-isso")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))

    # ── Cookie ────────────────────────────────────────
    COOKIE_NAME: str = "dme_token"
    COOKIE_HTTPONLY: bool = True
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"  # False em dev, True em produção (HTTPS)
    COOKIE_SAMESITE: str = "lax"
    COOKIE_MAX_AGE: int = JWT_EXPIRE_MINUTES * 60  # em segundos

    # ── Ambiente ──────────────────────────────────────
    DEV_MODE: bool = os.getenv("DEV_MODE", "true").lower() == "true"

    def validate(self) -> None:
        """
        Verifica se as variáveis essenciais estão configuradas.
        Em DEV_MODE=true, emite avisos no console em vez de travar o servidor.
        Em produção (DEV_MODE=false), lança RuntimeError se algo estiver faltando.
        """
        import logging
        logger = logging.getLogger("dme.config")

        erros = []
        if not self.SUPABASE_URL:
            erros.append("SUPABASE_URL não configurada")
        if not self.SUPABASE_SERVICE_KEY or self.SUPABASE_SERVICE_KEY == "COLE_SUA_SERVICE_ROLE_KEY_AQUI":
            erros.append("SUPABASE_SERVICE_KEY não configurada")
        if self.JWT_SECRET == "INSEGURO-troque-isso":
            erros.append("JWT_SECRET não configurada (gere com: openssl rand -hex 32)")

        if erros:
            if self.DEV_MODE:
                for e in erros:
                    logger.warning(f"[DEV] Configuração ausente: {e}")
                logger.warning("[DEV] Servidor iniciado com configuração incompleta. Defina DEV_MODE=false em produção.")
            else:
                raise RuntimeError(
                    "Configuração incompleta. Verifique o arquivo .env:\n  - "
                    + "\n  - ".join(erros)
                )


@lru_cache()
def get_settings() -> Settings:
    """Retorna a instância de Settings (cacheada)."""
    return Settings()
