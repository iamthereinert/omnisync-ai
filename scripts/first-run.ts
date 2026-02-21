/**
 * OmniSync AI — First Run Script
 *
 * Descobre todos os databases do Notion, cria tabelas espelhadas no PostgreSQL
 * e importa todos os registros.
 *
 * Uso:
 *   npx ts-node scripts/first-run.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { NotionConnector } from '../connectors/notion/client';
import { NotionImporter } from '../connectors/notion/importer';

async function main() {
  console.log('🚀 OmniSync AI — First Run');
  console.log('Connecting to PostgreSQL...');

  const db = new Pool({ connectionString: process.env.DATABASE_URL });
  await db.query('SELECT 1');
  console.log('✅ PostgreSQL connected');

  const notion = new NotionConnector(process.env.NOTION_API_KEY!);
  const importer = new NotionImporter(notion, db);

  await importer.firstRun();

  await db.end();
  console.log('✅ First run complete.');
}

main().catch((err) => {
  console.error('❌ First run failed:', err);
  process.exit(1);
});
