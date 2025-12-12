"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Github,
  Zap,
  GitPullRequest,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  Code2,
  Shield,
  FileSearch,
  Layers,
} from "lucide-react";

export default function Home() {
  const [demoUrl, setDemoUrl] = useState("");

  return (
    <main className="min-h-screen bg-grid">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#DC1FFF] rounded-full blur-[150px] opacity-20" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00FFA3] rounded-full blur-[150px] opacity-15" />

        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#DC1FFF]/30 bg-[#DC1FFF]/10 text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-[#00FFA3] pulse-live" />
            Superteam Earn Integration
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            GitHub Auto-Review
            <br />
            <span className="gradient-text">for Earn Agent</span>
          </h1>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
            AI-powered code analysis for GitHub bounty submissions.
            Integrates with the existing earn-agent service to automatically
            review PRs and repositories.
          </p>

          <div className="flex gap-4 justify-center flex-wrap mb-12">
            <Link href="/demo">
              <button className="gradient-button px-8 py-4 rounded-xl font-semibold text-white flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Try Live Demo
              </button>
            </Link>
            <Link href="/docs">
              <button className="px-8 py-4 rounded-xl font-semibold border border-gray-700 hover:border-[#DC1FFF]/50 transition-colors flex items-center gap-2">
                <FileSearch className="w-5 h-5" />
                View Documentation
              </button>
            </Link>
          </div>

          {/* Quick Demo Input */}
          <div className="max-w-xl mx-auto">
            <div className="gradient-border p-1">
              <div className="flex gap-2 bg-[#0D0D14] rounded-lg p-2">
                <input
                  type="url"
                  placeholder="Paste a GitHub PR or repo URL to test..."
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  className="flex-1 px-4 py-3 bg-transparent border-none outline-none text-white placeholder:text-gray-500"
                />
                <Link href={demoUrl ? `/demo?url=${encodeURIComponent(demoUrl)}` : "/demo"}>
                  <button className="gradient-button px-6 py-3 rounded-lg font-medium text-white flex items-center gap-2">
                    Review
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Example: https://github.com/solana-labs/solana-web3.js
            </p>
          </div>
        </div>
      </section>

      {/* How It Integrates */}
      <section className="py-16 px-4 border-y border-gray-800">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-4">How It Integrates with Earn</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Built to work seamlessly with the existing earn-agent architecture
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full gradient-button flex items-center justify-center mx-auto mb-4 text-white font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Sponsor Creates Listing</h3>
              <p className="text-sm text-gray-400">
                GitHub bounty published on Earn
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full gradient-button flex items-center justify-center mx-auto mb-4 text-white font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">Context Generated</h3>
              <p className="text-sm text-gray-400">
                generateContextGitHub extracts requirements
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full gradient-button flex items-center justify-center mx-auto mb-4 text-white font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">Submissions Reviewed</h3>
              <p className="text-sm text-gray-400">
                autoReviewGitHubSubmission analyzes code
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full gradient-button flex items-center justify-center mx-auto mb-4 text-white font-bold">
                4
              </div>
              <h3 className="font-semibold mb-2">Labels Assigned</h3>
              <p className="text-sm text-gray-400">
                Sponsor sees scores in dashboard
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-4">What It Analyzes</h2>
            <p className="text-gray-400">
              Comprehensive code review tailored for Solana bounties
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="gradient-border p-6">
              <CheckCircle2 className="w-8 h-8 text-[#00FFA3] mb-4" />
              <h3 className="font-semibold mb-2">Requirement Match</h3>
              <p className="text-sm text-gray-400">
                Semantic matching against bounty requirements with evidence
              </p>
            </div>

            <div className="gradient-border p-6">
              <Code2 className="w-8 h-8 text-[#00C2FF] mb-4" />
              <h3 className="font-semibold mb-2">Code Quality</h3>
              <p className="text-sm text-gray-400">
                Architecture, patterns, TypeScript usage, best practices
              </p>
            </div>

            <div className="gradient-border p-6">
              <Shield className="w-8 h-8 text-[#DC1FFF] mb-4" />
              <h3 className="font-semibold mb-2">Security Scan</h3>
              <p className="text-sm text-gray-400">
                Hardcoded secrets, vulnerabilities, Solana-specific issues
              </p>
            </div>

            <div className="gradient-border p-6">
              <Layers className="w-8 h-8 text-amber-400 mb-4" />
              <h3 className="font-semibold mb-2">Completeness</h3>
              <p className="text-sm text-gray-400">
                Feature implementation status, missing components
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Output Example */}
      <section className="py-16 px-4 gradient-bg">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-4">Review Output Format</h2>
            <p className="text-gray-400">
              Compatible with existing sponsor dashboard UI
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="gradient-border p-6 font-mono text-sm">
              <pre className="text-gray-300 overflow-x-auto">{`// submission.ai.evaluation (same schema as tweets/projects)
{
  "finalLabel": "Shortlisted",
  "notes": "Strong implementation of token swap...",
  "criteriaScore": 85,
  "qualityScore": 90,
  "totalScore": 87,
  "github": {
    "requirementMatch": {
      "score": 90,
      "matched": ["Token swap logic", "Unit tests"],
      "missing": ["Mainnet deployment"]
    },
    "codeQuality": { "score": 85 },
    "security": { "score": 92 },
    "completeness": { "score": 80 }
  }
}`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-4">Architecture</h2>
            <p className="text-gray-400">
              Follows earn-agent event-based patterns
            </p>
          </div>

          <div className="max-w-3xl mx-auto gradient-border p-8">
            <pre className="text-sm text-gray-300 overflow-x-auto">{`
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Earn Service  │────▶│   BullMQ Queue   │────▶│   Earn Agent    │
│  (Next.js API)  │     │     (Redis)      │     │   (Workers)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                                                │
        │ POST /submission/create                        │
        │ (with GitHub URL)                              │
        │                                                ▼
        │                                    ┌─────────────────────┐
        │                                    │  GitHub Auto-Review │
        │                                    │  ─────────────────  │
        │                                    │  • Fetch PR/Repo    │
        │                                    │  • Analyze Code     │
        │                                    │  • Generate Score   │
        │                                    │  • Assign Label     │
        │                                    └─────────────────────┘
        │                                                │
        │                                                ▼
        │                                    ┌─────────────────────┐
        ▼                                    │   Update Database   │
┌─────────────────┐                          │  submission.ai =    │
│ Sponsor Dashboard│◀─────────────────────────│  { evaluation: ... }│
│  (View Results) │                          └─────────────────────┘
└─────────────────┘
`}</pre>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Test?</h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Try the live demo with any public GitHub repository or PR.
            See exactly how the AI evaluates code submissions.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/demo">
              <button className="gradient-button px-10 py-4 rounded-xl font-semibold text-white text-lg flex items-center gap-2">
                <Github className="w-5 h-5" />
                Launch Demo
              </button>
            </Link>
            <a
              href="https://github.com/0xJesus/super-team-autoreviews"
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-4 rounded-xl font-semibold border border-gray-700 hover:border-[#DC1FFF]/50 transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              View Source
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-800">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-button flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">GitHub Auto-Review for Earn</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="https://earn.superteam.fun" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Superteam Earn
            </a>
            <a href="https://github.com/SuperteamDAO/earn" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Earn Repo
            </a>
            <Link href="/docs" className="hover:text-white transition-colors">
              Documentation
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
