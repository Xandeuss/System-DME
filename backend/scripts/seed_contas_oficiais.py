"""
Popula a tabela `contas_oficiais` com os órgãos e centros do DME.

Uso: python -m backend.scripts.seed_contas_oficiais
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from dotenv import load_dotenv
load_dotenv()

import psycopg

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL não configurado no .env")
    sys.exit(1)


# (nick, nome_oficial, categoria, imagem_url)
# imagem_url pode ficar em branco — o front usa o avatar padrão do Habbo como fallback.
ORGAOS: list[tuple[str, str, str]] = [
    ("Corregedoria",                      "Corregedoria",                       ""),
    ("Ministério Público",                "Ministério Público",                 ""),
    ("Grupamento de Operações Especiais", "Grupamento de Operações Especiais",  ""),
    ("Academia M. A. Negras",             "Academia M. A. Negras",              ""),
    ("Centro de R. Humanos",              "Centro de R. Humanos",               ""),
    ("Corpo de Oficiais Gen.",            "Corpo de Oficiais Gen.",             ""),
    ("Auditoria Fiscal",                  "Auditoria Fiscal",                   ""),
    ("Setor de Inteligência",             "Setor de Inteligência",              ""),
    ("Academia Publicitária Militar",     "Academia Publicitária Militar",      ""),
    ("Comando Feminino",                  "Comando Feminino",                   ""),
    ("Centro de Normas e Desligamentos",  "Centro de Normas e Desligamentos",   ""),
    ("Agência de Eventos",                "Agência de Eventos",                 ""),
    ("Superior Tribunal Militar",         "Superior Tribunal Militar",          ""),
    ("CND-MEMBROS",                       "CND-MEMBROS",                        ""),
    ("Centro de Desenvolvimento Tecnológico", "Centro de Desenvolvimento Tecnológico", ""),
]

CENTROS: list[tuple[str, str, str]] = [
    ("Centro de Instrução",   "Centro de Instrução",   ""),
    ("Centro de Supervisão",  "Centro de Supervisão",  ""),
    ("Centro de Treinamento", "Centro de Treinamento", ""),
    ("Centro de Patrulha",    "Centro de Patrulha",    ""),
]


def main() -> None:
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM contas_oficiais")

            for i, (nick, nome, img) in enumerate(ORGAOS):
                cur.execute(
                    """
                    INSERT INTO contas_oficiais (nick, nome_oficial, categoria, imagem_url, ordem)
                    VALUES (%s, %s, 'orgao', %s, %s)
                    """,
                    (nick, nome, img or None, i),
                )

            for i, (nick, nome, img) in enumerate(CENTROS):
                cur.execute(
                    """
                    INSERT INTO contas_oficiais (nick, nome_oficial, categoria, imagem_url, ordem)
                    VALUES (%s, %s, 'centro', %s, %s)
                    """,
                    (nick, nome, img or None, i),
                )
        conn.commit()

    print(f"✓ {len(ORGAOS)} órgãos e {len(CENTROS)} centros importados em contas_oficiais.")


if __name__ == "__main__":
    main()
