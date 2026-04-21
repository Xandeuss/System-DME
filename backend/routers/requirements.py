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
from backend.models.requirements import RequerimentoCreate, RequerimentoUpdate, MilitarUpdate
from backend.services.local_store import get_store

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
    store = get_store()

    registro = body.model_dump(exclude_none=True)
    registro["aplicador"] = user.nick
    registro["status"] = "pendente"

    result = store.insert_requerimento(registro)
    logger.info(f"Requerimento criado por {user.nick}: tipo={body.tipo}")
    return {"ok": True, "data": result}


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
    store = get_store()
    aplicador = user.nick if aba == "minhas" else None
    result = store.list_requerimentos(tipo=tipo, aplicador=aplicador)
    return {"ok": True, "data": result}


# ── GET /api/requerimentos/{req_id} ──────────────────────────────────────────

@router.get("/api/requerimentos/{req_id}")
async def buscar_requerimento(
    req_id: str,
    user: UserInfo = Depends(get_current_user),
):
    """Busca um requerimento específico pelo ID."""
    store = get_store()
    r = store.get_requerimento(req_id)
    if not r:
        raise HTTPException(status_code=404, detail="Requerimento não encontrado")
    return {"ok": True, "data": r}


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
    acoes_admin = {"aprovado", "reprovado", "cancelado"}
    if body.status in acoes_admin and user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem alterar o status de um requerimento",
        )

    campos = body.model_dump(exclude_none=True)
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    store = get_store()
    r = store.update_requerimento(req_id, campos)
    if not r:
        raise HTTPException(status_code=404, detail="Requerimento não encontrado")

    logger.info(f"Requerimento {req_id} atualizado por {user.nick}: {campos}")
    return {"ok": True, "message": "Requerimento atualizado com sucesso"}


# ── DELETE /api/requerimentos/{req_id} ───────────────────────────────────────

@router.delete("/api/requerimentos/{req_id}")
async def deletar_requerimento(
    req_id: str,
    user: UserInfo = Depends(get_current_admin),
):
    """Remove um requerimento. Restrito a administradores."""
    store = get_store()
    store.delete_requerimento(req_id)
    logger.info(f"Requerimento {req_id} deletado por {user.nick}")
    return {"ok": True, "message": "Requerimento removido com sucesso"}


# ── PATCH /api/militares/{nick} ───────────────────────────────────────────────

@router.patch("/api/militares/{nick}")
async def atualizar_militar(
    nick: str,
    body: MilitarUpdate,
    user: UserInfo = Depends(get_current_admin),
):
    """
    Atualiza patente ou status de um militar.
    Restrito a administradores.
    """
    campos = body.model_dump(exclude_none=True)
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    store = get_store()
    m = store.update_militar(nick, campos)
    if not m:
        raise HTTPException(status_code=404, detail="Militar não encontrado")

    logger.info(f"Militar {nick} atualizado por {user.nick}: {campos}")
    return {"ok": True, "message": f"Militar {nick} atualizado com sucesso"}
