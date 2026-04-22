"""
Serviço de listagem PostgreSQL.

Responsabilidade: quando um requerimento é aprovado, atualizar as tabelas
de listagem de forma transacional. Se o banco estiver indisponível, loga
o erro sem derrubar o request (degradação graciosa).
"""

import logging
from datetime import datetime, timezone
from typing import Any

from backend.db.pool import get_pool

logger = logging.getLogger("dme.listagem")

# ── Hierarquia de patentes ────────────────────────────────────────────────────
# Índice baixo = posto mais alto.

_ORDEM_ALTO_COMANDO = ["Fundador", "Supremo", "Supremo Interino"]

_ORDEM_MILITAR = [
    "Comandante-Geral", "Comandante", "Subcomandante", "Marechal", "General",
    "Coronel", "Tenente-Coronel", "Major", "Capitão", "Tenente",
    "Aspirante a Oficial", "Subtenente", "Sargento", "Cabo", "Soldado",
]

_ORDEM_EMPRESARIAL = [
    "Chanceler", "Presidente", "Vice-Presidente", "Ministro", "Comissário",
    "Delegado", "Executivo", "Diretor", "Coordenador", "Supervisor",
    "Escrivão", "Analista", "Inspetor", "Sócio", "Agente",
]

_ORDEM_IDX: dict[str, int] = {
    # Alto comando ganha valores negativos para ficar no topo absoluto
    **{p: (i - 100) for i, p in enumerate(_ORDEM_ALTO_COMANDO)},
    **{p: i for i, p in enumerate(_ORDEM_MILITAR)},
    **{p: i for i, p in enumerate(_ORDEM_EMPRESARIAL)},
}


def patente_ordem(patente: str) -> int:
    return _ORDEM_IDX.get(patente, 999)


def detectar_corpo(patente: str, tipo_req: str = "") -> str:
    """Decide o valor da coluna 'corpo' com base na patente ou tipo de requerimento."""
    p = (patente or "").strip()
    if p in _ORDEM_ALTO_COMANDO:
        return "alto_comando"
    if p == "Cadete" or tipo_req == "cadetes":
        return "cadetes"
    if p in _ORDEM_EMPRESARIAL:
        return "empresarial"
    return "militar"


def _parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


# ── Upsert de militar ─────────────────────────────────────────────────────────

async def upsert_militar(conn, militar: dict[str, Any]) -> None:
    """Insere ou atualiza um militar. Usado por scripts de seed e por aprovações."""
    await conn.execute(
        """
        INSERT INTO militares (nick, email, senha_hash, patente, patente_ordem,
                               corpo, status, role, tag, banido_ate, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (nick) DO UPDATE SET
            patente       = EXCLUDED.patente,
            patente_ordem = EXCLUDED.patente_ordem,
            corpo         = EXCLUDED.corpo,
            status        = EXCLUDED.status,
            role          = EXCLUDED.role,
            tag           = EXCLUDED.tag,
            banido_ate    = EXCLUDED.banido_ate
        """,
        (
            militar["nick"],
            militar.get("email"),
            militar.get("senha_hash", ""),
            militar["patente"],
            patente_ordem(militar["patente"]),
            militar.get("corpo", "militar"),
            militar.get("status", "ativo"),
            militar.get("role", "user"),
            militar.get("tag", "DME"),
            _parse_dt(militar.get("banido_ate")),
            _parse_dt(militar.get("created_at")) or datetime.now(timezone.utc),
        ),
    )


# ── Lógica de aprovação ───────────────────────────────────────────────────────

async def aplicar_aprovacao(req: dict[str, Any], militar_atual: dict[str, Any] | None) -> None:
    """
    Persiste os efeitos de um requerimento aprovado nas tabelas de listagem.
    Chamado pelo router de requerimentos após alterar o status para 'aprovado'.
    """
    pool = get_pool()
    if pool is None:
        logger.warning("PostgreSQL indisponível — aprovação não persistida: req_id=%s", req.get("id"))
        return

    tipo = req.get("tipo", "")

    try:
        async with pool.connection() as conn:
            if tipo in ("promocao", "rebaixamento"):
                await _aplicar_mudanca_patente(conn, req)
            elif tipo in ("entrada", "cadetes", "contrato"):
                await _aplicar_entrada(conn, req, militar_atual)
            elif tipo in ("demissao", "exoneracao"):
                await _aplicar_desligamento(conn, req)
            elif tipo == "transferencia":
                await _aplicar_transferencia(conn, req)
            elif tipo == "banido":
                await _aplicar_banimento(conn, req)

            await conn.commit()

        logger.info("Aprovação persistida no PostgreSQL: tipo=%s req_id=%s", tipo, req.get("id"))

    except Exception as exc:
        logger.error("Erro ao persistir aprovação no PostgreSQL: %s", exc, exc_info=True)


# ── Handlers por tipo ─────────────────────────────────────────────────────────

async def _aplicar_mudanca_patente(conn, req: dict) -> None:
    nova_patente = req.get("novaPatente")
    if not nova_patente:
        logger.warning("Requerimento de promoção/rebaixamento sem novaPatente: %s", req.get("id"))
        return

    corpo = detectar_corpo(nova_patente, req.get("tipo", ""))
    for nick in req.get("tags_envolvidos") or []:
        await conn.execute(
            """
            UPDATE militares
               SET patente = %s, patente_ordem = %s, corpo = %s
             WHERE LOWER(nick) = LOWER(%s)
            """,
            (nova_patente, patente_ordem(nova_patente), corpo, nick),
        )


async def _aplicar_entrada(conn, req: dict, militar: dict | None) -> None:
    """
    Ativa (ou cria) militares listados em tags_envolvidos.
    Se o militar ainda não existe no banco, cria um registro "shell" sem
    email/senha — o usuário completa esses dados ao se registrar.
    """
    tipo = req.get("tipo", "")
    nova_patente = req.get("novaPatente")
    corpo = detectar_corpo(nova_patente or "", tipo)
    patente_final = nova_patente or (militar.get("patente") if militar else None) or "Soldado"
    ordem_final = patente_ordem(patente_final)

    for nick in req.get("tags_envolvidos") or []:
        await conn.execute(
            """
            INSERT INTO militares (nick, email, senha_hash, patente, patente_ordem, corpo, status)
            VALUES (%s, NULL, '', %s, %s, %s, 'ativo')
            ON CONFLICT (nick) DO UPDATE SET
                patente       = EXCLUDED.patente,
                patente_ordem = EXCLUDED.patente_ordem,
                corpo         = EXCLUDED.corpo,
                status        = 'ativo'
            """,
            (nick, patente_final, ordem_final, corpo),
        )

    if tipo == "contrato":
        for nick in req.get("tags_envolvidos") or []:
            await conn.execute(
                """
                INSERT INTO recrutamentos (recrutador, recrutado, corpo, patente_inicial)
                VALUES (%s, %s, %s, %s)
                """,
                (req.get("aplicador"), nick, corpo, patente_final),
            )


async def _aplicar_desligamento(conn, req: dict) -> None:
    for nick in req.get("tags_envolvidos") or []:
        await conn.execute(
            "UPDATE militares SET status = 'desativado' WHERE LOWER(nick) = LOWER(%s)",
            (nick,),
        )


async def _aplicar_transferencia(conn, req: dict) -> None:
    nova_patente = req.get("novaPatente")
    if not nova_patente:
        return
    for nick in req.get("tags_envolvidos") or []:
        await conn.execute(
            """
            UPDATE militares
               SET patente = %s, patente_ordem = %s
             WHERE LOWER(nick) = LOWER(%s)
            """,
            (nova_patente, patente_ordem(nova_patente), nick),
        )


async def _aplicar_banimento(conn, req: dict) -> None:
    banido_ate = _parse_dt(req.get("banido_ate"))
    for nick in req.get("tags_envolvidos") or []:
        await conn.execute(
            "UPDATE militares SET status = 'banido', banido_ate = %s WHERE LOWER(nick) = LOWER(%s)",
            (banido_ate, nick),
        )
