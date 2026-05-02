"""
Router de Documentos Institucionais.
Endpoints: listar, buscar, criar, editar, excluir.
Armazenamento: tabela 'documentos' no PostgreSQL.
"""

import logging
from uuid import UUID
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from backend.db.pool import get_pool
from backend.dependencies import get_current_user
from backend.models.auth import UserInfo

logger = logging.getLogger("dme.documentos")

router = APIRouter(prefix="/api/documentos", tags=["documentos"])


# ── Modelos ──────────────────────────────────────────────────────────────────

class DocumentoOut(BaseModel):
    id: str
    titulo: str
    categoria: str
    conteudo: str
    source: str
    autor: str
    lastEditor: str
    createdAt: str
    updatedAt: str


class DocumentoCreate(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=256)
    categoria: str = Field(default="triplice", max_length=64)
    conteudo: str = Field(default="")
    source: str = Field(default="", max_length=2048)


class DocumentoUpdate(BaseModel):
    titulo: Optional[str] = Field(None, min_length=1, max_length=256)
    categoria: Optional[str] = Field(None, max_length=64)
    conteudo: Optional[str] = None
    source: Optional[str] = Field(None, max_length=2048)


# ── Helpers ───────────────────────────────────────────────────────────────────

CATEGORIAS_VALIDAS = {"triplice", "apendices", "portarias", "tutoriais"}


def _fmt(ts) -> str:
    """Formata datetime para string legível no padrão brasileiro."""
    if ts is None:
        return ""
    if isinstance(ts, str):
        return ts
    try:
        return ts.strftime("%d/%m/%Y %H:%M")
    except Exception:
        return str(ts)


def _row_to_doc(row) -> DocumentoOut:
    doc_id, titulo, categoria, conteudo, source, autor, last_editor, created_at, updated_at = row
    return DocumentoOut(
        id=str(doc_id),
        titulo=titulo,
        categoria=categoria,
        conteudo=conteudo or "",
        source=source or "",
        autor=autor or "Sistema",
        lastEditor=last_editor or autor or "Sistema",
        createdAt=_fmt(created_at),
        updatedAt=_fmt(updated_at),
    )


# ── GET /api/documentos ───────────────────────────────────────────────────────

@router.get("", response_model=List[DocumentoOut])
async def listar_documentos(categoria: Optional[str] = None):
    """Lista todos os documentos, opcionalmente filtrados por categoria."""
    pool = get_pool()
    if not pool:
        # Sem banco: retorna vazio (frontend usa fallback localStorage)
        return []

    try:
        async with pool.connection() as conn:
            if categoria:
                cur = await conn.execute(
                    """
                    SELECT id, titulo, categoria, conteudo, source,
                           autor, last_editor, created_at, updated_at
                    FROM documentos
                    WHERE categoria = %s
                    ORDER BY updated_at DESC
                    """,
                    (categoria,),
                )
            else:
                cur = await conn.execute(
                    """
                    SELECT id, titulo, categoria, conteudo, source,
                           autor, last_editor, created_at, updated_at
                    FROM documentos
                    ORDER BY updated_at DESC
                    """
                )
            rows = await cur.fetchall()
            return [_row_to_doc(r) for r in rows]
    except Exception as exc:
        logger.error(f"[DOCS] Erro ao listar: {exc}")
        return []


# ── GET /api/documentos/{id} ──────────────────────────────────────────────────

@router.get("/{doc_id}", response_model=DocumentoOut)
async def buscar_documento(doc_id: str):
    """Retorna um documento específico pelo UUID."""
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    try:
        async with pool.connection() as conn:
            cur = await conn.execute(
                """
                SELECT id, titulo, categoria, conteudo, source,
                       autor, last_editor, created_at, updated_at
                FROM documentos
                WHERE id = %s
                """,
                (doc_id,),
            )
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Documento não encontrado")
            return _row_to_doc(row)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[DOCS] Erro ao buscar {doc_id}: {exc}")
        raise HTTPException(status_code=500, detail="Erro interno")


# ── POST /api/documentos ──────────────────────────────────────────────────────

@router.post("", response_model=DocumentoOut, status_code=201)
async def criar_documento(
    body: DocumentoCreate,
    user: UserInfo = Depends(get_current_user),
):
    """Cria um novo documento institucional."""
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    categoria = body.categoria if body.categoria in CATEGORIAS_VALIDAS else "triplice"
    now = datetime.now(timezone.utc)

    try:
        async with pool.connection() as conn:
            cur = await conn.execute(
                """
                INSERT INTO documentos
                    (titulo, categoria, conteudo, source, autor, last_editor, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, titulo, categoria, conteudo, source,
                          autor, last_editor, created_at, updated_at
                """,
                (
                    body.titulo, categoria, body.conteudo, body.source,
                    user.nick, user.nick, now, now,
                ),
            )
            row = await cur.fetchone()
            await conn.commit()
            logger.info(f"[DOCS] Criado: '{body.titulo}' por {user.nick}")
            return _row_to_doc(row)
    except Exception as exc:
        logger.error(f"[DOCS] Erro ao criar: {exc}")
        raise HTTPException(status_code=500, detail="Erro ao salvar documento")


# ── PUT /api/documentos/{id} ──────────────────────────────────────────────────

@router.put("/{doc_id}", response_model=DocumentoOut)
async def editar_documento(
    doc_id: str,
    body: DocumentoUpdate,
    user: UserInfo = Depends(get_current_user),
):
    """Edita um documento existente. Apenas campos enviados são alterados."""
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    now = datetime.now(timezone.utc)
    fields = []
    values = []

    if body.titulo is not None:
        fields.append("titulo = %s")
        values.append(body.titulo)
    if body.categoria is not None:
        cat = body.categoria if body.categoria in CATEGORIAS_VALIDAS else "triplice"
        fields.append("categoria = %s")
        values.append(cat)
    if body.conteudo is not None:
        fields.append("conteudo = %s")
        values.append(body.conteudo)
    if body.source is not None:
        fields.append("source = %s")
        values.append(body.source)

    if not fields:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    fields.append("last_editor = %s")
    values.append(user.nick)
    fields.append("updated_at = %s")
    values.append(now)
    values.append(doc_id)

    try:
        async with pool.connection() as conn:
            cur = await conn.execute(
                f"""
                UPDATE documentos SET {', '.join(fields)}
                WHERE id = %s
                RETURNING id, titulo, categoria, conteudo, source,
                          autor, last_editor, created_at, updated_at
                """,
                values,
            )
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Documento não encontrado")
            await conn.commit()
            logger.info(f"[DOCS] Editado: {doc_id} por {user.nick}")
            return _row_to_doc(row)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[DOCS] Erro ao editar {doc_id}: {exc}")
        raise HTTPException(status_code=500, detail="Erro ao editar documento")


# ── DELETE /api/documentos/{id} ───────────────────────────────────────────────

@router.delete("/{doc_id}", status_code=204)
async def excluir_documento(
    doc_id: str,
    user: UserInfo = Depends(get_current_user),
):
    """Exclui um documento pelo UUID."""
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    try:
        async with pool.connection() as conn:
            cur = await conn.execute(
                "DELETE FROM documentos WHERE id = %s RETURNING id",
                (doc_id,),
            )
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Documento não encontrado")
            await conn.commit()
            logger.info(f"[DOCS] Excluído: {doc_id} por {user.nick}")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[DOCS] Erro ao excluir {doc_id}: {exc}")
        raise HTTPException(status_code=500, detail="Erro ao excluir documento")
