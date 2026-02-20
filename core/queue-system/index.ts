import amqp, { Channel, Connection } from 'amqplib';
import { logger } from '../../utils/logger';

export type JobType = 'to_postgres' | 'to_notion' | 'embed';
export type SyncSource = 'notion' | 'email' | 'whatsapp' | 'calendar' | 'jobs';

export interface SyncJob {
  id: string;
  type: JobType;
  source: SyncSource;
  payload: Record<string, unknown>;
  retries: number;
  createdAt: number;
}

const QUEUES = {
  to_postgres: 'omnisync.to_postgres',
  to_notion: 'omnisync.to_notion',
  embed: 'omnisync.embed',
} as const;

const MAX_RETRIES = 3;

export class QueueSystem {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async connect(): Promise<void> {
    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createChannel();

    for (const queue of Object.values(QUEUES)) {
      await this.channel.assertQueue(queue, { durable: true });
    }

    logger.info('[QueueSystem] Connected to RabbitMQ');
  }

  async enqueue(job: SyncJob): Promise<void> {
    if (!this.channel) throw new Error('QueueSystem not connected');

    const queue = QUEUES[job.type];
    const msg = Buffer.from(JSON.stringify(job));

    this.channel.sendToQueue(queue, msg, { persistent: true });
    logger.debug(`[Queue] Enqueued job ${job.id} → ${queue}`);
  }

  async startWorkers(handler: (job: SyncJob) => Promise<void>): Promise<void> {
    if (!this.channel) throw new Error('QueueSystem not connected');

    for (const [type, queue] of Object.entries(QUEUES)) {
      this.channel.consume(queue, async (msg) => {
        if (!msg) return;

        const job: SyncJob = JSON.parse(msg.content.toString());

        try {
          await handler(job);
          this.channel!.ack(msg);
        } catch (err) {
          if (job.retries < MAX_RETRIES) {
            job.retries++;
            await this.enqueue(job);
            logger.warn(`[Queue] Retrying job ${job.id} (attempt ${job.retries})`);
          } else {
            logger.error(`[Queue] Job ${job.id} exceeded max retries. Dead-lettering.`);
          }
          this.channel!.nack(msg, false, false);
        }
      });

      logger.info(`[Queue] Worker listening on ${queue}`);
    }
  }

  async stop(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    logger.info('[QueueSystem] Disconnected');
  }
}
