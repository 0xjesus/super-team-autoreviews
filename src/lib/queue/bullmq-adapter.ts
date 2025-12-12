/**
 * BullMQ Adapter for earn-agent/Railway deployment
 *
 * This adapter implements the QueueAdapter interface using BullMQ + Redis,
 * which is the stack used by the existing earn-agent service.
 *
 * Features:
 * - Exponential backoff retry
 * - Priority queues
 * - Rate limiting
 * - Job progress tracking
 * - Dead letter queue for failed jobs
 */

import { Queue, Worker, Job, QueueEvents } from "bullmq";
import type { RedisOptions } from "ioredis";
import type {
  QueueAdapter,
  QueueEvent,
  JobOptions,
  GitHubContextGenerateEvent,
  GitHubReviewSingleEvent,
  GitHubReviewBatchEvent,
} from "./types";

// Queue names matching earn-agent conventions
export const QUEUE_NAMES = {
  GITHUB_CONTEXT: "github-context-generation",
  GITHUB_REVIEW: "github-review-processing",
  GITHUB_BATCH: "github-batch-review",
  NOTIFICATIONS: "review-notifications",
} as const;

// Default job options optimized for GitHub API rate limits
const DEFAULT_JOB_OPTIONS: JobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000, // Start with 5s, then 10s, then 20s
  },
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 50, // Keep last 50 failed jobs for debugging
};

export class BullMQAdapter implements QueueAdapter {
  name = "BullMQ";
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private redisOptions: RedisOptions;
  private isInitialized = false;

  constructor(redisUrl?: string) {
    // Parse Redis URL or use defaults
    const url = redisUrl || process.env.REDIS_URL;
    if (!url) {
      throw new Error("REDIS_URL environment variable is required for BullMQ");
    }

    this.redisOptions = this.parseRedisUrl(url);
  }

  private parseRedisUrl(url: string): RedisOptions {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 6379,
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      tls: parsed.protocol === "rediss:" ? {} : undefined,
      maxRetriesPerRequest: null, // Required for BullMQ
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Create queues for each job type
    for (const [key, queueName] of Object.entries(QUEUE_NAMES)) {
      const queue = new Queue(queueName, {
        connection: this.redisOptions,
        defaultJobOptions: {
          attempts: DEFAULT_JOB_OPTIONS.attempts,
          backoff: DEFAULT_JOB_OPTIONS.backoff,
          removeOnComplete: DEFAULT_JOB_OPTIONS.removeOnComplete,
          removeOnFail: DEFAULT_JOB_OPTIONS.removeOnFail,
        },
      });

      const queueEvents = new QueueEvents(queueName, {
        connection: this.redisOptions,
      });

      this.queues.set(queueName, queue);
      this.queueEvents.set(queueName, queueEvents);
    }

    this.isInitialized = true;
    console.log("[BullMQ] Initialized with queues:", Object.values(QUEUE_NAMES));
  }

  async isConnected(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      // Check if any queue can ping Redis
      const queue = this.queues.get(QUEUE_NAMES.GITHUB_REVIEW);
      if (!queue) return false;

      // BullMQ queues are connected if they can get waiting count
      await queue.getWaitingCount();
      return true;
    } catch (error) {
      console.error("[BullMQ] Connection check failed:", error);
      return false;
    }
  }

  async send<T>(event: QueueEvent<T>, options?: JobOptions): Promise<string> {
    await this.initialize();

    const queueName = this.getQueueForEvent(event.name);
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue not found for event: ${event.name}`);
    }

    const jobOptions = { ...DEFAULT_JOB_OPTIONS, ...options };

    const job = await queue.add(event.name, event.data, {
      priority: jobOptions.priority,
      delay: jobOptions.delay,
      attempts: jobOptions.attempts,
      backoff: jobOptions.backoff,
      removeOnComplete: jobOptions.removeOnComplete,
      removeOnFail: jobOptions.removeOnFail,
    });

    console.log(`[BullMQ] Job added: ${event.name} -> ${job.id}`);
    return job.id || "";
  }

  async sendBatch<T>(
    events: QueueEvent<T>[],
    options?: JobOptions
  ): Promise<string[]> {
    const jobIds: string[] = [];

    for (const event of events) {
      const jobId = await this.send(event, options);
      jobIds.push(jobId);
    }

    return jobIds;
  }

  private getQueueForEvent(eventName: string): string {
    switch (eventName) {
      case "github.context.generate":
        return QUEUE_NAMES.GITHUB_CONTEXT;
      case "github.review.single":
        return QUEUE_NAMES.GITHUB_REVIEW;
      case "github.review.batch":
        return QUEUE_NAMES.GITHUB_BATCH;
      case "github.review.completed":
        return QUEUE_NAMES.NOTIFICATIONS;
      default:
        return QUEUE_NAMES.GITHUB_REVIEW;
    }
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    await this.initialize();

    let waiting = 0;
    let active = 0;
    let completed = 0;
    let failed = 0;

    for (const queue of this.queues.values()) {
      waiting += await queue.getWaitingCount();
      active += await queue.getActiveCount();
      completed += await queue.getCompletedCount();
      failed += await queue.getFailedCount();
    }

    return { waiting, active, completed, failed };
  }

  // Register a worker for processing jobs
  async registerWorker(
    queueName: string,
    processor: (job: Job) => Promise<unknown>,
    concurrency = 5
  ): Promise<void> {
    await this.initialize();

    const worker = new Worker(queueName, processor, {
      connection: this.redisOptions,
      concurrency,
      limiter: {
        max: 10, // Max 10 jobs per duration
        duration: 1000, // Per second - respects GitHub rate limits
      },
    });

    worker.on("completed", (job) => {
      console.log(`[BullMQ] Job completed: ${job.id}`);
    });

    worker.on("failed", (job, err) => {
      console.error(`[BullMQ] Job failed: ${job?.id}`, err.message);
    });

    worker.on("error", (err) => {
      console.error("[BullMQ] Worker error:", err);
    });

    this.workers.set(queueName, worker);
    console.log(`[BullMQ] Worker registered for queue: ${queueName}`);
  }

  async close(): Promise<void> {
    // Close all workers
    for (const worker of this.workers.values()) {
      await worker.close();
    }

    // Close all queue events
    for (const queueEvents of this.queueEvents.values()) {
      await queueEvents.close();
    }

    // Close all queues
    for (const queue of this.queues.values()) {
      await queue.close();
    }

    this.workers.clear();
    this.queueEvents.clear();
    this.queues.clear();
    this.isInitialized = false;

    console.log("[BullMQ] All connections closed");
  }

  // Helper to get a specific queue for direct access
  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }
}

// Singleton instance for the application
let bullmqInstance: BullMQAdapter | null = null;

export function getBullMQAdapter(): BullMQAdapter {
  if (!bullmqInstance) {
    bullmqInstance = new BullMQAdapter();
  }
  return bullmqInstance;
}

// Check if BullMQ should be used based on environment
export function shouldUseBullMQ(): boolean {
  return (
    process.env.USE_BULLMQ === "true" &&
    !!process.env.REDIS_URL
  );
}
