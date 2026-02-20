import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { QueueSystem } from './core/queue-system';
import { SyncEngine } from './core/sync-engine';
import { ConflictResolver } from './core/conflict-resolver';
import { NotionConnector } from './connectors/notion/client';
import { EmailHub } from './connectors/email';
import { EmbeddingEngine } from './ai-layer/embeddings';
import { RAGEngine } from './ai-layer/rag';
import { logger } from './utils/logger';

async function main() {
  logger.info('🚀 OmniSync AI starting...');

  // ─── Database ────────────────────────────────────────
  const db = new Pool({ connectionString: process.env.DATABASE_URL });
  await db.query('SELECT 1'); // health check
  logger.info('✅ PostgreSQL connected');

  // ─── Core ────────────────────────────────────────────
  const queue = new QueueSystem(process.env.RABBITMQ_URL!);
  await queue.connect();

  const resolver = new ConflictResolver(db);
  const engine = new SyncEngine(queue, resolver);

  // ─── Connectors ──────────────────────────────────────
  const notion = new NotionConnector(process.env.NOTION_API_KEY!);
  const emailHub = new EmailHub();
  // emailHub.register(new GmailAdapter(...));
  // emailHub.register(new OutlookAdapter(...));
  // emailHub.register(new ProtonAdapter(...));

  // ─── AI Layer ────────────────────────────────────────
  const embedder = new EmbeddingEngine(db);
  const rag = new RAGEngine(db);

  // ─── Start ───────────────────────────────────────────
  await engine.start();
  logger.info('✅ Sync Engine started');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down...');
    await engine.stop();
    await emailHub.disconnectAll();
    await db.end();
    process.exit(0);
  });

  logger.info('🧠 OmniSync AI is running. PostgreSQL is the source of truth.');
}

main().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
