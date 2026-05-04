"""
Router de autenticação.
Endpoints: login, register, logout, me.
"""

import logging
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse

from backend.config import get_settings
from backend.models.auth import (
    LoginRequest, RegisterRequest, AuthResponse, UserInfo, VerifyRequest, UpdateProfileRequest
)
from backend.services.auth_service import hash_password, verify_password, create_jwt
from backend.services.listagem_service import patente_ordem, detectar_corpo
from backend.db.pool import get_pool
from backend.dependencies import get_current_user

logger = logging.getLogger("dme.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── POST /api/auth/login ─────────────────────────────
@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    """Autentica o usuário contra a tabela 'usuarios' e seta o cookie JWT."""
    settings = get_settings()
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    async with pool.connection() as conn:
        # A. Buscar dados de autenticação
        cur = await conn.execute(
            "SELECT nick, senha_hash, status, role FROM usuarios WHERE LOWER(nick) = LOWER(%s)",
            (body.nick,),
        )
        row = await cur.fetchone()

        if not row:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")

        nick_db, senha_hash, user_status, role_db = row

        if not verify_password(body.password, senha_hash):
            raise HTTPException(status_code=401, detail="Senha incorreta")

        user_status = (user_status or "ativo").lower()
        if user_status != "ativo":
            mensagens = {
                "pendente": "Sua conta está aguardando aprovação administrativa.",
                "pendente_missao": "Você ainda não verificou sua missão no Habbo.",
                "pendente_aprovacao": "Sua verificação de missão foi concluída! Aguarde agora a aprovação de um administrador.",
                "desativado": "Sua conta foi desativada. Entre em contato com a administração.",
                "banido": "Sua conta foi banida. Entre em contato se achar que houve engano.",
            }
            detail = mensagens.get(user_status, "Acesso negado. Conta não está ativa.")
            raise HTTPException(status_code=403, detail=detail)

        # B. Buscar centros vinculados (Autorização)
        cur = await conn.execute(
            "SELECT centro FROM usuario_centros WHERE LOWER(nick) = LOWER(%s)",
            (nick_db,),
        )
        centros_rows = await cur.fetchall()
        centros = [r[0] for r in centros_rows]

    # Role é definida estritamente pelo banco de dados
    role = "admin" if role_db == "admin" else "user"
    
    # Injeta 'centros' no JWT
    token = create_jwt(nick_db, role, centros)

    response = JSONResponse(content={"ok": True, "message": "Login realizado com sucesso"})
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.COOKIE_MAX_AGE,
        path="/",
    )

    logger.info(f"Login OK: {nick_db} (role={role}, centros={centros})")
    return response


# ── POST /api/auth/register ──────────────────────────
@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterRequest):
    """
    Registra um novo usuário no sistema com status 'pendente'.
    """
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    patente_inicial = "Recruta"
    corpo_inicial = detectar_corpo(patente_inicial)
    senha = hash_password(body.password)
    now = datetime.now(timezone.utc)

    async with pool.connection() as conn:
        # 1. Verificar se usuário já existe em 'usuarios'
        cur = await conn.execute(
            "SELECT nick FROM usuarios WHERE LOWER(nick) = LOWER(%s)",
            (body.nick,),
        )
        if await cur.fetchone():
            raise HTTPException(status_code=409, detail="Este nome de usuário já está em uso")

        # 2. Criar em 'usuarios' (status pendente_missao até verificar Habbo)
        await conn.execute(
            """
            INSERT INTO usuarios (nick, email, senha_hash, role, status, created_at)
            VALUES (%s, %s, %s, 'user', 'pendente_missao', %s)
            """,
            (body.nick, body.email, senha, now),
        )

        # 3. Sincronizar com 'militares'
        cur = await conn.execute(
            "SELECT nick FROM militares WHERE LOWER(nick) = LOWER(%s)",
            (body.nick,),
        )
        existente = await cur.fetchone()

        if not existente:
            await conn.execute(
                """
                INSERT INTO militares (nick, patente, patente_ordem, corpo, status, tag, created_at)
                VALUES (%s, %s, %s, %s, 'pendente_missao', 'DME', %s)
                """,
                (
                    body.nick, patente_inicial, patente_ordem(patente_inicial), 
                    corpo_inicial, now,
                ),
            )
        else:
            # Se já existe (ex: criado por promotor), atualiza email/senha e status
            await conn.execute(
                """
                UPDATE militares SET email = %s, senha_hash = %s, status = 'pendente_missao'
                WHERE LOWER(nick) = LOWER(%s)
                """,
                (body.email, senha, body.nick),
            )
        
        await conn.commit()

    logger.info(f"Registro OK: {body.nick} (status=pendente)")
    return AuthResponse(ok=True, message="Cadastro realizado! Agora você precisa verificar sua identidade.")


# ── POST /api/auth/verify ──────────────────────────
@router.post("/verify", response_model=AuthResponse)
async def verify_habbo(body: VerifyRequest):
    """Verifica se o nick do usuário no Habbo contém o código na missão."""
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    # 1. Verificar se usuário existe e está pendente
    async with pool.connection() as conn:
        cur = await conn.execute(
            "SELECT status FROM usuarios WHERE LOWER(nick) = LOWER(%s)",
            (body.nick,),
        )
        row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Usuário não cadastrado.")
        
        if row[0] == "ativo":
            return AuthResponse(ok=True, message="Usuário já está ativo.")
        if row[0] in ("banido", "desativado"):
            raise HTTPException(status_code=403, detail="Esta conta está banida ou desativada.")

    # 2. Chamar API do Habbo
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # Usamos a API pública do Habbo para pegar a missão (motto)
            res = await client.get(
                f"https://www.habbo.com.br/api/public/users?name={body.nick}",
                headers={"User-Agent": "DME-System/2.0"}
            )
            if res.status_code == 404:
                raise HTTPException(status_code=404, detail="Nick não encontrado no Habbo Hotel.")
            if res.status_code != 200:
                raise HTTPException(status_code=502, detail="Erro ao consultar Habbo (API indisponível).")
            
            data = res.json()
            motto = data.get("motto", "")
            
            if body.code not in motto:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Código não encontrado na sua missão. Atual: '{motto}'"
                )
        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="Erro de conexão com o Habbo.")

    # 3. SUCESSO: Mudar para pendente_aprovacao (aguardando admin)
    async with pool.connection() as conn:
        await conn.execute("UPDATE usuarios SET status = 'pendente_aprovacao' WHERE LOWER(nick) = LOWER(%s)", (body.nick,))
        await conn.execute("UPDATE militares SET status = 'pendente_aprovacao' WHERE LOWER(nick) = LOWER(%s)", (body.nick,))
        await conn.commit()

    logger.info(f"Verificação OK: {body.nick} validado via Habbo (pendente_aprovacao)")
    return AuthResponse(ok=True, message="Sucesso! Sua identidade foi verificada. Agora aguarde a aprovação de um administrador para acessar o sistema.")


# ── POST /api/auth/logout ────────────────────────────
@router.post("/logout", response_model=AuthResponse)
async def logout():
    """Remove o cookie JWT, encerrando a sessão."""
    settings = get_settings()
    response = JSONResponse(content={"ok": True, "message": "Logout realizado"})
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path="/",
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )
    return response


# ── GET /api/auth/me ─────────────────────────────────
@router.get("/me", response_model=UserInfo)
async def me(user: UserInfo = Depends(get_current_user)):
    """Retorna os dados do usuário autenticado."""
    return user


# ── PUT /api/auth/profile ──────────────────────────
@router.put("/profile", response_model=AuthResponse)
async def update_profile(body: UpdateProfileRequest, user: UserInfo = Depends(get_current_user)):
    """Atualiza e-mail e/ou senha do usuário logado."""
    pool = get_pool()
    if not pool:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível")

    async with pool.connection() as conn:
        # 1. Validar senha atual
        cur = await conn.execute(
            "SELECT senha_hash FROM usuarios WHERE LOWER(nick) = LOWER(%s)",
            (user.nick,),
        )
        row = await cur.fetchone()
        if not row or not verify_password(body.senha_atual, row[0]):
            raise HTTPException(status_code=401, detail="Senha atual incorreta.")

        # 2. Preparar campos para atualizar
        updates = []
        params = []

        if body.email:
            updates.append("email = %s")
            params.append(body.email)
        
        if body.nova_senha:
            updates.append("senha_hash = %s")
            params.append(hash_password(body.nova_senha))

        if not updates:
            return AuthResponse(ok=True, message="Nenhuma alteração enviada.")

        params.append(user.nick)
        sql_usuarios = f"UPDATE usuarios SET {', '.join(updates)} WHERE LOWER(nick) = LOWER(%s)"
        sql_militares = f"UPDATE militares SET {', '.join(updates)} WHERE LOWER(nick) = LOWER(%s)"

        # 3. Executar updates
        await conn.execute(sql_usuarios, params)
        await conn.execute(sql_militares, params)
        await conn.commit()

    logger.info(f"Perfil atualizado: {user.nick}")
    return AuthResponse(ok=True, message="Dados atualizados com sucesso!")
