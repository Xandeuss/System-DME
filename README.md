# System-DME
Sistema de RPG policial do DME no Habbo Hotel.

## Estrutura do Projeto
- `backend/`: Contém a lógica do servidor FastAPI e `requirements.txt`.
- `static/`: Arquivos de estilo (CSS) e scripts (JS).
- `templates/`: Templates HTML servidos pelo Jinja2.

## Como Executar o Backend

1. **Instale as dependências:**
   Certifique-se de estar na raíz do projeto e execute:
   ```bash
   pip install -r backend/requirements.txt
   ```

Encerre qualquer tipo de script em python que esteja rodando no terminal.

taskkill /F /IM python.exe

2. **Execute o servidor:**
   ```bash
   python -m uvicorn backend.main:app --reload
   ```

3. **Acesse a aplicação:**
   Abra o navegador em [http://127.0.0.1:8000](http://127.0.0.1:8000).
   O sistema redirecionará automaticamente para a tela de login.

## Rotas Principais
As rotas agora são limpas e não utilizam a extensão `.html`:
- `/login`: Tela de acesso.
- `/home`: Painel principal (após login).
- `/perfil`: Consulta de perfis militares.
- `/painel`: Administrativo (para usuários autorizados).

## Credenciais de Teste
- **Usuário:** `Xandelicado`
- **Senha:** `123456`
