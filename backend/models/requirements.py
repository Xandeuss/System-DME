"""
Schemas Pydantic para requerimentos e ações em militares.
Validam os dados de entrada/saída dos endpoints correspondentes.
"""

from pydantic import BaseModel
from typing import Optional, List


# ── Requerimentos ─────────────────────────────────────────────────────────────

class RequerimentoCreate(BaseModel):
    """Dados para criar um novo requerimento (POST /api/requerimentos)."""
    tipo: str
    acao: Optional[str] = None
    permissor: Optional[str] = None
    observacao: Optional[str] = None
    data_hora: Optional[str] = None
    banido_ate: Optional[str] = None
    tags_envolvidos: Optional[List[str]] = None
    anexo_provas: Optional[str] = None
    # status é definido pelo backend (sempre 'pendente'), nunca pelo frontend
    # aplicador é injetado a partir do JWT, nunca do body


class RequerimentoUpdate(BaseModel):
    """
    Dados para atualizar um requerimento existente (PATCH /api/requerimentos/{id}).
    Todos os campos são opcionais — só os enviados serão alterados.
    """
    status: Optional[str] = None
    aprovador: Optional[str] = None
    reprovador: Optional[str] = None
    motivo_reprovacao: Optional[str] = None
    observacao: Optional[str] = None


# ── Militares ─────────────────────────────────────────────────────────────────

class MilitarUpdate(BaseModel):
    """
    Dados para atualizar um militar (PATCH /api/militares/{nick}).
    Aceita somente os campos que fazem sentido alterar via requerimento.
    """
    patente: Optional[str] = None
    status: Optional[str] = None
