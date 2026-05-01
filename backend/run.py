"""
Entrypoint de desenvolvimento.

Uso: python -m backend.run

Seta WindowsSelectorEventLoopPolicy antes do Uvicorn criar o event loop —
psycopg3 async não funciona com ProactorEventLoop (default no Windows).
"""

import sys
import asyncio
import uvicorn

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
