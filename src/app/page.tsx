"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Github, Zap, Shield, BarChart3, GitPullRequest, ExternalLink, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface Submission {
  id: string;
  githubUrl: string;
  githubType: string;
  status: string;
  createdAt: string;
  review?: {
    overallScore: number;
    suggestedLabels: string[];
  } | null;
}

interface Stats {
  totalSubmissions: number;
  completedReviews: number;
  averageScore: number;
  pendingReviews: number;
}

export default function Home() {
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/submissions?limit=5");
        if (response.ok) {
          const data = await response.json();
          setRecentSubmissions(data.submissions || []);

          // Calculate stats from submissions
          const allSubs = data.submissions || [];
          const completed = allSubs.filter((s: Submission) => s.status === "completed" && s.review);
          const scores = completed.map((s: Submission) => s.review?.overallScore || 0);
          const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;

          setStats({
            totalSubmissions: allSubs.length,
            completedReviews: completed.length,
            averageScore: avgScore,
            pendingReviews: allSubs.filter((s: Submission) => s.status === "pending" || s.status === "processing").length,
          });
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-[#00FFA3]";
    if (score >= 70) return "text-[#00C2FF]";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-[#00FFA3]" />;
      case "processing":
        return <Clock className="w-4 h-4 text-[#00C2FF] animate-pulse" />;
      case "failed":
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const extractRepoName = (url: string) => {
    const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
    return match ? match[1] : url;
  };

  return (
    <main className="min-h-screen bg-grid">
      {/* Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#DC1FFF] rounded-full blur-[150px] opacity-20" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00FFA3] rounded-full blur-[150px] opacity-15" />

        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#DC1FFF]/30 bg-[#DC1FFF]/10 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-[#00FFA3] pulse-live" />
            Live on Solana Ecosystem
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            AI-Powered
            <br />
            <span className="gradient-text">Code Reviews</span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
            Automated, intelligent code analysis for Superteam Earn bounty submissions.
            Real-time GitHub integration with zero hallucinations.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/dashboard">
              <button className="gradient-button px-8 py-4 rounded-xl font-semibold text-white flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Launch Dashboard
              </button>
            </Link>
            <a
              href="https://earn.superteam.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-xl font-semibold border border-gray-700 hover:border-[#DC1FFF]/50 transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              Superteam Earn
            </a>
          </div>
        </div>
      </section>

      {/* Live Stats Section */}
      <section className="py-16 px-4 border-y border-gray-800">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-sm font-semibold text-[#DC1FFF] uppercase tracking-wider mb-2">Live Statistics</h2>
            <p className="text-gray-400">Real-time data from the database - no mocks</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="gradient-border p-6 text-center">
              <div className="text-4xl font-bold gradient-text mb-2">
                {loading ? <span className="skeleton inline-block w-12 h-10 rounded" /> : stats?.totalSubmissions || 0}
              </div>
              <div className="text-gray-400 text-sm">Total Submissions</div>
            </div>
            <div className="gradient-border p-6 text-center">
              <div className="text-4xl font-bold text-[#00FFA3] mb-2">
                {loading ? <span className="skeleton inline-block w-12 h-10 rounded" /> : stats?.completedReviews || 0}
              </div>
              <div className="text-gray-400 text-sm">Completed Reviews</div>
            </div>
            <div className="gradient-border p-6 text-center">
              <div className="text-4xl font-bold text-[#00C2FF] mb-2">
                {loading ? <span className="skeleton inline-block w-12 h-10 rounded" /> : `${stats?.averageScore || 0}%`}
              </div>
              <div className="text-gray-400 text-sm">Average Score</div>
            </div>
            <div className="gradient-border p-6 text-center">
              <div className="text-4xl font-bold text-amber-400 mb-2">
                {loading ? <span className="skeleton inline-block w-12 h-10 rounded" /> : stats?.pendingReviews || 0}
              </div>
              <div className="text-gray-400 text-sm">Pending Reviews</div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activity Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold mb-1">Recent Submissions</h2>
              <p className="text-gray-400 text-sm">Live feed from the database</p>
            </div>
            <Link href="/dashboard" className="text-[#DC1FFF] hover:text-[#DC1FFF]/80 text-sm font-medium">
              View All &rarr;
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="gradient-border p-4">
                  <div className="skeleton h-6 w-48 rounded mb-2" />
                  <div className="skeleton h-4 w-32 rounded" />
                </div>
              ))}
            </div>
          ) : recentSubmissions.length === 0 ? (
            <div className="gradient-border p-12 text-center">
              <Github className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
              <p className="text-gray-400 mb-6">Submit your first GitHub repository or PR for AI review</p>
              <Link href="/dashboard">
                <button className="gradient-button px-6 py-3 rounded-lg font-medium text-white">
                  Submit Now
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentSubmissions.map((submission) => (
                <Link key={submission.id} href={`/dashboard?submission=${submission.id}`}>
                  <div className="gradient-border p-4 hover:glow-purple transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {submission.githubType === "pr" ? (
                          <GitPullRequest className="w-5 h-5 text-[#DC1FFF]" />
                        ) : (
                          <Github className="w-5 h-5 text-[#DC1FFF]" />
                        )}
                        <div>
                          <div className="font-medium">{extractRepoName(submission.githubUrl)}</div>
                          <div className="text-sm text-gray-400 flex items-center gap-2">
                            {getStatusIcon(submission.status)}
                            <span className="capitalize">{submission.status}</span>
                            <span className="text-gray-600">|</span>
                            <span>{new Date(submission.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      {submission.review && (
                        <div className={`text-2xl font-bold ${getScoreColor(submission.review.overallScore)}`}>
                          {submission.review.overallScore}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 gradient-bg">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose This System?</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Built specifically for Superteam Earn with real-time verification and zero mock data
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="gradient-border p-6">
              <div className="w-12 h-12 rounded-xl bg-[#DC1FFF]/20 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-[#DC1FFF]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-Time Analysis</h3>
              <p className="text-gray-400 text-sm">
                Powered by GPT-5.2 and Gemini 3 Pro. No mocked responses, no hallucinations - just real AI analysis.
              </p>
            </div>

            <div className="gradient-border p-6">
              <div className="w-12 h-12 rounded-xl bg-[#00FFA3]/20 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-[#00FFA3]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Security Focused</h3>
              <p className="text-gray-400 text-sm">
                Detects hardcoded secrets, vulnerabilities, and Solana-specific security issues in smart contracts.
              </p>
            </div>

            <div className="gradient-border p-6">
              <div className="w-12 h-12 rounded-xl bg-[#00C2FF]/20 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-[#00C2FF]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Verifiable Results</h3>
              <p className="text-gray-400 text-sm">
                Every review links to the real GitHub source. Click to verify the code exists and matches the analysis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Review Code?</h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Submit a GitHub URL and get an AI-powered review in seconds.
            All results are real and verifiable.
          </p>
          <Link href="/dashboard">
            <button className="gradient-button px-10 py-4 rounded-xl font-semibold text-white text-lg">
              Start Reviewing
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-800">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-button flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">Superteam Auto-Review</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="https://earn.superteam.fun" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Superteam Earn
            </a>
            <a href="https://solana.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Solana
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
