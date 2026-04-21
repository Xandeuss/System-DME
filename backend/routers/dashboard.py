"""
Router de dados do dashboard (home).

Endpoints:
  GET /api/militares          — lista todos os militares (busca, ranking)
  GET /api/militares/{nick}   — busca um militar pelo nick
  GET /api/turnos             — lista turnos (ranking semanal, oficiais do mês)
  GET /api/aulas              — lista aulas (stats)
  GET /api/recrutamentos      — lista recrutamentos (stats)
  GET /api/config             — configurações públicas (destaques, etc.)
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from backend.dependencies import get_current_user
from backend.models.auth import UserInfo
from backend.services.local_store import get_store

logger = logging.getLogger("dme.dashboard")

router = APIRouter(tags=["dashboard"])

_CAMPOS_PUBLICOS = ("nick", "patente", "corpo", "status", "tag", "created_at")


# ── GET /api/militares ───────────────────────────────────────────────────────

@router.get("/api/militares")
async def listar_militares(
    user: UserInfo = Depends(get_current_user),
):
    """Lista todos os militares ativos (para busca, ranking, etc.)."""
    store = get_store()
    data = [{k: v for k, v in m.items() if k in _CAMPOS_PUBLICOS} for m in store.list_militares()]
    return {"ok": True, "data": data}


# ── GET /api/militares/{nick} ────────────────────────────────────────────────

@router.get("/api/militares/{nick}")
async def buscar_militar(
    nick: str,
    user: UserInfo = Depends(get_current_user),
):
    """Busca um militar específico pelo nick."""
    store = get_store()
    m = store.get_militar(nick)
    if not m:
        raise HTTPException(status_code=404, detail="Militar não encontrado")
    return {"ok": True, "data": {k: v for k, v in m.items() if k in _CAMPOS_PUBLICOS}}


# ── GET /api/turnos ──────────────────────────────────────────────────────────

@router.get("/api/turnos")
async def listar_turnos(
    user: UserInfo = Depends(get_current_user),
):
    """Lista turnos registrados (para ranking semanal, oficiais do mês)."""
    store = get_store()
    return {"ok": True, "data": store.list_turnos()}


# ── GET /api/aulas ───────────────────────────────────────────────────────────

@router.get("/api/aulas")
async def listar_aulas(
    user: UserInfo = Depends(get_current_user),
):
    """Lista aulas postadas (para stats do dashboard)."""
    store = get_store()
    return {"ok": True, "data": store.list_aulas()}


# ── GET /api/recrutamentos ───────────────────────────────────────────────────

@router.get("/api/recrutamentos")
async def listar_recrutamentos(
    user: UserInfo = Depends(get_current_user),
):
    """Lista recrutamentos realizados (para stats do dashboard)."""
    store = get_store()
    return {"ok": True, "data": store.list_recrutamentos()}


# ── GET /api/config ──────────────────────────────────────────────────────────

@router.get("/api/config")
async def obter_config(
    user: UserInfo = Depends(get_current_user),
):
    """Retorna configurações do sistema (destaques, etc.)."""
    store = get_store()
    return {"ok": True, "data": store.get_config()}
