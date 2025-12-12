/**
 * Queue System Abstraction
 *
 * Supports both BullMQ (for earn-agent/Railway deployment) and Inngest (for Vercel/demo)
 * The system auto-detects which to use based on environment variables.
 *
 * For earn-agent integration: Set REDIS_URL and USE_BULLMQ=true
 * For standalone/demo: Uses Inngest by default
 */

export * from "./types";
export * from "./bullmq-adapter";
export * from "./queue-manager";
