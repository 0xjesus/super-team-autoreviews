/**
 * Queue Manager - Unified interface for BullMQ and Inngest
 *
 * Automatically selects the appropriate queue system based on environment:
 * - USE_BULLMQ=true + REDIS_URL -> BullMQ (for earn-agent/Railway)
 * - Otherwise -> Inngest (for Vercel/standalone demo)
 *
 * This allows the same codebase to work in both environments.
 */

import type {
  QueueAdapter,
  QueueEvent,
  JobOptions,
  GitHubContextGenerateEvent,
  GitHubReviewBatchEvent,
} from "./types";
import { getBullMQAdapter, shouldUseBullMQ } from "./bullmq-adapter";
import { inngest } from "../inngest";

// Inngest adapter implementing the same interface
class InngestAdapter implements QueueAdapter {
  name = "Inngest";

  async isConnected(): Promise<boolean> {
    // Inngest is always "connected" as it's serverless
    return true;
  }

  async send<T>(event: QueueEvent<T>, _options?: JobOptions): Promise<string> {
    // Map our event names to Inngest event names
    const inngestEventName = this.mapEventName(event.name);

    await inngest.send({
      name: inngestEventName as any,
      data: event.data as any,
    });

    // Inngest doesn't return job IDs in the same way
    return `inngest-${Date.now()}`;
  }

  async sendBatch<T>(
    events: QueueEvent<T>[],
    options?: JobOptions
  ): Promise<string[]> {
    const ids: string[] = [];
    for (const event of events) {
      const id = await this.send(event, options);
      ids.push(id);
    }
    return ids;
  }

  private mapEventName(eventName: string): string {
    // Map our generic event names to Inngest-specific names
    const mapping: Record<string, string> = {
      "github.context.generate": "github/submission.received",
      "github.review.single": "github/submission.received",
      "github.review.batch": "github/batch.review",
      "github.review.completed": "github/review.completed",
    };
    return mapping[eventName] || eventName;
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    // Inngest stats would require API call to Inngest dashboard
    // For now, return placeholder
    return { waiting: 0, active: 0, completed: 0, failed: 0 };
  }

  async close(): Promise<void> {
    // Inngest is serverless, no cleanup needed
  }
}

// Queue manager singleton
class QueueManager {
  private adapter: QueueAdapter | null = null;
  private adapterType: "bullmq" | "inngest" | null = null;

  async getAdapter(): Promise<QueueAdapter> {
    if (this.adapter) {
      return this.adapter;
    }

    if (shouldUseBullMQ()) {
      console.log("[QueueManager] Using BullMQ adapter");
      this.adapter = getBullMQAdapter();
      this.adapterType = "bullmq";
    } else {
      console.log("[QueueManager] Using Inngest adapter");
      this.adapter = new InngestAdapter();
      this.adapterType = "inngest";
    }

    return this.adapter;
  }

  getAdapterType(): "bullmq" | "inngest" | null {
    return this.adapterType;
  }

  // Convenience methods
  async sendSubmissionForReview(
    data: GitHubContextGenerateEvent,
    options?: JobOptions
  ): Promise<string> {
    const adapter = await this.getAdapter();
    return adapter.send(
      {
        name: "github.context.generate",
        data,
        timestamp: new Date(),
      },
      options
    );
  }

  async triggerBatchReview(
    data: GitHubReviewBatchEvent,
    options?: JobOptions
  ): Promise<string> {
    const adapter = await this.getAdapter();
    return adapter.send(
      {
        name: "github.review.batch",
        data,
        timestamp: new Date(),
      },
      options
    );
  }

  async getStats(): Promise<{
    adapter: string;
    stats: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
  }> {
    const adapter = await this.getAdapter();
    const stats = await adapter.getQueueStats();
    return {
      adapter: adapter.name,
      stats,
    };
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    adapter: string;
    details: string;
  }> {
    try {
      const adapter = await this.getAdapter();
      const isConnected = await adapter.isConnected();
      return {
        healthy: isConnected,
        adapter: adapter.name,
        details: isConnected ? "Connected" : "Connection failed",
      };
    } catch (error) {
      return {
        healthy: false,
        adapter: this.adapterType || "unknown",
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Export singleton
export const queueManager = new QueueManager();

// Export configuration info for debugging
export function getQueueConfig(): {
  useBullMQ: boolean;
  redisConfigured: boolean;
  inngestConfigured: boolean;
} {
  return {
    useBullMQ: shouldUseBullMQ(),
    redisConfigured: !!process.env.REDIS_URL,
    inngestConfigured: !!process.env.INNGEST_EVENT_KEY,
  };
}
