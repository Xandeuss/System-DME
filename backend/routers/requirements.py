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
from typing import Any
from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.responses import JSONResponse

from backend.dependencies import get_current_user, get_current_admin
from backend.models.auth import UserInfo
from backend.models.requirements import RequerimentoCreate, RequerimentoUpdate, MilitarUpdate
from backend.db.pool import get_pool
from backend.services import listagem_service

logger = logging.getLogger("dme.requerimentos")

router = APIRouter(tags=["requerimentos"])

def _row_to_dict(row, cur) -> dict:
    """Converte row para dicionário baseado nos nomes das colunas."""
    cols = [col.name for col in cur.description]
    return dict(zip(cols, row))

# ── POST /api/requerimentos ───────────────────────────────────────────────────

@router.post("/api/requerimentos", status_code=status.HTTP_201_CREATED)
async def criar_requerimento(
    body: RequerimentoCreate,
    user: UserInfo = Depends(get_current_user),
):
    """
    Cria um novo requerimento diretamente no PostgreSQL.
    """
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=500, detail="Banco de dados indisponível")

    registro = body.model_dump(exclude_none=True)
    aplicador = user.nick

    try:
        async with pool.connection() as conn:
            cur = await conn.execute(
                """
                INSERT INTO historico_requerimentos 
                    (tipo, aplicador, status, acao, nova_patente, tags_envolvidos, permissor, observacao, anexo_provas, valor, banido_ate)
                VALUES (%s, %s, 'pendente', %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    registro.get("tipo"), aplicador, registro.get("acao"), registro.get("novaPatente"), 
                    registro.get("tags_envolvidos", []), registro.get("permissor"), 
                    registro.get("observacao"), registro.get("anexo_provas"), 
                    registro.get("valor"), registro.get("banido_ate")
                )
            )
            row = await cur.fetchone()
            req_id = row[0]
            await conn.commit()
            
        logger.info(f"Requerimento {req_id} criado por {user.nick}: tipo={body.tipo}")
        return {"ok": True, "data": {"id": str(req_id)}}
    except Exception as e:
        logger.error(f"Erro ao criar requerimento: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao criar requerimento")


# ── GET /api/requerimentos ────────────────────────────────────────────────────

@router.get("/api/requerimentos")
async def listar_requerimentos(
    tipo: str = Query(..., description="Tipo do requerimento (ex: promocao, advertencia)"),
    aba: str = Query("todos", description="'minhas' filtra por aplicador, 'todos' retorna tudo"),
    user: UserInfo = Depends(get_current_user),
):
    """
    Lista requerimentos buscando do PostgreSQL.
    """
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=500, detail="Banco de dados indisponível")

    try:
        async with pool.connection() as conn:
            if aba == "minhas":
                cur = await conn.execute(
                    "SELECT * FROM historico_requerimentos WHERE tipo = %s AND aplicador = %s ORDER BY data_hora DESC",
                    (tipo, user.nick)
                )
            else:
                cur = await conn.execute(
                    "SELECT * FROM historico_requerimentos WHERE tipo = %s ORDER BY data_hora DESC",
                    (tipo,)
                )
            rows = await cur.fetchall()
            result = [_row_to_dict(r, cur) for r in rows]
            
            for item in result:
                item["id"] = str(item["id"])
                if item.get("data_hora"):
                    item["data_hora"] = item["data_hora"].isoformat()
                item["novaPatente"] = item.pop("nova_patente", None)
            
            return {"ok": True, "data": result}
    except Exception as e:
        logger.error(f"Erro ao listar requerimentos: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao buscar requerimentos")


# ── GET /api/requerimentos/{req_id} ──────────────────────────────────────────

@router.get("/api/requerimentos/{req_id}")
async def buscar_requerimento(
    req_id: str,
    user: UserInfo = Depends(get_current_user),
):
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=500, detail="Banco de dados indisponível")
        
    try:
        async with pool.connection() as conn:
            cur = await conn.execute("SELECT * FROM historico_requerimentos WHERE id = %s", (req_id,))
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Requerimento não encontrado")
            r = _row_to_dict(row, cur)
            r["id"] = str(r["id"])
            r["novaPatente"] = r.pop("nova_patente", None)
            return {"ok": True, "data": r}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar requerimento: {e}")
        raise HTTPException(status_code=500, detail="Erro interno")


# ── PATCH /api/requerimentos/{req_id} ────────────────────────────────────────

@router.patch("/api/requerimentos/{req_id}")
async def atualizar_requerimento(
    req_id: str,
    body: RequerimentoUpdate,
    user: UserInfo = Depends(get_current_user),
):
    acoes_admin = {"aprovado", "reprovado", "cancelado"}
    if body.status in acoes_admin and user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem alterar o status de um requerimento",
        )

    campos = body.model_dump(exclude_none=True)
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=500, detail="Banco de dados indisponível")

    try:
        async with pool.connection() as conn:
            # 1. Build UPDATE query
            set_clauses = []
            values = []
            for k, v in campos.items():
                col = "nova_patente" if k == "novaPatente" else k
                set_clauses.append(f"{col} = %s")
                values.append(v)
            
            if "status" in campos and campos["status"] in ("aprovado", "reprovado", "cancelado"):
                set_clauses.append("resolvido_em = NOW()")
            
            values.append(req_id)
            set_query = ", ".join(set_clauses)
            
            cur = await conn.execute(f"UPDATE historico_requerimentos SET {set_query} WHERE id = %s RETURNING id", values)
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Requerimento não encontrado")
            
            # 2. Fetch updated to pass to listagem_service
            cur = await conn.execute("SELECT * FROM historico_requerimentos WHERE id = %s", (req_id,))
            updated_row = await cur.fetchone()
            updated_req = _row_to_dict(updated_row, cur)
            updated_req["id"] = str(updated_req["id"])
            updated_req["novaPatente"] = updated_req.pop("nova_patente", None)
            
            await conn.commit()

        # Se foi aprovado, reflete nas listagens (militar, corpo, etc)
        if body.status == "aprovado":
            primeiro_envolvido = (updated_req.get("tags_envolvidos") or [None])[0]
            militar_atual = None
            if primeiro_envolvido:
                async with pool.connection() as conn:
                    c = await conn.execute("SELECT * FROM militares WHERE LOWER(nick) = LOWER(%s)", (primeiro_envolvido,))
                    m_row = await c.fetchone()
                    if m_row:
                        militar_atual = _row_to_dict(m_row, c)
            await listagem_service.aplicar_aprovacao(updated_req, militar_atual)

        logger.info(f"Requerimento {req_id} atualizado por {user.nick}: {campos}")
        return {"ok": True, "message": "Requerimento atualizado com sucesso"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar requerimento: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar requerimento")


# ── DELETE /api/requerimentos/{req_id} ───────────────────────────────────────

@router.delete("/api/requerimentos/{req_id}")
async def deletar_requerimento(
    req_id: str,
    user: UserInfo = Depends(get_current_admin),
):
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=500, detail="Banco de dados indisponível")
    try:
        async with pool.connection() as conn:
            await conn.execute("DELETE FROM historico_requerimentos WHERE id = %s", (req_id,))
            await conn.commit()
        logger.info(f"Requerimento {req_id} deletado por {user.nick}")
        return {"ok": True, "message": "Requerimento removido com sucesso"}
    except Exception as e:
        logger.error(f"Erro ao remover requerimento: {e}")
        raise HTTPException(status_code=500, detail="Erro interno")


# ── PATCH /api/militares/{nick} ───────────────────────────────────────────────

@router.patch("/api/militares/{nick}")
async def atualizar_militar(
    nick: str,
    body: MilitarUpdate,
    user: UserInfo = Depends(get_current_admin),
):
    campos = body.model_dump(exclude_none=True)
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=500, detail="Banco de dados indisponível")

    try:
        async with pool.connection() as conn:
            set_clauses = []
            values = []
            for k, v in campos.items():
                set_clauses.append(f"{k} = %s")
                values.append(v)
            if "patente" in campos:
                set_clauses.append("patente_ordem = %s")
                values.append(listagem_service.patente_ordem(campos["patente"]))
                set_clauses.append("corpo = %s")
                values.append(listagem_service.detectar_corpo(campos["patente"]))
                
            values.append(nick)
            
            cur = await conn.execute(
                f"UPDATE militares SET {', '.join(set_clauses)} WHERE LOWER(nick) = LOWER(%s) RETURNING nick",
                values
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Militar não encontrado")
            await conn.commit()
            
        logger.info(f"Militar {nick} atualizado por {user.nick}: {campos}")
        return {"ok": True, "message": f"Militar {nick} atualizado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar militar: {e}")
        raise HTTPException(status_code=500, detail="Erro interno")

