# OmniSync AI

Sistema centralizado de sincronização bidirecional — PostgreSQL + Notion + Email + IA.

---

## O que é

O OmniSync AI é um hub pessoal de dados que:

- Sincroniza **todos os databases do Notion** com um PostgreSQL local
- Indexa **todos os e-mails** (Gmail, Outlook, Proton) num único banco
- Gera **embeddings vetoriais** de todo o conteúdo para busca semântica
- Expõe os dados via **API REST/GraphQL** e integra com agentes de IA

PostgreSQL é a fonte da verdade. Notion é a interface visual. Email é indexado. IA é a camada de busca.

---

## Pré-requisitos

- **Node.js** v18+ com npm
- **Docker Desktop** instalado e rodando
- **Conta Notion** com API key
- **OpenAI API key** (para embeddings — opcional nas fases iniciais)

---

## Instalação

### 1. Clonar o repositório

```bash
git clone https://github.com/iamthereinert/omnisync-ai.git
cd omnisync-ai
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edita o `.env` com seus valores reais (veja seção **Configuração** abaixo).

### 4. Subir a infraestrutura Docker

```bash
docker-compose up -d
```

Isso inicia:
- **PostgreSQL** com pgvector na porta `5432`
- **RabbitMQ** na porta `5672` (painel: `http://localhost:15672` — user: `omnisync`, pass: `omnisync`)
- **Redis** na porta `6379`

### 5. Inicializar o banco de dados

```bash
npm run db:init
```

Cria as 5 tabelas: `sync_records`, `sync_queue`, `emails`, `schema_registry`, `sync_state`.

---

## Configuração (.env)

Preenche apenas o que for usar em cada fase:

```env
# OBRIGATÓRIO
DATABASE_URL=postgresql://omnisync:omnisync@localhost:5432/omnisync
RABBITMQ_URL=amqp://localhost:5672
REDIS_URL=redis://localhost:6379

# FASE 2 — Notion
NOTION_API_KEY=ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# FASE 3 — Email (preenche conforme quiser integrar)
GMAIL_CLIENT_ID=xxx
GMAIL_CLIENT_SECRET=xxx
GMAIL_REFRESH_TOKEN=xxx

# FASE 4 — IA / Embeddings
OPENAI_API_KEY=sk-xxx
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# APP
NODE_ENV=development
LOG_LEVEL=info
API_PORT=3000
```

---

## Comandos disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Inicia o servidor em modo desenvolvimento |
| `npm run build` | Compila TypeScript → `dist/` |
| `npm start` | Inicia a versão compilada |
| `npm run db:init` | Cria todas as tabelas no PostgreSQL |
| `npm run db:migrate` | Roda migrações pendentes |
| `npm run notion:first-run` | Importa todos os databases do Notion para o PostgreSQL |

---

## Estrutura do projeto

```
OmniSync-AI/
├── src/
│   ├── core/
│   │   ├── sync-engine/       # Motor principal de sincronização (RabbitMQ)
│   │   ├── queue-system/      # Gerenciamento de filas
│   │   └── conflict-resolver/ # Resolução de conflitos (SHA-256 + last-write-wins)
│   ├── connectors/
│   │   ├── notion/            # Client, schema-mapper, importer
│   │   └── email/             # Interface unificada (Gmail, Outlook, Proton)
│   ├── ai-layer/
│   │   ├── embeddings/        # OpenAI text-embedding-3-small
│   │   └── rag/               # Busca semântica via pgvector (cosine similarity)
│   └── utils/
│       └── logger.ts          # Winston logger
├── scripts/
│   ├── db-init.ts             # Cria tabelas no PostgreSQL
│   ├── db-migrate.ts          # Roda migrações
│   └── first-run.ts           # Importa Notion → PostgreSQL (Fase 2)
├── database/
│   └── schema/
│       └── init.sql           # Schema completo do banco
├── docs/
│   └── roadmap.md             # Roadmap detalhado das 5 fases
├── docker-compose.yml         # PostgreSQL + RabbitMQ + Redis
├── .env                       # Variáveis de ambiente (não commitado)
├── .env.example               # Template do .env
├── package.json
└── tsconfig.json
```

---

## Fases de desenvolvimento

### ✅ Fase 1 — Fundação (concluída)
Infraestrutura completa: Docker, banco de dados, filas, estrutura de código, dependências instaladas.

### 🔜 Fase 2 — Notion Integration
Importar os 100 databases do Notion para o PostgreSQL. Rodar:
```bash
npm run notion:first-run
```
Isso descobre todos os databases via API do Notion e importa todas as páginas para o PostgreSQL com mapeamento automático de schema.

### 🔜 Fase 3 — Email Hub
Adapters para Gmail (`connectors/email/gmail.ts`), Outlook e Proton Bridge. Todos os emails indexados na tabela `emails`.

### 🔜 Fase 4 — AI Layer
Pipeline de embeddings automático para novos registros. API REST para busca semântica (`/api/search?q=...`).

### 🔜 Fase 5 — Dashboard & Monitoring
Painel web, métricas Prometheus/Grafana, alertas via WhatsApp.

---

## Docker — referência rápida

```bash
# Subir tudo
docker-compose up -d

# Parar tudo
docker-compose stop

# Ver status
docker ps

# Remover containers (dados persistem nos volumes)
docker-compose down

# Remover tudo incluindo dados
docker-compose down -v
```

Containers criados:
- `omnisync-postgres` → porta 5432
- `omnisync-rabbitmq` → porta 5672 | painel 15672
- `omnisync-redis` → porta 6379

---

## Verificar se está funcionando

```bash
# PostgreSQL
docker exec -it omnisync-postgres psql -U omnisync -d omnisync -c "\dt"

# RabbitMQ (no browser)
# http://localhost:15672 — user: omnisync / pass: omnisync

# Notion API
curl -s https://api.notion.com/v1/search \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  --data '{"filter":{"value":"database","property":"object"}}' | \
  node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');console.log(JSON.parse(d).results.length,'databases')"
```

---

## Retomar o projeto

Quando quiser continuar:

1. Confirma que Docker está rodando: `docker ps`
2. Se os containers não estiverem UP: `cd C:\Users\iamth\Desktop\OmniSync-AI && docker-compose up -d`
3. Próximo passo é a **Fase 2**: `npm run notion:first-run`
4. Consulta `docs/roadmap.md` para o checklist completo de cada fase

---

## Repositório

`https://github.com/iamthereinert/omnisync-ai` (privado)
