import { createHash } from 'crypto';
import { Pool } from 'pg';
import { logger } from '../../utils/logger';

export class ConflictResolver {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Compute a stable hash for any data object.
   */
  computeHash(data: Record<string, unknown>): string {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    return createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Returns true if the record already exists with the same content hash.
   * Used to skip unnecessary writes.
   */
  async isDuplicate(
    source: string,
    externalId: string,
    data: Record<string, unknown>
  ): Promise<boolean> {
    const hash = this.computeHash(data);

    const result = await this.db.query(
      `SELECT hash FROM sync_records WHERE source = $1 AND external_id = $2`,
      [source, externalId]
    );

    if (result.rows.length === 0) return false;

    const existing = result.rows[0].hash;
    const isDup = existing === hash;

    if (isDup) {
      logger.debug(`[ConflictResolver] Duplicate detected: ${source}:${externalId}`);
    }

    return isDup;
  }

  /**
   * Resolve conflict between local and remote version.
   * Strategy: last-write-wins based on updated_at timestamp.
   */
  async resolveConflict(
    source: string,
    externalId: string,
    localData: Record<string, unknown>,
    remoteData: Record<string, unknown>
  ): Promise<{ winner: 'local' | 'remote'; data: Record<string, unknown> }> {
    const localTs = (localData.updated_at as number) ?? 0;
    const remoteTs = (remoteData.updated_at as number) ?? 0;

    if (localTs >= remoteTs) {
      logger.info(`[ConflictResolver] Local wins: ${source}:${externalId}`);
      return { winner: 'local', data: localData };
    }

    logger.info(`[ConflictResolver] Remote wins: ${source}:${externalId}`);
    return { winner: 'remote', data: remoteData };
  }
}
