import { Pool } from 'pg';
import { NotionConnector } from './client';
import { mapNotionSchemaToPostgres } from './schema-mapper';
import { logger } from '../../utils/logger';
import type { DatabaseObjectResponse } from '@notionhq/client/build/src/api-endpoints';

export class NotionImporter {
  private notion: NotionConnector;
  private db: Pool;

  constructor(notion: NotionConnector, db: Pool) {
    this.notion = notion;
    this.db = db;
  }

  /**
   * First-run: discover all Notion databases via search API
   * and register them in schema_registry.
   */
  async discoverDatabases(): Promise<DatabaseObjectResponse[]> {
    const { Client } = await import('@notionhq/client');
    const client = new Client({ auth: process.env.NOTION_API_KEY });

    const databases: DatabaseObjectResponse[] = [];
    let cursor: string | undefined;

    do {
      const res = await client.search({
        filter: { value: 'database', property: 'object' },
        page_size: 100,
        start_cursor: cursor,
      });

      for (const result of res.results) {
        if (result.object === 'database' && 'title' in result) {
          databases.push(result as DatabaseObjectResponse);
        }
      }

      cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
    } while (cursor);

    logger.info(`[Importer] Discovered ${databases.length} Notion databases`);
    return databases;
  }

  /**
   * Register a database in schema_registry and create mirrored PG table.
   */
  async registerDatabase(db: DatabaseObjectResponse): Promise<void> {
    const schema = mapNotionSchemaToPostgres(db);

    // Register in schema_registry
    await this.db.query(
      `INSERT INTO schema_registry (notion_database_id, table_name, schema_definition)
       VALUES ($1, $2, $3)
       ON CONFLICT (notion_database_id) DO UPDATE
       SET schema_definition = EXCLUDED.schema_definition`,
      [db.id, schema.tableName, JSON.stringify(schema)]
    );

    // Create mirror table in PostgreSQL
    try {
      await this.db.query(schema.createTableSQL);
      logger.info(`[Importer] Table created/verified: ${schema.tableName}`);
    } catch (err: any) {
      logger.warn(`[Importer] Table ${schema.tableName}: ${err.message}`);
    }
  }

  /**
   * Import all pages from a Notion database into sync_records.
   */
  async importDatabase(databaseId: string, tableName: string): Promise<number> {
    let cursor: string | undefined;
    let total = 0;

    do {
      const { pages, nextCursor } = await this.notion.queryDatabase(
        databaseId,
        undefined,
        cursor
      );

      for (const page of pages) {
        await this.db.query(
          `INSERT INTO sync_records (source, external_id, notion_id, data, metadata)
           VALUES ('notion', $1, $1, $2, $3)
           ON CONFLICT (source, external_id) DO UPDATE
           SET data = EXCLUDED.data, updated_at = NOW()`,
          [
            page.id,
            JSON.stringify(page.properties),
            JSON.stringify({
              database_id: databaseId,
              table_name: tableName,
              created_time: page.created_time,
              last_edited_time: page.last_edited_time,
            }),
          ]
        );
        total++;
      }

      cursor = nextCursor ?? undefined;
    } while (cursor);

    // Update sync state cursor
    await this.db.query(
      `INSERT INTO sync_state (source, last_sync_at)
       VALUES ($1, NOW())
       ON CONFLICT (source) DO UPDATE SET last_sync_at = NOW()`,
      [`notion:${databaseId}`]
    );

    logger.info(`[Importer] Imported ${total} records from ${tableName}`);
    return total;
  }

  /**
   * Full first-run: discover all databases, create tables, import all pages.
   */
  async firstRun(): Promise<void> {
    logger.info('[Importer] Starting first-run import...');

    const databases = await this.discoverDatabases();

    for (const db of databases) {
      const title = db.title?.[0]?.plain_text ?? db.id;
      logger.info(`[Importer] Processing: ${title}`);

      try {
        await this.registerDatabase(db);
        const schema = mapNotionSchemaToPostgres(db);
        await this.importDatabase(db.id, schema.tableName);
      } catch (err) {
        logger.error(`[Importer] Failed for ${title}:`, err);
      }
    }

    logger.info('[Importer] First-run complete.');
  }
}
