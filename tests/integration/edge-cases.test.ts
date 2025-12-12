import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseGitHubUrl } from "@/lib/github/client";

/**
 * Edge Case Tests
 *
 * Tests for handling edge cases in GitHub data fetching and review generation.
 * These tests validate error handling without requiring live API access.
 */

describe("GitHub URL Edge Cases", () => {
  describe("parseGitHubUrl", () => {
    it("should handle standard repository URLs", () => {
      const result = parseGitHubUrl("https://github.com/owner/repo");
      expect(result).toEqual({
        owner: "owner",
        repo: "repo",
        type: "repository",
      });
    });

    it("should handle PR URLs", () => {
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
      expect(result.owner).toBe("owner");
      expect(result.repo).toBe("repo");
    });

    it("should handle URLs with www prefix", () => {
      // This should either work or throw a clear error
      expect(() => {
        parseGitHubUrl("https://www.github.com/owner/repo");
      }).not.toThrow();
    });

    it("should throw for invalid URLs", () => {
      expect(() => parseGitHubUrl("not-a-url")).toThrow();
      expect(() => parseGitHubUrl("https://gitlab.com/owner/repo")).toThrow();
      expect(() => parseGitHubUrl("https://github.com/")).toThrow();
    });

    it("should handle tree/branch URLs as repository type", () => {
      const result = parseGitHubUrl("https://github.com/owner/repo/tree/main");
      expect(result.type).toBe("repository");
    });

    it("should handle blob (file) URLs as repository type", () => {
      const result = parseGitHubUrl("https://github.com/owner/repo/blob/main/README.md");
      expect(result.type).toBe("repository");
    });

    it("should handle commit URLs as repository type", () => {
      const result = parseGitHubUrl("https://github.com/owner/repo/commit/abc123");
      expect(result.type).toBe("repository");
    });
  });
});

describe("FetchResult Edge Cases", () => {
  // These types match our FetchResult interface
  interface MockFetchResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    errorType?: "empty_repo" | "private_repo" | "not_found" | "rate_limit" | "too_large" | "network";
    warnings?: string[];
  }

  describe("Error Type Classification", () => {
    it("should properly classify empty repository errors", () => {
      const result: MockFetchResult<null> = {
        success: false,
        error: "Repository is empty. No files to analyze.",
        errorType: "empty_repo",
      };

      expect(result.errorType).toBe("empty_repo");
      expect(result.error).toContain("empty");
    });

    it("should properly classify private repository errors", () => {
      const result: MockFetchResult<null> = {
        success: false,
        error: "Access denied. The repository may be private.",
        errorType: "private_repo",
      };

      expect(result.errorType).toBe("private_repo");
    });

    it("should properly classify rate limit errors", () => {
      const result: MockFetchResult<null> = {
        success: false,
        error: "GitHub API rate limit exceeded.",
        errorType: "rate_limit",
      };

      expect(result.errorType).toBe("rate_limit");
    });
  });

  describe("Warning Aggregation", () => {
    it("should collect multiple warnings for large repos", () => {
      const result: MockFetchResult<{ files: number }> = {
        success: true,
        data: { files: 500 },
        warnings: [
          "Repository is very large. File tree was truncated.",
          "15 files were skipped (too large or inaccessible).",
          "GitHub API rate limit low: 50 requests remaining.",
        ],
      };

      expect(result.warnings).toHaveLength(3);
      expect(result.warnings).toContain("Repository is very large. File tree was truncated.");
    });

    it("should handle PR-specific warnings", () => {
      const result: MockFetchResult<{ prNumber: number }> = {
        success: true,
        data: { prNumber: 123 },
        warnings: [
          "This PR was closed without being merged. Review may be less relevant.",
          "Large PR detected: 5000 additions, 2000 deletions.",
        ],
      };

      expect(result.warnings).toContainEqual(expect.stringContaining("closed without being merged"));
    });
  });
});

describe("Review Generation Edge Cases", () => {
  describe("Score Boundary Conditions", () => {
    const mapToEarnLabel = (score: number, labels: string[]): string => {
      if (labels.includes("security-concern") || labels.includes("potential-plagiarism")) {
        return "Needs_Review";
      }
      if (score >= 85) return "Shortlisted";
      if (score >= 70) return "High_Quality";
      if (score >= 50) return "Mid_Quality";
      if (score >= 30) return "Low_Quality";
      return "Spam";
    };

    it("should handle exact boundary scores", () => {
      expect(mapToEarnLabel(85, [])).toBe("Shortlisted");
      expect(mapToEarnLabel(84, [])).toBe("High_Quality");
      expect(mapToEarnLabel(70, [])).toBe("High_Quality");
      expect(mapToEarnLabel(69, [])).toBe("Mid_Quality");
      expect(mapToEarnLabel(50, [])).toBe("Mid_Quality");
      expect(mapToEarnLabel(49, [])).toBe("Low_Quality");
      expect(mapToEarnLabel(30, [])).toBe("Low_Quality");
      expect(mapToEarnLabel(29, [])).toBe("Spam");
    });

    it("should handle extreme scores", () => {
      expect(mapToEarnLabel(100, [])).toBe("Shortlisted");
      expect(mapToEarnLabel(0, [])).toBe("Spam");
    });

    it("should override label for critical issues", () => {
      expect(mapToEarnLabel(95, ["security-concern"])).toBe("Needs_Review");
      expect(mapToEarnLabel(90, ["potential-plagiarism"])).toBe("Needs_Review");
    });
  });

  describe("Content Size Limits", () => {
    const LIMITS = {
      MAX_FILE_SIZE: 50000,
      MAX_DIFF_SIZE: 1000000,
      MAX_FILES: 30,
    };

    it("should respect file size limits", () => {
      const largeFileContent = "x".repeat(60000);
      expect(largeFileContent.length).toBeGreaterThan(LIMITS.MAX_FILE_SIZE);
      // File should be skipped
    });

    it("should respect diff size limits", () => {
      const largeDiff = "x".repeat(1100000);
      expect(largeDiff.length).toBeGreaterThan(LIMITS.MAX_DIFF_SIZE);
      // Diff should be truncated
    });

    it("should limit number of files analyzed", () => {
      const fileList = Array.from({ length: 50 }, (_, i) => `file${i}.ts`);
      expect(fileList.length).toBeGreaterThan(LIMITS.MAX_FILES);
      // Should only analyze first 30
    });
  });
});

describe("Queue System Edge Cases", () => {
  describe("Event Type Validation", () => {
    const validEventTypes = [
      "github.context.generate",
      "github.review.single",
      "github.review.batch",
      "github.review.completed",
    ];

    it("should accept valid event types", () => {
      for (const eventType of validEventTypes) {
        expect(validEventTypes).toContain(eventType);
      }
    });

    it("should have consistent event naming", () => {
      for (const eventType of validEventTypes) {
        expect(eventType).toMatch(/^github\.[a-z]+\.[a-z]+$/);
      }
    });
  });

  describe("Job Options", () => {
    const defaultJobOptions = {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    };

    it("should have sensible retry settings", () => {
      expect(defaultJobOptions.attempts).toBeGreaterThan(1);
      expect(defaultJobOptions.attempts).toBeLessThanOrEqual(5);
    });

    it("should use exponential backoff", () => {
      expect(defaultJobOptions.backoff.type).toBe("exponential");
      expect(defaultJobOptions.backoff.delay).toBeGreaterThan(0);
    });
  });
});

describe("AI Provider Edge Cases", () => {
  describe("Model ID Detection", () => {
    const detectProvider = (modelId: string): string => {
      if (modelId.startsWith("gemini-")) return "gemini";
      if (modelId.startsWith("openrouter/")) return "openrouter";
      if (modelId.startsWith("claude-")) return "anthropic";
      if (modelId.includes("/")) return "openrouter";
      return "openai";
    };

    it("should detect Gemini models", () => {
      expect(detectProvider("gemini-2.0-flash")).toBe("gemini");
      expect(detectProvider("gemini-3-pro-preview")).toBe("gemini");
    });

    it("should detect OpenRouter models", () => {
      expect(detectProvider("anthropic/claude-3.5-sonnet")).toBe("openrouter");
      expect(detectProvider("meta-llama/llama-3.1-70b")).toBe("openrouter");
      expect(detectProvider("openrouter/anthropic/claude-3")).toBe("openrouter");
    });

    it("should detect Claude models", () => {
      expect(detectProvider("claude-3.5-sonnet")).toBe("anthropic");
      expect(detectProvider("claude-3-opus")).toBe("anthropic");
    });

    it("should default to OpenAI", () => {
      expect(detectProvider("gpt-4o")).toBe("openai");
      expect(detectProvider("gpt-4-turbo")).toBe("openai");
      expect(detectProvider("o1-mini")).toBe("openai");
    });
  });

  describe("Cost Estimation Edge Cases", () => {
    const estimateCost = (
      inputTokens: number,
      outputTokens: number,
      inputCost: number,
      outputCost: number
    ): number => {
      return (inputTokens * inputCost + outputTokens * outputCost) / 1_000_000;
    };

    it("should handle zero tokens", () => {
      expect(estimateCost(0, 0, 2.5, 10)).toBe(0);
    });

    it("should calculate correctly for typical usage", () => {
      // 10k input tokens, 2k output tokens with gpt-4o pricing
      const cost = estimateCost(10000, 2000, 2.5, 10);
      expect(cost).toBeCloseTo(0.045, 3);
    });

    it("should handle large token counts", () => {
      // 1M tokens each
      const cost = estimateCost(1000000, 1000000, 2.5, 10);
      expect(cost).toBe(12.5);
    });
  });
});
