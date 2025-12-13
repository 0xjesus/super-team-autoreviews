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
  Play,
  FileCode,
  GitPullRequest,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

const DOCUMENTATION = `# GitHub Auto-Review System for Superteam Earn

This system solves the core problem: **Superteam Earn processes many GitHub submissions but relies on slow manual reviews that don't scale.** This AI-powered auto-review system automatically evaluates public PRs and repositories, generates feedback, and assigns scores.

---

## What This Demo Shows

The interactive demo on the home page demonstrates the complete auto-review workflow:

### 1. Bounty Context Selection
Select from pre-configured bounty scenarios or create custom ones:
- **Token Swap Interface** - Frontend bounty with wallet integration requirements
- **NFT Marketplace Contract** - Smart contract bounty with Anchor/Rust requirements
- **DAO Voting System** - Full-stack bounty with governance requirements

Each bounty includes:
- Full description with scope
- Specific requirements to match against
- Expected tech stack

### 2. GitHub Submission Analysis
Submit any public GitHub URL:
- **Repository analysis** - Evaluates entire codebases
- **Pull Request analysis** - Evaluates specific PRs with diffs

The system fetches:
- File tree structure
- Source code of key files (prioritized by importance)
- PR metadata, commits, and diffs (for PRs)
- Language detection

### 3. AI-Powered Review
The AI analyzes the submission against bounty requirements:
- **Requirement Matching** - Which requirements are met, with file evidence
- **Code Quality Analysis** - Best practices, patterns, issues found
- **Security Analysis** - Vulnerability detection, Solana-specific checks
- **Completeness Score** - What's implemented vs missing

### 4. Scoring & Labels
Automatic label assignment based on scores:
- **Shortlisted** (85+) - Exceptional submission
- **High Quality** (70-84) - Strong submission
- **Mid Quality** (50-69) - Acceptable with gaps
- **Low Quality** (30-49) - Significant issues
- **Needs Review** - Requires human attention (security concerns)
- **Spam** (<30) - Low effort or irrelevant

### 5. Database Persistence
All reviews are saved with full metadata:
- Scores breakdown
- Matched/missing requirements
- Red flags detected
- Processing costs and time
- Model used

---

## How It Integrates with Earn Service

### Architecture Overview

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                    EARN ECOSYSTEM                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐       ┌─────────────────────────────────┐ │
│  │  earn-service   │──────▶│          Redis/BullMQ           │ │
│  │   (Next.js)     │       │                                 │ │
│  │                 │       │   github.review.single          │ │
│  │  - Submissions  │       │   github.review.batch           │ │
│  │  - Sponsor UI   │◀──────│   github.context.generate       │ │
│  └─────────────────┘       └─────────────────────────────────┘ │
│          │                              │                       │
│          │                              ▼                       │
│          │                 ┌─────────────────────────────────┐ │
│          │                 │   GitHub Auto-Review Workers    │ │
│          │                 │                                 │ │
│          │                 │   1. Fetch GitHub data          │ │
│          │                 │   2. Generate AI review         │ │
│          │                 │   3. Return scores + notes      │ │
│          │                 └─────────────────────────────────┘ │
│          │                              │                       │
│          ▼                              ▼                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                     MySQL Database                         │ │
│  │   Submission.ai_github_score, ai_github_label, etc.       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

### Event Flow

**1. Submission Created Event**
\`\`\`typescript
// When a GitHub submission is created in earn-service
await queue.add('github.context.generate', {
  submissionId: submission.id,
  listingId: listing.id,
  githubUrl: submission.link,
  bountyContext: {
    title: listing.title,
    description: listing.description,
    requirements: listing.requirements,
    techStack: listing.skills,
  }
});
\`\`\`

**2. Review Processing**
\`\`\`typescript
// Worker processes the review
const worker = new Worker('github.review', async (job) => {
  const { submissionId, githubUrl, bountyContext } = job.data;

  // Fetch GitHub data
  const githubData = await fetchRepositoryData(githubUrl);

  // Generate AI review
  const review = await generateReview(bountyContext, githubData);

  // Return result
  return {
    score: review.totalScore,
    label: review.label,
    notes: review.summary,
    breakdown: review.scores,
  };
});
\`\`\`

**3. Batch Review (Cron/Deadline)**
\`\`\`typescript
// Triggered when listing deadline passes
await queue.add('github.review.batch', {
  listingId: listing.id,
  triggeredBy: 'deadline',
});

// Worker processes all pending submissions
const batchWorker = new Worker('github.review.batch', async (job) => {
  const submissions = await getUnreviewedSubmissions(job.data.listingId);

  for (const submission of submissions) {
    await queue.add('github.review.single', {
      submissionId: submission.id,
      // ...
    });
  }
});
\`\`\`

---

## Database Integration

### Option 1: Add Columns to Existing Submission Table

\`\`\`sql
-- Migration for earn-service MySQL
ALTER TABLE Submission ADD COLUMN ai_github_score INT DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_label ENUM(
  'Shortlisted', 'High_Quality', 'Mid_Quality',
  'Low_Quality', 'Needs_Review', 'Spam'
) DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_summary TEXT DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_notes TEXT DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_matched_reqs JSON DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_missing_reqs JSON DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_red_flags JSON DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_model VARCHAR(100) DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_cost DECIMAL(10,6) DEFAULT NULL;
ALTER TABLE Submission ADD COLUMN ai_github_reviewed_at TIMESTAMP DEFAULT NULL;
\`\`\`

### Option 2: Separate Reviews Table

\`\`\`sql
CREATE TABLE github_reviews (
  id VARCHAR(36) PRIMARY KEY,
  submission_id VARCHAR(36) NOT NULL,
  overall_score INT,
  label VARCHAR(50),
  requirement_match_score INT,
  code_quality_score INT,
  completeness_score INT,
  security_score INT,
  summary TEXT,
  detailed_notes TEXT,
  matched_requirements JSON,
  missing_requirements JSON,
  red_flags JSON,
  model_used VARCHAR(100),
  tokens_used INT,
  processing_time_ms INT,
  estimated_cost DECIMAL(10,6),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES Submission(id)
);
\`\`\`

---

## Sponsor Dashboard Integration

### React Components

The demo includes exportable React components for the sponsor dashboard:

\`\`\`typescript
// Import in earn-service
import {
  GitHubReviewPanel,
  ReviewScoreBadge,
  ReviewLabelsDisplay,
  ReviewDetailModal
} from './components/earn';

// Usage in sponsor submission view
<GitHubReviewPanel
  review={submission.aiGithubReview}
  onLabelChange={(label) => updateLabel(submission.id, label)}
/>
\`\`\`

### Review Panel Features
- Overall score with color-coded badge
- Score breakdown (Requirements, Quality, Security, Completeness)
- Matched/Missing requirements lists
- Red flags with severity indicators
- Full AI analysis notes (markdown rendered)
- One-click label override

---

## API Endpoints

### POST /api/demo/analyze
Analyzes a GitHub submission (used by the demo):

\`\`\`typescript
// Request
{
  githubUrl: "https://github.com/owner/repo",
  bountyTitle: "Token Swap Interface",
  bountyDescription: "Build a production-ready...",
  requirements: ["Wallet integration", "Jupiter SDK", ...],
  techStack: ["React", "TypeScript", "Solana"],
  model: "gemini-2.5-flash" // or "gpt-4o", "claude-3.5-sonnet"
}

// Response
{
  success: true,
  evaluation: {
    totalScore: 85,
    finalLabel: "Shortlisted",
    notes: "Excellent implementation...",
    github: {
      requirementMatch: { score: 90, matched: [...], missing: [...] },
      codeQuality: { score: 85, strengths: [...], issues: [...] },
      security: { score: 80, findings: [...] },
      completeness: { score: 88, implemented: [...], missing: [...] }
    },
    confidence: 0.92,
    modelUsed: "gemini-2.5-flash",
    tokensUsed: 15420,
    estimatedCost: 0.0023
  }
}
\`\`\`

### GET /api/reviews
Fetches saved reviews with pagination:

\`\`\`typescript
// GET /api/reviews?limit=20&listingId=xxx

// Response
{
  reviews: [...],
  total: 150,
  hasMore: true
}
\`\`\`

### POST /api/webhooks/earn
Webhook endpoint for earn-service to trigger reviews:

\`\`\`typescript
// Request from earn-service
{
  event: "submission.created",
  data: {
    submissionId: "sub_123",
    listingId: "list_456",
    githubUrl: "https://github.com/...",
    listing: {
      title: "...",
      description: "...",
      requirements: [...]
    }
  }
}
\`\`\`

---

## Edge Cases Handled

The system handles various edge cases gracefully:

| Scenario | Handling |
|----------|----------|
| Empty repository | Returns specific error, suggests checking repo |
| Private repository | Detects 404, explains access limitation |
| Very large repo | Limits file fetching, prioritizes key files |
| Rate limiting | Implements backoff, reports remaining quota |
| Closed PR | Still analyzes, notes PR status |
| No README | Proceeds with source analysis only |
| Binary files | Skips, focuses on source code |
| Shallow content | Adjusts confidence score accordingly |

---

## AI Provider Configuration

### Supported Providers

| Provider | Models | Best For |
|----------|--------|----------|
| Google Gemini | gemini-2.5-flash, gemini-2.0-flash | Fast, cost-effective |
| OpenAI | gpt-4o, gpt-4o-mini | High accuracy |
| OpenRouter | claude-3.5-sonnet, llama-3.1-70b, deepseek-coder | Flexibility |

### Environment Variables

\`\`\`bash
# At least one AI provider required
GEMINI_API_KEY=AIza...        # Google AI Studio
OPENAI_API_KEY=sk-...         # OpenAI direct
OPENROUTER_API_KEY=sk-or-...  # OpenRouter (access to all models)

# GitHub access
GITHUB_TOKEN=ghp_...          # For API rate limits

# Database
DATABASE_URL=mysql://...      # Production MySQL

# Queue (for earn-agent integration)
REDIS_URL=redis://...
USE_BULLMQ=true
\`\`\`

---

## Testing

### Accuracy Validation

The system tracks accuracy against human reviews:

\`\`\`typescript
// Record validation when human overrides AI label
await recordValidation({
  submissionId: "...",
  aiScore: 75,
  aiLabel: "High_Quality",
  humanScore: 70,
  humanLabel: "High_Quality", // Match!
});

// Get accuracy metrics
const metrics = await getAccuracySummary();
// { overallAccuracy: 82.5, scoreAccuracy: 78.3, labelAccuracy: 86.7 }
\`\`\`

### Running Tests

\`\`\`bash
# All tests
pnpm test

# Accuracy validation tests
pnpm test tests/validation/accuracy.test.ts

# Edge case tests
pnpm test tests/integration/edge-cases.test.ts
\`\`\`

---

## Success Criteria

This implementation meets the bounty requirements:

✅ **End-to-end functionality** - Complete flow from submission to scored review
✅ **BullMQ/Redis integration** - Queue adapter ready for earn-agent
✅ **Multiple AI providers** - Gemini, OpenAI, OpenRouter supported
✅ **Edge case handling** - Empty repos, large PRs, rate limits, etc.
✅ **Sponsor dashboard components** - Exportable React components
✅ **Accuracy tracking** - Validation system for continuous improvement
✅ **Clear documentation** - This guide + inline code comments
✅ **Real-world testing** - Demo with actual GitHub repos/PRs

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
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Demo</span>
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#00FFA3]" />
            <h1 className="font-bold">Documentation</h1>
          </div>
          <a
            href="https://github.com/0xjesus/super-team-autoreviews"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <Github className="w-3 h-3" />
            Source Code
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="py-8 px-4 border-b border-gray-800 bg-gradient-to-b from-[#DC1FFF]/5 to-transparent">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl gradient-button flex items-center justify-center">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">GitHub Auto-Review System</h1>
              <p className="text-gray-400">
                AI-powered submission review for Superteam Earn bounties
              </p>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Play, label: "Live Demo", desc: "Try it now", color: "#DC1FFF", href: "/" },
              { icon: GitPullRequest, label: "PR & Repo", desc: "Both supported", color: "#00C2FF" },
              { icon: CheckCircle2, label: "Auto Labels", desc: "6 categories", color: "#00FFA3" },
              { icon: BarChart3, label: "Accuracy", desc: "Tracked metrics", color: "#F59E0B" },
            ].map(({ icon: Icon, label, desc, color, href }) => (
              href ? (
                <Link
                  key={label}
                  href={href}
                  className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-gray-500 transition-colors"
                >
                  <Icon className="w-5 h-5 mb-2" style={{ color }} />
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-gray-500">{desc}</div>
                </Link>
              ) : (
                <div
                  key={label}
                  className="p-3 rounded-lg bg-gray-800/50 border border-gray-700"
                >
                  <Icon className="w-5 h-5 mb-2" style={{ color }} />
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-gray-500">{desc}</div>
                </div>
              )
            ))}
          </div>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="py-6 px-4 border-b border-gray-800">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-sm font-medium text-gray-400 mb-3">CONTENTS</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            {[
              { label: "What the Demo Shows", href: "#what-this-demo-shows" },
              { label: "Earn Integration", href: "#how-it-integrates-with-earn-service" },
              { label: "Database Schema", href: "#database-integration" },
              { label: "Dashboard Components", href: "#sponsor-dashboard-integration" },
              { label: "API Endpoints", href: "#api-endpoints" },
              { label: "Edge Cases", href: "#edge-cases-handled" },
              { label: "AI Providers", href: "#ai-provider-configuration" },
              { label: "Testing", href: "#testing" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-[#DC1FFF]/50 hover:text-[#DC1FFF] transition-colors"
              >
                {label}
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
          prose-h4:text-base prose-h4:mt-4 prose-h4:mb-2 prose-h4:text-[#00FFA3]
          prose-p:text-gray-300 prose-p:leading-relaxed
          prose-a:text-[#00FFA3] prose-a:no-underline hover:prose-a:underline
          prose-strong:text-white prose-strong:font-semibold
          prose-code:text-[#00C2FF] prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800 prose-pre:rounded-xl prose-pre:overflow-x-auto
          prose-li:text-gray-300 prose-li:marker:text-[#DC1FFF]
          prose-table:border prose-table:border-gray-800
          prose-th:bg-gray-800/50 prose-th:text-white prose-th:font-medium prose-th:p-3 prose-th:border prose-th:border-gray-700
          prose-td:p-3 prose-td:border prose-td:border-gray-800 prose-td:text-gray-300
          prose-hr:border-gray-800
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
            <div className="flex items-center gap-3 text-[11px]">
              <Link
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DC1FFF]/10 border border-[#DC1FFF]/30 text-[#DC1FFF] hover:bg-[#DC1FFF]/20 transition-colors"
              >
                <Play className="w-3 h-3" />
                Try Demo
              </Link>
              <a
                href="https://github.com/0xjesus/super-team-autoreviews"
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
