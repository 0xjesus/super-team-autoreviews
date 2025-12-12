import { z } from "zod";

// Red flag schema
export const RedFlagSchema = z.object({
  type: z.enum([
    "hardcoded-secret",
    "security-vulnerability",
    "copied-code",
    "missing-tests",
    "incomplete-implementation",
    "gas-inefficiency",
  ]),
  severity: z.enum(["critical", "warning", "info"]),
  description: z.string(),
  file: z.string().optional(),
  line: z.number().optional(),
});

// Evidence schema for requirement matching
export const EvidenceSchema = z.object({
  requirement: z.string(),
  file: z.string(),
  lineRange: z.string().optional(),
  explanation: z.string(),
});

// Issue schema for code quality
export const IssueSchema = z.object({
  severity: z.enum(["critical", "major", "minor", "suggestion"]),
  description: z.string(),
  file: z.string().optional(),
  suggestion: z.string().optional(),
});

// Full review schema - this is what the AI returns
export const ReviewSchema = z.object({
  overallScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall quality score from 0-100"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence in the review accuracy from 0-1"),

  requirementMatch: z.object({
    score: z.number().min(0).max(100),
    matchedRequirements: z.array(z.string()),
    missingRequirements: z.array(z.string()),
    evidence: z.array(EvidenceSchema),
  }),

  codeQuality: z.object({
    score: z.number().min(0).max(100),
    strengths: z.array(z.string()),
    issues: z.array(IssueSchema),
  }),

  completeness: z.object({
    score: z.number().min(0).max(100),
    implementedFeatures: z.array(z.string()),
    missingFeatures: z.array(z.string()),
  }),

  security: z.object({
    score: z.number().min(0).max(100),
    findings: z.array(z.string()),
    solanaSpecific: z.array(z.string()).optional(),
  }),

  redFlags: z.array(RedFlagSchema),

  summary: z
    .string()
    .max(500)
    .describe("2-3 sentence summary for sponsors"),
  detailedNotes: z
    .string()
    .describe("Full markdown review with details"),

  suggestedLabels: z.array(
    z.enum([
      "high-quality",
      "needs-review",
      "incomplete",
      "security-concern",
      "potential-plagiarism",
      "excellent",
      "needs-revision",
    ])
  ),
});

export type ReviewOutput = z.infer<typeof ReviewSchema>;
export type RedFlag = z.infer<typeof RedFlagSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type Issue = z.infer<typeof IssueSchema>;
