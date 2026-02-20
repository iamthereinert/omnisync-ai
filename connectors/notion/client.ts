import { Client, isFullPage, isFullDatabase } from '@notionhq/client';
import type { PageObjectResponse, DatabaseObjectResponse, QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints';
import { logger } from '../../utils/logger';

export class NotionConnector {
  private client: Client;

  constructor(apiKey: string) {
    this.client = new Client({ auth: apiKey });
  }

  async getDatabases(rootPageId: string): Promise<DatabaseObjectResponse[]> {
    const results: DatabaseObjectResponse[] = [];
    const response = await this.client.blocks.children.list({ block_id: rootPageId });

    for (const block of response.results) {
      if ('type' in block && block.type === 'child_database') {
        const db = await this.client.databases.retrieve({ database_id: block.id });
        if (isFullDatabase(db)) results.push(db);
      }
    }

    return results;
  }

  async queryDatabase(
    databaseId: string,
    filter?: QueryDatabaseParameters['filter'],
    cursor?: string
  ): Promise<{ pages: PageObjectResponse[]; nextCursor: string | null }> {
    const response = await this.client.databases.query({
      database_id: databaseId,
      filter,
      start_cursor: cursor,
      page_size: 100,
    });

    const pages = response.results.filter(isFullPage) as PageObjectResponse[];
    return { pages, nextCursor: response.next_cursor };
  }

  async getPage(pageId: string): Promise<PageObjectResponse | null> {
    try {
      const page = await this.client.pages.retrieve({ page_id: pageId });
      return isFullPage(page) ? page : null;
    } catch {
      return null;
    }
  }

  async upsertPage(
    databaseId: string,
    properties: Record<string, unknown>,
    existingPageId?: string
  ): Promise<string> {
    if (existingPageId) {
      await this.client.pages.update({
        page_id: existingPageId,
        properties: properties as any,
      });
      logger.debug(`[Notion] Updated page ${existingPageId}`);
      return existingPageId;
    }

    const page = await this.client.pages.create({
      parent: { database_id: databaseId },
      properties: properties as any,
    });

    logger.debug(`[Notion] Created page ${page.id}`);
    return page.id;
  }

  async deletePage(pageId: string): Promise<void> {
    await this.client.pages.update({ page_id: pageId, archived: true });
    logger.debug(`[Notion] Archived page ${pageId}`);
  }
}
