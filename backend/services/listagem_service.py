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
    """Insere ou atualiza um militar. Sincroniza 'usuarios' e 'militares'."""
    nick = militar["nick"]
    patente = militar["patente"]
    
    # 1. Upsert em USUARIOS
    await conn.execute(
        """
        INSERT INTO usuarios (nick, email, senha_hash, role, status, banido_ate, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (nick) DO UPDATE SET
            email      = EXCLUDED.email,
            role       = EXCLUDED.role,
            status     = EXCLUDED.status,
            banido_ate = EXCLUDED.banido_ate
        """,
        (
            nick,
            militar.get("email"),
            militar.get("senha_hash", ""),
            militar.get("role", "user"),
            militar.get("status", "ativo"),
            _parse_dt(militar.get("banido_ate")),
            _parse_dt(militar.get("created_at")) or datetime.now(timezone.utc),
        ),
    )

    # 2. Upsert em MILITARES
    await conn.execute(
        """
        INSERT INTO militares (nick, patente, patente_ordem, corpo, tag)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (nick) DO UPDATE SET
            patente       = EXCLUDED.patente,
            patente_ordem = EXCLUDED.patente_ordem,
            corpo         = EXCLUDED.corpo,
            tag           = EXCLUDED.tag
        """,
        (
            nick,
            patente,
            patente_ordem(patente),
            militar.get("corpo", detectar_corpo(patente)),
            militar.get("tag", "DME"),
        ),
    )


# ── Lógica de aprovação ───────────────────────────────────────────────────────

async def aplicar_aprovacao(req: dict[str, Any], militar_atual: dict[str, Any] | None) -> None:
    """
    Persiste os efeitos de um requerimento aprovado nas tabelas de listagem.
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
            elif tipo == "remover_cadete":
                await _aplicar_remover_cadete(conn, req)
            elif tipo in ("demissao", "exoneracao"):
                await _aplicar_desligamento(conn, req)
            elif tipo == "transferencia":
                await _aplicar_transferencia(conn, req)
            elif tipo == "banido":
                await _aplicar_banimento(conn, req)

            await conn.commit()

        logger.info("Aprovação persistida no PostgreSQL: tipo=%s req_id=%s", tipo, req.get("id"))
        
        # Invalida cache de listagem para que as mudanças apareçam na hora
        from backend.utils.cache import cache
        cache.invalidate()

    except Exception as exc:
        logger.error("Erro ao persistir aprovação no PostgreSQL: %s", exc, exc_info=True)


# ── Handlers por tipo ─────────────────────────────────────────────────────────

async def _aplicar_mudanca_patente(conn, req: dict) -> None:
    nova_patente = req.get("novaPatente")
    if not nova_patente:
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
    tipo = req.get("tipo", "")
    nova_patente = req.get("novaPatente")
    corpo = detectar_corpo(nova_patente or "", tipo)
    patente_final = nova_patente or (militar.get("patente") if militar else None) or "Soldado"
    ordem_final = patente_ordem(patente_final)

    for nick in req.get("tags_envolvidos") or []:
        # 1. Garantir registro em 'usuarios' (sem senha por enquanto)
        await conn.execute(
            "INSERT INTO usuarios (nick, senha_hash) VALUES (%s, '') ON CONFLICT (nick) DO NOTHING",
            (nick,),
        )

        # 2. Se é ingresso de Cadete e o militar já existia em outro corpo,
        #    preserva a patente atual em `patente_anterior` para permitir
        #    restauração via "remover_cadete".
        patente_anterior_sql = ""
        patente_anterior_val: list = []
        if tipo == "cadetes":
            row = await (await conn.execute(
                "SELECT patente, corpo FROM militares WHERE LOWER(nick) = LOWER(%s)",
                (nick,),
            )).fetchone()
            if row and row[1] != "cadetes":
                patente_anterior_sql = ", patente_anterior = %s"
                patente_anterior_val = [row[0]]

        # 3. Ativar/Criar em 'militares'
        await conn.execute(
            f"""
            INSERT INTO militares (nick, patente, patente_ordem, corpo)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (nick) DO UPDATE SET
                patente       = EXCLUDED.patente,
                patente_ordem = EXCLUDED.patente_ordem,
                corpo         = EXCLUDED.corpo
                {patente_anterior_sql}
            """,
            (nick, patente_final, ordem_final, corpo, *patente_anterior_val),
        )
        # 4. Marcar usuario como ativo
        await conn.execute("UPDATE usuarios SET status = 'ativo' WHERE LOWER(nick) = LOWER(%s)", (nick,))

    if tipo == "contrato":
        for nick in req.get("tags_envolvidos") or []:
            await conn.execute(
                """
                INSERT INTO recrutamentos (recrutador, recrutado, corpo, patente_inicial)
                VALUES (%s, %s, %s, %s)
                """,
                (req.get("aplicador"), nick, corpo, patente_final),
            )


async def _aplicar_remover_cadete(conn, req: dict) -> None:
    """Restaura a patente anterior de um cadete. Remove da listagem de cadetes."""
    for nick in req.get("tags_envolvidos") or []:
        row = await (await conn.execute(
            "SELECT patente_anterior, corpo FROM militares WHERE LOWER(nick) = LOWER(%s)",
            (nick,),
        )).fetchone()
        if not row:
            logger.warning("remover_cadete: nick não encontrado: %s", nick)
            continue

        patente_anterior, corpo_atual = row[0], row[1]
        if corpo_atual != "cadetes":
            logger.warning("remover_cadete: %s não está em cadetes (corpo=%s)", nick, corpo_atual)
            continue

        if patente_anterior:
            # Restaura patente pré-Cadete
            novo_corpo = detectar_corpo(patente_anterior)
            await conn.execute(
                """
                UPDATE militares
                   SET patente          = %s,
                       patente_ordem    = %s,
                       corpo            = %s,
                       patente_anterior = NULL
                 WHERE LOWER(nick) = LOWER(%s)
                """,
                (patente_anterior, patente_ordem(patente_anterior), novo_corpo, nick),
            )
        else:
            # Sem histórico: remove da listagem (status=desativado).
            await conn.execute(
                "UPDATE usuarios SET status = 'desativado' WHERE LOWER(nick) = LOWER(%s)",
                (nick,),
            )


async def _aplicar_desligamento(conn, req: dict) -> None:
    for nick in req.get("tags_envolvidos") or []:
        await conn.execute(
            "UPDATE usuarios SET status = 'desativado' WHERE LOWER(nick) = LOWER(%s)",
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
            "UPDATE usuarios SET status = 'banido', banido_ate = %s WHERE LOWER(nick) = LOWER(%s)",
            (banido_ate, nick),
        )
