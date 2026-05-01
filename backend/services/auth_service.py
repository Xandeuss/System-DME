"""
Serviço de autenticação.
Gerencia hash de senhas (bcrypt direto) e criação/validação de tokens JWT.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import jwt, JWTError

from backend.config import get_settings


# ── Hashing de senha com bcrypt (sem passlib, evitando incompatibilidades)
def hash_password(plain: str) -> str:
    """Gera o hash bcrypt de uma senha em texto puro."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(plain.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Compara uma senha em texto puro com o hash armazenado."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ── JWT
def create_jwt(nick: str, role: str = "user", centros: list[str] = None) -> str:
    """
    Cria um token JWT assinado.
    Payload: { sub: nick, role: "user"|"admin", centros: [], exp: datetime }
    """
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)

    payload = {
        "sub": nick,
        "role": role,
        "centros": centros or [],
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
        if payload.get("sub") is None:
            return None
        return payload
    except JWTError:
        return None
