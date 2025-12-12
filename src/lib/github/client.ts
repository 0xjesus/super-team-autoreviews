import { Octokit } from "octokit";

// Create Octokit instance with auth if available
export function createGitHubClient() {
  return new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });
}

// Parse GitHub URL to extract owner, repo, and PR number
export function parseGitHubUrl(url: string): {
  owner: string;
  repo: string;
  type: "pr" | "repository";
  prNumber?: number;
} {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split("/").filter(Boolean);

  if (pathParts.length < 2) {
    throw new Error("Invalid GitHub URL: missing owner or repo");
  }

  const owner = pathParts[0];
  const repo = pathParts[1];

  // Check if it's a PR URL
  if (pathParts[2] === "pull" && pathParts[3]) {
    return {
      owner,
      repo,
      type: "pr",
      prNumber: parseInt(pathParts[3], 10),
    };
  }

  return { owner, repo, type: "repository" };
}

// Determine language from file extension
export function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    rs: "rust",
    py: "python",
    go: "go",
    sol: "solidity",
    json: "json",
    toml: "toml",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    css: "css",
    scss: "scss",
    html: "html",
  };
  return languageMap[ext || ""] || "plaintext";
}
