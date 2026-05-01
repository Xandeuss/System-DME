"""
Importa o roster empresarial para o PostgreSQL.
Uso: python -m backend.scripts.seed_empresarial
"""

import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from dotenv import load_dotenv
load_dotenv()

import psycopg

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL não configurado no .env"); sys.exit(1)

_ORDEM = {
    "Chanceler": 0, "Presidente": 1, "Vice-Presidente": 2, "Ministro": 3,
    "Comissário": 4, "Delegado": 5, "Executivo": 6, "Diretor": 7,
    "Coordenador": 8, "Supervisor": 9, "Escrivão": 10, "Analista": 11,
    "Inspetor": 12, "Sócio": 13, "Agente": 14,
}

ROSTER = [
    # (nick, patente)
    # ── Chanceler
    ("FelipeME45",       "Chanceler"),
    ("gihsih",           "Chanceler"),
    ("Gore!",            "Chanceler"),
    ("-Jotape-",         "Chanceler"),
    ("JrN",              "Chanceler"),
    ("!TKs",             "Chanceler"),
    ("Proplayer1",       "Chanceler"),
    ("Archie-",          "Chanceler"),
    ("nick2",            "Chanceler"),
    ("@Nilmar",          "Chanceler"),
    ("Mick-Pablo",       "Chanceler"),
    ("Tom_Shelbyy",      "Chanceler"),
    ("sluupzz",          "Chanceler"),
    ("Emis",             "Chanceler"),
    ("Sinner__",         "Chanceler"),
    ("Tenoriw",          "Chanceler"),
    ("pascoalio1",       "Chanceler"),
    ("Cueio122.Ban",     "Chanceler"),
    ("BielFerrari13",    "Chanceler"),
    ("dinozauro29.",     "Chanceler"),
    ("HiperluizPlanet",  "Chanceler"),
    # ── Presidente
    ("paolaMelo12",      "Presidente"),
    ("letxx15.",         "Presidente"),
    ("Kaev",             "Presidente"),
    ("Danff23_B2",       "Presidente"),
    ("Ronaldo",          "Presidente"),
    ("Ryanzin_zks",      "Presidente"),
    # ── Vice-Presidente
    ("Xandelicado",      "Vice-Presidente"),
    ("Desenganado",      "Vice-Presidente"),
    # ── Ministro
    ("SonLee",           "Ministro"),
    ("Tsc",              "Ministro"),
    ("Louk-",            "Ministro"),
    ("MySuddenDeath",    "Ministro"),
    ("ser7-x-842",       "Ministro"),
    ("Alysson00",        "Ministro"),
    ("-079",             "Ministro"),
    ("Strellinha",       "Ministro"),
    ("Sir,Pessoto",      "Ministro"),
    ("Bo@ventura",       "Ministro"),
    ("Keegan",           "Ministro"),
    ("Daniel142018",     "Ministro"),
    ("ytygoytygo",       "Ministro"),
    ("HabbJothn",        "Ministro"),
    ("marqinhozzzzqw",   "Ministro"),
    ("willfra",          "Ministro"),
    # ── Delegado
    ("!.Pandinha22.!",   "Delegado"),
    # ── Executivo
    ("JoaoPauloMata",    "Executivo"),
    (".Nicolly2025.",    "Executivo"),
    ("Bousand.",         "Executivo"),
    # ── Diretor
    ("Marcosviih",       "Diretor"),
    ("top245",           "Diretor"),
    ("Guinhomandraaak",  "Diretor"),
    # ── Coordenador
    ("F:H",              "Coordenador"),
    ("DriiLiiah",        "Coordenador"),
    ("Seishin",          "Coordenador"),
    ("felipe@324",       "Coordenador"),
    # ── Supervisor
    ("Leonnzinho",       "Supervisor"),
    ("MKZ07",            "Supervisor"),
    (",miilaa",          "Supervisor"),
    ("Scratx",           "Supervisor"),
    ("BLACK-0777",       "Supervisor"),
    # ── Escrivão
    ("Apenas1Play",      "Escrivão"),
    ("Dr.Krysth",        "Escrivão"),
    ("Murilo.@123",      "Escrivão"),
    ("Nayany_lins",      "Escrivão"),
    # ── Analista
    ("ContaTest",        "Analista"),
    ("soled2021",        "Analista"),
    ("Kaldur.",          "Analista"),
    ("X-CARLOSINCRIV",   "Analista"),
    ("mellnocturna",     "Analista"),
    ("Yoru_Lucky",       "Analista"),
    # ── Inspetor
    ("Pimenta_14",       "Inspetor"),
    ("DebGoulart",       "Inspetor"),
    # ── Sócio
    ("!Ofendendo",       "Sócio"),
    ("EduardoZnX",       "Sócio"),
    (".alagoano",        "Sócio"),
    # ── Agente
    ("Ryla",             "Agente"),
    ("Alggie",           "Agente"),
]


def main():
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            for nick, patente in ROSTER:
                ordem = _ORDEM[patente]
                cur.execute(
                    """
                    INSERT INTO militares (nick, patente, patente_ordem, corpo, tag, created_at)
                    VALUES (%s, %s, %s, 'empresarial', 'DME', NOW())
                    ON CONFLICT (nick) DO UPDATE SET
                        patente       = EXCLUDED.patente,
                        patente_ordem = EXCLUDED.patente_ordem,
                        corpo         = EXCLUDED.corpo
                    """,
                    (nick, patente, ordem),
                )
        conn.commit()
    print(f"✓ {len(ROSTER)} membros empresariais importados com sucesso.")


if __name__ == "__main__":
    main()
