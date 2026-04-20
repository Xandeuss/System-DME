"""
Store local em memória — substitui o Supabase durante desenvolvimento.
Dados persistem apenas enquanto o servidor estiver rodando.

Para reconectar ao Supabase depois, basta trocar os imports de volta
para supabase_client.py nos arquivos que usam get_store().
"""

import logging
from datetime import datetime, timezone
from backend.services.auth_service import hash_password

logger = logging.getLogger("dme.store")


class LocalStore:
    """Banco de dados em memória com dados de exemplo."""

    def __init__(self):
        # ── Militares (usuários) ─────────────────────────
        self.militares = [
            {
                "nick": "Xandelicado",
                "email": "xandelicado@dme.com",
                "senha_hash": hash_password("123456"),
                "patente": "Comandante-Geral",
                "corpo": "militar",
                "status": "ativo",
                "role": "admin",
                "tag": "DME",
                "created_at": "2025-01-01T00:00:00Z",
            },
            {
                "nick": "rafacv",
                "email": "rafacv@dme.com",
                "senha_hash": hash_password("123456"),
                "patente": "Coronel",
                "corpo": "militar",
                "status": "ativo",
                "role": "admin",
                "tag": "DME",
                "created_at": "2025-02-15T00:00:00Z",
            },
            {
                "nick": "Soldado01",
                "email": "soldado@dme.com",
                "senha_hash": hash_password("123456"),
                "patente": "Soldado",
                "corpo": "militar",
                "status": "ativo",
                "role": "user",
                "tag": "DME",
                "created_at": "2025-06-10T00:00:00Z",
            },
        ]

        # ── Requerimentos ────────────────────────────────
        self.requerimentos = []

        # ── Turnos ───────────────────────────────────────
        self.turnos = []

        # ── Aulas ────────────────────────────────────────
        self.aulas = []

        # ── Recrutamentos ────────────────────────────────
        self.recrutamentos = []

        # ── Config ───────────────────────────────────────
        self.config = {
            "treinadorDestaque": "Xandelicado",
            "supervisorDestaque": "rafacv",
        }

        # Contador de IDs
        self._next_id = 1

        logger.info("[LOCAL] Store em memória inicializado com dados de exemplo")

    def _gen_id(self) -> str:
        id_str = str(self._next_id)
        self._next_id += 1
        return id_str

    # ── Militares ────────────────────────────────────────

    def get_militar(self, nick: str):
        return next((m for m in self.militares if m["nick"].lower() == nick.lower()), None)

    def list_militares(self):
        return self.militares

    def insert_militar(self, data: dict):
        self.militares.append(data)
        return data

    def update_militar(self, nick: str, campos: dict):
        m = self.get_militar(nick)
        if m:
            m.update(campos)
        return m

    # ── Requerimentos ────────────────────────────────────

    def insert_requerimento(self, data: dict):
        data["id"] = self._gen_id()
        data["data_hora"] = data.get("data_hora") or datetime.now(timezone.utc).isoformat()
        self.requerimentos.append(data)
        return data

    def get_requerimento(self, req_id: str):
        return next((r for r in self.requerimentos if r["id"] == req_id), None)

    def list_requerimentos(self, tipo: str, aplicador: str = None):
        result = [r for r in self.requerimentos if r.get("tipo") == tipo]
        if aplicador:
            result = [r for r in result if r.get("aplicador") == aplicador]
        return sorted(result, key=lambda r: r.get("data_hora", ""), reverse=True)

    def update_requerimento(self, req_id: str, campos: dict):
        r = self.get_requerimento(req_id)
        if r:
            r.update(campos)
        return r

    def delete_requerimento(self, req_id: str):
        self.requerimentos = [r for r in self.requerimentos if r["id"] != req_id]

    # ── Turnos ───────────────────────────────────────────

    def list_turnos(self):
        return self.turnos

    # ── Aulas ────────────────────────────────────────────

    def list_aulas(self):
        return self.aulas

    # ── Recrutamentos ────────────────────────────────────

    def list_recrutamentos(self):
        return self.recrutamentos

    # ── Config ───────────────────────────────────────────

    def get_config(self):
        return self.config


# Instância global (singleton)
_store = None


def get_store() -> LocalStore:
    global _store
    if _store is None:
        _store = LocalStore()
    return _store
