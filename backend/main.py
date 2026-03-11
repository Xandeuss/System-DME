from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from pathlib import Path

app = FastAPI()

# Setup paths relative to this file
BASE_DIR = Path(__file__).resolve().parent.parent

# Mount static files
app.mount("/styles", StaticFiles(directory=str(BASE_DIR / "static/styles")), name="styles")
app.mount("/scripts", StaticFiles(directory=str(BASE_DIR / "static/scripts")), name="scripts")

# Templates
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# Routes for each page
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("home.html", {"request": request})

@app.get("/home", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("home.html", {"request": request})

@app.get("/listagens", response_class=HTMLResponse)
async def listagens(request: Request):
    return templates.TemplateResponse("listagens.html", {"request": request})

@app.get("/requerimentos", response_class=HTMLResponse)
async def requerimentos(request: Request):
    return templates.TemplateResponse("requerimentos.html", {"request": request})

@app.get("/login", response_class=HTMLResponse)
async def login(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/dashboard_orgao", response_class=HTMLResponse)
async def dashboard_orgao(request: Request):
    return templates.TemplateResponse("dashboard_orgao.html", {"request": request})

@app.get("/centro_detalhe", response_class=HTMLResponse)
async def centro_detalhe(request: Request):
    return templates.TemplateResponse("centro_detalhe.html", {"request": request})

@app.get("/centro_tarefas_orgaos", response_class=HTMLResponse)
async def centro_tarefas_orgaos(request: Request):
    return templates.TemplateResponse("centro_tarefas_orgaos.html", {"request": request})

@app.get("/chat", response_class=HTMLResponse)
async def chat(request: Request):
    return templates.TemplateResponse("chat.html", {"request": request})

@app.get("/chat_global", response_class=HTMLResponse)
async def chat_global(request: Request):
    return templates.TemplateResponse("chat.html", {"request": request})  # Assuming chat_global uses chat.html

@app.get("/configuracao", response_class=HTMLResponse)
async def configuracao(request: Request):
    return templates.TemplateResponse("configuracao.html", {"request": request})

@app.get("/consulta_promocao", response_class=HTMLResponse)
async def consulta_promocao(request: Request):
    return templates.TemplateResponse("consulta_promocao.html", {"request": request})

@app.get("/documentos", response_class=HTMLResponse)
async def documentos(request: Request):
    return templates.TemplateResponse("documentos.html", {"request": request})

@app.get("/loja", response_class=HTMLResponse)
async def loja(request: Request):
    return templates.TemplateResponse("loja.html", {"request": request})

@app.get("/notificacoes", response_class=HTMLResponse)
async def notificacoes(request: Request):
    return templates.TemplateResponse("home.html", {"request": request})  # Assuming notifications on home

@app.get("/orgao_interno", response_class=HTMLResponse)
async def orgao_interno(request: Request):
    return templates.TemplateResponse("orgao_interno.html", {"request": request})

@app.get("/ouvidoria", response_class=HTMLResponse)
async def ouvidoria(request: Request):
    return templates.TemplateResponse("ouvidoria.html", {"request": request})

@app.get("/painel", response_class=HTMLResponse)
async def painel(request: Request):
    return templates.TemplateResponse("painel.html", {"request": request})

@app.get("/perfil", response_class=HTMLResponse)
async def perfil(request: Request):
    return templates.TemplateResponse("perfil.html", {"request": request})

@app.get("/ponto_servico", response_class=HTMLResponse)
async def ponto_servico(request: Request):
    return templates.TemplateResponse("ponto_servico.html", {"request": request})

@app.get("/postar_aula", response_class=HTMLResponse)
async def postar_aula(request: Request):
    return templates.TemplateResponse("postar_aula.html", {"request": request})

@app.get("/recrutamentos", response_class=HTMLResponse)
async def recrutamentos(request: Request):
    return templates.TemplateResponse("recrutamentos.html", {"request": request})

@app.get("/sabatina", response_class=HTMLResponse)
async def sabatina(request: Request):
    return templates.TemplateResponse("sabatina.html", {"request": request})

@app.get("/setor_legislativo", response_class=HTMLResponse)
async def setor_legislativo(request: Request):
    return templates.TemplateResponse("setor_legislativo.html", {"request": request})

@app.get("/setup_admin", response_class=HTMLResponse)
async def setup_admin(request: Request):
    return templates.TemplateResponse("setup_admin.html", {"request": request})

@app.get("/todos_turnos", response_class=HTMLResponse)
async def todos_turnos(request: Request):
    return templates.TemplateResponse("todos_turnos.html", {"request": request})

@app.get("/verificacao", response_class=HTMLResponse)
async def verificacao(request: Request):
    return templates.TemplateResponse("verificacao.html", {"request": request})