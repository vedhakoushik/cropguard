-- CropGuard app tables (run first, then 02_ and 03_ seed files)
-- Reference tables (crops, pests, pesticides, location_crop_data) are created by the seed files.

CREATE TABLE IF NOT EXISTS crops (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    scientific_name VARCHAR(150),
    category        VARCHAR(100),
    growing_season  VARCHAR(100),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_title VARCHAR(200) NOT NULL DEFAULT 'New Chat',
    crop_id       INTEGER REFERENCES crops(id) ON DELETE SET NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id         BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);

CREATE TABLE IF NOT EXISTS crop_images (
    id                BIGSERIAL PRIMARY KEY,
    session_id        UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
    crop_id           INTEGER REFERENCES crops(id) ON DELETE SET NULL,
    s3_key            VARCHAR(300),
    original_filename VARCHAR(300),
    analysis_status   VARCHAR(20) NOT NULL DEFAULT 'pending',
    ai_confidence     VARCHAR(50),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analysis_results (
    id                     BIGSERIAL PRIMARY KEY,
    session_id             UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    image_id               BIGINT REFERENCES crop_images(id) ON DELETE SET NULL,
    crop_id                INTEGER REFERENCES crops(id) ON DELETE SET NULL,
    pest_name_detected     VARCHAR(200),
    cause_summary          TEXT,
    solution_summary       TEXT,
    severity               VARCHAR(20),
    recommended_pesticides JSONB NOT NULL DEFAULT '[]',
    additional_tips        TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analysis_session ON analysis_results(session_id, created_at DESC);
