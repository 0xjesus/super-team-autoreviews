import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ReviewSchema, type ReviewOutput } from "./schemas";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";
import type { KeyFile, FileTreeNode } from "../db/schema";

// Get provider and model - created lazily to read env vars at runtime
function getModel(modelId: string) {
  if (modelId.startsWith("gemini-")) {
    // Use GEMINI_API_KEY (the one the user has configured)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    const provider = createGoogleGenerativeAI({ apiKey });
    return provider(modelId);
  }

  // OpenAI
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  const provider = createOpenAI({ apiKey });
  return provider(modelId);
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

export async function generateReview(
  bountyContext: BountyContext,
  codeContext: CodeContext
): Promise<ReviewOutput & { tokensUsed: number; modelUsed: string }> {
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

  // Default to Gemini since GEMINI_API_KEY is configured
  const modelId = process.env.AI_MODEL || "gemini-2.0-flash";

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

  return {
    ...result.object,
    tokensUsed: inputTokens + outputTokens,
    modelUsed: modelId,
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
