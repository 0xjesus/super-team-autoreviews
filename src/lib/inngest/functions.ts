import { inngest } from "./client";
import { db, submissions, reviews, listingContexts, githubContentCache } from "../db";
import { eq, and, gt } from "drizzle-orm";
import { parseGitHubUrl, fetchRepositoryData, fetchPRData } from "../github";
import { generateReview, chunkCodeForAnalysis, aggregateChunkAnalyses } from "../ai";
import type { BountyContext, CodeContext } from "../ai";

// Main review function - handles single submission review
export const reviewGitHubSubmission = inngest.createFunction(
  {
    id: "review-github-submission",
    retries: 3,
    concurrency: {
      limit: 10, // Respect GitHub rate limits
    },
  },
  { event: "github/submission.received" },
  async ({ event, step }) => {
    const {
      submissionId,
      externalId,
      listingId,
      githubUrl,
      bountyTitle,
      bountyDescription,
      requirements,
      techStack,
    } = event.data;

    // Step 1: Parse GitHub URL and update submission status
    const githubInfo = await step.run("parse-github-url", async () => {
      const parsed = parseGitHubUrl(githubUrl);

      await db
        .update(submissions)
        .set({
          status: "fetching",
          owner: parsed.owner,
          repo: parsed.repo,
          prNumber: parsed.prNumber,
          githubType: parsed.type,
          updatedAt: new Date(),
        })
        .where(eq(submissions.id, submissionId));

      return parsed;
    });

    // Step 2: Check cache or fetch GitHub data
    const githubData = await step.run("fetch-github-data", async () => {
      // Check cache first
      const cached = await db
        .select()
        .from(githubContentCache)
        .where(
          and(
            eq(githubContentCache.githubUrl, githubUrl),
            gt(githubContentCache.expiresAt, new Date())
          )
        )
        .limit(1);

      if (cached.length > 0) {
        return {
          fromCache: true,
          data: cached[0],
        };
      }

      // Fetch fresh data
      if (githubInfo.type === "pr") {
        const prData = await fetchPRData(githubUrl);
        return { fromCache: false, data: prData, type: "pr" as const };
      } else {
        const repoData = await fetchRepositoryData(githubUrl);
        return { fromCache: false, data: repoData, type: "repository" as const };
      }
    });

    // Step 3: Update submission status to analyzing
    await step.run("update-status-analyzing", async () => {
      await db
        .update(submissions)
        .set({
          status: "analyzing",
          updatedAt: new Date(),
        })
        .where(eq(submissions.id, submissionId));
    });

    // Step 4: Store listing context if not exists
    await step.run("store-listing-context", async () => {
      const existing = await db
        .select()
        .from(listingContexts)
        .where(eq(listingContexts.listingId, listingId))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(listingContexts).values({
          listingId,
          title: bountyTitle,
          description: bountyDescription,
          requirements,
          techStack,
        });
      }
    });

    // Step 5: Generate AI review
    const reviewResult = await step.run("generate-ai-review", async () => {
      const bountyContext: BountyContext = {
        title: bountyTitle,
        description: bountyDescription,
        requirements,
        techStack,
      };

      let codeContext: CodeContext;

      if (githubData.fromCache) {
        // Use cached data - cast since DB JSON types don't match exactly
        const cachedData = githubData.data as unknown as {
          fileTree: CodeContext["fileTree"];
          keyFiles: CodeContext["keyFiles"];
        };
        codeContext = {
          type: githubInfo.type,
          fileTree: cachedData.fileTree || [],
          keyFiles: cachedData.keyFiles || [],
        } as CodeContext;
      } else if (!githubData.fromCache && githubInfo.type === "pr") {
        const prData = githubData.data as Awaited<ReturnType<typeof fetchPRData>>;
        codeContext = {
          type: "pr",
          fileTree: [],
          keyFiles: prData.changedFiles.map((f) => ({
            path: f.filename,
            language: f.filename.split(".").pop() || "plaintext",
            content: f.patch || "",
            importance: "high" as const,
          })),
          diff: prData.diff,
          prTitle: prData.title,
          prDescription: prData.description,
          commits: prData.commits,
        };
      } else {
        const repoData = githubData.data as Awaited<ReturnType<typeof fetchRepositoryData>>;
        codeContext = {
          type: "repository",
          fileTree: repoData.fileTree,
          keyFiles: repoData.keyFiles,
        };

        // Cache the repo data
        await db.insert(githubContentCache).values({
          githubUrl,
          fileCount: repoData.totalFiles,
          totalLines: repoData.totalLines,
          languages: repoData.languages,
          fileTree: repoData.fileTree,
          keyFiles: repoData.keyFiles,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        });
      }

      // Check if we need to chunk
      const totalTokens = codeContext.keyFiles.reduce(
        (sum, f) => sum + Math.ceil(f.content.length / 4),
        0
      );

      if (totalTokens > 12000 && codeContext.type === "repository") {
        // Chunk and analyze
        const chunks = chunkCodeForAnalysis(codeContext.keyFiles);
        const analyses = [];

        for (const chunk of chunks) {
          const chunkContext: CodeContext = {
            type: "repository",
            fileTree: codeContext.fileTree,
            keyFiles: chunk.files,
          };

          const analysis = await generateReview(bountyContext, chunkContext);
          analyses.push(analysis);
        }

        return aggregateChunkAnalyses(analyses, bountyContext);
      }

      return generateReview(bountyContext, codeContext);
    });

    // Step 6: Persist review to database
    const reviewRecord = await step.run("persist-review", async () => {
      const [inserted] = await db
        .insert(reviews)
        .values({
          submissionId,
          overallScore: reviewResult.overallScore,
          confidence: String(reviewResult.confidence),
          requirementMatchScore: reviewResult.requirementMatch.score,
          codeQualityScore: reviewResult.codeQuality.score,
          completenessScore: reviewResult.completeness.score,
          securityScore: reviewResult.security.score,
          summary: reviewResult.summary,
          detailedNotes: reviewResult.detailedNotes,
          labels: reviewResult.suggestedLabels,
          redFlags: reviewResult.redFlags,
          matchedRequirements: reviewResult.requirementMatch.matchedRequirements,
          missingRequirements: reviewResult.requirementMatch.missingRequirements,
          modelUsed: reviewResult.modelUsed,
          tokensUsed: reviewResult.tokensUsed,
        })
        .returning();

      // Update submission status
      await db
        .update(submissions)
        .set({
          status: "completed",
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(submissions.id, submissionId));

      return inserted;
    });

    // Step 7: Send completion event
    await step.sendEvent("notify-completion", {
      name: "github/review.completed",
      data: {
        submissionId,
        externalId,
        reviewId: reviewRecord.id,
        score: reviewResult.overallScore,
        labels: reviewResult.suggestedLabels,
      },
    });

    return {
      success: true,
      submissionId,
      reviewId: reviewRecord.id,
      score: reviewResult.overallScore,
    };
  }
);

// Batch review function - triggers multiple reviews
export const batchReviewSubmissions = inngest.createFunction(
  {
    id: "batch-review-submissions",
    retries: 2,
  },
  { event: "github/batch.review" },
  async ({ event, step }) => {
    const { listingId, submissionIds } = event.data;

    // Get listing context
    const [listingContext] = await step.run("get-listing-context", async () => {
      return db
        .select()
        .from(listingContexts)
        .where(eq(listingContexts.listingId, listingId))
        .limit(1);
    });

    if (!listingContext) {
      throw new Error(`Listing context not found for ${listingId}`);
    }

    // Get all pending submissions
    const pendingSubmissions = await step.run("get-pending-submissions", async () => {
      return db
        .select()
        .from(submissions)
        .where(
          and(
            eq(submissions.listingId, listingId),
            eq(submissions.status, "pending")
          )
        );
    });

    // Filter to only requested submissions if specified
    const toReview = submissionIds.length > 0
      ? pendingSubmissions.filter((s) => submissionIds.includes(s.id))
      : pendingSubmissions;

    // Send events for each submission
    const events = toReview.map((submission) => ({
      name: "github/submission.received" as const,
      data: {
        submissionId: submission.id,
        externalId: submission.externalId,
        listingId: submission.listingId,
        githubUrl: submission.githubUrl,
        bountyTitle: listingContext.title || "",
        bountyDescription: listingContext.description || "",
        requirements: listingContext.requirements || [],
        techStack: listingContext.techStack || [],
      },
    }));

    await step.sendEvent("trigger-reviews", events);

    return {
      triggered: events.length,
      submissionIds: toReview.map((s) => s.id),
    };
  }
);

// Scheduled cron job to process pending reviews
export const scheduledReviewCron = inngest.createFunction(
  {
    id: "scheduled-review-cron",
  },
  { cron: "*/15 * * * *" }, // Every 15 minutes
  async ({ step }) => {
    // Find listings with pending submissions past their deadline
    // This would need integration with earn-service to get deadline info
    // For now, just process any pending submissions

    const pendingSubmissions = await step.run("find-pending", async () => {
      return db
        .select()
        .from(submissions)
        .where(eq(submissions.status, "pending"))
        .limit(50);
    });

    if (pendingSubmissions.length === 0) {
      return { processed: 0 };
    }

    // Group by listing
    const byListing = pendingSubmissions.reduce(
      (acc, sub) => {
        if (!acc[sub.listingId]) {
          acc[sub.listingId] = [];
        }
        acc[sub.listingId].push(sub.id);
        return acc;
      },
      {} as Record<string, string[]>
    );

    // Trigger batch reviews
    const events = Object.entries(byListing).map(([listingId, ids]) => ({
      name: "github/batch.review" as const,
      data: { listingId, submissionIds: ids },
    }));

    await step.sendEvent("trigger-batch-reviews", events);

    return {
      processed: pendingSubmissions.length,
      listings: Object.keys(byListing).length,
    };
  }
);

// Export all functions for registration
export const functions = [
  reviewGitHubSubmission,
  batchReviewSubmissions,
  scheduledReviewCron,
];
