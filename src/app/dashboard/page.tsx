"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Search,
  Github,
  GitPullRequest,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  Shield,
  Code2,
  FileCheck,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Send,
  Loader2,
} from "lucide-react";

interface Model {
  id: string;
  name: string;
  description: string;
  recommended: boolean;
  provider: string;
}

interface Submission {
  id: string;
  externalId: string;
  githubUrl: string;
  githubType: string;
  owner: string | null;
  repo: string | null;
  prNumber: number | null;
  status: string;
  createdAt: string;
  bountyTitle: string | null;
}

interface Review {
  id: string;
  submissionId: string;
  overallScore: number;
  requirementScore: number;
  codeQualityScore: number;
  completenessScore: number;
  securityScore: number;
  confidence: number;
  suggestedLabels: string[];
  summary: string;
  detailedNotes: string;
  redFlags: Array<{
    type: string;
    severity: string;
    description: string;
    file?: string;
  }>;
  submission: Submission;
}

export default function DashboardPage() {
  const [submissions, setSubmissions] = useState<(Submission & { review?: Review | null })[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<(Submission & { review?: Review | null }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"submissions" | "submit">("submissions");

  // Submit form state
  const [githubUrl, setGithubUrl] = useState("");
  const [bountyTitle, setBountyTitle] = useState("");
  const [bountyDescription, setBountyDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [models, setModels] = useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/submissions?limit=50");
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const response = await fetch("/api/models");
      if (response.ok) {
        const data = await response.json();
        setModels(data.models || []);
        if (data.defaultModel) {
          setSelectedModel(data.defaultModel);
        }
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
    fetchModels();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchSubmissions, 10000);
    return () => clearInterval(interval);
  }, [fetchSubmissions, fetchModels]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalId: `manual-${Date.now()}`,
          githubUrl,
          bountyTitle: bountyTitle || "Manual Review",
          bountyDescription: bountyDescription || "",
          requirements: requirements ? requirements.split("\n").filter((r) => r.trim()) : [],
          techStack: [],
          model: selectedModel,
          triggerReview: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit");
      }

      // Clear form and switch to submissions view
      setGithubUrl("");
      setBountyTitle("");
      setBountyDescription("");
      setRequirements("");
      setActiveTab("submissions");
      fetchSubmissions();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      sub.owner?.toLowerCase().includes(query) ||
      sub.repo?.toLowerCase().includes(query) ||
      sub.githubUrl.toLowerCase().includes(query) ||
      sub.bountyTitle?.toLowerCase().includes(query)
    );
  });

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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return { icon: CheckCircle2, color: "text-[#00FFA3]", bg: "bg-[#00FFA3]/10", label: "Completed" };
      case "processing":
        return { icon: Clock, color: "text-[#00C2FF]", bg: "bg-[#00C2FF]/10", label: "Processing" };
      case "failed":
        return { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10", label: "Failed" };
      default:
        return { icon: Clock, color: "text-gray-400", bg: "bg-gray-400/10", label: "Pending" };
    }
  };

  const extractRepoName = (url: string) => {
    const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
    return match ? match[1] : url;
  };

  return (
    <div className="min-h-screen bg-grid">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-button flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">Superteam Auto-Review</span>
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={fetchSubmissions}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin text-[#DC1FFF]" : "text-gray-400"}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab("submissions")}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === "submissions"
                ? "gradient-button text-white"
                : "bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            Submissions
          </button>
          <button
            onClick={() => setActiveTab("submit")}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === "submit"
                ? "gradient-button text-white"
                : "bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            Submit New
          </button>
        </div>

        {activeTab === "submissions" ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Submissions List */}
            <div className="lg:col-span-2 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search submissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-900/50 border border-gray-800 focus:border-[#DC1FFF]/50 focus:ring-1 focus:ring-[#DC1FFF]/50 outline-none transition-all"
                />
              </div>

              {/* Stats Bar */}
              <div className="flex gap-3 text-sm">
                <div className="px-3 py-1.5 rounded-lg bg-gray-800/50 text-gray-400">
                  Total: {submissions.length}
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-[#00FFA3]/10 text-[#00FFA3]">
                  Completed: {submissions.filter((s) => s.status === "completed").length}
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-[#00C2FF]/10 text-[#00C2FF]">
                  Processing: {submissions.filter((s) => s.status === "processing").length}
                </div>
              </div>

              {/* List */}
              <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-2">
                {isLoading && submissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                    <p>Loading submissions...</p>
                  </div>
                ) : filteredSubmissions.length === 0 ? (
                  <div className="gradient-border p-8 text-center">
                    <Github className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No submissions found</h3>
                    <p className="text-gray-500 text-sm mb-4">
                      {searchQuery ? "Try a different search term" : "Submit your first GitHub URL to get started"}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => setActiveTab("submit")}
                        className="gradient-button px-6 py-2 rounded-lg text-white font-medium"
                      >
                        Submit Now
                      </button>
                    )}
                  </div>
                ) : (
                  filteredSubmissions.map((submission) => {
                    const statusConfig = getStatusConfig(submission.status);
                    const StatusIcon = statusConfig.icon;
                    const isSelected = selectedSubmission?.id === submission.id;

                    return (
                      <button
                        key={submission.id}
                        onClick={() => setSelectedSubmission(submission)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          isSelected
                            ? "border-[#DC1FFF]/50 bg-[#DC1FFF]/5 glow-purple"
                            : "border-gray-800 bg-gray-900/30 hover:border-gray-700 hover:bg-gray-900/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {submission.githubType === "pr" ? (
                              <GitPullRequest className="w-5 h-5 text-[#DC1FFF] flex-shrink-0 mt-0.5" />
                            ) : (
                              <Github className="w-5 h-5 text-[#DC1FFF] flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{extractRepoName(submission.githubUrl)}</div>
                              {submission.bountyTitle && (
                                <div className="text-sm text-gray-500 truncate">{submission.bountyTitle}</div>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusConfig.bg} ${statusConfig.color}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {statusConfig.label}
                                </span>
                                <span className="text-xs text-gray-600">
                                  {new Date(submission.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          {submission.review && (
                            <div className={`text-2xl font-bold ${getScoreColor(submission.review.overallScore)}`}>
                              {submission.review.overallScore}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-3">
              {selectedSubmission ? (
                <div className="gradient-border p-6 space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {selectedSubmission.githubType === "pr" ? (
                          <GitPullRequest className="w-6 h-6 text-[#DC1FFF]" />
                        ) : (
                          <Github className="w-6 h-6 text-[#DC1FFF]" />
                        )}
                        <h2 className="text-xl font-bold">{extractRepoName(selectedSubmission.githubUrl)}</h2>
                      </div>
                      {selectedSubmission.bountyTitle && (
                        <p className="text-gray-400">{selectedSubmission.bountyTitle}</p>
                      )}
                    </div>
                    <a
                      href={selectedSubmission.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on GitHub
                    </a>
                  </div>

                  {selectedSubmission.review ? (
                    <>
                      {/* Score Overview */}
                      <div className="grid grid-cols-5 gap-4">
                        <div className={`p-4 rounded-xl border ${getScoreBg(selectedSubmission.review.overallScore)} text-center`}>
                          <div className={`text-3xl font-bold ${getScoreColor(selectedSubmission.review.overallScore)}`}>
                            {selectedSubmission.review.overallScore}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">Overall</div>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-800/50 text-center">
                          <div className="flex items-center justify-center mb-1">
                            <FileCheck className="w-4 h-4 text-[#DC1FFF]" />
                          </div>
                          <div className="text-xl font-bold">{selectedSubmission.review.requirementScore}</div>
                          <div className="text-xs text-gray-400">Requirements</div>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-800/50 text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Code2 className="w-4 h-4 text-[#00C2FF]" />
                          </div>
                          <div className="text-xl font-bold">{selectedSubmission.review.codeQualityScore}</div>
                          <div className="text-xs text-gray-400">Code Quality</div>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-800/50 text-center">
                          <div className="flex items-center justify-center mb-1">
                            <CheckCircle2 className="w-4 h-4 text-[#00FFA3]" />
                          </div>
                          <div className="text-xl font-bold">{selectedSubmission.review.completenessScore}</div>
                          <div className="text-xs text-gray-400">Completeness</div>
                        </div>
                        <div className="p-4 rounded-xl bg-gray-800/50 text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Shield className="w-4 h-4 text-amber-400" />
                          </div>
                          <div className="text-xl font-bold">{selectedSubmission.review.securityScore}</div>
                          <div className="text-xs text-gray-400">Security</div>
                        </div>
                      </div>

                      {/* Labels */}
                      {selectedSubmission.review.suggestedLabels?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedSubmission.review.suggestedLabels.map((label, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 rounded-full text-sm bg-[#DC1FFF]/10 text-[#DC1FFF] border border-[#DC1FFF]/30"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Summary */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Summary</h3>
                        <p className="text-gray-300">{selectedSubmission.review.summary}</p>
                      </div>

                      {/* Red Flags */}
                      {selectedSubmission.review.redFlags?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">Red Flags</h3>
                          <div className="space-y-2">
                            {selectedSubmission.review.redFlags.map((flag, i) => (
                              <div
                                key={i}
                                className="p-3 rounded-lg bg-red-400/10 border border-red-400/30"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <AlertTriangle className="w-4 h-4 text-red-400" />
                                  <span className="font-medium text-red-400 capitalize">{flag.severity}</span>
                                  <span className="text-gray-500">|</span>
                                  <span className="text-gray-400 text-sm">{flag.type}</span>
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

                      {/* Detailed Notes */}
                      {selectedSubmission.review.detailedNotes && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Detailed Notes</h3>
                          <div className="p-4 rounded-lg bg-gray-900/50 max-h-64 overflow-y-auto">
                            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                              {selectedSubmission.review.detailedNotes}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Confidence */}
                      <div className="text-sm text-gray-500">
                        Analysis confidence: {selectedSubmission.review.confidence}%
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center">
                      {selectedSubmission.status === "processing" ? (
                        <>
                          <Loader2 className="w-12 h-12 text-[#00C2FF] animate-spin mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">Review in Progress</h3>
                          <p className="text-gray-500">The AI is analyzing the code. This may take a few moments.</p>
                        </>
                      ) : selectedSubmission.status === "failed" ? (
                        <>
                          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">Review Failed</h3>
                          <p className="text-gray-500">Something went wrong during the analysis.</p>
                        </>
                      ) : (
                        <>
                          <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">Waiting for Review</h3>
                          <p className="text-gray-500">This submission is queued for AI analysis.</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="gradient-border p-12 text-center h-full flex flex-col items-center justify-center min-h-[500px]">
                  <ChevronRight className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a Submission</h3>
                  <p className="text-gray-500">Click on a submission to view its review details</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Submit Form */
          <div className="max-w-2xl mx-auto">
            <div className="gradient-border p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#DC1FFF]/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#DC1FFF]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Submit for Review</h2>
                  <p className="text-gray-400 text-sm">Enter a GitHub URL to start AI analysis</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* GitHub URL */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    GitHub URL <span className="text-[#DC1FFF]">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://github.com/owner/repo or https://github.com/owner/repo/pull/123"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-800 focus:border-[#DC1FFF]/50 focus:ring-1 focus:ring-[#DC1FFF]/50 outline-none transition-all"
                  />
                </div>

                {/* Model Selector */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#DC1FFF]" />
                    AI Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={isLoadingModels}
                    className="w-full px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-800 focus:border-[#DC1FFF]/50 focus:ring-1 focus:ring-[#DC1FFF]/50 outline-none transition-all"
                  >
                    {isLoadingModels ? (
                      <option>Loading models...</option>
                    ) : (
                      models.map((model) => (
                        <option key={model.id} value={model.id}>
                          [{model.provider === "google" ? "Gemini" : "OpenAI"}] {model.name}
                          {model.recommended ? " (Recommended)" : ""} - {model.description}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Bounty Title */}
                <div>
                  <label className="block text-sm font-medium mb-2">Bounty Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Build a Token Swap"
                    value={bountyTitle}
                    onChange={(e) => setBountyTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-800 focus:border-[#DC1FFF]/50 focus:ring-1 focus:ring-[#DC1FFF]/50 outline-none transition-all"
                  />
                </div>

                {/* Bounty Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">Bounty Description</label>
                  <textarea
                    placeholder="Describe the bounty requirements..."
                    value={bountyDescription}
                    onChange={(e) => setBountyDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-800 focus:border-[#DC1FFF]/50 focus:ring-1 focus:ring-[#DC1FFF]/50 outline-none transition-all resize-none"
                  />
                </div>

                {/* Requirements */}
                <div>
                  <label className="block text-sm font-medium mb-2">Requirements (one per line)</label>
                  <textarea
                    placeholder="Implement user authentication&#10;Add unit tests&#10;Deploy to mainnet"
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-gray-900/50 border border-gray-800 focus:border-[#DC1FFF]/50 focus:ring-1 focus:ring-[#DC1FFF]/50 outline-none transition-all resize-none font-mono text-sm"
                  />
                </div>

                {/* Error */}
                {submitError && (
                  <div className="p-4 rounded-xl bg-red-400/10 border border-red-400/30 text-red-400 text-sm">
                    {submitError}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !githubUrl}
                  className="w-full gradient-button py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Submit for Review
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
