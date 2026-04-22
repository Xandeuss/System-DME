"""
Schemas Pydantic para autenticação.
Validam os dados de entrada/saída dos endpoints de auth.
"""

from pydantic import BaseModel, Field, field_validator
import re


class LoginRequest(BaseModel):
    """Dados enviados no POST /api/auth/login."""
    nick: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=6, max_length=128)

    @field_validator("nick")
    @classmethod
    def nick_valido(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^[a-zA-Z0-9._-]+$", v):
            raise ValueError("Nick contém caracteres inválidos")
        return v


class RegisterRequest(BaseModel):
    """Dados enviados no POST /api/auth/register."""
    nick: str = Field(..., min_length=3, max_length=30)
    email: str = Field(..., max_length=120)
    password: str = Field(..., min_length=6, max_length=128)

    @field_validator("nick")
    @classmethod
    def nick_valido(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^[a-zA-Z0-9._-]+$", v):
            raise ValueError("Nick contém caracteres inválidos")
        return v

    @field_validator("email")
    @classmethod
    def email_valido(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", v):
            raise ValueError("E-mail inválido")
        return v


class AuthResponse(BaseModel):
    """Resposta padrão dos endpoints de auth."""
    ok: bool
    message: str


class UserInfo(BaseModel):
    """Dados do usuário retornados pelo GET /api/auth/me."""
    nick: str
    patente: str = "Recruta"
    corpo: str = "militar"
    status: str = "ativo"
    role: str = "user"
    centros: list[str] = []
