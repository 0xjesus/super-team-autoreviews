import { describe, it, expect } from "vitest";
import { ReviewSchema, RedFlagSchema } from "@/lib/ai/schemas";

describe("ReviewSchema", () => {
  it("should validate a complete review object", () => {
    const review = {
      overallScore: 85,
      confidence: 0.9,
      requirementMatch: {
        score: 90,
        matchedRequirements: ["Implement auth", "Add tests"],
        missingRequirements: [],
        evidence: [
          {
            requirement: "Implement auth",
            file: "src/auth.ts",
            explanation: "Auth implemented correctly",
          },
        ],
      },
      codeQuality: {
        score: 80,
        strengths: ["Clean code", "Good naming"],
        issues: [
          {
            severity: "minor" as const,
            description: "Consider adding more comments",
          },
        ],
      },
      completeness: {
        score: 85,
        implementedFeatures: ["Login", "Register"],
        missingFeatures: ["Password reset"],
      },
      security: {
        score: 90,
        findings: ["No hardcoded secrets found"],
        solanaSpecific: ["PDA validation correct"],
      },
      redFlags: [],
      summary: "Good submission with minor improvements needed.",
      detailedNotes: "# Review\n\nDetailed analysis...",
      suggestedLabels: ["high-quality" as const],
    };

    const result = ReviewSchema.safeParse(review);
    expect(result.success).toBe(true);
  });

  it("should reject invalid scores", () => {
    const review = {
      overallScore: 150, // Invalid: > 100
      confidence: 0.9,
      requirementMatch: { score: 90, matchedRequirements: [], missingRequirements: [], evidence: [] },
      codeQuality: { score: 80, strengths: [], issues: [] },
      completeness: { score: 85, implementedFeatures: [], missingFeatures: [] },
      security: { score: 90, findings: [] },
      redFlags: [],
      summary: "Test",
      detailedNotes: "Test",
      suggestedLabels: [],
    };

    const result = ReviewSchema.safeParse(review);
    expect(result.success).toBe(false);
  });

  it("should reject invalid confidence", () => {
    const review = {
      overallScore: 85,
      confidence: 1.5, // Invalid: > 1
      requirementMatch: { score: 90, matchedRequirements: [], missingRequirements: [], evidence: [] },
      codeQuality: { score: 80, strengths: [], issues: [] },
      completeness: { score: 85, implementedFeatures: [], missingFeatures: [] },
      security: { score: 90, findings: [] },
      redFlags: [],
      summary: "Test",
      detailedNotes: "Test",
      suggestedLabels: [],
    };

    const result = ReviewSchema.safeParse(review);
    expect(result.success).toBe(false);
  });
});

describe("RedFlagSchema", () => {
  it("should validate a valid red flag", () => {
    const redFlag = {
      type: "hardcoded-secret" as const,
      severity: "critical" as const,
      description: "API key found in config",
      file: "src/config.ts",
      line: 42,
    };

    const result = RedFlagSchema.safeParse(redFlag);
    expect(result.success).toBe(true);
  });

  it("should reject invalid red flag types", () => {
    const redFlag = {
      type: "invalid-type",
      severity: "critical",
      description: "Test",
    };

    const result = RedFlagSchema.safeParse(redFlag);
    expect(result.success).toBe(false);
  });

  it("should allow optional fields", () => {
    const redFlag = {
      type: "security-vulnerability" as const,
      severity: "warning" as const,
      description: "Potential issue",
      // file and line are optional
    };

    const result = RedFlagSchema.safeParse(redFlag);
    expect(result.success).toBe(true);
  });
});
