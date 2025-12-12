"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bot,
  Github,
  BookOpen,
  ArrowLeft,
  Copy,
  Check,
  Database,
  Server,
  Zap,
  Code2,
  Settings,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

const DOCUMENTATION = `# Superteam Earn Integration Guide

This document describes how to integrate the GitHub Auto-Review system with the existing earn-service and earn-agent infrastructure.

## Architecture Overview

\`\`\`
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
\`\`\`

## Database Migration: PostgreSQL → MySQL

The standalone demo uses PostgreSQL (Neon). For earn-service integration, migrate to MySQL.

### Option 1: Drizzle MySQL Dialect

\`\`\`typescript
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
\`\`\`

### Option 2: Use Existing earn-service Tables

Add columns to existing \`Submission\` table:

\`\`\`sql
-- Migration for existing earn-service MySQL
ALTER TABLE Submission ADD COLUMN ai_github_score INT DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_label VARCHAR(50) DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_notes TEXT DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_model VARCHAR(100) DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_cost DECIMAL(10,6) DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_reviewed_at TIMESTAMP DEFAULT NULL;
\`\`\`

## Queue Integration

### BullMQ Configuration

\`\`\`typescript
// Environment variables for Railway
REDIS_URL=redis://default:password@containers-us-west-1.railway.app:6379
USE_BULLMQ=true
\`\`\`

### Event Types for earn-agent

\`\`\`typescript
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
\`\`\`

## AI Provider Configuration

### OpenRouter (Recommended for earn-agent)

\`\`\`bash
OPENROUTER_API_KEY=sk-or-v1-xxxxx
AI_MODEL=anthropic/claude-3.5-sonnet  # Best for code review
\`\`\`

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

\`\`\`typescript
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
\`\`\`

### Callback to earn-service

\`\`\`typescript
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
\`\`\`

## Dashboard Integration

### React Components Export

\`\`\`typescript
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
\`\`\`

## Environment Variables Summary

\`\`\`bash
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
\`\`\`

## Testing Integration

\`\`\`bash
# Run all tests
pnpm test

# Run accuracy validation (requires API keys)
pnpm test tests/validation/accuracy.test.ts

# Run edge case tests
pnpm test tests/integration/edge-cases.test.ts
\`\`\`

## Deployment Checklist

- [ ] MySQL schema migrated
- [ ] Redis/BullMQ configured on Railway
- [ ] OpenRouter API key configured
- [ ] GitHub token with repo access
- [ ] Webhook endpoints registered in earn-service
- [ ] Cron job scheduled for deadline reviews
- [ ] Dashboard components integrated
- [ ] Callback authentication configured
`;

export default function DocsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <main className="min-h-screen bg-grid">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Demo</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#00C2FF]" />
              <h1 className="font-bold">Integration Documentation</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/0xJesus/super-team-autoreviews"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <Github className="w-3 h-3" />
              Source Code
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-8 px-4 border-b border-gray-800">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl gradient-button flex items-center justify-center">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Earn Integration Guide</h1>
              <p className="text-gray-400 text-sm">
                Complete documentation for integrating GitHub Auto-Review with earn-service
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { icon: Database, label: "Database", color: "#DC1FFF", href: "#database-migration" },
              { icon: Server, label: "Queue", color: "#00C2FF", href: "#queue-integration" },
              { icon: Zap, label: "AI Providers", color: "#00FFA3", href: "#ai-provider-configuration" },
              { icon: Settings, label: "Environment", color: "#F59E0B", href: "#environment-variables-summary" },
            ].map(({ icon: Icon, label, color, href }) => (
              <a
                key={label}
                href={href}
                className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-gray-600 transition-colors flex items-center gap-2"
              >
                <Icon className="w-4 h-4" style={{ color }} />
                <span className="text-sm font-medium">{label}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Documentation Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="prose prose-invert prose-sm max-w-none
          prose-headings:text-white prose-headings:font-bold
          prose-h1:text-2xl prose-h1:border-b prose-h1:border-gray-800 prose-h1:pb-4 prose-h1:mb-6
          prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-[#DC1FFF]
          prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-[#00C2FF]
          prose-p:text-gray-300 prose-p:leading-relaxed
          prose-a:text-[#00FFA3] prose-a:no-underline hover:prose-a:underline
          prose-strong:text-white prose-strong:font-semibold
          prose-code:text-[#00C2FF] prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800 prose-pre:rounded-xl prose-pre:overflow-x-auto
          prose-li:text-gray-300 prose-li:marker:text-[#DC1FFF]
          prose-table:border prose-table:border-gray-800
          prose-th:bg-gray-800/50 prose-th:text-white prose-th:font-medium prose-th:p-3 prose-th:border prose-th:border-gray-700
          prose-td:p-3 prose-td:border prose-td:border-gray-800 prose-td:text-gray-300
        ">
          <ReactMarkdown
            components={{
              h2: ({ children, ...props }) => (
                <h2 id={children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-')} {...props}>
                  {children}
                </h2>
              ),
              pre: ({ children }) => (
                <div className="relative group">
                  <pre className="overflow-x-auto">{children}</pre>
                  <button
                    onClick={() => {
                      const code = (children as any)?.props?.children || '';
                      handleCopy(code, code.slice(0, 20));
                    }}
                    className="absolute top-2 right-2 p-2 rounded-lg bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copiedSection ? (
                      <Check className="w-4 h-4 text-[#00FFA3]" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              ),
            }}
          >
            {DOCUMENTATION}
          </ReactMarkdown>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 px-4 border-t border-gray-800 mt-12">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#DC1FFF]" />
              <span className="text-xs text-gray-400">GitHub Auto-Review for Superteam Earn</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <Link
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DC1FFF]/10 border border-[#DC1FFF]/30 text-[#DC1FFF] hover:bg-[#DC1FFF]/20 transition-colors"
              >
                <Code2 className="w-3 h-3" />
                Try Demo
              </Link>
              <a
                href="https://github.com/0xJesus/super-team-autoreviews"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <Github className="w-3 h-3" />
                Source Code
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
