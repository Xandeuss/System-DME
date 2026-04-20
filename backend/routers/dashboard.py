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
from fastapi import APIRouter, HTTPException, Depends, Query
from backend.dependencies import get_current_user
from backend.models.auth import UserInfo
from backend.services.supabase_client import get_supabase

logger = logging.getLogger("dme.dashboard")

router = APIRouter(tags=["dashboard"])


# ── GET /api/militares ───────────────────────────────────────────────────────

@router.get("/api/militares")
async def listar_militares(
    user: UserInfo = Depends(get_current_user),
):
    """Lista todos os militares ativos (para busca, ranking, etc.)."""
    sb = get_supabase()

    try:
        result = (
            sb.table("militares")
            .select("nick, patente, corpo, status, tag, created_at")
            .execute()
        )
        return {"ok": True, "data": result.data or []}
    except Exception as e:
        logger.error(f"Erro ao listar militares: {e}")
        return {"ok": True, "data": []}


# ── GET /api/militares/{nick} ────────────────────────────────────────────────

@router.get("/api/militares/{nick}")
async def buscar_militar(
    nick: str,
    user: UserInfo = Depends(get_current_user),
):
    """Busca um militar específico pelo nick."""
    sb = get_supabase()

    try:
        result = (
            sb.table("militares")
            .select("nick, patente, corpo, status, tag, created_at")
            .eq("nick", nick)
            .maybe_single()
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Militar não encontrado")
        return {"ok": True, "data": result.data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar militar {nick}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar militar")


# ── GET /api/turnos ──────────────────────────────────────────────────────────

@router.get("/api/turnos")
async def listar_turnos(
    user: UserInfo = Depends(get_current_user),
):
    """Lista turnos registrados (para ranking semanal, oficiais do mês)."""
    sb = get_supabase()

    try:
        result = (
            sb.table("turnos")
            .select("usuario, duracao, inicio, fim")
            .order("inicio", desc=True)
            .execute()
        )
        return {"ok": True, "data": result.data or []}
    except Exception as e:
        logger.warning(f"Tabela 'turnos' não encontrada ou erro: {e}")
        return {"ok": True, "data": []}


# ── GET /api/aulas ───────────────────────────────────────────────────────────

@router.get("/api/aulas")
async def listar_aulas(
    user: UserInfo = Depends(get_current_user),
):
    """Lista aulas postadas (para stats do dashboard)."""
    sb = get_supabase()

    try:
        result = (
            sb.table("aulas")
            .select("instrutor, data, tipo")
            .order("data", desc=True)
            .execute()
        )
        return {"ok": True, "data": result.data or []}
    except Exception as e:
        logger.warning(f"Tabela 'aulas' não encontrada ou erro: {e}")
        return {"ok": True, "data": []}


# ── GET /api/recrutamentos ───────────────────────────────────────────────────

@router.get("/api/recrutamentos")
async def listar_recrutamentos(
    user: UserInfo = Depends(get_current_user),
):
    """Lista recrutamentos realizados (para stats do dashboard)."""
    sb = get_supabase()

    try:
        result = (
            sb.table("recrutamentos")
            .select("recrutador, data, recrutado")
            .order("data", desc=True)
            .execute()
        )
        return {"ok": True, "data": result.data or []}
    except Exception as e:
        logger.warning(f"Tabela 'recrutamentos' não encontrada ou erro: {e}")
        return {"ok": True, "data": []}


# ── GET /api/config ──────────────────────────────────────────────────────────

@router.get("/api/config")
async def obter_config(
    user: UserInfo = Depends(get_current_user),
):
    """Retorna configurações do sistema (destaques, etc.)."""
    sb = get_supabase()

    try:
        result = (
            sb.table("config")
            .select("*")
            .maybe_single()
            .execute()
        )
        return {"ok": True, "data": result.data or {}}
    except Exception as e:
        logger.warning(f"Tabela 'config' não encontrada ou erro: {e}")
        return {"ok": True, "data": {}}
