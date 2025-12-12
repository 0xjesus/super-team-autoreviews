# Superteam GitHub Auto-Review System

AI-powered automated code review system for GitHub Pull Requests and repositories, built for Superteam Earn bounty submissions.

## Features

- **Multi-Provider AI Support**: Choose between OpenAI (GPT-5.2, GPT-4o, o1, o3) and Google Gemini (Gemini 3 Pro, 2.5 Pro/Flash)
- **PR & Repository Analysis**: Review both pull requests and full repositories
- **Smart Requirement Matching**: Semantic matching against bounty requirements with evidence
- **Security Scanning**: Detects hardcoded secrets, vulnerabilities, and Solana-specific security issues
- **Async Processing**: Uses Inngest for handling large repos without Vercel timeouts
- **Sponsor Dashboard**: Beautiful UI for viewing and managing reviews
- **Model Selection**: Dynamic model selector that fetches available models from APIs

## Quick Start

### 1. Prerequisites

- Node.js 18+
- pnpm package manager
- Neon database account (free tier works)
- OpenAI API key and/or Google Gemini API key
- GitHub personal access token

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/0xJesus/super-team-autoreviews.git
cd super-team-autoreviews

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env.local
```

### 3. Configure Environment Variables

Edit `.env.local` with your credentials:

```env
# Required: Database
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Required: At least one AI provider
OPENAI_API_KEY="sk-..."
GEMINI_API_KEY="AIza..."  # Optional: for Gemini models

# Required: GitHub access
GITHUB_TOKEN="ghp_..."

# Optional: Override default model
# AI_MODEL="gemini-2.5-flash"
```

### 4. Setup Database

```bash
# Push schema to Neon
pnpm db:push
```

### 5. Run Development Server

```bash
pnpm dev
```

Visit http://localhost:3000 to see the dashboard.

## Available AI Models

### OpenAI Models
| Model | Description |
|-------|-------------|
| `gpt-5.2-2025-12-11` | **Default** - Latest and most capable model |
| `gpt-4o` | Best for complex code analysis |
| `gpt-4o-mini` | Fast and cost-effective |
| `o1` | Advanced reasoning model |
| `o1-mini` | Fast reasoning model |
| `o3-mini` | Latest mini reasoning model |

### Google Gemini Models
| Model | Description |
|-------|-------------|
| `gemini-3-pro-preview` | Most capable Gemini model |
| `gemini-2.5-pro` | Best for complex reasoning |
| `gemini-2.5-flash` | Fast with great performance |
| `gemini-2.5-flash-lite` | Most cost-effective |
| `gemini-2.0-flash` | Previous gen fast model |

## How It Works

### 1. Submit a GitHub URL

Use the dashboard to submit a GitHub repository or PR URL. The system will:
1. Parse the URL to determine if it's a PR or repository
2. Fetch the code/diff from GitHub API
3. Queue the review job with Inngest

### 2. AI Analysis

The AI model analyzes:
- **Requirements Match**: How well the code meets bounty requirements
- **Code Quality**: Architecture, patterns, readability, maintainability
- **Completeness**: Feature implementation status
- **Security**: Vulnerabilities, secrets, Solana-specific issues

### 3. Review Output

Each review includes:
- Overall score (0-100)
- Breakdown scores per category
- Red flags with severity levels (critical, high, medium, low)
- Suggested labels (high-quality, needs-review, security-concern, etc.)
- Detailed markdown notes

## API Reference

### Submit for Review

```bash
POST /api/submissions
Content-Type: application/json

{
  "githubUrl": "https://github.com/owner/repo",
  "bountyTitle": "Build a Token Swap",
  "bountyDescription": "Create a Solana token swap...",
  "requirements": ["Implement swap logic", "Add tests"],
  "techStack": ["TypeScript", "Solana", "Anchor"],
  "model": "gpt-5.2-2025-12-11",  // Optional
  "triggerReview": true
}
```

### Get Available Models

```bash
GET /api/models

Response:
{
  "models": [
    { "id": "gpt-5.2-2025-12-11", "name": "GPT-5.2", "provider": "openai", "recommended": true },
    { "id": "gemini-3-pro-preview", "name": "Gemini 3 Pro", "provider": "google", "recommended": true }
  ],
  "defaultModel": "gpt-5.2-2025-12-11",
  "providers": { "openai": true, "google": true }
}
```

### Get Review Results

```bash
GET /api/submissions/{id}

Response:
{
  "submission": {
    "id": "...",
    "status": "completed",
    "review": {
      "overallScore": 85,
      "requirementMatch": { "score": 90, "matchedRequirements": [...] },
      "codeQuality": { "score": 80, "issues": [...] },
      "security": { "score": 85, "findings": [...] },
      "redFlags": [...],
      "suggestedLabels": ["high-quality"]
    }
  }
}
```

### Webhook Integration

For automated submissions from earn-service:

```bash
POST /api/webhooks/earn
Content-Type: application/json

{
  "event": "submission.created",
  "data": {
    "submissionId": "...",
    "listingId": "...",
    "githubUrl": "https://github.com/...",
    "listing": {
      "title": "...",
      "description": "...",
      "requirements": [...],
      "techStack": [...]
    }
  }
}
```

## Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure environment variables:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `GEMINI_API_KEY` (optional)
   - `GITHUB_TOKEN`
   - `INNGEST_EVENT_KEY`
   - `INNGEST_SIGNING_KEY`
4. Deploy

### 3. Configure Inngest

1. Go to [inngest.com](https://inngest.com) and create an account
2. Create a new app
3. Add the signing key and event key to Vercel environment variables
4. The Inngest functions will auto-register on deployment

## Architecture

```
                                   ┌─────────────────────────────────────────┐
                                   │           Vercel Deployment              │
┌──────────────┐                   │  ┌─────────────────────────────────────┐│
│ earn-service │──webhook──────────┼─►│        Next.js App Router           ││
└──────────────┘                   │  │  ┌─────────┐ ┌─────────┐           ││
                                   │  │  │Dashboard│ │API Routes│           ││
┌──────────────┐                   │  │  └────┬────┘ └────┬────┘           ││
│   Browser    │──────────────────────│       │           │                 ││
└──────────────┘                   │  └───────┼───────────┼─────────────────┘│
                                   │          │           │                  │
                                   │          ▼           ▼                  │
                                   │  ┌─────────────────────────────────────┐│
                                   │  │        Inngest Functions            ││
                                   │  │  • review-github-submission         ││
                                   │  │  • batch-review-submissions         ││
                                   │  │  • scheduled-review-cron            ││
                                   │  └──────────────────┬──────────────────┘│
                                   └─────────────────────┼───────────────────┘
                                                         │
                    ┌────────────────────────────────────┼────────────────────────────────────┐
                    │                                    │                                    │
                    ▼                                    ▼                                    ▼
           ┌───────────────┐                   ┌─────────────────┐                 ┌─────────────────┐
           │   Neon DB     │                   │  OpenAI / Gemini │                 │   GitHub API    │
           │  (Postgres)   │                   │   (AI Analysis)  │                 │  (Code Fetch)   │
           └───────────────┘                   └─────────────────┘                 └─────────────────┘
```

## Review Scoring System

| Category | Weight | What It Measures |
|----------|--------|------------------|
| Requirements Match | 30% | How well the code meets bounty requirements |
| Code Quality | 25% | Architecture, patterns, readability |
| Completeness | 25% | Feature implementation status |
| Security | 20% | Vulnerabilities, secrets, best practices |

### Score Interpretation

| Score | Label | Meaning |
|-------|-------|---------|
| 90-100 | `excellent` | Exceeds expectations |
| 75-89 | `high-quality` | Meets all requirements well |
| 50-74 | `needs-review` | Has issues requiring attention |
| 0-49 | `needs-revision` | Significant problems |

### Red Flag Types

- `security-vulnerability` - Security issues detected
- `incomplete-implementation` - Missing required features
- `copied-code` - Potential plagiarism detected
- `low-quality` - Poor code quality
- `missing-tests` - No tests provided

## Development

### Running Tests

```bash
pnpm test          # Run tests once
pnpm test:watch    # Watch mode
pnpm test:coverage # With coverage
```

### Running Inngest Dev Server

```bash
pnpm inngest:dev
```

This starts the Inngest dev server for local function testing.

### Database Commands

```bash
pnpm db:push       # Push schema changes
pnpm db:studio     # Open Drizzle Studio
pnpm db:generate   # Generate migrations
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `OPENAI_API_KEY` | Yes* | OpenAI API key |
| `GEMINI_API_KEY` | No | Google Gemini API key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | No | Alternative Gemini key name |
| `GITHUB_TOKEN` | Yes | GitHub PAT for API access |
| `AI_MODEL` | No | Override default model |
| `INNGEST_EVENT_KEY` | Prod | Inngest event key |
| `INNGEST_SIGNING_KEY` | Prod | Inngest signing key |
| `NEXT_PUBLIC_APP_URL` | No | App URL for callbacks |
| `USE_MOCKS` | No | Enable mock mode for testing |

*At least one AI provider key is required

## License

MIT
