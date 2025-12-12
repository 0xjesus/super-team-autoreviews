/**
 * Queue Event Types - Compatible with earn-agent architecture
 *
 * These event types mirror the earn-agent event structure for seamless integration
 */

export interface GitHubContextGenerateEvent {
  submissionId: string;
  externalId: string;
  listingId: string;
  githubUrl: string;
  bountyTitle?: string;
  bountyDescription?: string;
  requirements?: string[];
  techStack?: string[];
  model?: string;
}

export interface GitHubReviewSingleEvent {
  submissionId: string;
  context: {
    bountyTitle: string;
    bountyDescription: string;
    requirements: string[];
    techStack: string[];
  };
  githubData: {
    type: "pr" | "repository";
    owner: string;
    repo: string;
    prNumber?: number;
  };
  model?: string;
}

export interface GitHubReviewBatchEvent {
  listingId: string;
  submissionIds?: string[];
  afterDeadline?: boolean;
  triggeredBy: "cron" | "webhook" | "manual";
}

export interface GitHubReviewCompletedEvent {
  submissionId: string;
  externalId: string;
  listingId: string;
  review: {
    overallScore: number;
    label: string;
    summary: string;
    confidence: number;
  };
  processingTimeMs: number;
  modelUsed: string;
}

// Union type for all queue events
export type QueueEventType =
  | "github.context.generate"
  | "github.review.single"
  | "github.review.batch"
  | "github.review.completed";

export interface QueueEvent<T = unknown> {
  name: QueueEventType;
  data: T;
  timestamp: Date;
  attemptNumber?: number;
}

// Job options compatible with BullMQ
export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: "exponential" | "fixed";
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

// Queue system interface - implemented by both BullMQ and Inngest adapters
export interface QueueAdapter {
  name: string;
  isConnected(): Promise<boolean>;

  // Send events
  send<T>(event: QueueEvent<T>, options?: JobOptions): Promise<string>;
  sendBatch<T>(events: QueueEvent<T>[], options?: JobOptions): Promise<string[]>;

  // For monitoring
  getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }>;

  // Cleanup
  close(): Promise<void>;
}

// Earn-service callback interface for integration
export interface EarnServiceCallback {
  updateSubmissionLabel(
    submissionId: string,
    label: string,
    notes: string
  ): Promise<void>;

  notifyReviewComplete(
    submissionId: string,
    review: GitHubReviewCompletedEvent["review"]
  ): Promise<void>;
}
