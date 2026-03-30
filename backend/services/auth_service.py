"""
Serviço de autenticação.
Gerencia hash de senhas e criação/validação de tokens JWT.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import jwt, JWTError
from passlib.context import CryptContext

from backend.config import get_settings

# ── Hashing de senha com bcrypt ──────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Gera o hash bcrypt de uma senha em texto puro."""
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Compara uma senha em texto puro com o hash armazenado."""
    return pwd_context.verify(plain, hashed)


# ── JWT ──────────────────────────────────────────────
def create_jwt(nick: str, role: str = "user") -> str:
    """
    Cria um token JWT assinado.
    Payload: { sub: nick, role: "user"|"admin", exp: datetime }
    """
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)

    payload = {
        "sub": nick,
        "role": role,
        "exp": expire,
    }

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_jwt(token: str) -> Optional[dict]:
    """
    Decodifica e valida um token JWT.
    Retorna o payload se válido, None se expirado/inválido.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        # Garante que o campo 'sub' existe
        if payload.get("sub") is None:
            return None
        return payload
    except JWTError:
        return None
