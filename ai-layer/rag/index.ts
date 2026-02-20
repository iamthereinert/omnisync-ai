import { Pool } from 'pg';
import { EmbeddingEngine } from '../embeddings';
import { logger } from '../../utils/logger';

export interface SearchResult {
  id: string;
  source: string;
  externalId: string;
  data: Record<string, unknown>;
  similarity: number;
}

export class RAGEngine {
  private db: Pool;
  private embedder: EmbeddingEngine;

  constructor(db: Pool) {
    this.db = db;
    this.embedder = new EmbeddingEngine(db);
  }

  /**
   * Semantic search across all sync_records using cosine similarity.
   */
  async search(query: string, limit = 10, source?: string): Promise<SearchResult[]> {
    const embedding = await this.embedder.generate(query);
    const pgVector = `[${embedding.join(',')}]`;

    const whereClause = source ? `AND source = $3` : '';
    const params: unknown[] = [pgVector, limit];
    if (source) params.push(source);

    const result = await this.db.query<{
      id: string;
      source: string;
      external_id: string;
      data: Record<string, unknown>;
      similarity: number;
    }>(
      `
      SELECT
        id,
        source,
        external_id,
        data,
        1 - (embedding <=> $1::vector) AS similarity
      FROM sync_records
      WHERE embedding IS NOT NULL
      ${whereClause}
      ORDER BY embedding <=> $1::vector
      LIMIT $2
      `,
      params
    );

    logger.debug(`[RAG] Query "${query}" → ${result.rows.length} results`);

    return result.rows.map((r) => ({
      id: r.id,
      source: r.source,
      externalId: r.external_id,
      data: r.data,
      similarity: r.similarity,
    }));
  }

  /**
   * Semantic search within emails only.
   */
  async searchEmails(query: string, limit = 10): Promise<SearchResult[]> {
    const embedding = await this.embedder.generate(query);
    const pgVector = `[${embedding.join(',')}]`;

    const result = await this.db.query(
      `
      SELECT
        id,
        'email' AS source,
        external_id,
        jsonb_build_object('subject', subject, 'from', from_addr, 'body', body_text) AS data,
        1 - (embedding <=> $1::vector) AS similarity
      FROM emails
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $2
      `,
      [pgVector, limit]
    );

    return result.rows;
  }
}
