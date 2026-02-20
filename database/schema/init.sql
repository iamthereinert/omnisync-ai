-- OmniSync AI — Master Database Schema
-- PostgreSQL is the source of truth.
-- Notion is the interface layer only.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Core sync records ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_records (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source       TEXT NOT NULL,           -- 'notion' | 'email' | 'whatsapp' | 'calendar' | 'jobs'
  external_id  TEXT NOT NULL,           -- ID from source system
  notion_id    TEXT,                    -- Notion page ID (if synced)
  sync_version INT DEFAULT 1,           -- incremented on each sync
  hash         TEXT,                    -- content hash for deduplication
  status       TEXT DEFAULT 'active',   -- 'active' | 'archived' | 'deleted'
  data         JSONB NOT NULL,          -- full record payload
  metadata     JSONB DEFAULT '{}',      -- timestamps, labels, source metadata
  embedding    vector(1536),            -- OpenAI text-embedding-3-small
  synced_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (source, external_id)
);

-- ─── Sync queue ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_queue (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id       TEXT NOT NULL UNIQUE,
  operation    TEXT NOT NULL,           -- 'upsert' | 'delete' | 'embed'
  source       TEXT NOT NULL,
  direction    TEXT NOT NULL,           -- 'to_postgres' | 'to_notion' | 'embed'
  payload      JSONB NOT NULL,
  status       TEXT DEFAULT 'pending',  -- 'pending' | 'processing' | 'done' | 'failed'
  retries      INT DEFAULT 0,
  error        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ─── Email store ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emails (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider     TEXT NOT NULL,           -- 'gmail' | 'outlook' | 'proton'
  external_id  TEXT NOT NULL,
  thread_id    TEXT,
  from_addr    TEXT NOT NULL,
  to_addrs     TEXT[],
  subject      TEXT,
  body_text    TEXT,
  body_html    TEXT,
  labels       TEXT[],
  received_at  TIMESTAMPTZ,
  notion_id    TEXT,
  embedding    vector(1536),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider, external_id)
);

-- ─── Schema registry (Notion databases mapped to PG) ─────────
CREATE TABLE IF NOT EXISTS schema_registry (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notion_database_id TEXT NOT NULL UNIQUE,
  table_name         TEXT NOT NULL UNIQUE,
  schema_definition  JSONB NOT NULL,
  last_synced_at     TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Sync state (incremental sync cursors) ────────────────────
CREATE TABLE IF NOT EXISTS sync_state (
  source       TEXT PRIMARY KEY,
  last_cursor  TEXT,                    -- Notion next_cursor or timestamp
  last_sync_at TIMESTAMPTZ,
  metadata     JSONB DEFAULT '{}'
);

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS sync_records_source_idx    ON sync_records (source);
CREATE INDEX IF NOT EXISTS sync_records_notion_id_idx ON sync_records (notion_id);
CREATE INDEX IF NOT EXISTS sync_records_updated_at_idx ON sync_records (updated_at DESC);
CREATE INDEX IF NOT EXISTS sync_queue_status_idx      ON sync_queue (status);
CREATE INDEX IF NOT EXISTS emails_provider_idx        ON emails (provider);
CREATE INDEX IF NOT EXISTS emails_received_at_idx     ON emails (received_at DESC);

-- Vector similarity index (for semantic search)
CREATE INDEX IF NOT EXISTS sync_records_embedding_idx
  ON sync_records USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS emails_embedding_idx
  ON emails USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
