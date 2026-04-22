"""
Router de dados do dashboard (home).

Endpoints:
  GET /api/militares          — lista todos os militares (busca, ranking)
  GET /api/militares/{nick}   — busca um militar pelo nick
  GET /api/turnos             — lista turnos (ranking semanal, oficiais do mês)
  GET /api/aulas              — lista aulas (stats)
  GET /api/recrutamentos      — lista recrutamentos (stats)
  GET /api/config             — configurações públicas (destaques, etc.)
  GET /api/listagens          — militares agrupados por corpo (para /listagens)
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from backend.dependencies import get_current_user
from backend.models.auth import UserInfo
from backend.db.pool import get_pool

logger = logging.getLogger("dme.dashboard")

router = APIRouter(tags=["dashboard"])


# ── GET /api/militares ───────────────────────────────────────────────────────

@router.get("/api/militares")
async def listar_militares(user: UserInfo = Depends(get_current_user)):
    """Lista todos os militares do PostgreSQL."""
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    async with pool.connection() as conn:
        cur = await conn.execute(
            """
            SELECT nick, email, patente, corpo, status, tag, created_at,
                   (senha_hash IS NOT NULL AND senha_hash != '') AS is_system_user
            FROM militares
            ORDER BY corpo, patente_ordem, nick
            """
        )
        rows = await cur.fetchall()

    data = [
        {
            "nick":           r[0],
            "email":          r[1],
            "patente":        r[2],
            "corpo":          r[3],
            "status":         r[4],
            "tag":            r[5],
            "created_at":     r[6].isoformat() if r[6] else None,
            "is_system_user": bool(r[7]),
        }
        for r in rows
    ]
    return {"ok": True, "data": data}


# ── GET /api/militares/{nick} ────────────────────────────────────────────────

@router.get("/api/militares/{nick}")
async def buscar_militar(nick: str, user: UserInfo = Depends(get_current_user)):
    """Busca um militar específico pelo nick."""
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    async with pool.connection() as conn:
        cur = await conn.execute(
            """
            SELECT nick, patente, corpo, status, tag, created_at
              FROM militares
             WHERE LOWER(nick) = LOWER(%s)
            """,
            (nick,),
        )
        row = await cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Militar não encontrado")

    return {
        "ok": True,
        "data": {
            "nick":       row[0],
            "patente":    row[1],
            "corpo":      row[2],
            "status":     row[3],
            "tag":        row[4],
            "created_at": row[5].isoformat() if row[5] else None,
        },
    }


# ── GET /api/turnos ──────────────────────────────────────────────────────────

@router.get("/api/turnos")
async def listar_turnos(user: UserInfo = Depends(get_current_user)):
    """Lista turnos registrados (para ranking semanal, oficiais do mês)."""
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    async with pool.connection() as conn:
        cur = await conn.execute(
            """
            SELECT id, nick, entrada, saida, duracao_min, atividade
              FROM turnos
             ORDER BY entrada DESC
            """
        )
        rows = await cur.fetchall()

    data = [
        {
            "id":          r[0],
            "nick":        r[1],
            "entrada":     r[2].isoformat() if r[2] else None,
            "saida":       r[3].isoformat() if r[3] else None,
            "duracao_min": r[4],
            "atividade":   r[5],
        }
        for r in rows
    ]
    return {"ok": True, "data": data}


# ── GET /api/aulas ───────────────────────────────────────────────────────────

@router.get("/api/aulas")
async def listar_aulas(user: UserInfo = Depends(get_current_user)):
    """Lista aulas postadas (para stats do dashboard)."""
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    async with pool.connection() as conn:
        cur = await conn.execute(
            """
            SELECT id, instrutor, titulo, descricao, centro, link, alunos, data
              FROM aulas
             ORDER BY data DESC
            """
        )
        rows = await cur.fetchall()

    data = [
        {
            "id":        r[0],
            "instrutor": r[1],
            "titulo":    r[2],
            "descricao": r[3],
            "centro":    r[4],
            "link":      r[5],
            "alunos":    r[6] or [],
            "data":      r[7].isoformat() if r[7] else None,
        }
        for r in rows
    ]
    return {"ok": True, "data": data}


# ── GET /api/recrutamentos ───────────────────────────────────────────────────

@router.get("/api/recrutamentos")
async def listar_recrutamentos(user: UserInfo = Depends(get_current_user)):
    """Lista recrutamentos realizados (para stats do dashboard)."""
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    async with pool.connection() as conn:
        cur = await conn.execute(
            """
            SELECT id, recrutador, recrutado, corpo, patente_inicial, data
              FROM recrutamentos
             ORDER BY data DESC
            """
        )
        rows = await cur.fetchall()

    data = [
        {
            "id":              r[0],
            "recrutador":      r[1],
            "recrutado":       r[2],
            "corpo":           r[3],
            "patente_inicial": r[4],
            "data":            r[5].isoformat() if r[5] else None,
        }
        for r in rows
    ]
    return {"ok": True, "data": data}


# ── GET /api/config ──────────────────────────────────────────────────────────

_CONFIG_PADRAO = {
    "treinadorDestaque":  "Xandelicado",
    "supervisorDestaque": "rafacv",
}


@router.get("/api/config")
async def obter_config(user: UserInfo = Depends(get_current_user)):
    """Retorna configurações públicas do sistema (destaques, etc.)."""
    return {"ok": True, "data": _CONFIG_PADRAO}


# ── GET /api/listagens ───────────────────────────────────────────────────────

def _row(r):
    return {"nick": r[0], "patente": r[1], "extra": ""}


def _fmt_date(d):
    if not d:
        return "—"
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return f"{d.day} {months[d.month - 1]} {d.year}"


def _row_exo(r):
    nick, tag, motivo, dt1, dt2 = r
    extra = f"[{tag}] {{{motivo}}} - {_fmt_date(dt1)} - {_fmt_date(dt2)}"
    return {"nick": nick, "patente": "Exonerado", "extra": extra}


@router.get("/api/listagens")
async def listar_por_grupo(user: UserInfo = Depends(get_current_user)):
    """
    Retorna militares agrupados por listagem.
    Grupos: militar, empresarial, alto_comando, cadetes, contas_oficiais, exonerados.
    """
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    resultado = {
        "militar": [],
        "empresarial": [],
        "alto_comando": [],
        "cadetes": [],
        "contas_oficiais": [],
        "exonerados": [],
    }

    async with pool.connection() as conn:
        # Militares ativos (por corpo)
        for corpo in ("militar", "empresarial", "alto_comando"):
            cur = await conn.execute(
                """
                SELECT nick, patente FROM militares
                 WHERE status = 'ativo' AND corpo = %s
                 ORDER BY patente_ordem, nick
                """,
                (corpo,),
            )
            rows = await cur.fetchall()
            resultado[corpo] = [_row(r) for r in rows]

        # Cadetes ativos (demitidos ficam fora via status='desativado')
        cur = await conn.execute(
            """
            SELECT nick, patente, tag FROM militares
             WHERE corpo = 'cadetes' AND status = 'ativo'
             ORDER BY nick
            """
        )
        rows = await cur.fetchall()
        resultado["cadetes"] = [
            {"nick": r[0], "patente": r[1], "extra": r[2] or ""} for r in rows
        ]

        # Contas oficiais (órgãos + centros)
        cur = await conn.execute(
            """
            SELECT nick, nome_oficial, categoria, COALESCE(imagem_url, '')
              FROM contas_oficiais
             WHERE ativo = TRUE
             ORDER BY categoria, ordem, nick
            """
        )
        rows = await cur.fetchall()
        resultado["contas_oficiais"] = [
            {"nick": r[0], "patente": r[1], "corpo": r[2], "extra": r[3]}
            for r in rows
        ]

        # Exonerados
        cur = await conn.execute(
            """
            SELECT nick, tag, motivo, data_inicio, data_fim
              FROM exonerados
             ORDER BY data_fim DESC, nick
            """
        )
        rows = await cur.fetchall()
        resultado["exonerados"] = [_row_exo(r) for r in rows]

    return {"ok": True, "data": resultado}
