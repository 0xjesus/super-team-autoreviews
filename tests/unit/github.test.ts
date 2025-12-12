import { describe, it, expect } from "vitest";
import { parseGitHubUrl, getLanguageFromPath } from "@/lib/github/client";

describe("parseGitHubUrl", () => {
  it("should parse a repository URL", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo");
    expect(result).toEqual({
      owner: "owner",
      repo: "repo",
      type: "repository",
    });
  });

  it("should parse a PR URL", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo/pull/123");
    expect(result).toEqual({
      owner: "owner",
      repo: "repo",
      type: "pr",
      prNumber: 123,
    });
  });

  it("should handle URLs with trailing slashes", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo/");
    expect(result).toEqual({
      owner: "owner",
      repo: "repo",
      type: "repository",
    });
  });

  it("should handle URLs with branches", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo/tree/main");
    expect(result.owner).toBe("owner");
    expect(result.repo).toBe("repo");
    expect(result.type).toBe("repository");
  });

  it("should throw for invalid URLs", () => {
    expect(() => parseGitHubUrl("https://github.com/owner")).toThrow();
  });
});

describe("getLanguageFromPath", () => {
  it("should identify TypeScript files", () => {
    expect(getLanguageFromPath("src/index.ts")).toBe("typescript");
    expect(getLanguageFromPath("src/App.tsx")).toBe("typescript");
  });

  it("should identify JavaScript files", () => {
    expect(getLanguageFromPath("src/index.js")).toBe("javascript");
    expect(getLanguageFromPath("src/App.jsx")).toBe("javascript");
  });

  it("should identify Rust files", () => {
    expect(getLanguageFromPath("programs/src/lib.rs")).toBe("rust");
  });

  it("should identify Solidity files", () => {
    expect(getLanguageFromPath("contracts/Token.sol")).toBe("solidity");
  });

  it("should return plaintext for unknown extensions", () => {
    expect(getLanguageFromPath("Makefile")).toBe("plaintext");
    expect(getLanguageFromPath("file.xyz")).toBe("plaintext");
  });
});
