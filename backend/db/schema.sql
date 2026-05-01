-- ============================================================
-- System-DME — Schema PostgreSQL
-- Tabelas de listagem: atualizadas automaticamente quando um
-- requerimento é aprovado (via listagem_service.py).
-- ============================================================

-- ── Usuários do sistema ───────────────────────────────────────
-- Contas que podem fazer login no System-DME.
-- Um militar pode existir na listagem sem ter conta aqui.
CREATE TABLE IF NOT EXISTS usuarios (
    nick        VARCHAR(64)  PRIMARY KEY,
    email       VARCHAR(128),
    senha_hash  TEXT         NOT NULL DEFAULT '',
    role        VARCHAR(8)   NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    status      VARCHAR(16)  NOT NULL DEFAULT 'ativo'
                             CHECK (status IN ('ativo', 'pendente', 'desativado', 'banido')),
    banido_ate  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_nick ON usuarios (LOWER(nick));


-- ── Centros vinculados a usuários ─────────────────────────────
CREATE TABLE IF NOT EXISTS usuario_centros (
    nick    VARCHAR(64) NOT NULL REFERENCES usuarios(nick) ON DELETE CASCADE,
    centro  VARCHAR(64) NOT NULL,
    PRIMARY KEY (nick, centro)
);


-- ── Militares ────────────────────────────────────────────────
-- patente_ordem: índice numérico da hierarquia (0 = mais alto).
-- Permite ORDER BY patente_ordem ASC sem lógica no app.
-- email/senha_hash podem estar vazios para militares criados
-- por aprovação de requerimento (ainda sem conta no sistema).
CREATE TABLE IF NOT EXISTS militares (
    nick            VARCHAR(64)  PRIMARY KEY,
    email           VARCHAR(128),
    senha_hash      TEXT         NOT NULL DEFAULT '',
    patente         VARCHAR(64)  NOT NULL,
    patente_ordem   SMALLINT     NOT NULL DEFAULT 99,
    corpo           VARCHAR(16)  NOT NULL CHECK (corpo IN ('militar', 'empresarial', 'alto_comando', 'cadetes')),
    status          VARCHAR(16)  NOT NULL DEFAULT 'pendente'
                                 CHECK (status IN ('ativo', 'pendente', 'desativado', 'banido')),
    role            VARCHAR(8)   NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    tag             VARCHAR(16)  NOT NULL DEFAULT 'DME',
    banido_ate      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- patente_anterior: guardada ao virar Cadete para permitir restauração
-- via requerimento "remover_cadete". NULL quando não aplicável.
ALTER TABLE militares ADD COLUMN IF NOT EXISTS patente_anterior VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_militares_listagem ON militares (corpo, status, patente_ordem);
CREATE INDEX IF NOT EXISTS idx_militares_status   ON militares (status);

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_militares ON militares;
CREATE TRIGGER set_updated_at_militares
    BEFORE UPDATE ON militares
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


-- ── Contas oficiais (Órgãos e Centros) ───────────────────────
-- Separadas de 'militares' porque não são pessoas: não logam,
-- não têm email/senha, e o nome exibido na UI é o nome do órgão
-- (Corregedoria, Centro de Instrução, etc.), não uma patente.
CREATE TABLE IF NOT EXISTS contas_oficiais (
    nick          VARCHAR(64)  PRIMARY KEY,
    nome_oficial  VARCHAR(128) NOT NULL,
    categoria     VARCHAR(16)  NOT NULL CHECK (categoria IN ('orgao', 'centro')),
    imagem_url    TEXT,
    ordem         SMALLINT     NOT NULL DEFAULT 99,
    ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contas_oficiais_cat ON contas_oficiais (categoria, ordem);


-- ── Exonerados ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exonerados (
    nick        VARCHAR(64)  PRIMARY KEY,
    tag         VARCHAR(16)  NOT NULL DEFAULT 'DME',
    motivo      TEXT         NOT NULL DEFAULT '',
    data_inicio DATE         NOT NULL,
    data_fim    DATE         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exonerados_data_fim ON exonerados (data_fim DESC);


-- ── Histórico de requerimentos ───────────────────────────────
CREATE TABLE IF NOT EXISTS historico_requerimentos (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo                VARCHAR(32)  NOT NULL,
    aplicador           VARCHAR(64)  NOT NULL,
    status              VARCHAR(16)  NOT NULL DEFAULT 'pendente',
    acao                TEXT,
    nova_patente        VARCHAR(64),
    tags_envolvidos     TEXT[],
    permissor           VARCHAR(64),
    aprovador           VARCHAR(64),
    reprovador          VARCHAR(64),
    motivo_reprovacao   TEXT,
    observacao          TEXT,
    anexo_provas        TEXT,
    valor               VARCHAR(64),
    banido_ate          TIMESTAMPTZ,
    data_hora           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    resolvido_em        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_req_tipo      ON historico_requerimentos (tipo);
CREATE INDEX IF NOT EXISTS idx_req_status    ON historico_requerimentos (status);
CREATE INDEX IF NOT EXISTS idx_req_aplicador ON historico_requerimentos (aplicador);
CREATE INDEX IF NOT EXISTS idx_req_data      ON historico_requerimentos (data_hora DESC);


-- ── Turnos ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS turnos (
    id          BIGSERIAL    PRIMARY KEY,
    nick        VARCHAR(64)  NOT NULL,
    entrada     TIMESTAMPTZ  NOT NULL,
    saida       TIMESTAMPTZ,
    duracao_min INTEGER,
    atividade   VARCHAR(128),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turnos_nick ON turnos (nick);


-- ── Aulas ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aulas (
    id          BIGSERIAL    PRIMARY KEY,
    instrutor   VARCHAR(64)  NOT NULL,
    titulo      VARCHAR(128) NOT NULL,
    descricao   TEXT,
    centro      VARCHAR(64),
    link        TEXT,
    alunos      TEXT[],
    data        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ── Recrutamentos ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recrutamentos (
    id              BIGSERIAL    PRIMARY KEY,
    recrutador      VARCHAR(64)  NOT NULL,
    recrutado       VARCHAR(64)  NOT NULL,
    corpo           VARCHAR(16)  NOT NULL,
    patente_inicial VARCHAR(64)  NOT NULL,
    data            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recrutamentos_recrutador ON recrutamentos (recrutador);
