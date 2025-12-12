import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseGitHubUrl } from "@/lib/github/client";
import { fetchRepositoryData, fetchPRData } from "@/lib/github/fetcher";
import { generateReview, type BountyContext, type CodeContext } from "@/lib/ai/reviewer";

// Input schema
const AnalyzeRequestSchema = z.object({
  githubUrl: z.string().url(),
  bountyTitle: z.string().optional(),
  bountyDescription: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  techStack: z.array(z.string()).optional(),
});

// Earn-compatible label mapping
function mapToEarnLabel(score: number, labels: string[]): string {
  // Critical issues
  if (labels.includes("security-concern") || labels.includes("potential-plagiarism")) {
    return "Needs_Review";
  }

  // Score-based mapping to Earn labels
  if (score >= 85) return "Shortlisted";
  if (score >= 70) return "High_Quality";
  if (score >= 50) return "Mid_Quality";
  if (score >= 30) return "Low_Quality";
  return "Spam";
}

// POST /api/demo/analyze - Analyze a GitHub URL and return earn-compatible format
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const data = AnalyzeRequestSchema.parse(body);

    // Parse the GitHub URL
    const githubInfo = parseGitHubUrl(data.githubUrl);

    // Build bounty context
    const bountyContext: BountyContext = {
      title: data.bountyTitle || `Code Review: ${githubInfo.owner}/${githubInfo.repo}`,
      description: data.bountyDescription || "",
      requirements: data.requirements || [],
      techStack: data.techStack || [],
    };

    // Fetch GitHub data based on type
    let codeContext: CodeContext;

    if (githubInfo.type === "pr") {
      const prData = await fetchPRData(data.githubUrl);

      // For PRs, we need to also fetch repo data for context
      const repoUrl = `https://github.com/${githubInfo.owner}/${githubInfo.repo}`;
      const repoData = await fetchRepositoryData(repoUrl);

      codeContext = {
        type: "pr",
        fileTree: repoData.fileTree,
        keyFiles: repoData.keyFiles,
        diff: prData.diff,
        prTitle: prData.title,
        prDescription: prData.description,
        commits: prData.commits,
      };
    } else {
      const repoData = await fetchRepositoryData(data.githubUrl);

      codeContext = {
        type: "repository",
        fileTree: repoData.fileTree,
        keyFiles: repoData.keyFiles,
      };
    }

    // Generate AI review
    const review = await generateReview(bountyContext, codeContext);

    // Calculate processing time
    const processingTimeMs = Date.now() - startTime;

    // Map to Earn-compatible format (submission.ai.evaluation)
    const earnEvaluation = {
      finalLabel: mapToEarnLabel(review.overallScore, review.suggestedLabels),
      notes: review.summary,
      criteriaScore: review.requirementMatch.score,
      qualityScore: review.codeQuality.score,
      totalScore: review.overallScore,

      // Extended GitHub-specific data
      github: {
        type: githubInfo.type,
        owner: githubInfo.owner,
        repo: githubInfo.repo,
        prNumber: githubInfo.prNumber,

        requirementMatch: {
          score: review.requirementMatch.score,
          matched: review.requirementMatch.matchedRequirements,
          missing: review.requirementMatch.missingRequirements,
          evidence: review.requirementMatch.evidence,
        },

        codeQuality: {
          score: review.codeQuality.score,
          strengths: review.codeQuality.strengths,
          issues: review.codeQuality.issues,
        },

        security: {
          score: review.security.score,
          findings: review.security.findings,
          solanaSpecific: review.security.solanaSpecific || [],
        },

        completeness: {
          score: review.completeness.score,
          implemented: review.completeness.implementedFeatures,
          missing: review.completeness.missingFeatures,
        },

        redFlags: review.redFlags,
      },

      // Metadata
      confidence: review.confidence,
      detailedNotes: review.detailedNotes,
      suggestedLabels: review.suggestedLabels,
      modelUsed: review.modelUsed,
      tokensUsed: review.tokensUsed,
      processingTimeMs,
    };

    return NextResponse.json({
      success: true,
      evaluation: earnEvaluation,
    });

  } catch (error) {
    console.error("Demo analysis error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: error.issues
        },
        { status: 400 }
      );
    }

    // GitHub API errors
    if (error instanceof Error) {
      if (error.message.includes("Not Found")) {
        return NextResponse.json(
          {
            success: false,
            error: "Repository or PR not found. Make sure the URL is correct and the repository is public."
          },
          { status: 404 }
        );
      }

      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          {
            success: false,
            error: "GitHub API rate limit exceeded. Please try again later."
          },
          { status: 429 }
        );
      }

      // AI API errors - be more specific about the actual error
      if (error.message.includes("API key") ||
          error.message.includes("authentication") ||
          error.message.includes("OPENAI_API_KEY") ||
          error.message.includes("GOOGLE_GENERATIVE_AI_API_KEY")) {
        return NextResponse.json(
          {
            success: false,
            error: "AI service not configured. Please check API keys.",
            debug: error.message
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Analysis failed. Please try again.",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
