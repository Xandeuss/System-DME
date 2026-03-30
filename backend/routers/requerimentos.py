"""
Router de requerimentos e ações em militares.

Endpoints:
  POST   /api/requerimentos               — cria novo requerimento
  GET    /api/requerimentos               — lista requerimentos (filtros: tipo, aba)
  GET    /api/requerimentos/{req_id}      — busca um requerimento por ID
  PATCH  /api/requerimentos/{req_id}      — atualiza status / campos do requerimento
  DELETE /api/requerimentos/{req_id}      — remove um requerimento (somente admin)
  PATCH  /api/militares/{nick}            — atualiza patente ou status de um militar
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.responses import JSONResponse

from backend.dependencies import get_current_user, get_current_admin
from backend.models.auth import UserInfo
from backend.models.requerimentos import RequerimentoCreate, RequerimentoUpdate, MilitarUpdate
from backend.services.supabase_client import get_supabase

logger = logging.getLogger("dme.requerimentos")

router = APIRouter(tags=["requerimentos"])


# ── POST /api/requerimentos ───────────────────────────────────────────────────

@router.post("/api/requerimentos", status_code=status.HTTP_201_CREATED)
async def criar_requerimento(
    body: RequerimentoCreate,
    user: UserInfo = Depends(get_current_user),
):
    """
    Cria um novo requerimento.
    O aplicador é extraído do JWT — nunca do body.
    O status inicial é sempre 'pendente'.
    """
    sb = get_supabase()

    registro = body.model_dump(exclude_none=True)
    registro["aplicador"] = user.nick
    registro["status"] = "pendente"

    try:
        result = sb.table("requerimentos").insert(registro).execute()
        logger.info(f"Requerimento criado por {user.nick}: tipo={body.tipo}")
        return {"ok": True, "data": result.data[0] if result.data else None}
    except Exception as e:
        logger.error(f"Erro ao criar requerimento: {e}")
        raise HTTPException(status_code=500, detail="Erro ao salvar requerimento")


# ── GET /api/requerimentos ────────────────────────────────────────────────────

@router.get("/api/requerimentos")
async def listar_requerimentos(
    tipo: str = Query(..., description="Tipo do requerimento (ex: promocao, advertencia)"),
    aba: str = Query("todos", description="'minhas' filtra por aplicador, 'todos' retorna tudo"),
    user: UserInfo = Depends(get_current_user),
):
    """
    Lista requerimentos por tipo.
    - aba='minhas': retorna apenas os do usuário logado.
    - aba='todos': retorna todos (qualquer usuário pode ver).
    Ordenação: mais recente primeiro.
    """
    sb = get_supabase()

    try:
        query = (
            sb.table("requerimentos")
            .select("*")
            .eq("tipo", tipo)
            .order("data_hora", desc=True)
        )

        if aba == "minhas":
            query = query.eq("aplicador", user.nick)

        result = query.execute()
        return {"ok": True, "data": result.data or []}
    except Exception as e:
        logger.error(f"Erro ao listar requerimentos: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar requerimentos")


# ── GET /api/requerimentos/{req_id} ──────────────────────────────────────────

@router.get("/api/requerimentos/{req_id}")
async def buscar_requerimento(
    req_id: str,
    user: UserInfo = Depends(get_current_user),
):
    """Busca um requerimento específico pelo ID."""
    sb = get_supabase()

    try:
        result = (
            sb.table("requerimentos")
            .select("*")
            .eq("id", req_id)
            .maybe_single()
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Requerimento não encontrado")
        return {"ok": True, "data": result.data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar requerimento {req_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar requerimento")


# ── PATCH /api/requerimentos/{req_id} ────────────────────────────────────────

@router.patch("/api/requerimentos/{req_id}")
async def atualizar_requerimento(
    req_id: str,
    body: RequerimentoUpdate,
    user: UserInfo = Depends(get_current_user),
):
    """
    Atualiza campos de um requerimento existente.
    Aprovar/reprovar/cancelar exige role admin.
    Editar observação pode ser feito pelo próprio aplicador.
    """
    sb = get_supabase()

    # Operações de workflow (aceitar/negar/cancelar) são restritas a admin
    acoes_admin = {"aprovado", "reprovado", "cancelado"}
    if body.status in acoes_admin and user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem alterar o status de um requerimento",
        )

    campos = body.model_dump(exclude_none=True)
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    try:
        sb.table("requerimentos").update(campos).eq("id", req_id).execute()
        logger.info(f"Requerimento {req_id} atualizado por {user.nick}: {campos}")
        return {"ok": True, "message": "Requerimento atualizado com sucesso"}
    except Exception as e:
        logger.error(f"Erro ao atualizar requerimento {req_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar requerimento")


# ── DELETE /api/requerimentos/{req_id} ───────────────────────────────────────

@router.delete("/api/requerimentos/{req_id}")
async def deletar_requerimento(
    req_id: str,
    user: UserInfo = Depends(get_current_admin),
):
    """Remove um requerimento. Restrito a administradores."""
    sb = get_supabase()

    try:
        sb.table("requerimentos").delete().eq("id", req_id).execute()
        logger.info(f"Requerimento {req_id} deletado por {user.nick}")
        return {"ok": True, "message": "Requerimento removido com sucesso"}
    except Exception as e:
        logger.error(f"Erro ao deletar requerimento {req_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao deletar requerimento")


# ── PATCH /api/militares/{nick} ───────────────────────────────────────────────

@router.patch("/api/militares/{nick}")
async def atualizar_militar(
    nick: str,
    body: MilitarUpdate,
    user: UserInfo = Depends(get_current_admin),
):
    """
    Atualiza patente ou status de um militar.
    Restrito a administradores — chamado internamente ao aprovar
    requerimentos de promoção, rebaixamento ou demissão.
    """
    sb = get_supabase()

    campos = body.model_dump(exclude_none=True)
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    try:
        sb.table("militares").update(campos).eq("nick", nick).execute()
        logger.info(f"Militar {nick} atualizado por {user.nick}: {campos}")
        return {"ok": True, "message": f"Militar {nick} atualizado com sucesso"}
    except Exception as e:
        logger.error(f"Erro ao atualizar militar {nick}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar militar")
