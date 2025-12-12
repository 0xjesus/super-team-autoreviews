import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ReviewSchema, type ReviewOutput } from "./schemas";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";
import type { KeyFile, FileTreeNode } from "../db/schema";

// Provider detection based on model ID prefix
type AIProvider = "openai" | "gemini" | "openrouter" | "anthropic";

function detectProvider(modelId: string): AIProvider {
  if (modelId.startsWith("gemini-")) return "gemini";
  if (modelId.startsWith("openrouter/")) return "openrouter";
  if (modelId.startsWith("claude-")) return "anthropic";
  // OpenRouter model format: provider/model-name
  if (modelId.includes("/")) return "openrouter";
  return "openai";
}

// Get provider and model - created lazily to read env vars at runtime
// Supports: OpenAI, Gemini, OpenRouter (earn-agent compatible), Anthropic
function getModel(modelId: string) {
  const provider = detectProvider(modelId);

  switch (provider) {
    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set");
      }
      const geminiProvider = createGoogleGenerativeAI({ apiKey });
      return geminiProvider(modelId);
    }

    case "openrouter": {
      // OpenRouter - compatible with earn-agent infrastructure
      // Uses OpenAI-compatible API with different base URL
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY environment variable is not set. OpenRouter is required for earn-agent integration.");
      }
      const openrouterProvider = createOpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        headers: {
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://earn.superteam.fun",
          "X-Title": "Superteam Earn Auto-Review",
        },
      });
      // Remove 'openrouter/' prefix if present
      const cleanModelId = modelId.replace(/^openrouter\//, "");
      return openrouterProvider(cleanModelId);
    }

    case "anthropic": {
      // Anthropic models via OpenRouter (earn-agent uses this pattern)
      const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY or ANTHROPIC_API_KEY required for Claude models");
      }
      // Use OpenRouter for Anthropic models if OPENROUTER_API_KEY is set
      if (process.env.OPENROUTER_API_KEY) {
        const openrouterProvider = createOpenAI({
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: "https://openrouter.ai/api/v1",
        });
        return openrouterProvider(`anthropic/${modelId}`);
      }
      // Direct Anthropic API would need @ai-sdk/anthropic
      throw new Error("Direct Anthropic API not configured. Use OPENROUTER_API_KEY instead.");
    }

    default: {
      // OpenAI direct
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY environment variable is not set");
      }
      const openaiProvider = createOpenAI({ apiKey });
      return openaiProvider(modelId);
    }
  }
}

// Export provider detection for use in UI
export function getAvailableProviders(): { provider: AIProvider; configured: boolean }[] {
  return [
    { provider: "openai", configured: !!process.env.OPENAI_API_KEY },
    { provider: "gemini", configured: !!process.env.GEMINI_API_KEY },
    { provider: "openrouter", configured: !!process.env.OPENROUTER_API_KEY },
    { provider: "anthropic", configured: !!process.env.OPENROUTER_API_KEY || !!process.env.ANTHROPIC_API_KEY },
  ];
}

export interface BountyContext {
  title: string;
  description: string;
  requirements: string[];
  techStack: string[];
}

export interface RepositoryContext {
  type: "repository";
  fileTree: FileTreeNode[];
  keyFiles: KeyFile[];
}

export interface PRContext {
  type: "pr";
  fileTree: FileTreeNode[];
  keyFiles: KeyFile[];
  diff: string;
  prTitle: string;
  prDescription: string | null;
  commits: Array<{ sha: string; message: string; author: string }>;
}

export type CodeContext = RepositoryContext | PRContext;

// Convert file tree to string representation
function fileTreeToString(nodes: FileTreeNode[], indent = ""): string {
  let result = "";
  for (const node of nodes) {
    result += `${indent}${node.type === "directory" ? "📁" : "📄"} ${node.name}\n`;
    if (node.children) {
      result += fileTreeToString(node.children, indent + "  ");
    }
  }
  return result;
}

// Cost per 1M tokens (estimated, varies by model)
// Includes OpenRouter models for earn-agent compatibility
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // Gemini 3 (Latest)
  "gemini-3-pro-preview": { input: 1.25, output: 10.00 },
  // Gemini 2.5
  "gemini-2.5-pro": { input: 1.25, output: 10.00 },
  "gemini-2.5-flash": { input: 0.075, output: 0.30 },
  "gemini-2.5-flash-lite": { input: 0.02, output: 0.10 },
  // Gemini 2.0
  "gemini-2.0-flash": { input: 0.075, output: 0.30 },
  // OpenAI Direct
  "gpt-4o": { input: 2.50, output: 10.00 },
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4-turbo": { input: 10.00, output: 30.00 },
  "o1": { input: 15.00, output: 60.00 },
  "o1-mini": { input: 3.00, output: 12.00 },
  "o3-mini": { input: 1.10, output: 4.40 },
  // OpenRouter Models (earn-agent compatible)
  "anthropic/claude-3.5-sonnet": { input: 3.00, output: 15.00 },
  "anthropic/claude-3-haiku": { input: 0.25, output: 1.25 },
  "anthropic/claude-3-opus": { input: 15.00, output: 75.00 },
  "meta-llama/llama-3.1-70b-instruct": { input: 0.35, output: 0.40 },
  "meta-llama/llama-3.1-8b-instruct": { input: 0.055, output: 0.055 },
  "mistralai/mistral-large": { input: 2.00, output: 6.00 },
  "mistralai/codestral-latest": { input: 0.30, output: 0.90 },
  "google/gemini-pro-1.5": { input: 1.25, output: 5.00 },
  "google/gemini-flash-1.5": { input: 0.075, output: 0.30 },
  "deepseek/deepseek-chat": { input: 0.14, output: 0.28 },
  "deepseek/deepseek-coder": { input: 0.14, output: 0.28 },
  // Claude direct (via OpenRouter)
  "claude-3.5-sonnet": { input: 3.00, output: 15.00 },
  "claude-3-haiku": { input: 0.25, output: 1.25 },
};

function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[modelId] || { input: 1.00, output: 3.00 }; // Default fallback
  return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;
}

export async function generateReview(
  bountyContext: BountyContext,
  codeContext: CodeContext,
  requestedModel?: string
): Promise<ReviewOutput & { tokensUsed: number; modelUsed: string; estimatedCost: number }> {
  const startTime = Date.now();

  const fileTreeString = fileTreeToString(codeContext.fileTree);

  const userPrompt = buildUserPrompt(
    bountyContext.title,
    bountyContext.description,
    bountyContext.requirements,
    bountyContext.techStack,
    {
      type: codeContext.type,
      fileTree: fileTreeString,
      keyFiles: codeContext.keyFiles.map((f) => ({
        path: f.path,
        language: f.language,
        content: f.content,
      })),
      ...(codeContext.type === "pr"
        ? {
            diff: codeContext.diff,
            prTitle: codeContext.prTitle,
            prDescription: codeContext.prDescription || undefined,
            commits: codeContext.commits.map((c) => ({ message: c.message })),
          }
        : {}),
    }
  );

  // Use requested model or default
  const modelId = requestedModel || process.env.AI_MODEL || "gemini-2.0-flash";

  const result = await generateObject({
    model: getModel(modelId),
    schema: ReviewSchema,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.3, // Low temperature for consistency
  });

  const processingTime = Date.now() - startTime;

  // Estimate tokens (rough calculation)
  const inputTokens = Math.ceil((SYSTEM_PROMPT.length + userPrompt.length) / 4);
  const outputTokens = Math.ceil(JSON.stringify(result.object).length / 4);
  const totalTokens = inputTokens + outputTokens;
  const cost = estimateCost(modelId, inputTokens, outputTokens);

  return {
    ...result.object,
    tokensUsed: totalTokens,
    modelUsed: modelId,
    estimatedCost: cost,
  };
}

// Chunk large repositories for analysis
export interface CodeChunk {
  index: number;
  files: KeyFile[];
  totalTokens: number;
}

export function chunkCodeForAnalysis(
  keyFiles: KeyFile[],
  maxTokensPerChunk = 12000
): CodeChunk[] {
  const chunks: CodeChunk[] = [];
  let currentChunk: KeyFile[] = [];
  let currentTokens = 0;

  // Sort by importance
  const sortedFiles = [...keyFiles].sort((a, b) => {
    const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return importanceOrder[a.importance] - importanceOrder[b.importance];
  });

  for (const file of sortedFiles) {
    const fileTokens = Math.ceil(file.content.length / 4);

    if (currentTokens + fileTokens > maxTokensPerChunk && currentChunk.length > 0) {
      chunks.push({
        index: chunks.length,
        files: currentChunk,
        totalTokens: currentTokens,
      });
      currentChunk = [];
      currentTokens = 0;
    }

    currentChunk.push(file);
    currentTokens += fileTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push({
      index: chunks.length,
      files: currentChunk,
      totalTokens: currentTokens,
    });
  }

  return chunks;
}

// Extended review type with metadata
export type ExtendedReviewOutput = ReviewOutput & { tokensUsed: number; modelUsed: string };

// Aggregate multiple chunk analyses into final review
export function aggregateChunkAnalyses(
  analyses: ExtendedReviewOutput[],
  bountyContext: BountyContext
): ExtendedReviewOutput {
  if (analyses.length === 0) {
    throw new Error("No analyses to aggregate");
  }

  if (analyses.length === 1) {
    return analyses[0];
  }

  // Aggregate scores (weighted average with confidence)
  const totalConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0);

  const weightedScore = (field: keyof ReviewOutput) => {
    return Math.round(
      analyses.reduce((sum, a) => {
        const score = a[field];
        if (typeof score === "number") {
          return sum + score * a.confidence;
        }
        return sum;
      }, 0) / totalConfidence
    );
  };

  // Merge arrays and dedupe
  const mergeArrays = <T>(arrays: T[][]): T[] => {
    return [...new Set(arrays.flat())];
  };

  // Merge red flags
  const allRedFlags = analyses.flatMap((a) => a.redFlags);

  // Calculate aggregated scores
  const overallScore = weightedScore("overallScore");

  return {
    overallScore,
    confidence: Math.min(...analyses.map((a) => a.confidence)),

    requirementMatch: {
      score: Math.round(
        analyses.reduce((sum, a) => sum + a.requirementMatch.score, 0) / analyses.length
      ),
      matchedRequirements: mergeArrays(
        analyses.map((a) => a.requirementMatch.matchedRequirements)
      ),
      missingRequirements: mergeArrays(
        analyses.map((a) => a.requirementMatch.missingRequirements)
      ),
      evidence: analyses.flatMap((a) => a.requirementMatch.evidence),
    },

    codeQuality: {
      score: Math.round(
        analyses.reduce((sum, a) => sum + a.codeQuality.score, 0) / analyses.length
      ),
      strengths: mergeArrays(analyses.map((a) => a.codeQuality.strengths)),
      issues: analyses.flatMap((a) => a.codeQuality.issues),
    },

    completeness: {
      score: Math.round(
        analyses.reduce((sum, a) => sum + a.completeness.score, 0) / analyses.length
      ),
      implementedFeatures: mergeArrays(
        analyses.map((a) => a.completeness.implementedFeatures)
      ),
      missingFeatures: mergeArrays(analyses.map((a) => a.completeness.missingFeatures)),
    },

    security: {
      score: Math.round(
        analyses.reduce((sum, a) => sum + a.security.score, 0) / analyses.length
      ),
      findings: mergeArrays(analyses.map((a) => a.security.findings)),
      solanaSpecific: mergeArrays(
        analyses.map((a) => a.security.solanaSpecific || [])
      ),
    },

    redFlags: allRedFlags,

    summary: generateAggregatedSummary(analyses, overallScore),
    detailedNotes: generateAggregatedNotes(analyses, bountyContext),

    suggestedLabels: determineLabels(overallScore, allRedFlags),

    // Aggregate metadata
    tokensUsed: analyses.reduce((sum, a) => sum + a.tokensUsed, 0),
    modelUsed: analyses[0]?.modelUsed || "unknown",
  };
}

function generateAggregatedSummary(
  analyses: ReviewOutput[],
  overallScore: number
): string {
  const qualityDescription =
    overallScore >= 85
      ? "excellent"
      : overallScore >= 70
        ? "good"
        : overallScore >= 50
          ? "acceptable"
          : "needs improvement";

  const hasSecurityIssues = analyses.some((a) =>
    a.redFlags.some((r) => r.type === "security-vulnerability")
  );

  let summary = `This submission is ${qualityDescription} with an overall score of ${overallScore}/100. `;

  if (hasSecurityIssues) {
    summary += "Security concerns were identified that should be addressed. ";
  }

  const strengths = [...new Set(analyses.flatMap((a) => a.codeQuality.strengths))];
  if (strengths.length > 0) {
    summary += `Key strengths include: ${strengths.slice(0, 2).join(", ")}.`;
  }

  return summary.slice(0, 500);
}

function generateAggregatedNotes(
  analyses: ReviewOutput[],
  bountyContext: BountyContext
): string {
  let notes = `# Code Review for "${bountyContext.title}"\n\n`;

  notes += `## Overall Assessment\n`;
  notes += analyses[0].detailedNotes.split("##")[1]?.split("##")[0] || "";

  notes += `\n## Requirement Matching\n`;
  const matched = [...new Set(analyses.flatMap((a) => a.requirementMatch.matchedRequirements))];
  const missing = [...new Set(analyses.flatMap((a) => a.requirementMatch.missingRequirements))];

  if (matched.length > 0) {
    notes += `### Implemented\n${matched.map((r) => `- ✅ ${r}`).join("\n")}\n\n`;
  }
  if (missing.length > 0) {
    notes += `### Missing\n${missing.map((r) => `- ❌ ${r}`).join("\n")}\n\n`;
  }

  notes += `## Code Quality\n`;
  const issues = analyses.flatMap((a) => a.codeQuality.issues);
  if (issues.length > 0) {
    notes += issues
      .slice(0, 10)
      .map((i) => `- **${i.severity}**: ${i.description}${i.file ? ` (${i.file})` : ""}`)
      .join("\n");
  }

  notes += `\n\n## Security\n`;
  const findings = [...new Set(analyses.flatMap((a) => a.security.findings))];
  if (findings.length > 0) {
    notes += findings.map((f) => `- ${f}`).join("\n");
  } else {
    notes += "No significant security issues identified.";
  }

  const redFlags = analyses.flatMap((a) => a.redFlags);
  if (redFlags.length > 0) {
    notes += `\n\n## Red Flags\n`;
    notes += redFlags
      .map(
        (r) =>
          `- **${r.severity.toUpperCase()}** [${r.type}]: ${r.description}${r.file ? ` in \`${r.file}\`` : ""}`
      )
      .join("\n");
  }

  return notes;
}

function determineLabels(
  score: number,
  redFlags: ReviewOutput["redFlags"]
): ReviewOutput["suggestedLabels"] {
  const labels: ReviewOutput["suggestedLabels"] = [];

  if (score >= 90) {
    labels.push("excellent");
    labels.push("high-quality");
  } else if (score >= 75) {
    labels.push("high-quality");
  } else if (score >= 50) {
    labels.push("needs-review");
  } else {
    labels.push("needs-revision");
  }

  if (redFlags.some((r) => r.type === "security-vulnerability")) {
    labels.push("security-concern");
  }

  if (redFlags.some((r) => r.type === "copied-code")) {
    labels.push("potential-plagiarism");
  }

  if (redFlags.some((r) => r.type === "incomplete-implementation")) {
    labels.push("incomplete");
  }

  return labels;
}
