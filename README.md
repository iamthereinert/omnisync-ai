# OmniSync AI

> **Hub central de sincronização bidirecional inteligente**
> PostgreSQL como fonte da verdade · Notion como interface · IA integrada

---

## Arquitetura

```
     Fontes de Dados
  ┌──────────────────────────────────────────────────┐
  │  Notion · Gmail · Outlook · Proton · WhatsApp    │
  └──────────────────────┬───────────────────────────┘
                         │ webhooks / polling
                         ▼
  ┌──────────────────────────────────────────────────┐
  │              SYNC ENGINE (CORE)                  │
  │   Queue (RabbitMQ) · Conflict Resolver           │
  │   Diff Detection  · Sync Workers                 │
  └────────────┬─────────────────┬────────────────────┘
               │                 │
               ▼                 ▼
  ┌─────────────────┐   ┌──────────────────────────┐
  │   PostgreSQL    │   │        AI LAYER           │
  │   Master DB     │   │  Embeddings · pgvector    │
  │   + pgvector    │   │  RAG · Semantic Search    │
  └────────┬────────┘   └──────────────────────────┘
           │ bidirectional sync
           ▼
  ┌─────────────────────────────────────────────────┐
  │              NOTION (Interface Only)             │
  │         Databases · Páginas · Webhooks           │
  └─────────────────────────────────────────────────┘
           │
           ▼
  ┌─────────────────────────────────────────────────┐
  │          APIs & Dashboard                        │
  │   REST API · GraphQL · Admin Panel              │
  └─────────────────────────────────────────────────┘
```

---

## Stack

| Componente | Tecnologia |
|------------|------------|
| Runtime | Node.js + TypeScript |
| Banco principal | PostgreSQL + pgvector |
| Queue | RabbitMQ (amqplib) |
| Cache | Redis |
| Embeddings | OpenAI text-embedding-3-small |
| Notion | @notionhq/client |
| Monitoring | Prometheus |
| Logs | Winston |

---

## Estrutura

```
OmniSync-AI/
├── core/
│   ├── sync-engine/         # SyncEngine class — orquestrador central
│   ├── queue-system/        # RabbitMQ queue (to_postgres, to_notion, embed)
│   └── conflict-resolver/   # Dedup por hash, last-write-wins
│
├── connectors/
│   ├── notion/              # NotionConnector, importer, schema-mapper
│   ├── email/               # EmailHub + adapters (Gmail, Outlook, Proton)
│   └── future-integrations/ # Telegram, WhatsApp, etc.
│
├── database/
│   ├── schema/              # init.sql (sync_records, emails, schema_registry)
│   ├── migrations/          # versioned migrations
│   └── indexing/            # index definitions
│
├── ai-layer/
│   ├── embeddings/          # EmbeddingEngine (OpenAI)
│   ├── rag/                 # RAGEngine (pgvector cosine search)
│   └── agents/              # future AI agents
│
├── api/
│   ├── rest/                # Express REST API
│   └── graphql/             # GraphQL API
│
├── monitoring/              # Prometheus metrics
├── utils/                   # logger, helpers
└── docs/
    ├── architecture.md
    └── roadmap.md
```

---

## Setup

```bash
# 1. Install deps
npm install

# 2. Configure environment
cp .env.example .env
# Fill in DATABASE_URL, NOTION_API_KEY, OPENAI_API_KEY, RABBITMQ_URL

# 3. Init database
psql $DATABASE_URL -f database/schema/init.sql

# 4. Run
npm run dev
```

---

## Fases de Implementação

- **Fase 1 — Fundação:** PostgreSQL schema, SyncEngine, Queue (RabbitMQ)
- **Fase 2 — Notion:** Importação inicial, sync incremental, webhooks
- **Fase 3 — Email Hub:** Gmail, Outlook, Proton indexados e sincronizados
- **Fase 4 — AI Layer:** Embeddings, busca semântica, multi-agent

---

## Integrações existentes (migrando)

| Módulo | Fonte | Status |
|--------|-------|--------|
| notion-email-bridge | Gmail/Outlook/Proton ↔ Notion | migrating |
| economic-calendar | Eventos econômicos → Notion | migrating |
| whatsapp-notion | WhatsApp ↔ Notion | migrating |
| notion-job-hunter | Vagas CHR → Notion | migrating |
