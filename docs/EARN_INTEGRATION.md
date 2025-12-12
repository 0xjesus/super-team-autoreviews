# Superteam Earn Integration Guide

This document describes how to integrate the GitHub Auto-Review system with the existing earn-service and earn-agent infrastructure.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EARN ECOSYSTEM                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────────┐  │
│  │ earn-service│────▶│   Redis     │◀────│    earn-agent               │  │
│  │  (Next.js)  │     │   Queue     │     │  (Current: Writing/Grants)  │  │
│  └─────────────┘     └─────────────┘     └─────────────────────────────┘  │
│        │                   │                          │                    │
│        │                   ▼                          │                    │
│        │           ┌─────────────┐                    │                    │
│        │           │   BullMQ    │                    │                    │
│        │           │   Workers   │                    │                    │
│        │           └─────────────┘                    │                    │
│        │                   │                          │                    │
│        ▼                   ▼                          ▼                    │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    GitHub Auto-Review Module                         │  │
│  │  ┌───────────────┐  ┌───────────────┐  ┌────────────────────────┐  │  │
│  │  │ Queue Adapter │  │ GitHub Fetch  │  │   AI Review Engine     │  │  │
│  │  │ (BullMQ/     │  │ (Octokit)     │  │ (Vercel AI SDK +       │  │  │
│  │  │  Inngest)    │  │               │  │  OpenRouter/Gemini)    │  │  │
│  │  └───────────────┘  └───────────────┘  └────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Database Migration: PostgreSQL → MySQL

The standalone demo uses PostgreSQL (Neon). For earn-service integration, migrate to MySQL.

### Option 1: Drizzle MySQL Dialect

```typescript
// src/lib/db/mysql-schema.ts
import { mysqlTable, varchar, int, text, json, timestamp, mysqlEnum } from 'drizzle-orm/mysql-core';

// Same schema, different dialect
export const submissions = mysqlTable('github_submissions', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  externalId: varchar('external_id', { length: 255 }).notNull(),
  listingId: varchar('listing_id', { length: 255 }).notNull(),
  githubUrl: varchar('github_url', { length: 500 }).notNull(),
  githubType: mysqlEnum('github_type', ['pr', 'repository']).notNull(),
  owner: varchar('owner', { length: 255 }),
  repo: varchar('repo', { length: 255 }),
  prNumber: int('pr_number'),
  bountyTitle: varchar('bounty_title', { length: 500 }),
  status: mysqlEnum('status', ['pending', 'fetching', 'analyzing', 'completed', 'failed']).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
});

export const reviews = mysqlTable('github_reviews', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  submissionId: varchar('submission_id', { length: 36 }).notNull(),
  overallScore: int('overall_score'),
  confidence: varchar('confidence', { length: 10 }),
  requirementMatchScore: int('requirement_match_score'),
  codeQualityScore: int('code_quality_score'),
  completenessScore: int('completeness_score'),
  securityScore: int('security_score'),
  summary: text('summary'),
  detailedNotes: text('detailed_notes'),
  labels: json('labels').$type<string[]>(),
  redFlags: json('red_flags'),
  matchedRequirements: json('matched_requirements').$type<string[]>(),
  missingRequirements: json('missing_requirements').$type<string[]>(),
  modelUsed: varchar('model_used', { length: 100 }),
  tokensUsed: int('tokens_used'),
  processingTimeMs: int('processing_time_ms'),
  estimatedCost: varchar('estimated_cost', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Option 2: Use Existing earn-service Tables

Add columns to existing `Submission` table:

```sql
-- Migration for existing earn-service MySQL
ALTER TABLE Submission ADD COLUMN ai_github_score INT DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_label VARCHAR(50) DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_notes TEXT DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_model VARCHAR(100) DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_cost DECIMAL(10,6) DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_reviewed_at TIMESTAMP DEFAULT NULL;
```

## Queue Integration

### BullMQ Configuration

```typescript
// Environment variables for Railway
REDIS_URL=redis://default:password@containers-us-west-1.railway.app:6379
USE_BULLMQ=true
```

### Event Types for earn-agent

```typescript
// These events integrate with existing earn-agent architecture
type EarnAgentGitHubEvents = {
  // Triggered when a GitHub submission is created
  'github.context.generate': {
    submissionId: string;
    externalId: string;
    listingId: string;
    githubUrl: string;
    bountyTitle?: string;
    bountyDescription?: string;
    requirements?: string[];
    techStack?: string[];
  };

  // Triggered for individual review
  'github.review.single': {
    submissionId: string;
    context: BountyContext;
    githubData: GitHubData;
  };

  // Triggered at listing deadline
  'github.review.batch': {
    listingId: string;
    submissionIds?: string[];
    afterDeadline: boolean;
    triggeredBy: 'cron' | 'webhook' | 'manual';
  };

  // Sent when review is complete
  'github.review.completed': {
    submissionId: string;
    externalId: string;
    review: {
      overallScore: number;
      label: EarnLabel;
      summary: string;
      confidence: number;
    };
  };
};
```

### Worker Registration

```typescript
// src/lib/queue/workers.ts
import { Worker } from 'bullmq';
import { QUEUE_NAMES } from './bullmq-adapter';

export function registerWorkers(redisConnection: RedisOptions) {
  // Context generation worker
  new Worker(
    QUEUE_NAMES.GITHUB_CONTEXT,
    async (job) => {
      const { submissionId, githubUrl } = job.data;
      // Fetch GitHub data and store in cache
      const result = await fetchRepositoryDataSafe(githubUrl);
      return result;
    },
    { connection: redisConnection, concurrency: 5 }
  );

  // Review processing worker
  new Worker(
    QUEUE_NAMES.GITHUB_REVIEW,
    async (job) => {
      const { submissionId, context, githubData } = job.data;
      // Generate AI review
      const review = await generateReview(context, githubData);
      return review;
    },
    {
      connection: redisConnection,
      concurrency: 10,
      limiter: { max: 10, duration: 1000 }, // Rate limiting
    }
  );
}
```

## AI Provider Configuration

### OpenRouter (Recommended for earn-agent)

```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxx
AI_MODEL=anthropic/claude-3.5-sonnet  # Best for code review
```

### Available Models via OpenRouter

| Model | Cost/1M Input | Cost/1M Output | Notes |
|-------|---------------|----------------|-------|
| anthropic/claude-3.5-sonnet | $3.00 | $15.00 | Best for code understanding |
| anthropic/claude-3-haiku | $0.25 | $1.25 | Fast and affordable |
| meta-llama/llama-3.1-70b | $0.35 | $0.40 | Open source, good quality |
| deepseek/deepseek-coder | $0.14 | $0.28 | Code-specialized, very cheap |
| mistralai/codestral | $0.30 | $0.90 | Specialized for code |

## Webhook Endpoints

### For earn-service Integration

```typescript
// POST /api/webhooks/earn
// Called by earn-service when:
// 1. New GitHub submission created
// 2. Listing deadline reached
// 3. Manual batch review requested

interface EarnWebhook {
  event: 'submission.created' | 'listing.deadline' | 'batch.review';
  data: {
    submissionId?: string;
    listingId: string;
    githubUrl?: string;
    listing?: {
      title: string;
      description: string;
      requirements: string[];
      techStack: string[];
      deadline?: string;
    };
  };
}
```

### Callback to earn-service

```typescript
// The auto-review system calls back to earn-service when review is complete
interface ReviewCallback {
  submissionId: string;
  externalId: string;
  review: {
    label: 'Shortlisted' | 'High_Quality' | 'Mid_Quality' | 'Low_Quality' | 'Needs_Review' | 'Spam';
    score: number;
    notes: string;
    confidence: number;
  };
  meta: {
    modelUsed: string;
    tokensUsed: number;
    processingTimeMs: number;
    estimatedCost: number;
  };
}

// Endpoint in earn-service to receive callback
// POST /api/internal/github-review-complete
```

## Dashboard Integration

### React Components Export

```typescript
// Import in earn-service sponsor dashboard
import {
  GitHubReviewPanel,
  ReviewScoreBadge,
  ReviewDetailModal,
} from '@superteam/github-autoreview/components';

// Usage in sponsor dashboard
<GitHubReviewPanel
  submissionId={submission.id}
  review={submission.ai?.github}
  onLabelChange={(label) => updateSubmissionLabel(submission.id, label)}
/>
```

## Cron Job Setup

### Deadline-Based Review Trigger

```typescript
// Runs every 15 minutes on Railway
// Checks for listings past deadline with pending reviews

import { CronJob } from 'cron';

const reviewCron = new CronJob('*/15 * * * *', async () => {
  // Find listings past deadline
  const expiredListings = await db
    .select()
    .from(listings)
    .where(
      and(
        lte(listings.deadline, new Date()),
        eq(listings.type, 'github'),
        eq(listings.reviewsProcessed, false)
      )
    );

  for (const listing of expiredListings) {
    await queueManager.triggerBatchReview({
      listingId: listing.id,
      afterDeadline: true,
      triggeredBy: 'cron',
    });
  }
});
```

## Environment Variables Summary

```bash
# Database
DATABASE_URL=mysql://user:pass@host:3306/earn_db

# Queue (Railway Redis)
REDIS_URL=redis://default:pass@host:6379
USE_BULLMQ=true

# AI Providers (at least one required)
OPENROUTER_API_KEY=sk-or-v1-xxxxx  # Recommended
OPENAI_API_KEY=sk-xxxxx            # Optional
GEMINI_API_KEY=AIzaxxxxx           # Optional

# GitHub
GITHUB_TOKEN=ghp_xxxxx

# App
NEXT_PUBLIC_APP_URL=https://earn.superteam.fun
EARN_SERVICE_CALLBACK_URL=https://earn.superteam.fun/api/internal/github-review-complete
EARN_SERVICE_API_KEY=xxxxx  # For authenticated callbacks
```

## Testing Integration

```bash
# Run all tests
pnpm test

# Run accuracy validation (requires API keys)
pnpm test tests/validation/accuracy.test.ts

# Run edge case tests
pnpm test tests/integration/edge-cases.test.ts
```

## Deployment Checklist

- [ ] MySQL schema migrated
- [ ] Redis/BullMQ configured on Railway
- [ ] OpenRouter API key configured
- [ ] GitHub token with repo access
- [ ] Webhook endpoints registered in earn-service
- [ ] Cron job scheduled for deadline reviews
- [ ] Dashboard components integrated
- [ ] Callback authentication configured
