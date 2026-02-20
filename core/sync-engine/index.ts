import { QueueSystem, SyncJob } from '../queue-system';
import { ConflictResolver } from '../conflict-resolver';
import { logger } from '../../utils/logger';

export type SyncSource = 'notion' | 'email' | 'whatsapp' | 'calendar' | 'jobs';
export type SyncDirection = 'to_postgres' | 'to_notion' | 'embed';

export interface SyncEvent {
  source: SyncSource;
  direction: SyncDirection;
  externalId: string;
  notionId?: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export class SyncEngine {
  private queue: QueueSystem;
  private resolver: ConflictResolver;
  private running = false;

  constructor(queue: QueueSystem, resolver: ConflictResolver) {
    this.queue = queue;
    this.resolver = resolver;
  }

  async start(): Promise<void> {
    this.running = true;
    logger.info('[SyncEngine] Started');
    await this.queue.startWorkers(this.processJob.bind(this));
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.queue.stop();
    logger.info('[SyncEngine] Stopped');
  }

  async enqueue(event: SyncEvent): Promise<void> {
    const job: SyncJob = {
      id: `${event.source}:${event.externalId}:${event.direction}`,
      type: event.direction,
      source: event.source,
      payload: event,
      retries: 0,
      createdAt: Date.now(),
    };

    // Dedup check before enqueue
    const isDuplicate = await this.resolver.isDuplicate(event.source, event.externalId, event.data);
    if (isDuplicate) {
      logger.debug(`[SyncEngine] Skipping duplicate: ${job.id}`);
      return;
    }

    await this.queue.enqueue(job);
    logger.info(`[SyncEngine] Enqueued: ${job.id}`);
  }

  private async processJob(job: SyncJob): Promise<void> {
    logger.info(`[SyncEngine] Processing: ${job.id}`);
    try {
      switch (job.type) {
        case 'to_postgres':
          await this.syncToPostgres(job);
          break;
        case 'to_notion':
          await this.syncToNotion(job);
          break;
        case 'embed':
          await this.generateEmbedding(job);
          break;
        default:
          logger.warn(`[SyncEngine] Unknown job type: ${job.type}`);
      }
    } catch (err) {
      logger.error(`[SyncEngine] Failed to process ${job.id}:`, err);
      throw err; // let queue handle retry
    }
  }

  private async syncToPostgres(job: SyncJob): Promise<void> {
    // Implemented by PostgreSQL layer
    logger.debug(`[SyncEngine] → PostgreSQL: ${job.id}`);
  }

  private async syncToNotion(job: SyncJob): Promise<void> {
    // Implemented by Notion connector
    logger.debug(`[SyncEngine] → Notion: ${job.id}`);
  }

  private async generateEmbedding(job: SyncJob): Promise<void> {
    // Implemented by AI layer
    logger.debug(`[SyncEngine] → Embed: ${job.id}`);
  }
}
