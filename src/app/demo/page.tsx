"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
  ArrowLeft,
  Zap,
  Clock,
  RefreshCw,
} from "lucide-react";

interface ReviewResult {
  success: boolean;
  warning?: string;
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
        evidence: Array<{
          requirement: string;
          file: string;
          explanation: string;
        }>;
      };
      codeQuality: {
        score: number;
        strengths: string[];
        issues: Array<{
          severity: string;
          description: string;
          file?: string;
        }>;
      };
      security: {
        score: number;
        findings: string[];
        solanaSpecific: string[];
      };
      completeness: {
        score: number;
        implemented: string[];
        missing: string[];
      };
      redFlags: Array<{
        type: string;
        severity: string;
        description: string;
        file?: string;
      }>;
    };
    confidence: number;
    detailedNotes: string;
    suggestedLabels: string[];
    modelUsed: string;
    tokensUsed: number;
    processingTimeMs: number;
  };
}

function DemoContent() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";

  const [githubUrl, setGithubUrl] = useState(initialUrl);
  const [bountyTitle, setBountyTitle] = useState("");
  const [requirements, setRequirements] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [useDemoMode, setUseDemoMode] = useState(false);

  // Auto-analyze if URL is provided
  useEffect(() => {
    if (initialUrl && !result && !isAnalyzing) {
      handleAnalyze();
    }
  }, [initialUrl]);

  const handleAnalyze = async () => {
    if (!githubUrl) {
      setError("Please enter a GitHub URL");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setProgress("Validating GitHub URL...");

    try {
      setProgress("Fetching repository data from GitHub...");

      const response = await fetch("/api/demo/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubUrl,
          bountyTitle: bountyTitle || "Code Review Demo",
          requirements: requirements
            ? requirements.split("\n").filter((r) => r.trim())
            : ["Good code quality", "Security best practices", "Complete implementation"],
          demoMode: useDemoMode,
        }),
      });

      setProgress("AI is analyzing the code...");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAnalyzing(false);
      setProgress("");
    }
  };

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
    switch (label) {
      case "Shortlisted":
        return "bg-[#00FFA3]/20 text-[#00FFA3] border-[#00FFA3]/30";
      case "High_Quality":
        return "bg-[#00C2FF]/20 text-[#00C2FF] border-[#00C2FF]/30";
      case "Mid_Quality":
        return "bg-amber-400/20 text-amber-400 border-amber-400/30";
      case "Low_Quality":
        return "bg-red-400/20 text-red-400 border-red-400/30";
      default:
        return "bg-gray-400/20 text-gray-400 border-gray-400/30";
    }
  };

  return (
    <div className="min-h-screen bg-grid">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
            <div className="w-8 h-8 rounded-lg gradient-button flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">GitHub Auto-Review Demo</span>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Test the AI Review</h1>
              <p className="text-gray-400">
                Enter any public GitHub repository or PR to see how the AI analyzes it
              </p>
            </div>

            <div className="gradient-border p-6 space-y-4">
              {/* GitHub URL */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  GitHub URL <span className="text-[#DC1FFF]">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://github.com/owner/repo or .../pull/123"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-800 focus:border-[#DC1FFF]/50 focus:ring-1 focus:ring-[#DC1FFF]/50 outline-none transition-all"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Supports repositories and pull requests
                </p>
              </div>

              {/* Bounty Title (Optional) */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Bounty Title <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Build a Token Swap on Solana"
                  value={bountyTitle}
                  onChange={(e) => setBountyTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-800 focus:border-[#DC1FFF]/50 focus:ring-1 focus:ring-[#DC1FFF]/50 outline-none transition-all"
                />
              </div>

              {/* Requirements (Optional) */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Requirements <span className="text-gray-500">(one per line, optional)</span>
                </label>
                <textarea
                  placeholder="Implement swap functionality&#10;Add unit tests&#10;Deploy to devnet"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-800 focus:border-[#DC1FFF]/50 focus:ring-1 focus:ring-[#DC1FFF]/50 outline-none transition-all resize-none font-mono text-sm"
                />
              </div>

              {/* Demo Mode Toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useDemoMode}
                  onChange={(e) => setUseDemoMode(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-700 bg-gray-900/50 text-[#DC1FFF] focus:ring-[#DC1FFF]/50"
                />
                <span className="text-sm text-gray-400">
                  Demo mode <span className="text-gray-600">(show sample output without AI)</span>
                </span>
              </label>

              {/* Error */}
              {error && (
                <div className="p-4 rounded-xl bg-red-400/10 border border-red-400/30 text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !githubUrl}
                className="w-full gradient-button py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Analyze Code
                  </>
                )}
              </button>

              {/* Progress */}
              {progress && (
                <div className="text-sm text-[#00C2FF] flex items-center gap-2">
                  <Clock className="w-4 h-4 animate-pulse" />
                  {progress}
                </div>
              )}
            </div>

            {/* Example URLs */}
            <div className="gradient-border p-4">
              <p className="text-sm font-medium mb-3">Try these examples:</p>
              <div className="space-y-2">
                {[
                  "https://github.com/solana-labs/solana-web3.js",
                  "https://github.com/coral-xyz/anchor",
                  "https://github.com/metaplex-foundation/js",
                ].map((url) => (
                  <button
                    key={url}
                    onClick={() => setGithubUrl(url)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 text-sm text-gray-400 hover:text-white transition-colors truncate"
                  >
                    {url}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div>
            {isAnalyzing ? (
              <div className="gradient-border p-12 text-center">
                <Loader2 className="w-12 h-12 text-[#DC1FFF] animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Analyzing Code</h3>
                <p className="text-gray-500">{progress || "Please wait..."}</p>
              </div>
            ) : result ? (
              <div className="gradient-border p-6 space-y-6">
                {/* Demo Mode Warning */}
                {result.warning && (
                  <div className="p-4 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 text-sm flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block mb-1">Demo Mode</strong>
                      <span className="text-amber-400/80">{result.warning}</span>
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {result.evaluation.github.type === "pr" ? (
                        <GitPullRequest className="w-6 h-6 text-[#DC1FFF]" />
                      ) : (
                        <Github className="w-6 h-6 text-[#DC1FFF]" />
                      )}
                      <h2 className="text-xl font-bold">
                        {result.evaluation.github.owner}/{result.evaluation.github.repo}
                      </h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getLabelColor(result.evaluation.finalLabel)}`}>
                        {result.evaluation.finalLabel.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm text-gray-500">
                        {result.evaluation.processingTimeMs}ms | {result.evaluation.modelUsed}
                      </span>
                    </div>
                  </div>
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View
                  </a>
                </div>

                {/* Scores Grid */}
                <div className="grid grid-cols-5 gap-3">
                  <div className={`p-3 rounded-xl border ${getScoreBg(result.evaluation.totalScore)} text-center`}>
                    <div className={`text-2xl font-bold ${getScoreColor(result.evaluation.totalScore)}`}>
                      {result.evaluation.totalScore}
                    </div>
                    <div className="text-xs text-gray-400">Total</div>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-800/50 text-center">
                    <FileCheck className="w-4 h-4 text-[#DC1FFF] mx-auto mb-1" />
                    <div className="text-lg font-bold">{result.evaluation.github.requirementMatch.score}</div>
                    <div className="text-xs text-gray-400">Match</div>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-800/50 text-center">
                    <Code2 className="w-4 h-4 text-[#00C2FF] mx-auto mb-1" />
                    <div className="text-lg font-bold">{result.evaluation.github.codeQuality.score}</div>
                    <div className="text-xs text-gray-400">Quality</div>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-800/50 text-center">
                    <Layers className="w-4 h-4 text-[#00FFA3] mx-auto mb-1" />
                    <div className="text-lg font-bold">{result.evaluation.github.completeness.score}</div>
                    <div className="text-xs text-gray-400">Complete</div>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-800/50 text-center">
                    <Shield className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <div className="text-lg font-bold">{result.evaluation.github.security.score}</div>
                    <div className="text-xs text-gray-400">Security</div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Review Notes
                  </h3>
                  <p className="text-gray-300">{result.evaluation.notes}</p>
                </div>

                {/* Requirements */}
                {(result.evaluation.github.requirementMatch.matched.length > 0 ||
                  result.evaluation.github.requirementMatch.missing.length > 0) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-[#00FFA3] mb-2">Matched Requirements</h4>
                      <ul className="space-y-1">
                        {result.evaluation.github.requirementMatch.matched.map((req, i) => (
                          <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#00FFA3] flex-shrink-0 mt-0.5" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-red-400 mb-2">Missing Requirements</h4>
                      <ul className="space-y-1">
                        {result.evaluation.github.requirementMatch.missing.map((req, i) => (
                          <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Red Flags */}
                {result.evaluation.github.redFlags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">
                      Red Flags
                    </h3>
                    <div className="space-y-2">
                      {result.evaluation.github.redFlags.map((flag, i) => (
                        <div key={i} className="p-3 rounded-lg bg-red-400/10 border border-red-400/30">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <span className="font-medium text-red-400 capitalize text-sm">{flag.severity}</span>
                            <span className="text-gray-500 text-xs">| {flag.type.replace(/-/g, " ")}</span>
                          </div>
                          <p className="text-gray-300 text-sm">{flag.description}</p>
                          {flag.file && (
                            <p className="text-gray-500 text-xs mt-1 font-mono">{flag.file}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw JSON */}
                <details className="group">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400">
                    View raw evaluation JSON
                  </summary>
                  <pre className="mt-2 p-4 rounded-lg bg-gray-900/50 text-xs text-gray-400 overflow-x-auto">
                    {JSON.stringify(result.evaluation, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="gradient-border p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
                <Github className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Ready to Analyze</h3>
                <p className="text-gray-500 max-w-sm">
                  Enter a GitHub URL and click "Analyze Code" to see the AI review in action
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-grid flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#DC1FFF] animate-spin" />
      </div>
    }>
      <DemoContent />
    </Suspense>
  );
}
