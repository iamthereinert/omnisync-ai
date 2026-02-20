import OpenAI from 'openai';
import { Pool } from 'pg';
import { logger } from '../../utils/logger';

const MODEL = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';
const DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS ?? '1536');

export class EmbeddingEngine {
  private openai: OpenAI;
  private db: Pool;

  constructor(db: Pool) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.db = db;
  }

  async generate(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: MODEL,
      input: text.slice(0, 8191), // token limit
      dimensions: DIMENSIONS,
    });

    return response.data[0].embedding;
  }

  async embedRecord(recordId: string, text: string): Promise<void> {
    const embedding = await this.generate(text);
    const pgVector = `[${embedding.join(',')}]`;

    await this.db.query(
      `UPDATE sync_records SET embedding = $1 WHERE id = $2`,
      [pgVector, recordId]
    );

    logger.debug(`[Embeddings] Embedded record ${recordId}`);
  }

  async embedEmail(emailId: string, text: string): Promise<void> {
    const embedding = await this.generate(text);
    const pgVector = `[${embedding.join(',')}]`;

    await this.db.query(
      `UPDATE emails SET embedding = $1 WHERE id = $2`,
      [pgVector, emailId]
    );

    logger.debug(`[Embeddings] Embedded email ${emailId}`);
  }

  extractText(data: Record<string, unknown>): string {
    // Recursively extract all string values for embedding
    const parts: string[] = [];

    function extract(obj: unknown): void {
      if (typeof obj === 'string') {
        parts.push(obj);
      } else if (Array.isArray(obj)) {
        obj.forEach(extract);
      } else if (obj && typeof obj === 'object') {
        Object.values(obj as Record<string, unknown>).forEach(extract);
      }
    }

    extract(data);
    return parts.join(' ').trim();
  }
}
