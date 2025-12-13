"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  Github,
  GitPullRequest,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Shield,
  FileCheck,
  Layers,
  Zap,
  ChevronDown,
  ChevronRight,
  Play,
  Bot,
  Sparkles,
  ArrowRight,
  Info,
  Terminal,
  Circle,
  Trash2,
  Settings,
  Plus,
  X,
  History,
  RefreshCw,
  Star,
  CheckSquare,
  Square,
  BookOpen,
  FileText,
} from "lucide-react";

// VERIFIED: All repos and PRs exist (checked via GitHub API)
// Quality indicators: "excellent" = should score 85+, "good" = 70-84, "medium" = 50-69, "poor" = <50
const BOUNTY_SCENARIOS = [
  {
    id: "token-swap",
    title: "Token Swap Interface",
    subtitle: "Frontend bounty",
    description: "Build a production-ready frontend interface for swapping SPL tokens on Solana. The application should integrate with Jupiter aggregator to find the best swap routes across all Solana DEXs. Users must be able to connect their wallets (Phantom, Solflare, Backpack), view their token balances, select input/output tokens, specify amounts, preview swap quotes with price impact, and execute transactions with proper confirmation handling. The UI should be responsive, handle loading states gracefully, show transaction history, and provide clear error messages. Consider implementing slippage settings and priority fee options for advanced users.",
    requirements: [
      "Wallet adapter integration (Phantom, Solflare, Backpack)",
      "Jupiter SDK integration for optimal swap routing",
      "Token balance display with USD values",
      "Token selection UI with search and favorites",
      "Real-time price quotes and impact preview",
      "Transaction confirmation and history tracking",
      "Slippage tolerance and priority fee settings",
      "Error handling with user-friendly messages",
      "Responsive design for mobile devices",
      "Loading states and skeleton components",
    ],
    techStack: ["React", "TypeScript", "Solana Web3.js", "Jupiter SDK", "Tailwind CSS", "Zustand"],
    color: "#00FFA3",
    examples: [
      { url: "https://github.com/solana-labs/dapp-scaffold", name: "Solana dApp Scaffold", description: "Official Next.js template with wallet adapter - SHOULD PASS", type: "repo" as const, quality: "excellent" as const },
      { url: "https://github.com/anza-xyz/wallet-adapter", name: "Wallet Adapter", description: "Official wallet connection library - SHOULD PASS", type: "repo" as const, quality: "excellent" as const },
      { url: "https://github.com/orca-so/whirlpools", name: "Orca Whirlpools", description: "DEX SDK with swap functionality - SHOULD PASS", type: "repo" as const, quality: "excellent" as const },
      { url: "https://github.com/anza-xyz/agave/pull/100", name: "Agave PR #100", description: "Core validator PR - may not match frontend requirements", type: "pr" as const, quality: "medium" as const },
    ],
  },
  {
    id: "nft-marketplace",
    title: "NFT Marketplace Contract",
    subtitle: "Smart contract bounty",
    description: "Develop a secure and gas-efficient Anchor program for a fully-featured NFT marketplace on Solana. The program should support listing NFTs for sale at fixed prices, buying listed NFTs with SOL, canceling active listings, and automatic royalty distribution to original creators following Metaplex standards. Implement secure escrow functionality to hold NFTs during the listing period. The contract must include comprehensive input validation, proper PDA derivation, and protection against common vulnerabilities like reentrancy. Include a full test suite with >80% coverage testing all happy paths, edge cases, and error conditions.",
    requirements: [
      "List NFT for sale with custom SOL price",
      "Buy NFT with automatic SOL transfer to seller",
      "Cancel listing and return NFT to owner",
      "Royalty distribution following Metaplex standard",
      "Secure escrow PDA for holding listed NFTs",
      "Proper account validation and ownership checks",
      "Protection against reentrancy attacks",
      "Unit tests with >80% code coverage",
      "Integration tests for full workflows",
      "Clear documentation and code comments",
    ],
    techStack: ["Rust", "Anchor", "Solana", "Metaplex", "SPL Token"],
    color: "#DC1FFF",
    examples: [
      { url: "https://github.com/metaplex-foundation/mpl-token-metadata", name: "Metaplex Token Metadata", description: "Official NFT metadata program - SHOULD PASS", type: "repo" as const, quality: "excellent" as const },
      { url: "https://github.com/clockwork-xyz/clockwork", name: "Clockwork", description: "Solana automation with Anchor - SHOULD PASS (good code)", type: "repo" as const, quality: "good" as const },
      { url: "https://github.com/solana-developers/program-examples", name: "Program Examples", description: "Basic examples - may be too simple", type: "repo" as const, quality: "medium" as const },
      { url: "https://github.com/metaplex-foundation/mpl-token-metadata/pull/100", name: "Metaplex PR #100", description: "Token metadata improvement - SHOULD PASS", type: "pr" as const, quality: "excellent" as const },
    ],
  },
  {
    id: "dao-voting",
    title: "DAO Voting System",
    subtitle: "Full-stack bounty",
    description: "Build a complete on-chain governance system for DAOs on Solana. The system should allow token holders to create proposals with titles, descriptions, and executable instructions. Implement token-weighted voting where voting power is proportional to token holdings at a snapshot timestamp. Include configurable quorum thresholds (minimum participation) and approval thresholds (votes required to pass). Proposals should have time-locked execution - a delay period after approval before execution. Support vote delegation so users can delegate their voting power to trusted representatives. Build a React frontend dashboard showing active proposals, voting status, and historical results.",
    requirements: [
      "Create proposals with title, description, and actions",
      "Token-weighted voting based on holdings snapshot",
      "Configurable quorum threshold (min participation %)",
      "Configurable approval threshold (votes to pass %)",
      "Time-locked execution with configurable delay",
      "Vote delegation to other addresses",
      "Frontend dashboard showing all proposals",
      "Real-time voting status updates",
      "Historical proposal and vote tracking",
      "User voting power and delegation display",
    ],
    techStack: ["Rust", "Anchor", "React", "TypeScript", "SPL Governance", "WebSocket"],
    color: "#00C2FF",
    examples: [
      { url: "https://github.com/solana-labs/solana-program-library", name: "SPL Governance", description: "Official governance program - SHOULD PASS", type: "repo" as const, quality: "excellent" as const },
      { url: "https://github.com/solana-labs/governance-ui", name: "Governance UI (Realms)", description: "Official Realms frontend - SHOULD PASS", type: "repo" as const, quality: "excellent" as const },
      { url: "https://github.com/switchboard-xyz/solana-sdk", name: "Switchboard SDK", description: "Oracle SDK - partial match", type: "repo" as const, quality: "medium" as const },
      { url: "https://github.com/solana-labs/solana-program-library/pull/6500", name: "SPL PR #6500", description: "Program library update - SHOULD PASS", type: "pr" as const, quality: "good" as const },
    ],
  },
];

const AVAILABLE_MODELS = [
  // Gemini 3 (Latest & Most Powerful)
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro", provider: "Google", description: "Most intelligent - best reasoning" },
  // Gemini 2.5
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", description: "Advanced thinking model" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", description: "Fast + smart - best balance", recommended: true },
  { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", provider: "Google", description: "Ultra fast - cheapest" },
  // Gemini 2.0
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google", description: "Previous gen - stable" },
  // OpenAI (requires OPENAI_API_KEY)
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", description: "OpenAI flagship" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", description: "OpenAI fast & cheap" },
];

interface FileAnalyzed {
  path: string;
  language: string;
  importance: string;
  lines: number;
  size: number;
}

interface TechnicalMetadata {
  filesAnalyzed: FileAnalyzed[];
  totalFiles: number;
  totalLinesAnalyzed: number;
  totalBytesAnalyzed: number;
  languagesDetected: string[];
  fileTreeSize: number;
  diffSize?: number;
  commitsAnalyzed?: number;
  prTitle?: string;
  prDescription?: string | null;
}

interface ReviewResult {
  success: boolean;
  evaluation: {
    finalLabel: string;
    notes: string;
    criteriaScore: number;
    qualityScore: number;
    totalScore: number;
    github: {
      type: "pr" | "repository";
      owner: string;
      repo: string;
      prNumber?: number;
      requirementMatch: {
        score: number;
        matched: string[];
        missing: string[];
        evidence: Array<{ requirement: string; file: string; explanation: string; lineRange?: string }>;
      };
      codeQuality: {
        score: number;
        strengths: string[];
        issues: Array<{ severity: string; description: string; file?: string; suggestion?: string }>;
      };
      security: { score: number; findings: string[]; solanaSpecific: string[] };
      completeness: { score: number; implemented: string[]; missing: string[] };
      redFlags: Array<{ type: string; severity: string; description: string; file?: string; line?: number }>;
    };
    technical: TechnicalMetadata;
    confidence: number;
    detailedNotes: string;
    suggestedLabels: string[];
    modelUsed: string;
    tokensUsed: number;
    estimatedCost: number;
    processingTimeMs: number;
    submissionId?: string;
  };
}

interface LogEntry {
  time: string;
  type: "info" | "success" | "error" | "processing" | "step";
  message: string;
}

interface RedFlag {
  type: string;
  severity: string;
  description: string;
  file?: string;
  line?: number;
}

interface SavedReview {
  id: string;
  overallScore: number | null;
  confidence: string | null;
  requirementMatchScore: number | null;
  codeQualityScore: number | null;
  completenessScore: number | null;
  securityScore: number | null;
  summary: string | null;
  detailedNotes: string | null;
  labels: string[] | null;
  redFlags: RedFlag[] | null;
  matchedRequirements: string[] | null;
  missingRequirements: string[] | null;
  modelUsed: string | null;
  tokensUsed: number | null;
  processingTimeMs: number | null;
  estimatedCost: string | null;
  createdAt: string;
  submission: {
    id: string;
    externalId: string;
    githubUrl: string;
    githubType: string;
    owner: string | null;
    repo: string | null;
    prNumber: number | null;
    bountyTitle: string | null;
    status: string;
    createdAt: string;
    reviewedAt: string | null;
  };
}

interface BatchItem {
  url: string;
  name: string;
  status: "pending" | "analyzing" | "done" | "error";
  result?: ReviewResult;
  error?: string;
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBounty, setSelectedBounty] = useState(BOUNTY_SCENARIOS[0]);
  const [customBounty, setCustomBounty] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customRequirements, setCustomRequirements] = useState("");
  const [customTechStack, setCustomTechStack] = useState("");

  const [githubUrl, setGithubUrl] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedReviewId, setSavedReviewId] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Saved reviews state
  const [showSavedReviews, setShowSavedReviews] = useState(false);
  const [savedReviews, setSavedReviews] = useState<SavedReview[]>([]);
  const [loadingSavedReviews, setLoadingSavedReviews] = useState(false);

  // Batch review state
  const [batchMode, setBatchMode] = useState(false);
  const [selectedForBatch, setSelectedForBatch] = useState<Set<string>>(new Set());
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);

  const addLog = (type: LogEntry["type"], message: string) => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => [...prev, { time, type, message }]);
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (!customBounty) {
      setGithubUrl("");
      setCustomUrl("");
      setResult(null);
      setError(null);
      setLogs([]);
      setSavedReviewId(null);
    }
  }, [selectedBounty, customBounty]);

  const handleSelectExample = (url: string) => {
    setGithubUrl(url);
    setCustomUrl("");
    setCurrentStep(2);
    addLog("info", `Selected: ${url.replace("https://github.com/", "")}`);
  };

  const handleCustomUrlChange = (url: string) => {
    setCustomUrl(url);
    setGithubUrl(url);
    if (url) setCurrentStep(2);
  };

  const getBountyData = () => {
    if (customBounty) {
      return {
        title: customTitle || "Custom Bounty",
        description: customDescription,
        requirements: customRequirements.split("\n").filter(r => r.trim()),
        techStack: customTechStack.split(",").map(t => t.trim()).filter(Boolean),
      };
    }
    return {
      title: selectedBounty.title,
      description: selectedBounty.description,
      requirements: selectedBounty.requirements,
      techStack: selectedBounty.techStack,
    };
  };

  const handleAnalyze = async () => {
    const urlToAnalyze = githubUrl || customUrl;
    if (!urlToAnalyze) {
      setError("Please enter a GitHub URL or select an example");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setCurrentStep(3);
    setLogs([]);
    setSavedReviewId(null);

    const bountyData = getBountyData();
    const isPR = urlToAnalyze.includes("/pull/");
    const startTime = Date.now();

    addLog("step", "╔═══════════════════════════════════════════════════════════╗");
    addLog("step", "║         EARN-AGENT AUTO-REVIEW v1.0.0                     ║");
    addLog("step", "╚═══════════════════════════════════════════════════════════╝");
    addLog("info", "");
    addLog("info", "┌─ REQUEST CONFIGURATION ─────────────────────────────────────");
    addLog("info", `│ Bounty Title: ${bountyData.title}`);
    addLog("info", `│ Target URL: ${urlToAnalyze}`);
    addLog("info", `│ Analysis Type: ${isPR ? "Pull Request Review" : "Repository Analysis"}`);
    addLog("info", `│ AI Model: ${selectedModel}`);
    addLog("info", `│ Requirements to Match: ${bountyData.requirements.length}`);
    addLog("info", `│ Tech Stack Filter: ${bountyData.techStack.join(", ") || "None"}`);
    addLog("info", "└──────────────────────────────────────────────────────────────");
    addLog("info", "");

    try {
      // Phase 1: GitHub API
      addLog("step", "┌─ PHASE 1: GITHUB DATA FETCHING ─────────────────────────────");
      addLog("processing", "│ [1.1] Initializing GitHub API client...");
      addLog("info", "│      └─ Using Octokit REST API v2024.11.14");
      addLog("info", "│      └─ Authentication: Public API (rate limit: 60/hr)");

      addLog("processing", "│ [1.2] Fetching repository metadata...");

      // Make the actual API call
      const response = await fetch("/api/demo/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubUrl: urlToAnalyze,
          bountyTitle: bountyData.title,
          bountyDescription: bountyData.description,
          requirements: bountyData.requirements,
          techStack: bountyData.techStack,
          model: selectedModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Analysis failed");
      }

      const tech = data.evaluation.technical;
      const elapsed1 = ((Date.now() - startTime) / 1000).toFixed(2);

      addLog("success", `│      └─ Repository: ${data.evaluation.github.owner}/${data.evaluation.github.repo}`);
      addLog("info", `│      └─ File tree entries: ${tech.fileTreeSize}`);
      addLog("info", `│      └─ Elapsed: ${elapsed1}s`);
      addLog("info", "└──────────────────────────────────────────────────────────────");
      addLog("info", "");

      // Phase 2: File Analysis
      addLog("step", "┌─ PHASE 2: SOURCE CODE EXTRACTION ───────────────────────────");
      addLog("info", `│ Total files identified: ${tech.totalFiles}`);
      addLog("info", `│ Languages detected: ${tech.languagesDetected.join(", ")}`);
      addLog("info", `│ Total lines of code: ${tech.totalLinesAnalyzed.toLocaleString()}`);
      addLog("info", `│ Total bytes: ${(tech.totalBytesAnalyzed / 1024).toFixed(2)} KB`);
      addLog("info", "│");
      addLog("info", "│ Key files analyzed by importance:");

      // Group by importance
      const byImportance = tech.filesAnalyzed.reduce((acc: Record<string, FileAnalyzed[]>, f: FileAnalyzed) => {
        if (!acc[f.importance]) acc[f.importance] = [];
        acc[f.importance].push(f);
        return acc;
      }, {});

      for (const importance of ["critical", "high", "medium", "low"]) {
        const files = byImportance[importance] || [];
        if (files.length > 0) {
          addLog("info", `│   [${importance.toUpperCase()}] ${files.length} file(s):`);
          files.slice(0, 3).forEach((f: FileAnalyzed) => {
            addLog("info", `│     • ${f.path} (${f.language}, ${f.lines} lines)`);
          });
          if (files.length > 3) {
            addLog("info", `│     ... and ${files.length - 3} more`);
          }
        }
      }

      if (tech.diffSize) {
        addLog("info", "│");
        addLog("info", `│ PR-specific data:`);
        addLog("info", `│   • Diff size: ${(tech.diffSize / 1024).toFixed(2)} KB`);
        addLog("info", `│   • Commits analyzed: ${tech.commitsAnalyzed}`);
        if (tech.prTitle) addLog("info", `│   • PR Title: "${tech.prTitle}"`);
      }
      addLog("info", "└──────────────────────────────────────────────────────────────");
      addLog("info", "");

      // Phase 3: AI Analysis
      const elapsed2 = ((Date.now() - startTime) / 1000).toFixed(2);
      addLog("step", "┌─ PHASE 3: AI ANALYSIS ──────────────────────────────────────");
      addLog("info", `│ Model: ${data.evaluation.modelUsed}`);
      addLog("info", `│ Provider: ${data.evaluation.modelUsed.startsWith("gemini") ? "Google AI (Gemini)" : "OpenAI"}`);
      addLog("info", `│ Temperature: 0.3 (deterministic mode)`);
      addLog("info", `│ Schema: Structured JSON output with Zod validation`);
      addLog("info", "│");
      addLog("info", "│ Token usage breakdown:");
      addLog("info", `│   • Input tokens (estimated): ${Math.ceil(data.evaluation.tokensUsed * 0.8).toLocaleString()}`);
      addLog("info", `│   • Output tokens (estimated): ${Math.ceil(data.evaluation.tokensUsed * 0.2).toLocaleString()}`);
      addLog("info", `│   • Total tokens: ${data.evaluation.tokensUsed.toLocaleString()}`);
      addLog("info", `│   • Estimated cost: $${data.evaluation.estimatedCost.toFixed(6)}`);
      addLog("info", "│");
      addLog("info", `│ AI Confidence: ${(data.evaluation.confidence * 100).toFixed(1)}%`);
      addLog("info", `│ Processing time: ${elapsed2}s`);
      addLog("info", "└──────────────────────────────────────────────────────────────");
      addLog("info", "");

      // Phase 4: Requirement Matching
      addLog("step", "┌─ PHASE 4: REQUIREMENT MATCHING ─────────────────────────────");
      const reqMatch = data.evaluation.github.requirementMatch;
      addLog("info", `│ Matched: ${reqMatch.matched.length}/${bountyData.requirements.length} requirements`);
      addLog("info", `│ Score: ${reqMatch.score}/100`);
      addLog("info", "│");
      if (reqMatch.matched.length > 0) {
        addLog("success", "│ ✓ MATCHED REQUIREMENTS:");
        reqMatch.matched.slice(0, 5).forEach((r: string) => {
          addLog("success", `│   • ${r.slice(0, 60)}${r.length > 60 ? "..." : ""}`);
        });
        if (reqMatch.matched.length > 5) {
          addLog("success", `│   ... and ${reqMatch.matched.length - 5} more`);
        }
      }
      if (reqMatch.missing.length > 0) {
        addLog("info", "│");
        addLog("error", "│ ✗ MISSING REQUIREMENTS:");
        reqMatch.missing.slice(0, 5).forEach((r: string) => {
          addLog("error", `│   • ${r.slice(0, 60)}${r.length > 60 ? "..." : ""}`);
        });
        if (reqMatch.missing.length > 5) {
          addLog("error", `│   ... and ${reqMatch.missing.length - 5} more`);
        }
      }
      addLog("info", "└──────────────────────────────────────────────────────────────");
      addLog("info", "");

      // Phase 5: Code Quality Analysis
      addLog("step", "┌─ PHASE 5: CODE QUALITY ANALYSIS ────────────────────────────");
      const codeQuality = data.evaluation.github.codeQuality;
      addLog("info", `│ Quality Score: ${codeQuality.score}/100`);
      addLog("info", "│");
      if (codeQuality.strengths.length > 0) {
        addLog("success", "│ STRENGTHS:");
        codeQuality.strengths.slice(0, 4).forEach((s: string) => {
          addLog("success", `│   + ${s}`);
        });
      }
      if (codeQuality.issues.length > 0) {
        addLog("info", "│");
        addLog("info", "│ ISSUES FOUND:");
        codeQuality.issues.slice(0, 4).forEach((i: { severity: string; description: string; file?: string }) => {
          const icon = i.severity === "critical" ? "🔴" : i.severity === "major" ? "🟠" : "🟡";
          addLog("info", `│   ${icon} [${i.severity.toUpperCase()}] ${i.description.slice(0, 50)}${i.description.length > 50 ? "..." : ""}`);
          if (i.file) addLog("info", `│      └─ in ${i.file}`);
        });
        if (codeQuality.issues.length > 4) {
          addLog("info", `│   ... and ${codeQuality.issues.length - 4} more issues`);
        }
      }
      addLog("info", "└──────────────────────────────────────────────────────────────");
      addLog("info", "");

      // Phase 6: Security Analysis
      addLog("step", "┌─ PHASE 6: SECURITY ANALYSIS ────────────────────────────────");
      const security = data.evaluation.github.security;
      addLog("info", `│ Security Score: ${security.score}/100`);
      if (security.findings.length > 0) {
        addLog("info", "│");
        addLog("info", "│ Findings:");
        security.findings.slice(0, 4).forEach((f: string) => {
          addLog("info", `│   ⚠ ${f}`);
        });
      }
      if (security.solanaSpecific && security.solanaSpecific.length > 0) {
        addLog("info", "│");
        addLog("info", "│ Solana-specific security checks:");
        security.solanaSpecific.slice(0, 3).forEach((f: string) => {
          addLog("info", `│   🔐 ${f}`);
        });
      }
      addLog("info", "└──────────────────────────────────────────────────────────────");
      addLog("info", "");

      // Red Flags
      const redFlags = data.evaluation.github.redFlags;
      if (redFlags.length > 0) {
        addLog("step", "┌─ RED FLAGS DETECTED ─────────────────────────────────────────");
        redFlags.forEach((rf: { severity: string; type: string; description: string; file?: string }) => {
          const icon = rf.severity === "critical" ? "🚨" : rf.severity === "warning" ? "⚠️" : "ℹ️";
          addLog(rf.severity === "critical" ? "error" : "info", `│ ${icon} [${rf.type}] ${rf.description}`);
          if (rf.file) addLog("info", `│    └─ File: ${rf.file}`);
        });
        addLog("info", "└──────────────────────────────────────────────────────────────");
        addLog("info", "");
      }

      // Final Results
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      addLog("step", "╔═══════════════════════════════════════════════════════════╗");
      addLog("step", "║                    REVIEW COMPLETE                         ║");
      addLog("step", "╚═══════════════════════════════════════════════════════════╝");
      addLog("info", "");
      addLog("success", `   OVERALL SCORE: ${data.evaluation.totalScore}/100`);
      addLog("success", `   LABEL: ${data.evaluation.finalLabel.replace(/_/g, " ").toUpperCase()}`);
      addLog("info", "");
      addLog("info", "   Score Breakdown:");
      addLog("info", `     • Requirement Match: ${reqMatch.score}/100`);
      addLog("info", `     • Code Quality: ${codeQuality.score}/100`);
      addLog("info", `     • Completeness: ${data.evaluation.github.completeness.score}/100`);
      addLog("info", `     • Security: ${security.score}/100`);
      addLog("info", "");
      addLog("info", "   Metadata:");
      addLog("info", `     • AI Model: ${data.evaluation.modelUsed}`);
      addLog("info", `     • Tokens Used: ${data.evaluation.tokensUsed.toLocaleString()}`);
      addLog("info", `     • Cost: $${data.evaluation.estimatedCost.toFixed(6)}`);
      addLog("info", `     • Total Time: ${totalTime}s`);
      addLog("info", `     • Confidence: ${(data.evaluation.confidence * 100).toFixed(1)}%`);

      if (data.evaluation.submissionId) {
        addLog("info", "");
        addLog("success", `   ✓ Saved to database: ${data.evaluation.submissionId}`);
        setSavedReviewId(data.evaluation.submissionId);
      }

      addLog("info", "");
      addLog("step", "═══════════════════════════════════════════════════════════════");

      setResult(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred";
      addLog("error", "");
      addLog("error", "╔═══════════════════════════════════════════════════════════╗");
      addLog("error", "║                    ANALYSIS FAILED                         ║");
      addLog("error", "╚═══════════════════════════════════════════════════════════╝");
      addLog("error", `   Error: ${errorMsg}`);
      addLog("error", "═══════════════════════════════════════════════════════════════");
      setError(errorMsg);
      setCurrentStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!savedReviewId) return;

    addLog("processing", "Deleting review from database...");
    try {
      const response = await fetch(`/api/reviews/${savedReviewId}`, { method: "DELETE" });
      if (response.ok) {
        addLog("success", "Review deleted successfully");
        setSavedReviewId(null);
      } else {
        addLog("error", "Failed to delete review");
      }
    } catch {
      addLog("error", "Failed to delete review");
    }
  };

  // Fetch saved reviews
  const fetchSavedReviews = async () => {
    setLoadingSavedReviews(true);
    try {
      const response = await fetch("/api/reviews?limit=20");
      const data = await response.json();
      setSavedReviews(data.reviews || []);
    } catch (err) {
      console.error("Failed to fetch saved reviews:", err);
    } finally {
      setLoadingSavedReviews(false);
    }
  };

  // Delete a saved review
  const handleDeleteSavedReview = async (submissionId: string) => {
    try {
      const response = await fetch(`/api/reviews/${submissionId}`, { method: "DELETE" });
      if (response.ok) {
        setSavedReviews(prev => prev.filter(r => r.submission.id !== submissionId));
      }
    } catch (err) {
      console.error("Failed to delete review:", err);
    }
  };

  // Toggle batch selection
  const toggleBatchSelection = (url: string) => {
    setSelectedForBatch(prev => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  // Run batch analysis
  const handleBatchAnalyze = async () => {
    if (selectedForBatch.size === 0) return;

    setIsBatchAnalyzing(true);
    setLogs([]);
    const items: BatchItem[] = Array.from(selectedForBatch).map(url => {
      const example = selectedBounty.examples.find(e => e.url === url);
      return {
        url,
        name: example?.name || url.split("/").slice(-2).join("/"),
        status: "pending" as const,
      };
    });
    setBatchItems(items);

    addLog("step", "═══════════════════════════════════════════");
    addLog("step", "  BATCH REVIEW STARTING");
    addLog("step", "═══════════════════════════════════════════");
    addLog("info", `Processing ${items.length} submissions...`);
    addLog("info", `Model: ${selectedModel}`);
    addLog("step", "───────────────────────────────────────────");

    const bountyData = getBountyData();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      addLog("processing", `[${i + 1}/${items.length}] Analyzing: ${item.name}...`);

      setBatchItems(prev => prev.map((it, idx) =>
        idx === i ? { ...it, status: "analyzing" } : it
      ));

      try {
        const response = await fetch("/api/demo/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            githubUrl: item.url,
            bountyTitle: bountyData.title,
            bountyDescription: bountyData.description,
            requirements: bountyData.requirements,
            techStack: bountyData.techStack,
            model: selectedModel,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          addLog("success", `     └─ ${item.name}: Score ${data.evaluation.totalScore}/100 - ${data.evaluation.finalLabel.replace(/_/g, " ")}`);
          setBatchItems(prev => prev.map((it, idx) =>
            idx === i ? { ...it, status: "done", result: data } : it
          ));
        } else {
          throw new Error(data.error || "Analysis failed");
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        addLog("error", `     └─ ${item.name}: FAILED - ${errorMsg}`);
        setBatchItems(prev => prev.map((it, idx) =>
          idx === i ? { ...it, status: "error", error: errorMsg } : it
        ));
      }
    }

    addLog("step", "───────────────────────────────────────────");
    addLog("step", "  BATCH REVIEW COMPLETE");
    addLog("step", "═══════════════════════════════════════════");

    const completed = items.filter((_, i) => {
      const current = batchItems[i];
      return current?.status === "done";
    }).length;
    addLog("success", `Completed: ${completed}/${items.length}`);

    setIsBatchAnalyzing(false);
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-[#00FFA3]";
    if (score >= 70) return "text-[#00C2FF]";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 85) return "bg-[#00FFA3]/10 border-[#00FFA3]/30";
    if (score >= 70) return "bg-[#00C2FF]/10 border-[#00C2FF]/30";
    if (score >= 50) return "bg-amber-400/10 border-amber-400/30";
    return "bg-red-400/10 border-red-400/30";
  };

  const getLabelColor = (label: string) => {
    const colors: Record<string, string> = {
      "Shortlisted": "bg-[#00FFA3]/20 text-[#00FFA3] border-[#00FFA3]/30",
      "High_Quality": "bg-[#00C2FF]/20 text-[#00C2FF] border-[#00C2FF]/30",
      "Mid_Quality": "bg-amber-400/20 text-amber-400 border-amber-400/30",
      "Low_Quality": "bg-red-400/20 text-red-400 border-red-400/30",
      "Needs_Review": "bg-purple-400/20 text-purple-400 border-purple-400/30",
    };
    return colors[label] || "bg-gray-400/20 text-gray-400 border-gray-400/30";
  };

  const getLogColor = (type: LogEntry["type"]) => {
    const colors: Record<string, string> = {
      success: "text-[#00FFA3]",
      error: "text-red-400",
      processing: "text-[#DC1FFF]",
      step: "text-[#00C2FF]",
      info: "text-gray-400",
    };
    return colors[type] || "text-gray-400";
  };

  return (
    <main className="min-h-screen bg-grid">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-button flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold">GitHub Auto-Review</h1>
              <p className="text-[10px] text-gray-500">for Superteam Earn</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Documentation Button - Prominent */}
            <a
              href="/docs"
              className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-button text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <BookOpen className="w-4 h-4" />
              Documentation
            </a>
            <button
              onClick={() => {
                setShowSavedReviews(true);
                fetchSavedReviews();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <History className="w-3 h-3" />
              Saved Reviews
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#00FFA3]/10 border border-[#00FFA3]/30 text-xs">
              <div className="w-2 h-2 rounded-full bg-[#00FFA3] animate-pulse" />
              <span className="text-[#00FFA3]">Live Demo</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero - Compact */}
      <section className="py-4 px-4 border-b border-gray-800">
        <div className="container mx-auto text-center max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#DC1FFF]/30 bg-[#DC1FFF]/10 text-xs mb-2">
            <Sparkles className="w-3 h-3 text-[#DC1FFF]" />
            AI-Powered Code Review
          </div>
          <h2 className="text-xl font-bold mb-1">
            Test the <span className="gradient-text">earn-agent</span> Review System
          </h2>
          <p className="text-gray-400 text-xs">
            Select a bounty scenario, pick a submission (repo or PR), and watch the AI analyze it in real-time.
          </p>
        </div>
      </section>

      {/* Main Content - 2 columns */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-5 gap-6 max-w-7xl mx-auto">

          {/* Left Column: Config (2/5) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Step 1: Bounty */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full gradient-button flex items-center justify-center text-white text-[10px] font-bold">1</div>
                  <h3 className="font-semibold text-sm">Bounty Context</h3>
                </div>
                <button
                  onClick={() => setCustomBounty(!customBounty)}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition-all ${
                    customBounty ? "border-[#DC1FFF] bg-[#DC1FFF]/10 text-[#DC1FFF]" : "border-gray-700 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  {customBounty ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {customBounty ? "Use Preset" : "Custom"}
                </button>
              </div>

              {customBounty ? (
                <div className="gradient-border p-3 space-y-3">
                  <input
                    type="text"
                    placeholder="Bounty Title"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-700 focus:border-[#DC1FFF]/50 outline-none text-sm"
                  />
                  <textarea
                    placeholder="Description"
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-700 focus:border-[#DC1FFF]/50 outline-none text-sm resize-none"
                  />
                  <textarea
                    placeholder="Requirements (one per line)"
                    value={customRequirements}
                    onChange={(e) => setCustomRequirements(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-700 focus:border-[#DC1FFF]/50 outline-none text-xs font-mono resize-none"
                  />
                  <input
                    type="text"
                    placeholder="Tech Stack (comma separated)"
                    value={customTechStack}
                    onChange={(e) => setCustomTechStack(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-700 focus:border-[#DC1FFF]/50 outline-none text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  {BOUNTY_SCENARIOS.map((bounty) => (
                    <button
                      key={bounty.id}
                      onClick={() => setSelectedBounty(bounty)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        selectedBounty.id === bounty.id
                          ? "border-[#DC1FFF] bg-[#DC1FFF]/5"
                          : "border-gray-800 bg-gray-900/30 hover:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${bounty.color}20`, color: bounty.color }}>
                            {bounty.subtitle}
                          </span>
                          <span className="font-medium text-sm">{bounty.title}</span>
                        </div>
                        {selectedBounty.id === bounty.id && <CheckCircle2 className="w-4 h-4 text-[#DC1FFF]" />}
                      </div>
                    </button>
                  ))}

                  {/* Selected Bounty Details */}
                  <details className="group overflow-hidden" open>
                    <summary className="cursor-pointer text-[10px] font-medium text-[#DC1FFF] flex items-center gap-1 mt-3">
                      <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                      View Bounty Details: {selectedBounty.title}
                    </summary>
                    <div className="mt-2 p-3 rounded-lg bg-gray-900/50 border border-gray-800 space-y-3 overflow-hidden">
                      {/* Description */}
                      <div>
                        <h4 className="text-[9px] font-medium text-gray-400 uppercase mb-1">Description</h4>
                        <p className="text-[11px] text-gray-300 leading-relaxed">{selectedBounty.description}</p>
                      </div>

                      {/* Requirements */}
                      <div>
                        <h4 className="text-[9px] font-medium text-gray-400 uppercase mb-1">Requirements ({selectedBounty.requirements.length})</h4>
                        <ul className="space-y-1 max-h-32 overflow-y-auto">
                          {selectedBounty.requirements.map((req, i) => (
                            <li key={i} className="text-[10px] text-gray-400 flex items-start gap-1.5">
                              <span className="text-[#00FFA3] mt-0.5">•</span>
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Tech Stack */}
                      <div>
                        <h4 className="text-[9px] font-medium text-gray-400 uppercase mb-1">Tech Stack</h4>
                        <div className="flex flex-wrap gap-1">
                          {selectedBounty.techStack.map((tech, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[9px] bg-[#00C2FF]/10 text-[#00C2FF] border border-[#00C2FF]/20">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </div>

            {/* Step 2: Submission */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${currentStep >= 2 ? "gradient-button text-white" : "bg-gray-800 text-gray-500"}`}>2</div>
                <h3 className="font-semibold text-sm">Submission</h3>
              </div>

              <div className="gradient-border p-3 space-y-3">
                {/* Examples */}
                {!customBounty && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        Examples for "{selectedBounty.title}"
                      </label>
                      <button
                        onClick={() => {
                          setBatchMode(!batchMode);
                          if (!batchMode) setSelectedForBatch(new Set());
                        }}
                        className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border transition-all ${
                          batchMode ? "border-[#00C2FF] bg-[#00C2FF]/10 text-[#00C2FF]" : "border-gray-700 text-gray-500 hover:border-gray-600"
                        }`}
                      >
                        {batchMode ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                        Batch Mode
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {selectedBounty.examples.map((example) => {
                        const qualityColors = {
                          excellent: { bg: "bg-[#00FFA3]/20", text: "text-[#00FFA3]", border: "border-[#00FFA3]/30", label: "PASS" },
                          good: { bg: "bg-[#00C2FF]/20", text: "text-[#00C2FF]", border: "border-[#00C2FF]/30", label: "GOOD" },
                          medium: { bg: "bg-amber-400/20", text: "text-amber-400", border: "border-amber-400/30", label: "MAYBE" },
                          poor: { bg: "bg-red-400/20", text: "text-red-400", border: "border-red-400/30", label: "FAIL" },
                        };
                        const qc = qualityColors[example.quality];
                        const isSelected = selectedForBatch.has(example.url);
                        return (
                          <button
                            key={example.url}
                            onClick={() => batchMode ? toggleBatchSelection(example.url) : handleSelectExample(example.url)}
                            className={`w-full text-left p-2 rounded-lg border transition-all ${
                              batchMode && isSelected
                                ? "border-[#00C2FF] bg-[#00C2FF]/10"
                                : githubUrl === example.url && !customUrl && !batchMode
                                  ? "border-[#00FFA3] bg-[#00FFA3]/10"
                                  : "border-gray-800 bg-gray-900/50 hover:border-gray-600"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {batchMode ? (
                                  isSelected ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-[#00C2FF]" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-gray-500" />
                                  )
                                ) : example.type === "pr" ? (
                                  <GitPullRequest className={`w-3.5 h-3.5 ${githubUrl === example.url ? "text-[#DC1FFF]" : "text-[#DC1FFF]/50"}`} />
                                ) : (
                                  <Github className={`w-3.5 h-3.5 ${githubUrl === example.url ? "text-[#00FFA3]" : "text-gray-500"}`} />
                                )}
                                <span className="font-medium text-xs">{example.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={`text-[8px] px-1.5 py-0.5 rounded border ${qc.bg} ${qc.text} ${qc.border}`}>
                                  {qc.label}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded ${example.type === "pr" ? "bg-[#DC1FFF]/20 text-[#DC1FFF]" : "bg-gray-800 text-gray-400"}`}>
                                  {example.type.toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <p className="text-[10px] text-gray-500 ml-5 truncate">{example.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Custom URL */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                    {customBounty ? "GitHub URL" : "Or paste any URL"}
                  </label>
                  <div className="relative">
                    <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="url"
                      placeholder="https://github.com/owner/repo or /pull/123"
                      value={customUrl}
                      onChange={(e) => handleCustomUrlChange(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-900/50 border border-gray-700 focus:border-[#DC1FFF]/50 outline-none text-sm"
                    />
                  </div>
                </div>

                {/* Model Selector */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                    <Settings className="w-3 h-3" /> AI Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-700 focus:border-[#DC1FFF]/50 outline-none text-sm appearance-none cursor-pointer"
                  >
                    {AVAILABLE_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description} {model.recommended ? "⭐" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-2 rounded-lg bg-red-400/10 border border-red-400/30 text-red-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Run Button */}
                {batchMode ? (
                  <button
                    onClick={handleBatchAnalyze}
                    disabled={isBatchAnalyzing || selectedForBatch.size === 0}
                    className="w-full gradient-button py-2.5 rounded-lg font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBatchAnalyzing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing {selectedForBatch.size} items...</>
                    ) : (
                      <><Play className="w-4 h-4" /> Run Batch Review ({selectedForBatch.size} selected)</>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || (!githubUrl && !customUrl)}
                    className="w-full gradient-button py-2.5 rounded-lg font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Play className="w-4 h-4" /> Run Auto-Review</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Terminal & Results (3/5) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Terminal - LARGE */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="w-4 h-4 text-[#00FFA3]" />
                <h3 className="font-semibold text-sm">Live Process Log</h3>
                <span className="text-[10px] text-gray-500">Real-time analysis steps</span>
              </div>
              <div className="rounded-xl border border-gray-800 bg-black overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-800 bg-gray-900/50">
                  <Circle className="w-2.5 h-2.5 text-red-500 fill-red-500" />
                  <Circle className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                  <Circle className="w-2.5 h-2.5 text-green-500 fill-green-500" />
                  <span className="text-[10px] text-gray-500 ml-2 font-mono">earn-agent@v1.0.0 ~ /auto-review</span>
                </div>
                <div
                  ref={terminalRef}
                  className="p-3 h-64 overflow-y-auto font-mono text-[11px] leading-relaxed"
                >
                  {logs.length === 0 ? (
                    <div className="text-gray-600 space-y-1">
                      <p className="text-[#00FFA3]">$ earn-agent --help</p>
                      <p className="text-gray-500 mt-2">Usage: Select a bounty and submission above,</p>
                      <p className="text-gray-500">       then click "Run Auto-Review" to start.</p>
                      <p className="text-gray-600 mt-4"># The process log will show:</p>
                      <p className="text-gray-600">  - GitHub API connection</p>
                      <p className="text-gray-600">  - Repository/PR data fetching</p>
                      <p className="text-gray-600">  - File structure analysis</p>
                      <p className="text-gray-600">  - AI model processing</p>
                      <p className="text-gray-600">  - Requirement matching</p>
                      <p className="text-gray-600">  - Final score and label</p>
                      <p className="text-gray-700 mt-4"># All reviews are saved to the database.</p>
                    </div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className={`flex gap-2 ${getLogColor(log.type)}`}>
                        <span className="text-gray-600 select-none">[{log.time}]</span>
                        {log.type === "processing" && <Loader2 className="w-3 h-3 animate-spin flex-shrink-0 mt-0.5" />}
                        {log.type === "success" && <CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-0.5" />}
                        {log.type === "error" && <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />}
                        <span className="break-all">{log.message}</span>
                      </div>
                    ))
                  )}
                  {isAnalyzing && <span className="text-[#DC1FFF] animate-pulse">█</span>}
                </div>
              </div>
            </div>

            {/* Results */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${result ? "gradient-button text-white" : "bg-gray-800 text-gray-500"}`}>3</div>
                <h3 className="font-semibold text-sm">Review Results</h3>
              </div>

              {result ? (
                <div className="gradient-border p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {result.evaluation.github.type === "pr" ? (
                          <GitPullRequest className="w-5 h-5 text-[#DC1FFF]" />
                        ) : (
                          <Github className="w-5 h-5 text-[#DC1FFF]" />
                        )}
                        <h2 className="font-bold text-sm">
                          {result.evaluation.github.owner}/{result.evaluation.github.repo}
                          {result.evaluation.github.prNumber && <span className="text-[#DC1FFF]"> #{result.evaluation.github.prNumber}</span>}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getLabelColor(result.evaluation.finalLabel)}`}>
                          {result.evaluation.finalLabel.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Confidence: {(result.evaluation.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {savedReviewId && (
                        <button
                          onClick={handleDeleteReview}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          title="Delete from database"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <a
                        href={githubUrl || customUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="grid grid-cols-5 gap-2">
                    <div className={`p-2 rounded-lg border ${getScoreBg(result.evaluation.totalScore)} text-center`}>
                      <div className={`text-xl font-bold ${getScoreColor(result.evaluation.totalScore)}`}>{result.evaluation.totalScore}</div>
                      <div className="text-[9px] text-gray-400">TOTAL</div>
                    </div>
                    {[
                      { score: result.evaluation.github.requirementMatch.score, label: "Match", icon: FileCheck, color: "#DC1FFF" },
                      { score: result.evaluation.github.codeQuality.score, label: "Quality", icon: Code2, color: "#00C2FF" },
                      { score: result.evaluation.github.completeness.score, label: "Complete", icon: Layers, color: "#00FFA3" },
                      { score: result.evaluation.github.security.score, label: "Security", icon: Shield, color: "#F59E0B" },
                    ].map(({ score, label, icon: Icon, color }) => (
                      <div key={label} className="p-2 rounded-lg bg-gray-800/50 text-center">
                        <Icon className="w-3 h-3 mx-auto mb-0.5" style={{ color }} />
                        <div className="text-base font-bold">{score}</div>
                        <div className="text-[9px] text-gray-400">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-700">
                    <h4 className="text-[10px] font-medium text-gray-400 mb-1 uppercase">AI Summary</h4>
                    <p className="text-xs text-gray-300">{result.evaluation.notes}</p>
                  </div>

                  {/* Technical Metadata */}
                  {result.evaluation.technical && (
                    <details className="group overflow-hidden">
                      <summary className="cursor-pointer text-[10px] font-medium text-[#00C2FF] flex items-center gap-1">
                        <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                        Technical Details ({result.evaluation.technical.totalFiles} files, {result.evaluation.technical.totalLinesAnalyzed.toLocaleString()} lines)
                      </summary>
                      <div className="mt-2 p-2 rounded-lg bg-gray-900/50 border border-gray-800 space-y-2 overflow-hidden">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-1 rounded bg-gray-800/50">
                            <div className="text-sm font-bold">{result.evaluation.technical.totalFiles}</div>
                            <div className="text-[8px] text-gray-500">Files</div>
                          </div>
                          <div className="p-1 rounded bg-gray-800/50">
                            <div className="text-sm font-bold">{result.evaluation.technical.totalLinesAnalyzed.toLocaleString()}</div>
                            <div className="text-[8px] text-gray-500">Lines</div>
                          </div>
                          <div className="p-1 rounded bg-gray-800/50">
                            <div className="text-sm font-bold">{(result.evaluation.technical.totalBytesAnalyzed / 1024).toFixed(1)}KB</div>
                            <div className="text-[8px] text-gray-500">Size</div>
                          </div>
                        </div>
                        <div className="text-[9px] text-gray-400">
                          <span className="font-medium">Languages:</span> {result.evaluation.technical.languagesDetected.join(", ")}
                        </div>
                        <div className="max-h-24 overflow-y-auto">
                          {result.evaluation.technical.filesAnalyzed.map((f, i) => (
                            <div key={i} className="text-[9px] text-gray-500 flex items-center gap-2">
                              <span className={`px-1 rounded text-[7px] ${
                                f.importance === "critical" ? "bg-red-500/20 text-red-400" :
                                f.importance === "high" ? "bg-amber-500/20 text-amber-400" :
                                "bg-gray-700 text-gray-400"
                              }`}>{f.importance}</span>
                              <span className="truncate flex-1">{f.path}</span>
                              <span className="text-gray-600">{f.lines}L</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  )}

                  {/* Requirements with Evidence */}
                  <details className="group overflow-hidden" open>
                    <summary className="cursor-pointer text-[10px] font-medium text-[#DC1FFF] flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                      Requirement Matching ({result.evaluation.github.requirementMatch.matched.length}/{result.evaluation.github.requirementMatch.matched.length + result.evaluation.github.requirementMatch.missing.length})
                    </summary>
                    <div className="mt-2 space-y-2 overflow-hidden">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-lg bg-[#00FFA3]/5 border border-[#00FFA3]/20">
                          <div className="flex items-center gap-1 text-[#00FFA3] text-[10px] font-medium mb-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Matched ({result.evaluation.github.requirementMatch.matched.length})
                          </div>
                          <ul className="space-y-0.5 max-h-24 overflow-y-auto">
                            {result.evaluation.github.requirementMatch.matched.map((req, i) => (
                              <li key={i} className="text-[10px] text-gray-400">• {req}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-2 rounded-lg bg-red-400/5 border border-red-400/20">
                          <div className="flex items-center gap-1 text-red-400 text-[10px] font-medium mb-1">
                            <AlertTriangle className="w-3 h-3" />
                            Missing ({result.evaluation.github.requirementMatch.missing.length})
                          </div>
                          <ul className="space-y-0.5 max-h-24 overflow-y-auto">
                            {result.evaluation.github.requirementMatch.missing.length > 0 ? (
                              result.evaluation.github.requirementMatch.missing.map((req, i) => (
                                <li key={i} className="text-[10px] text-gray-400">• {req}</li>
                              ))
                            ) : (
                              <li className="text-[10px] text-gray-500">All requirements matched!</li>
                            )}
                          </ul>
                        </div>
                      </div>
                      {/* Evidence */}
                      {result.evaluation.github.requirementMatch.evidence.length > 0 && (
                        <div className="p-2 rounded-lg bg-gray-800/30 border border-gray-700">
                          <h5 className="text-[9px] font-medium text-gray-400 mb-1 uppercase">Evidence Found</h5>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {result.evaluation.github.requirementMatch.evidence.map((ev, i) => (
                              <div key={i} className="text-[9px] p-1 rounded bg-gray-900/50">
                                <div className="text-[#00FFA3] font-medium">{ev.requirement}</div>
                                <div className="text-gray-500">
                                  Found in <span className="text-[#00C2FF]">{ev.file}</span>
                                  {ev.lineRange && <span> (lines {ev.lineRange})</span>}
                                </div>
                                <div className="text-gray-400 mt-0.5">{ev.explanation}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>

                  {/* Code Quality Details */}
                  <details className="group overflow-hidden">
                    <summary className="cursor-pointer text-[10px] font-medium text-[#00C2FF] flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                      Code Quality Analysis ({result.evaluation.github.codeQuality.issues.length} issues found)
                    </summary>
                    <div className="mt-2 space-y-2 overflow-hidden">
                      {result.evaluation.github.codeQuality.strengths.length > 0 && (
                        <div className="p-2 rounded-lg bg-[#00FFA3]/5 border border-[#00FFA3]/20">
                          <h5 className="text-[9px] font-medium text-[#00FFA3] mb-1">Strengths</h5>
                          {result.evaluation.github.codeQuality.strengths.map((s, i) => (
                            <div key={i} className="text-[9px] text-gray-400">+ {s}</div>
                          ))}
                        </div>
                      )}
                      {result.evaluation.github.codeQuality.issues.length > 0 && (
                        <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                          <h5 className="text-[9px] font-medium text-amber-400 mb-1">Issues</h5>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {result.evaluation.github.codeQuality.issues.map((issue, i) => (
                              <div key={i} className="text-[9px] p-1 rounded bg-gray-900/50">
                                <span className={`px-1 rounded text-[7px] ${
                                  issue.severity === "critical" ? "bg-red-500/20 text-red-400" :
                                  issue.severity === "major" ? "bg-amber-500/20 text-amber-400" :
                                  "bg-gray-700 text-gray-400"
                                }`}>{issue.severity}</span>
                                <span className="text-gray-300 ml-1">{issue.description}</span>
                                {issue.file && <div className="text-gray-500 text-[8px]">in {issue.file}</div>}
                                {issue.suggestion && <div className="text-[#00C2FF] text-[8px] mt-0.5">Suggestion: {issue.suggestion}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>

                  {/* Security Analysis */}
                  <details className="group overflow-hidden">
                    <summary className="cursor-pointer text-[10px] font-medium text-amber-400 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                      Security Analysis ({result.evaluation.github.security.findings.length} findings)
                    </summary>
                    <div className="mt-2 p-2 rounded-lg bg-gray-800/30 border border-gray-700 overflow-hidden">
                      {result.evaluation.github.security.findings.length > 0 ? (
                        <div className="space-y-1">
                          {result.evaluation.github.security.findings.map((f, i) => (
                            <div key={i} className="text-[9px] text-gray-400">⚠ {f}</div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[9px] text-gray-500">No security issues found</div>
                      )}
                      {result.evaluation.github.security.solanaSpecific.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-700">
                          <h5 className="text-[9px] font-medium text-[#DC1FFF] mb-1">Solana-Specific Checks</h5>
                          {result.evaluation.github.security.solanaSpecific.map((f, i) => (
                            <div key={i} className="text-[9px] text-gray-400">🔐 {f}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </details>

                  {/* Red Flags */}
                  {result.evaluation.github.redFlags.length > 0 && (
                    <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                      <h4 className="text-[10px] font-medium text-red-400 mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Red Flags ({result.evaluation.github.redFlags.length})
                      </h4>
                      <div className="space-y-1">
                        {result.evaluation.github.redFlags.map((rf, i) => (
                          <div key={i} className="text-[9px] p-1 rounded bg-gray-900/50">
                            <span className={`px-1 rounded text-[7px] ${
                              rf.severity === "critical" ? "bg-red-500/30 text-red-400" :
                              rf.severity === "warning" ? "bg-amber-500/30 text-amber-400" :
                              "bg-gray-700 text-gray-400"
                            }`}>{rf.severity}</span>
                            <span className="text-[#00C2FF] ml-1">[{rf.type}]</span>
                            <span className="text-gray-300 ml-1">{rf.description}</span>
                            {rf.file && <div className="text-gray-500 text-[8px]">in {rf.file}{rf.line && `:${rf.line}`}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completeness */}
                  <details className="group overflow-hidden">
                    <summary className="cursor-pointer text-[10px] font-medium text-[#00FFA3] flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                      Completeness ({result.evaluation.github.completeness.implemented.length} implemented, {result.evaluation.github.completeness.missing.length} missing)
                    </summary>
                    <div className="mt-2 grid grid-cols-2 gap-2 overflow-hidden">
                      <div className="p-2 rounded-lg bg-[#00FFA3]/5 border border-[#00FFA3]/20">
                        <h5 className="text-[9px] font-medium text-[#00FFA3] mb-1">Implemented</h5>
                        <ul className="space-y-0.5 max-h-20 overflow-y-auto">
                          {result.evaluation.github.completeness.implemented.map((f, i) => (
                            <li key={i} className="text-[9px] text-gray-400">✓ {f}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-800/30 border border-gray-700">
                        <h5 className="text-[9px] font-medium text-gray-400 mb-1">Missing</h5>
                        <ul className="space-y-0.5 max-h-20 overflow-y-auto">
                          {result.evaluation.github.completeness.missing.length > 0 ? (
                            result.evaluation.github.completeness.missing.map((f, i) => (
                              <li key={i} className="text-[9px] text-gray-500">✗ {f}</li>
                            ))
                          ) : (
                            <li className="text-[9px] text-gray-500">Nothing missing</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </details>

                  {/* AI Detailed Notes */}
                  <details className="group overflow-hidden">
                    <summary className="cursor-pointer text-[10px] font-medium text-gray-400 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                      Full AI Analysis Notes
                    </summary>
                    <div className="mt-2 p-3 rounded-lg bg-gray-900/50 border border-gray-800 max-h-64 overflow-y-auto prose prose-sm prose-invert prose-headings:text-gray-200 prose-p:text-gray-400 prose-li:text-gray-400 prose-strong:text-gray-300 prose-code:text-[#00C2FF] prose-code:bg-gray-800 prose-code:px-1 prose-code:rounded max-w-none">
                      <div className="text-[10px] leading-relaxed">
                        <ReactMarkdown>
                          {result.evaluation.detailedNotes}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </details>

                  {/* Metadata */}
                  <div className="p-2 rounded-lg bg-gray-800/30 border border-gray-700">
                    <h4 className="text-[9px] font-medium text-gray-500 mb-1 uppercase">Processing Metadata</h4>
                    <div className="grid grid-cols-4 gap-2 text-center text-[9px]">
                      <div>
                        <div className="font-bold text-white">{result.evaluation.modelUsed}</div>
                        <div className="text-gray-500">Model</div>
                      </div>
                      <div>
                        <div className="font-bold text-white">{result.evaluation.tokensUsed.toLocaleString()}</div>
                        <div className="text-gray-500">Tokens</div>
                      </div>
                      <div>
                        <div className="font-bold text-white">${result.evaluation.estimatedCost.toFixed(6)}</div>
                        <div className="text-gray-500">Cost</div>
                      </div>
                      <div>
                        <div className="font-bold text-white">{(result.evaluation.processingTimeMs / 1000).toFixed(2)}s</div>
                        <div className="text-gray-500">Time</div>
                      </div>
                    </div>
                  </div>

                  {/* DB Info */}
                  {savedReviewId && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#00FFA3]/5 border border-[#00FFA3]/20">
                      <CheckCircle2 className="w-4 h-4 text-[#00FFA3]" />
                      <span className="text-xs text-[#00FFA3]">Saved to database</span>
                      <code className="text-[10px] text-gray-500 font-mono ml-auto">{savedReviewId}</code>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setResult(null);
                        setGithubUrl("");
                        setCustomUrl("");
                        setCurrentStep(1);
                        setLogs([]);
                        setSavedReviewId(null);
                      }}
                      className="flex-1 py-2 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors text-xs flex items-center justify-center gap-1"
                    >
                      <ArrowRight className="w-3 h-3" /> Test Another
                    </button>
                    <details className="group flex-1">
                      <summary className="cursor-pointer py-2 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors text-xs flex items-center justify-center gap-1 list-none">
                        <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" /> Raw JSON
                      </summary>
                      <pre className="mt-2 p-2 rounded-lg bg-gray-900/80 text-[9px] text-gray-400 overflow-x-auto max-h-40 border border-gray-800">
                        {JSON.stringify(result.evaluation, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              ) : (
                <div className="gradient-border p-6 text-center">
                  <Bot className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                  <h3 className="font-medium text-sm mb-1">Ready to Review</h3>
                  <p className="text-[10px] text-gray-500">Results will appear here after analysis</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="py-4 px-4 border-t border-gray-800">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#DC1FFF]" />
              <span className="text-xs text-gray-400">GitHub Auto-Review for Superteam Earn</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <a
                href="/docs"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00C2FF]/10 border border-[#00C2FF]/30 text-[#00C2FF] hover:bg-[#00C2FF]/20 transition-colors"
              >
                <BookOpen className="w-3 h-3" />
                Documentation
              </a>
              <a
                href="https://github.com/0xjesus/super-team-autoreviews"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <Github className="w-3 h-3" />
                Source Code
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Saved Reviews Modal - Enhanced with full details */}
      {showSavedReviews && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#DC1FFF]" />
                <h2 className="font-bold">Saved Reviews Database</h2>
                <span className="text-xs text-gray-500">({savedReviews.length} reviews)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchSavedReviews}
                  disabled={loadingSavedReviews}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingSavedReviews ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => setShowSavedReviews(false)}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              {loadingSavedReviews ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#DC1FFF]" />
                </div>
              ) : savedReviews.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <h3 className="font-medium mb-1">No Saved Reviews</h3>
                  <p className="text-xs text-gray-500">Reviews will appear here after you run analyses</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedReviews.map((review) => (
                    <details
                      key={review.id}
                      className="group rounded-xl border border-gray-800 bg-gray-800/30 overflow-hidden"
                    >
                      <summary className="cursor-pointer p-4 hover:bg-gray-800/50 transition-colors list-none">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <ChevronRight className="w-4 h-4 text-gray-500 group-open:rotate-90 transition-transform flex-shrink-0" />
                              {review.submission.githubType === "pr" ? (
                                <GitPullRequest className="w-4 h-4 text-[#DC1FFF] flex-shrink-0" />
                              ) : (
                                <Github className="w-4 h-4 text-[#00FFA3] flex-shrink-0" />
                              )}
                              <span className="font-medium text-sm truncate">
                                {review.submission.owner}/{review.submission.repo}
                                {review.submission.prNumber && <span className="text-[#DC1FFF]"> #{review.submission.prNumber}</span>}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap ml-6">
                              {review.labels?.map((label, i) => (
                                <span key={i} className={`px-2 py-0.5 rounded-full text-[9px] font-medium border ${getLabelColor(label)}`}>
                                  {label.replace(/_/g, " ")}
                                </span>
                              ))}
                              <span className="text-[10px] text-gray-500">
                                {review.modelUsed} • {review.tokensUsed?.toLocaleString()} tokens • ${parseFloat(review.estimatedCost || "0").toFixed(4)} • {new Date(review.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-lg text-center ${getScoreBg(review.overallScore || 0)}`}>
                              <div className={`text-lg font-bold ${getScoreColor(review.overallScore || 0)}`}>
                                {review.overallScore || 0}
                              </div>
                              <div className="text-[8px] text-gray-500">SCORE</div>
                            </div>
                          </div>
                        </div>
                      </summary>

                      {/* Expanded details */}
                      <div className="p-4 pt-0 border-t border-gray-800 mt-2 space-y-4">
                        {/* Score Breakdown */}
                        <div className="grid grid-cols-5 gap-2">
                          <div className={`p-2 rounded-lg border ${getScoreBg(review.overallScore || 0)} text-center`}>
                            <div className={`text-lg font-bold ${getScoreColor(review.overallScore || 0)}`}>{review.overallScore || 0}</div>
                            <div className="text-[8px] text-gray-400">OVERALL</div>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-800/50 text-center">
                            <div className="text-base font-bold text-[#DC1FFF]">{review.requirementMatchScore || 0}</div>
                            <div className="text-[8px] text-gray-400">MATCH</div>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-800/50 text-center">
                            <div className="text-base font-bold text-[#00C2FF]">{review.codeQualityScore || 0}</div>
                            <div className="text-[8px] text-gray-400">QUALITY</div>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-800/50 text-center">
                            <div className="text-base font-bold text-[#00FFA3]">{review.completenessScore || 0}</div>
                            <div className="text-[8px] text-gray-400">COMPLETE</div>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-800/50 text-center">
                            <div className="text-base font-bold text-amber-400">{review.securityScore || 0}</div>
                            <div className="text-[8px] text-gray-400">SECURITY</div>
                          </div>
                        </div>

                        {/* Summary */}
                        {review.summary && (
                          <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-700">
                            <h4 className="text-[10px] font-medium text-gray-400 mb-1 uppercase">AI Summary</h4>
                            <p className="text-xs text-gray-300">{review.summary}</p>
                          </div>
                        )}

                        {/* Requirements */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-lg bg-[#00FFA3]/5 border border-[#00FFA3]/20">
                            <h5 className="text-[9px] font-medium text-[#00FFA3] mb-1">Matched Requirements ({review.matchedRequirements?.length || 0})</h5>
                            <ul className="space-y-0.5 max-h-24 overflow-y-auto">
                              {review.matchedRequirements?.map((req, i) => (
                                <li key={i} className="text-[9px] text-gray-400">✓ {req}</li>
                              )) || <li className="text-[9px] text-gray-500">None recorded</li>}
                            </ul>
                          </div>
                          <div className="p-2 rounded-lg bg-red-400/5 border border-red-400/20">
                            <h5 className="text-[9px] font-medium text-red-400 mb-1">Missing Requirements ({review.missingRequirements?.length || 0})</h5>
                            <ul className="space-y-0.5 max-h-24 overflow-y-auto">
                              {review.missingRequirements?.length ? (
                                review.missingRequirements.map((req, i) => (
                                  <li key={i} className="text-[9px] text-gray-400">✗ {req}</li>
                                ))
                              ) : (
                                <li className="text-[9px] text-gray-500">All matched!</li>
                              )}
                            </ul>
                          </div>
                        </div>

                        {/* Red Flags */}
                        {review.redFlags && review.redFlags.length > 0 && (
                          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                            <h5 className="text-[9px] font-medium text-red-400 mb-1">Red Flags ({review.redFlags.length})</h5>
                            <div className="space-y-1">
                              {review.redFlags.map((rf, i) => (
                                <div key={i} className="text-[9px] text-gray-400">
                                  <span className={`px-1 rounded text-[7px] ${
                                    rf.severity === "critical" ? "bg-red-500/30 text-red-400" :
                                    rf.severity === "warning" ? "bg-amber-500/30 text-amber-400" :
                                    "bg-gray-700 text-gray-400"
                                  }`}>{rf.severity}</span>
                                  <span className="text-[#00C2FF] ml-1">[{rf.type}]</span>
                                  <span className="ml-1">{rf.description}</span>
                                  {rf.file && <span className="text-gray-500"> in {rf.file}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Detailed Notes */}
                        {review.detailedNotes && (
                          <details className="group/notes overflow-hidden">
                            <summary className="cursor-pointer text-[10px] font-medium text-gray-400 flex items-center gap-1">
                              <ChevronRight className="w-3 h-3 group-open/notes:rotate-90 transition-transform" />
                              Full AI Analysis Notes
                            </summary>
                            <div className="mt-2 p-3 rounded-lg bg-gray-900/50 border border-gray-800 max-h-64 overflow-y-auto prose prose-sm prose-invert prose-headings:text-gray-200 prose-p:text-gray-400 prose-li:text-gray-400 prose-strong:text-gray-300 prose-code:text-[#00C2FF] prose-code:bg-gray-800 prose-code:px-1 prose-code:rounded max-w-none">
                              <div className="text-[10px] leading-relaxed">
                                <ReactMarkdown>
                                  {review.detailedNotes}
                                </ReactMarkdown>
                              </div>
                            </div>
                          </details>
                        )}

                        {/* Metadata */}
                        <div className="p-2 rounded-lg bg-gray-800/30 border border-gray-700">
                          <h4 className="text-[9px] font-medium text-gray-500 mb-2 uppercase">Processing Metadata</h4>
                          <div className="grid grid-cols-6 gap-2 text-center text-[9px]">
                            <div>
                              <div className="font-bold text-white">{review.modelUsed || "N/A"}</div>
                              <div className="text-gray-500">Model</div>
                            </div>
                            <div>
                              <div className="font-bold text-white">{review.tokensUsed?.toLocaleString() || "N/A"}</div>
                              <div className="text-gray-500">Tokens</div>
                            </div>
                            <div>
                              <div className="font-bold text-white">${parseFloat(review.estimatedCost || "0").toFixed(6)}</div>
                              <div className="text-gray-500">Cost</div>
                            </div>
                            <div>
                              <div className="font-bold text-white">{review.processingTimeMs ? (review.processingTimeMs / 1000).toFixed(2) + "s" : "N/A"}</div>
                              <div className="text-gray-500">Time</div>
                            </div>
                            <div>
                              <div className="font-bold text-white">{review.confidence ? (parseFloat(review.confidence) * 100).toFixed(0) + "%" : "N/A"}</div>
                              <div className="text-gray-500">Confidence</div>
                            </div>
                            <div>
                              <div className="font-bold text-white">{review.submission.status}</div>
                              <div className="text-gray-500">Status</div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <a
                            href={review.submission.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors text-xs flex items-center justify-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> View on GitHub
                          </a>
                          <button
                            onClick={() => handleDeleteSavedReview(review.submission.id)}
                            className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors text-xs flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>

                        {/* Database IDs */}
                        <div className="text-[8px] text-gray-600 font-mono">
                          Review ID: {review.id} | Submission ID: {review.submission.id} | External: {review.submission.externalId}
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Results Modal */}
      {batchItems.length > 0 && !isBatchAnalyzing && batchItems.some(b => b.status === "done") && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#00C2FF]" />
                <h2 className="font-bold">Batch Review Results</h2>
                <span className="text-xs text-gray-500">
                  ({batchItems.filter(b => b.status === "done").length}/{batchItems.length} completed)
                </span>
              </div>
              <button
                onClick={() => {
                  setBatchItems([]);
                  setBatchMode(false);
                  setSelectedForBatch(new Set());
                }}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="space-y-3">
                {batchItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-colors ${
                      item.status === "done"
                        ? "border-gray-800 bg-gray-800/30"
                        : item.status === "error"
                          ? "border-red-500/30 bg-red-500/5"
                          : "border-gray-800 bg-gray-800/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {item.status === "done" ? (
                            <CheckCircle2 className="w-4 h-4 text-[#00FFA3] flex-shrink-0" />
                          ) : item.status === "error" ? (
                            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          )}
                          <span className="font-medium text-sm truncate">{item.name}</span>
                        </div>
                        {item.result && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium border ${getLabelColor(item.result.evaluation.finalLabel)}`}>
                              {item.result.evaluation.finalLabel.replace(/_/g, " ")}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {item.result.evaluation.modelUsed} • ${item.result.evaluation.estimatedCost.toFixed(4)}
                            </span>
                          </div>
                        )}
                        {item.error && (
                          <p className="text-[10px] text-red-400 mt-1">{item.error}</p>
                        )}
                        {item.result?.evaluation.notes && (
                          <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{item.result.evaluation.notes}</p>
                        )}
                      </div>
                      {item.result && (
                        <div className="flex items-center gap-2">
                          <div className={`px-3 py-1 rounded-lg text-center ${getScoreBg(item.result.evaluation.totalScore)}`}>
                            <div className={`text-lg font-bold ${getScoreColor(item.result.evaluation.totalScore)}`}>
                              {item.result.evaluation.totalScore}
                            </div>
                            <div className="text-[8px] text-gray-500">SCORE</div>
                          </div>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-4 p-3 rounded-xl bg-gray-800/50 border border-gray-700">
                <h4 className="text-xs font-medium mb-2">Summary</h4>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-[#00FFA3]">{batchItems.filter(b => b.status === "done").length}</div>
                    <div className="text-[9px] text-gray-500">Completed</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-400">{batchItems.filter(b => b.status === "error").length}</div>
                    <div className="text-[9px] text-gray-500">Failed</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">
                      {Math.round(batchItems.filter(b => b.result).reduce((sum, b) => sum + (b.result?.evaluation.totalScore || 0), 0) / Math.max(batchItems.filter(b => b.result).length, 1))}
                    </div>
                    <div className="text-[9px] text-gray-500">Avg Score</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-amber-400">
                      ${batchItems.filter(b => b.result).reduce((sum, b) => sum + (b.result?.evaluation.estimatedCost || 0), 0).toFixed(4)}
                    </div>
                    <div className="text-[9px] text-gray-500">Total Cost</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
