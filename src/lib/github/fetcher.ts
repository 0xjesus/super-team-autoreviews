import { createGitHubClient, parseGitHubUrl, getLanguageFromPath } from "./client";
import type { FileTreeNode, KeyFile } from "../db/schema";

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

export async function fetchRepositoryData(githubUrl: string): Promise<GitHubRepoData> {
  const octokit = createGitHubClient();
  const { owner, repo } = parseGitHubUrl(githubUrl);

  // Fetch repo metadata
  const { data: repoData } = await octokit.rest.repos.get({ owner, repo });

  // Fetch languages
  const { data: languages } = await octokit.rest.repos.listLanguages({ owner, repo });

  // Fetch file tree (recursive)
  const { data: tree } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: repoData.default_branch,
    recursive: "true",
  });

  // Filter and build file tree
  const files = tree.tree.filter(
    (item) =>
      item.type === "blob" &&
      item.path &&
      !shouldSkipPath(item.path) &&
      isRelevantFile(item.path)
  );

  const fileTree = buildFileTree(files);

  // Fetch key files content
  const keyFilePaths = identifyKeyFiles(files.map((f) => f.path!));
  const keyFiles = await fetchKeyFilesContent(octokit, owner, repo, keyFilePaths);

  // Calculate total lines (estimate)
  const totalLines = keyFiles.reduce((sum, f) => sum + f.content.split("\n").length, 0);

  return {
    owner,
    repo,
    defaultBranch: repoData.default_branch,
    description: repoData.description,
    languages,
    fileTree,
    keyFiles,
    totalFiles: files.length,
    totalLines,
  };
}

export async function fetchPRData(githubUrl: string): Promise<GitHubPRData> {
  const octokit = createGitHubClient();
  const { owner, repo, prNumber } = parseGitHubUrl(githubUrl);

  if (!prNumber) {
    throw new Error("Invalid PR URL: missing PR number");
  }

  // Fetch PR metadata
  const { data: prData } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  // Fetch PR files
  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  // Fetch PR commits
  const { data: commits } = await octokit.rest.pulls.listCommits({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  // Build diff from patches
  const diff = files
    .filter((f) => f.patch)
    .map((f) => `--- a/${f.filename}\n+++ b/${f.filename}\n${f.patch}`)
    .join("\n\n");

  return {
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
  };
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
