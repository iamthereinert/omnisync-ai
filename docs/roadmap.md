# OmniSync AI — Roadmap

## Fase 1 — Fundação ✅ (estrutura criada)
- [x] Estrutura de pastas e módulos
- [x] SyncEngine com queue e conflict resolver
- [x] Schema PostgreSQL com pgvector
- [ ] Setup local PostgreSQL + RabbitMQ
- [ ] First run: conectar e testar pipeline básico

## Fase 2 — Notion Integration
- [ ] NotionConnector: importação de databases
- [ ] Schema auto-mapping (Notion → PostgreSQL tables)
- [ ] Sync incremental (next_cursor)
- [ ] Webhooks Notion → SyncEngine
- [ ] Bidirectional: PostgreSQL changes → Notion

## Fase 3 — Email Hub
- [ ] Gmail adapter (OAuth2)
- [ ] Outlook adapter (MSAL)
- [ ] Proton adapter (Bridge IMAP)
- [ ] Email indexação no PostgreSQL
- [ ] Email → Notion sync
- [ ] Thread grouping + metadata extraction

## Fase 4 — AI Layer
- [ ] Embedding pipeline (OpenAI text-embedding-3-small)
- [ ] pgvector indexing automático em novos registros
- [ ] RAGEngine: semantic search API
- [ ] REST API / GraphQL para queries
- [ ] AI Agents: auto-categorização, resumo de emails
- [ ] Multi-agent system (OpenClaw integration)

## Fase 5 — Dashboard & Monitoring
- [ ] Admin panel web
- [ ] Prometheus metrics
- [ ] Grafana dashboard
- [ ] Alertas de sync failure
- [ ] Analytics de uso
