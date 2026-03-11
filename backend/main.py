from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.exception_handlers import http_exception_handler
from starlette.exceptions import HTTPException as StarletteHTTPException

from pathlib import Path
import logging

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("dme")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="DME System",
    description="Sistema de RPG policial do DME no Habbo Hotel.",
    version="1.0.0",
    docs_url=None,   # desabilita /docs em produção (remova se quiser usar Swagger)
    redoc_url=None,
)

# ── Middlewares ───────────────────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent

# ── Static files ──────────────────────────────────────────────────────────────
app.mount("/styles",  StaticFiles(directory=str(BASE_DIR / "static/styles")),  name="styles")
app.mount("/scripts", StaticFiles(directory=str(BASE_DIR / "static/scripts")), name="scripts")

# ── Templates ─────────────────────────────────────────────────────────────────
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# ── Tratamento global de erros ────────────────────────────────────────────────
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Redireciona 404 para /login e loga qualquer outro erro HTTP."""
    logger.warning(f"HTTP {exc.status_code} em {request.url.path}")
    if exc.status_code == 404:
        return RedirectResponse(url="/login")
    return await http_exception_handler(request, exc)

# ── Helpers internos ──────────────────────────────────────────────────────────
def _render(template: str):
    """Atalho para criar rotas que apenas servem um template."""
    async def handler(request: Request) -> HTMLResponse:
        return templates.TemplateResponse(template, {"request": request})
    handler.__name__ = template.replace(".html", "")   # evita conflito de nome no FastAPI
    return handler

# ── Rotas ─────────────────────────────────────────────────────────────────────

# Raiz → redireciona para /login (não expõe /home sem autenticação no cliente)
@app.get("/", response_class=RedirectResponse, include_in_schema=False)
async def root():
    return RedirectResponse(url="/login")

# Autenticação
app.add_api_route("/login",       _render("login.html"),       methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/verificacao", _render("verificacao.html"), methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/setup_admin", _render("setup_admin.html"), methods=["GET"], response_class=HTMLResponse)

# Área principal
app.add_api_route("/home",         _render("home.html"),         methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/perfil",       _render("perfil.html"),       methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/configuracao", _render("configuracao.html"), methods=["GET"], response_class=HTMLResponse)

# Administrativo
app.add_api_route("/painel",    _render("painel.html"),    methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/listagens", _render("listagens.html"), methods=["GET"], response_class=HTMLResponse)

# Serviços e operações
app.add_api_route("/requerimentos",      _render("requerimentos.html"),      methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/ponto_servico",      _render("ponto_servico.html"),      methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/postar_aula",        _render("postar_aula.html"),        methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/recrutamentos",      _render("recrutamentos.html"),      methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/consulta_promocao",  _render("consulta_promocao.html"),  methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/documentos",         _render("documentos.html"),         methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/sabatina",           _render("sabatina.html"),           methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/todos_turnos",       _render("todos_turnos.html"),       methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/ouvidoria",          _render("ouvidoria.html"),          methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/setor_legislativo",  _render("setor_legislativo.html"),  methods=["GET"], response_class=HTMLResponse)

# Órgãos / Centros
app.add_api_route("/dashboard_orgao",       _render("dashboard_orgao.html"),       methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/orgao_interno",         _render("orgao_interno.html"),         methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/centro_detalhe",        _render("centro_detalhe.html"),        methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/centro_tarefas_orgaos", _render("centro_tarefas_orgaos.html"), methods=["GET"], response_class=HTMLResponse)

# Loja
app.add_api_route("/loja", _render("loja.html"), methods=["GET"], response_class=HTMLResponse)

# Chat — /chat_global agora serve seu próprio template
# CORREÇÃO: anteriormente ambas as rotas serviam chat.html, tornando chat_global sem efeito real.
# Se você tiver um template separado para chat global, basta criar o arquivo; 
# enquanto não existir, ele aponta para chat.html como fallback explícito.
app.add_api_route("/chat",        _render("chat.html"), methods=["GET"], response_class=HTMLResponse)
app.add_api_route("/chat_global", _render("chat.html"), methods=["GET"], response_class=HTMLResponse)
