# OmniSync AI — Roadmap

---

## ✅ Fase 1 — Fundação (COMPLETA)
- [x] Estrutura de pastas e módulos
- [x] SyncEngine com RabbitMQ (queues: to_postgres, to_notion, embed)
- [x] ConflictResolver com hash SHA-256 + last-write-wins
- [x] Schema PostgreSQL com pgvector (sync_records, sync_queue, emails, schema_registry, sync_state)
- [x] NotionConnector (client, schema-mapper)
- [x] EmailHub (interface unificada Gmail/Outlook/Proton)
- [x] EmbeddingEngine (OpenAI text-embedding-3-small)
- [x] RAGEngine (cosine similarity via pgvector)
- [x] Docker Compose (PostgreSQL + RabbitMQ + Redis)
- [x] npm install + deps configuradas

---

## 🔜 Fase 2 — Notion Integration

### Objetivo
Importar todos os databases do Notion para o PostgreSQL e iniciar sync incremental bidirecional.

### Tarefas
- [ ] **First-run importer** — conectar ao Notion com `NOTION_ROOT_PAGE_ID`, listar todos os databases e importar todas as páginas para o PostgreSQL
- [ ] **Schema auto-mapping** — usar `schema-mapper.ts` para criar tabelas PostgreSQL espelhando os schemas do Notion automaticamente
- [ ] **Sync incremental** — usar `next_cursor` do Notion para buscar apenas mudanças desde o último sync (`sync_state` table)
- [ ] **Notion → PostgreSQL** — detectar mudanças no Notion via polling, enfileirar jobs `to_postgres`
- [ ] **PostgreSQL → Notion** — detectar mudanças locais e enfileirar jobs `to_notion`
- [ ] **Webhook handler** — receber eventos do Notion (quando suportados) para sync em tempo real

### Pré-requisito
- `NOTION_ROOT_PAGE_ID` na `.env` (ID da página raiz do workspace Notion)

---

## 🔜 Fase 3 — Email Hub

### Objetivo
Indexar e sincronizar todos os e-mails (Gmail, Outlook, Proton) no PostgreSQL.

### Tarefas
- [ ] **Gmail adapter** — OAuth2, fetch de emails, watch de inbox via Gmail Push
- [ ] **Outlook adapter** — MSAL, Microsoft Graph API
- [ ] **Proton adapter** — Proton Bridge IMAP local
- [ ] **Indexação** — todos os emails salvos na tabela `emails` com metadata extraída
- [ ] **Email → Notion** — emails importantes sincronizados para databases Notion
- [ ] **Thread grouping** — agrupar emails por thread_id
- [ ] **Embedding** — gerar embeddings de todos os emails para busca semântica

---

## 🔜 Fase 4 — AI Layer

### Objetivo
Ativar busca semântica e agentes inteligentes sobre todos os dados sincronizados.

### Tarefas
- [ ] **Embedding pipeline** — automatizar geração de embeddings para novos registros
- [ ] **RAG API** — endpoint REST para semantic search (`/api/search?q=...`)
- [ ] **Auto-categorização** — classificar emails e registros por categoria/prioridade
- [ ] **Resumo automático** — sumarizar threads longas, databases grandes
- [ ] **Multi-agent** — integração com OpenClaw para queries em linguagem natural sobre os dados

---

## 🔜 Fase 5 — Dashboard & Monitoring

### Objetivo
Visibilidade total do sistema e interface web de administração.

### Tarefas
- [ ] **REST API** — endpoints CRUD para todos os recursos
- [ ] **GraphQL API** — queries flexíveis para dashboard
- [ ] **Admin panel** — UI web para visualizar sync status, filas, logs
- [ ] **Prometheus metrics** — latência, throughput, erros por integration
- [ ] **Grafana dashboard** — visualização das métricas
- [ ] **Alertas** — notificação (WhatsApp/Telegram) em caso de falha de sync

---

## Visão final

```
Fase 1 ✅ → Fase 2 (Notion) → Fase 3 (Email) → Fase 4 (AI) → Fase 5 (Dashboard)
```

Ao final das 5 fases: **sistema operacional pessoal de dados + IA** — tudo sincronizado, pesquisável semanticamente, e acessível via agentes inteligentes.
