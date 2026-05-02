from fastapi import FastAPI, Request, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exception_handlers import http_exception_handler
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from contextlib import asynccontextmanager
from pathlib import Path
import logging
import sys

# psycopg3 não suporta ProactorEventLoop (padrão do Windows).
# Forçar SelectorEventLoop antes do uvicorn criar o loop.
if sys.platform == "win32":
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from backend.config import get_settings
from backend.routers.auth import router as auth_router
from backend.routers.requirements import router as requerimentos_router
from backend.routers.dashboard import router as dashboard_router
from backend.routers.documentos import router as documentos_router
from backend.dependencies import get_current_user, get_current_admin
from backend.models.auth import UserInfo
from backend.db import pool as db_pool

# ── Login
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("dme")

# ── Validar configuração
settings = get_settings()
settings.validate()


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await db_pool.init_pool()
    yield
    await db_pool.close_pool()


# ── App
app = FastAPI(
    title="DME System",
    description="Sistema de RPG policial do DME no Habbo Hotel.",
    version="2.0.0",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)


# ── Middleware: Headers de Segurança
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adiciona headers de segurança em todas as respostas."""

    _CSP = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' https://www.habbo.com.br https: data:; "
        "connect-src 'self' https://www.habbo.com.br; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self';"
    )

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = self._CSP

        if not settings.DEV_MODE:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        return response


# ── Middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent

# ── Static files ──────────────────────────────────────────────────────────────
app.mount("/styles",  StaticFiles(directory=str(BASE_DIR / "static/styles")),  name="styles")
app.mount("/scripts", StaticFiles(directory=str(BASE_DIR / "static/scripts")), name="scripts")

# ── Templates ─────────────────────────────────────────────────────────────────
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# ── Registrar routers ────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(requerimentos_router)
app.include_router(dashboard_router)
app.include_router(documentos_router)

# ── Tratamento global de erros ────────────────────────────────────────────────
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Loga qualquer erro HTTP.
    Só redireciona 404 -> /login para páginas HTML (não para /api/* nem /scripts/* ou /styles/*).
    """
    logger.warning(f"HTTP {exc.status_code} em {request.url.path}")
    path = request.url.path
    is_api_or_asset = path.startswith("/api/") or path.startswith("/scripts/") or path.startswith("/styles/")
    if exc.status_code == 404 and not is_api_or_asset:
        return RedirectResponse(url="/login")
    return await http_exception_handler(request, exc)


# ── Helpers internos ──────────────────────────────────────────────────────────
def _render(template: str):
    """Atalho para criar rotas que apenas servem um template (páginas públicas)."""
    async def handler(request: Request) -> HTMLResponse:
        return templates.TemplateResponse(template, {"request": request})
    handler.__name__ = template.replace(".html", "")
    return handler


def _render_protected(template: str):
    """
    Atalho para rotas protegidas: valida o cookie JWT antes de servir o template.
    Se não autenticado, redireciona para /login.
    Em DEV_MODE, pula a autenticação e injeta usuário de teste.
    """
    from backend.services.auth_service import decode_jwt

    async def handler(request: Request) -> HTMLResponse:
        if settings.DEV_MODE:
            return templates.TemplateResponse(template, {
                "request": request,
                "user_nick": "dev",
                "user_role": "admin",
            })

        token = request.cookies.get(settings.COOKIE_NAME)
        if not token:
            return RedirectResponse(url="/login")

        payload = decode_jwt(token)
        if payload is None:
            return RedirectResponse(url="/login")

        return templates.TemplateResponse(template, {
            "request": request,
            "user_nick": payload.get("sub", ""),
            "user_role": payload.get("role", "user"),
        })

    handler.__name__ = template.replace(".html", "") + "_protected"
    return handler


def _render_admin(template: str):
    """
    Atalho para rotas de admin: exige role 'admin' no JWT.
    Em DEV_MODE, pula a autenticação e injeta admin de teste.
    """
    from backend.services.auth_service import decode_jwt

    async def handler(request: Request) -> HTMLResponse:
        if settings.DEV_MODE:
            return templates.TemplateResponse(template, {
                "request": request,
                "user_nick": "dev",
                "user_role": "admin",
            })

        token = request.cookies.get(settings.COOKIE_NAME)
        if not token:
            return RedirectResponse(url="/login")

        payload = decode_jwt(token)
        if payload is None:
            return RedirectResponse(url="/login")

        nick = payload.get("sub", "")
        role = payload.get("role", "user")
        is_admin = (role == "admin")

        if not is_admin:
            return RedirectResponse(url="/home")

        return templates.TemplateResponse(template, {
            "request": request,
            "user_nick": nick,
            "user_role": "admin",
        })

    handler.__name__ = template.replace(".html", "") + "_admin"
    return handler


# ── Rotas
@app.get("/", response_class=RedirectResponse, include_in_schema=False)
async def root():
    if settings.DEV_MODE:
        return RedirectResponse(url="/home")
    return RedirectResponse(url="/login")

# ── Páginas públicas
@app.get("/login", response_class=HTMLResponse, include_in_schema=False)
async def login_page(request: Request):
    if settings.DEV_MODE:
        return RedirectResponse(url="/home")
    return templates.TemplateResponse("login.html", {"request": request})
app.add_api_route("/verificacao", _render("verificacao.html"), methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/setup_admin", _render("setup_admin.html"), methods=["GET"], response_class=HTMLResponse)

# ── Páginas protegidas
app.add_api_route("/home",         _render_protected("home.html"),         methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/perfil",       _render_protected("perfil.html"),       methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/meu_perfil",   _render_protected("meu_perfil.html"),   methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/configuracao", _render_protected("configuracao.html"), methods=["GET"], response_class=HTMLResponse)

# Serviços e operações
app.add_api_route("/requerimentos",      _render_protected("requerimentos.html"),      methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/ponto_servico",      _render_protected("ponto_servico.html"),      methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/postar_aula",        _render_protected("postar_aula.html"),        methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/recrutamentos",      _render_protected("recrutamentos.html"),      methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/consulta_promocao",  _render_protected("consulta_promocao.html"),  methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/documentos",         _render_protected("documentos.html"),         methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/sabatina",           _render_protected("sabatina.html"),           methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/todos_turnos",       _render_protected("todos_turnos.html"),       methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/ouvidoria",          _render_protected("ouvidoria.html"),          methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/setor_legislativo",  _render_protected("setor_legislativo.html"),  methods=["GET"], response_class=HTMLResponse)

# Órgãos / Centros
app.add_api_route("/dashboard_orgao",       _render_protected("dashboard_orgao.html"),       methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/orgao_interno",         _render_protected("orgao_interno.html"),         methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/centro_detalhe",        _render_protected("centro_detalhe.html"),        methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/centro_tarefas_orgaos", _render_protected("centro_tarefas_orgaos.html"), methods=["GET"], response_class=HTMLResponse)

# Loja
app.add_api_route("/loja", _render_protected("loja.html"), methods=["GET"], response_class=HTMLResponse)

# Mensagens e Chat
app.add_api_route("/mensagens",   _render_protected("mensagens.html"), methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/chat",        _render_protected("chat.html"),      methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/chat_global", _render_protected("chat.html"),      methods=["GET"], response_class=HTMLResponse)

# ── Páginas administrativas
app.add_api_route("/painel",    _render_admin("painel.html"),    methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/listagens", _render_admin("listagens.html"), methods=["GET"], response_class=HTMLResponse)
