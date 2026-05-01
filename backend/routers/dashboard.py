"""
Router de dados do dashboard (home).

Endpoints com Cache:
  GET /api/militares
  GET /api/listagens
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from backend.dependencies import get_current_user
from backend.models.auth import UserInfo
from backend.db.pool import get_pool
from backend.utils.cache import cache

logger = logging.getLogger("dme.dashboard")

router = APIRouter(tags=["dashboard"])


# ── GET /api/militares ───────────────────────────────────────────────────────

@router.get("/api/militares")
async def listar_militares(user: UserInfo = Depends(get_current_user)):
    """Lista todos os militares do PostgreSQL (com Cache)."""
    cached_data = cache.get("militares_all")
    if cached_data:
        return {"ok": True, "data": cached_data, "cached": True}

    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    async with pool.connection() as conn:
        cur = await conn.execute(
            """
            SELECT m.nick, u.email, m.patente, m.corpo, u.status, m.tag, m.created_at,
                   (u.senha_hash IS NOT NULL AND u.senha_hash != '') AS is_system_user,
                   u.role
            FROM militares m
            LEFT JOIN usuarios u ON LOWER(m.nick) = LOWER(u.nick)
            ORDER BY m.corpo, m.patente_ordem, m.nick
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
            "role":           r[8] or "user",
        }
        for r in rows
    ]
    
    cache.set("militares_all", data, ttl=300) # 5 minutos
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
            SELECT m.nick, m.patente, m.corpo, u.status, m.tag, m.created_at
              FROM militares m
              JOIN usuarios u ON m.nick = u.nick
             WHERE LOWER(m.nick) = LOWER(%s)
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
    """Lista turnos registrados."""
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    async with pool.connection() as conn:
        cur = await conn.execute(
            "SELECT id, nick, entrada, saida, duracao_min, atividade FROM turnos ORDER BY entrada DESC"
        )
        rows = await cur.fetchall()

    data = [{"id": r[0], "nick": r[1], "entrada": r[2].isoformat() if r[2] else None, "saida": r[3].isoformat() if r[3] else None, "duracao_min": r[4], "atividade": r[5]} for r in rows]
    return {"ok": True, "data": data}


# ── GET /api/config ──────────────────────────────────────────────────────────

_CONFIG_PADRAO = {
    "treinadorDestaque":  "Xandelicado",
    "supervisorDestaque": "rafacv",
}

@router.get("/api/config")
async def obter_config(user: UserInfo = Depends(get_current_user)):
    return {"ok": True, "data": _CONFIG_PADRAO}


# ── GET /api/aulas ───────────────────────────────────────────────────────────

@router.get("/api/aulas")
async def listar_aulas(user: UserInfo = Depends(get_current_user)):
    """Placeholder para lista de aulas."""
    return {"ok": True, "data": []}


# ── GET /api/recrutamentos ───────────────────────────────────────────────────

@router.get("/api/recrutamentos")
async def listar_recrutamentos_dashboard(user: UserInfo = Depends(get_current_user)):
    """Placeholder para lista de recrutamentos recentes no dashboard."""
    return {"ok": True, "data": []}


# ── GET /api/listagens ───────────────────────────────────────────────────────

def _row(r):
    return {"nick": r[0], "patente": r[1], "extra": ""}

def _fmt_date(d):
    if not d: return "—"
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return f"{d.day} {months[d.month - 1]} {d.year}"

def _row_exo(r):
    nick, tag, motivo, dt1, dt2 = r
    extra = f"[{tag}] {{{motivo}}} - {_fmt_date(dt1)} - {_fmt_date(dt2)}"
    return {"nick": nick, "patente": "Exonerado", "extra": extra}


@router.get("/api/listagens")
async def listar_por_grupo(user: UserInfo = Depends(get_current_user)):
    """Retorna militares agrupados por listagem (com Cache)."""
    cached_data = cache.get("listagens_all")
    if cached_data:
        return {"ok": True, "data": cached_data, "cached": True}

    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    resultado = {
        "militar": [], "empresarial": [], "alto_comando": [],
        "cadetes": [], "contas_oficiais": [], "exonerados": [],
    }

    async with pool.connection() as conn:
        # Listagem pública esconde apenas quem foi desligado/banido explicitamente.
        # Militares seedados (sem conta em `usuarios`) continuam visíveis — a conta
        # no sistema é opcional para aparecer na listagem do RPG.
        for corpo in ("militar", "empresarial", "alto_comando"):
            cur = await conn.execute(
                """
                SELECT m.nick, m.patente
                  FROM militares m
                  LEFT JOIN usuarios u ON LOWER(m.nick) = LOWER(u.nick)
                 WHERE m.corpo = %s
                   AND (u.status IS NULL OR u.status NOT IN ('desativado', 'banido'))
                 ORDER BY m.patente_ordem, m.nick
                """,
                (corpo,),
            )
            rows = await cur.fetchall()
            resultado[corpo] = [_row(r) for r in rows]

        cur = await conn.execute(
            """
            SELECT m.nick, m.patente, m.tag
              FROM militares m
              LEFT JOIN usuarios u ON LOWER(m.nick) = LOWER(u.nick)
             WHERE m.corpo = 'cadetes'
               AND (u.status IS NULL OR u.status NOT IN ('desativado', 'banido'))
             ORDER BY m.nick
            """
        )
        rows = await cur.fetchall()
        resultado["cadetes"] = [{"nick": r[0], "patente": r[1], "extra": r[2] or ""} for r in rows]

        cur = await conn.execute("SELECT nick, nome_oficial, categoria, COALESCE(imagem_url, '') FROM contas_oficiais WHERE ativo = TRUE ORDER BY categoria, ordem, nick")
        rows = await cur.fetchall()
        resultado["contas_oficiais"] = [{"nick": r[0], "patente": r[1], "corpo": r[2], "extra": r[3]} for r in rows]

        cur = await conn.execute("SELECT nick, tag, motivo, data_inicio, data_fim FROM exonerados ORDER BY data_fim DESC, nick")
        rows = await cur.fetchall()
        resultado["exonerados"] = [_row_exo(r) for r in rows]

    cache.set("listagens_all", resultado, ttl=300)
    return {"ok": True, "data": resultado}
