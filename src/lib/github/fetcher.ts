import { createGitHubClient, parseGitHubUrl, getLanguageFromPath } from "./client";
import type { FileTreeNode, KeyFile } from "../db/schema";

// Edge case handling types
export interface FetchResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorType?: "empty_repo" | "private_repo" | "not_found" | "rate_limit" | "too_large" | "closed_pr" | "network" | "unknown";
  warnings?: string[];
  metadata?: {
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
    truncated?: boolean;
    skippedFiles?: number;
    totalFilesFound?: number;
  };
}

// Maximum limits for edge case handling
const LIMITS = {
  MAX_FILES_TO_ANALYZE: 30,
  MAX_FILE_SIZE_BYTES: 50000, // 50KB per file
  MAX_TOTAL_DIFF_SIZE: 1000000, // 1MB total diff
  MAX_PR_FILES: 300,
  MAX_COMMITS_TO_FETCH: 100,
  RATE_LIMIT_THRESHOLD: 100, // Warn when less than 100 requests remaining
};

export interface GitHubRepoData {
  owner: string;
  repo: string;
  defaultBranch: string;
  description: string | null;
  languages: Record<string, number>;
  fileTree: FileTreeNode[];
  keyFiles: KeyFile[];
  totalFiles: number;
  totalLines: number;
}

export interface GitHubPRData {
  owner: string;
  repo: string;
  prNumber: number;
  title: string;
  description: string | null;
  baseBranch: string;
  headBranch: string;
  state: string;
  diff: string;
  changedFiles: PRChangedFile[];
  commits: PRCommit[];
}

export interface PRChangedFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface PRCommit {
  sha: string;
  message: string;
  author: string;
}

// Priority patterns for Solana/Web3 projects
const PRIORITY_PATTERNS = [
  "Anchor.toml",
  "Cargo.toml",
  "package.json",
  "tsconfig.json",
  "**/lib.rs",
  "**/mod.rs",
  "**/instructions/*.rs",
  "**/state/*.rs",
  "src/index.ts",
  "src/main.ts",
  "src/App.tsx",
  "programs/**/src/*.rs",
  "contracts/**/*.sol",
];

// File extensions to include in analysis
const RELEVANT_EXTENSIONS = [
  ".rs",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".sol",
  ".toml",
  ".json",
  ".py",
  ".go",
];

// Files to always skip
const SKIP_PATTERNS = [
  "node_modules",
  ".git",
  "target",
  "dist",
  "build",
  ".next",
  "coverage",
  "__pycache__",
  "*.lock",
  "*.log",
  ".env*",
];

// Safe fetch with edge case handling
export async function fetchRepositoryDataSafe(githubUrl: string): Promise<FetchResult<GitHubRepoData>> {
  const warnings: string[] = [];
  let rateLimitRemaining: number | undefined;
  let rateLimitReset: Date | undefined;

  try {
    const octokit = createGitHubClient();
    const { owner, repo } = parseGitHubUrl(githubUrl);

    // Check rate limit first
    try {
      const { data: rateLimit } = await octokit.rest.rateLimit.get();
      rateLimitRemaining = rateLimit.resources.core.remaining;
      rateLimitReset = new Date(rateLimit.resources.core.reset * 1000);

      if (rateLimitRemaining < LIMITS.RATE_LIMIT_THRESHOLD) {
        warnings.push(`GitHub API rate limit low: ${rateLimitRemaining} requests remaining. Resets at ${rateLimitReset.toISOString()}`);
      }

      if (rateLimitRemaining === 0) {
        return {
          success: false,
          error: `GitHub API rate limit exceeded. Resets at ${rateLimitReset.toISOString()}`,
          errorType: "rate_limit",
          metadata: { rateLimitRemaining, rateLimitReset },
        };
      }
    } catch {
      // Rate limit check failed, continue anyway
    }

    // Fetch repo metadata
    let repoData;
    try {
      const response = await octokit.rest.repos.get({ owner, repo });
      repoData = response.data;
    } catch (error: any) {
      if (error.status === 404) {
        return {
          success: false,
          error: `Repository not found: ${owner}/${repo}. Make sure it exists and is public.`,
          errorType: "not_found",
        };
      }
      if (error.status === 403) {
        return {
          success: false,
          error: `Access denied to ${owner}/${repo}. The repository may be private.`,
          errorType: "private_repo",
        };
      }
      throw error;
    }

    // Fetch languages
    const { data: languages } = await octokit.rest.repos.listLanguages({ owner, repo });

    // Fetch file tree (recursive)
    let tree;
    let truncated = false;
    try {
      const response = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: repoData.default_branch,
        recursive: "true",
      });
      tree = response.data;
      truncated = tree.truncated || false;

      if (truncated) {
        warnings.push("Repository is very large. File tree was truncated. Analysis may be incomplete.");
      }
    } catch (error: any) {
      // Empty repository case
      if (error.message?.includes("Git Repository is empty")) {
        return {
          success: false,
          error: "Repository is empty. No files to analyze.",
          errorType: "empty_repo",
        };
      }
      throw error;
    }

    // Filter and build file tree
    const allFiles = tree.tree.filter(
      (item) =>
        item.type === "blob" &&
        item.path &&
        !shouldSkipPath(item.path) &&
        isRelevantFile(item.path)
    );

    // Check for empty repo (no relevant files)
    if (allFiles.length === 0) {
      // Check if there are ANY files
      const anyFiles = tree.tree.filter((item) => item.type === "blob");
      if (anyFiles.length === 0) {
        return {
          success: false,
          error: "Repository is empty. No files found.",
          errorType: "empty_repo",
        };
      }
      // Has files but none are relevant
      warnings.push("No relevant code files found. Repository may only contain documentation or binary files.");
    }

    const fileTree = buildFileTree(allFiles);

    // Fetch key files content
    const keyFilePaths = identifyKeyFiles(allFiles.map((f) => f.path!));
    const keyFiles = await fetchKeyFilesContent(octokit, owner, repo, keyFilePaths);

    const skippedFiles = keyFilePaths.length - keyFiles.length;
    if (skippedFiles > 0) {
      warnings.push(`${skippedFiles} files were skipped (too large or inaccessible).`);
    }

    // Calculate total lines (estimate)
    const totalLines = keyFiles.reduce((sum, f) => sum + f.content.split("\n").length, 0);

    return {
      success: true,
      data: {
        owner,
        repo,
        defaultBranch: repoData.default_branch,
        description: repoData.description,
        languages,
        fileTree,
        keyFiles,
        totalFiles: allFiles.length,
        totalLines,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata: {
        rateLimitRemaining,
        rateLimitReset,
        truncated,
        skippedFiles,
        totalFilesFound: tree.tree.length,
      },
    };
  } catch (error: any) {
    // Network errors
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return {
        success: false,
        error: "Network error: Unable to connect to GitHub API.",
        errorType: "network",
      };
    }

    // Rate limit from error response
    if (error.status === 403 && error.message?.includes("rate limit")) {
      return {
        success: false,
        error: "GitHub API rate limit exceeded. Please try again later.",
        errorType: "rate_limit",
        metadata: { rateLimitRemaining, rateLimitReset },
      };
    }

    return {
      success: false,
      error: error.message || "Unknown error fetching repository data",
      errorType: "unknown",
    };
  }
}

// Original function maintained for backwards compatibility
export async function fetchRepositoryData(githubUrl: string): Promise<GitHubRepoData> {
  const result = await fetchRepositoryDataSafe(githubUrl);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data!;
}

// Safe PR fetch with edge case handling
export async function fetchPRDataSafe(githubUrl: string): Promise<FetchResult<GitHubPRData>> {
  const warnings: string[] = [];
  let rateLimitRemaining: number | undefined;
  let rateLimitReset: Date | undefined;

  try {
    const octokit = createGitHubClient();
    const { owner, repo, prNumber } = parseGitHubUrl(githubUrl);

    if (!prNumber) {
      return {
        success: false,
        error: "Invalid PR URL: missing PR number",
        errorType: "not_found",
      };
    }

    // Check rate limit
    try {
      const { data: rateLimit } = await octokit.rest.rateLimit.get();
      rateLimitRemaining = rateLimit.resources.core.remaining;
      rateLimitReset = new Date(rateLimit.resources.core.reset * 1000);

      if (rateLimitRemaining < LIMITS.RATE_LIMIT_THRESHOLD) {
        warnings.push(`GitHub API rate limit low: ${rateLimitRemaining} requests remaining.`);
      }

      if (rateLimitRemaining === 0) {
        return {
          success: false,
          error: `GitHub API rate limit exceeded. Resets at ${rateLimitReset.toISOString()}`,
          errorType: "rate_limit",
          metadata: { rateLimitRemaining, rateLimitReset },
        };
      }
    } catch {
      // Continue anyway
    }

    // Fetch PR metadata
    let prData;
    try {
      const response = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });
      prData = response.data;
    } catch (error: any) {
      if (error.status === 404) {
        return {
          success: false,
          error: `Pull request #${prNumber} not found in ${owner}/${repo}.`,
          errorType: "not_found",
        };
      }
      if (error.status === 403) {
        return {
          success: false,
          error: `Access denied to PR #${prNumber}. The repository may be private.`,
          errorType: "private_repo",
        };
      }
      throw error;
    }

    // Check PR state
    if (prData.state === "closed" && !prData.merged) {
      warnings.push("This PR was closed without being merged. Review may be less relevant.");
    }
    if (prData.merged) {
      warnings.push("This PR has already been merged.");
    }
    if (prData.draft) {
      warnings.push("This is a draft PR. Code may be incomplete.");
    }

    // Fetch PR files with pagination for large PRs
    let files: any[] = [];
    let page = 1;
    let totalFilesCount = 0;

    while (true) {
      const { data: pageFiles } = await octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
        page,
      });

      files.push(...pageFiles);
      totalFilesCount += pageFiles.length;

      if (pageFiles.length < 100) break;
      if (files.length >= LIMITS.MAX_PR_FILES) {
        warnings.push(`PR has more than ${LIMITS.MAX_PR_FILES} files. Analysis limited to first ${LIMITS.MAX_PR_FILES} files.`);
        break;
      }
      page++;
    }

    // Check for very large PRs
    const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
    const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

    if (totalAdditions + totalDeletions > 10000) {
      warnings.push(`Large PR detected: ${totalAdditions} additions, ${totalDeletions} deletions. Review focused on key changes.`);
    }

    // Fetch PR commits
    const { data: commits } = await octokit.rest.pulls.listCommits({
      owner,
      repo,
      pull_number: prNumber,
      per_page: LIMITS.MAX_COMMITS_TO_FETCH,
    });

    // Build diff from patches, handling very large diffs
    let diff = "";
    let truncatedDiff = false;
    let skippedFiles = 0;

    for (const f of files) {
      if (!f.patch) continue;

      const patchSize = f.patch.length;

      // Skip binary files or very large patches
      if (patchSize > 100000) {
        skippedFiles++;
        continue;
      }

      const newDiff = `--- a/${f.filename}\n+++ b/${f.filename}\n${f.patch}\n\n`;

      if (diff.length + newDiff.length > LIMITS.MAX_TOTAL_DIFF_SIZE) {
        truncatedDiff = true;
        break;
      }

      diff += newDiff;
    }

    if (truncatedDiff) {
      warnings.push("Diff was truncated due to size. Analysis focused on first part of changes.");
    }
    if (skippedFiles > 0) {
      warnings.push(`${skippedFiles} files with very large changes were summarized instead of analyzed in detail.`);
    }

    return {
      success: true,
      data: {
        owner,
        repo,
        prNumber,
        title: prData.title,
        description: prData.body,
        baseBranch: prData.base.ref,
        headBranch: prData.head.ref,
        state: prData.state,
        diff,
        changedFiles: files.map((f) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          patch: f.patch,
        })),
        commits: commits.map((c) => ({
          sha: c.sha,
          message: c.commit.message,
          author: c.commit.author?.name || "Unknown",
        })),
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata: {
        rateLimitRemaining,
        rateLimitReset,
        truncated: truncatedDiff,
        skippedFiles,
        totalFilesFound: totalFilesCount,
      },
    };
  } catch (error: any) {
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return {
        success: false,
        error: "Network error: Unable to connect to GitHub API.",
        errorType: "network",
      };
    }

    if (error.status === 403 && error.message?.includes("rate limit")) {
      return {
        success: false,
        error: "GitHub API rate limit exceeded.",
        errorType: "rate_limit",
        metadata: { rateLimitRemaining, rateLimitReset },
      };
    }

    return {
      success: false,
      error: error.message || "Unknown error fetching PR data",
      errorType: "unknown",
    };
  }
}

// Original function for backwards compatibility
export async function fetchPRData(githubUrl: string): Promise<GitHubPRData> {
  const result = await fetchPRDataSafe(githubUrl);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data!;
}

function shouldSkipPath(path: string): boolean {
  return SKIP_PATTERNS.some((pattern) => {
    if (pattern.includes("*")) {
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));
      return regex.test(path);
    }
    return path.includes(pattern);
  });
}

function isRelevantFile(path: string): boolean {
  return RELEVANT_EXTENSIONS.some((ext) => path.endsWith(ext));
}

function buildFileTree(
  files: { path?: string; type?: string }[]
): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const file of files) {
    if (!file.path) continue;

    const parts = file.path.split("/");
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      let existing = currentLevel.find((n) => n.name === part);

      if (!existing) {
        existing = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          type: isFile ? "file" : "directory",
          children: isFile ? undefined : [],
        };
        currentLevel.push(existing);
      }

      if (!isFile && existing.children) {
        currentLevel = existing.children;
      }
    }
  }

  return root;
}

function identifyKeyFiles(allPaths: string[]): string[] {
  const keyFiles: string[] = [];

  // First, add files matching priority patterns
  for (const pattern of PRIORITY_PATTERNS) {
    const matches = allPaths.filter((path) => {
      if (pattern.includes("*")) {
        const regex = new RegExp(
          "^" + pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$"
        );
        return regex.test(path);
      }
      return path === pattern || path.endsWith("/" + pattern);
    });
    keyFiles.push(...matches);
  }

  // Dedupe and limit
  const unique = [...new Set(keyFiles)];
  return unique.slice(0, 30); // Limit to 30 key files
}

async function fetchKeyFilesContent(
  octokit: ReturnType<typeof createGitHubClient>,
  owner: string,
  repo: string,
  paths: string[]
): Promise<KeyFile[]> {
  const keyFiles: KeyFile[] = [];

  for (const path of paths) {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if ("content" in data && data.type === "file") {
        const content = Buffer.from(data.content, "base64").toString("utf-8");

        // Skip very large files
        if (content.length > 50000) continue;

        keyFiles.push({
          path,
          language: getLanguageFromPath(path),
          content,
          importance: getFileImportance(path),
        });
      }
    } catch {
      // File might not exist or be inaccessible
      continue;
    }
  }

  return keyFiles;
}

function getFileImportance(path: string): KeyFile["importance"] {
  const criticalPatterns = ["lib.rs", "main.rs", "index.ts", "main.ts", "App.tsx"];
  const highPatterns = ["Cargo.toml", "package.json", "Anchor.toml", "mod.rs"];

  const filename = path.split("/").pop() || "";

  if (criticalPatterns.some((p) => filename === p)) return "critical";
  if (highPatterns.some((p) => filename === p)) return "high";
  if (path.includes("/instructions/") || path.includes("/state/")) return "high";
  if (path.includes("/tests/") || path.includes(".test.")) return "low";

  return "medium";
}
