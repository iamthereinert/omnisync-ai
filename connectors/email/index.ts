import { logger } from '../../utils/logger';

export interface EmailMessage {
  id: string;
  provider: 'gmail' | 'outlook' | 'proton';
  from: string;
  to: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  receivedAt: Date;
  labels?: string[];
  threadId?: string;
  attachments?: Array<{ name: string; mimeType: string; size: number }>;
}

export interface EmailAdapter {
  name: string;
  connect(): Promise<void>;
  fetchRecent(limit?: number): Promise<EmailMessage[]>;
  watchInbox(callback: (msg: EmailMessage) => void): Promise<void>;
  disconnect(): Promise<void>;
}

export class EmailHub {
  private adapters: Map<string, EmailAdapter> = new Map();

  register(adapter: EmailAdapter): void {
    this.adapters.set(adapter.name, adapter);
    logger.info(`[EmailHub] Registered adapter: ${adapter.name}`);
  }

  async connectAll(): Promise<void> {
    for (const [name, adapter] of this.adapters) {
      try {
        await adapter.connect();
        logger.info(`[EmailHub] Connected: ${name}`);
      } catch (err) {
        logger.error(`[EmailHub] Failed to connect ${name}:`, err);
      }
    }
  }

  async fetchAll(limit = 50): Promise<EmailMessage[]> {
    const results: EmailMessage[] = [];

    for (const [name, adapter] of this.adapters) {
      try {
        const msgs = await adapter.fetchRecent(limit);
        results.push(...msgs);
        logger.info(`[EmailHub] Fetched ${msgs.length} from ${name}`);
      } catch (err) {
        logger.error(`[EmailHub] Fetch failed for ${name}:`, err);
      }
    }

    // Sort by received date, newest first
    return results.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
  }

  async watchAll(callback: (msg: EmailMessage) => void): Promise<void> {
    for (const [name, adapter] of this.adapters) {
      try {
        await adapter.watchInbox(callback);
        logger.info(`[EmailHub] Watching inbox: ${name}`);
      } catch (err) {
        logger.error(`[EmailHub] Watch failed for ${name}:`, err);
      }
    }
  }

  async disconnectAll(): Promise<void> {
    for (const [name, adapter] of this.adapters) {
      try {
        await adapter.disconnect();
        logger.info(`[EmailHub] Disconnected: ${name}`);
      } catch (err) {
        logger.error(`[EmailHub] Disconnect failed for ${name}:`, err);
      }
    }
  }
}
