import { NextRequest, NextResponse } from "next/server";
import { db, reviews, submissions } from "@/lib/db";
import { eq, desc, and, gte, lte } from "drizzle-orm";

// GET /api/reviews - List reviews with filters and full details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listingId");
    const minScore = searchParams.get("minScore");
    const maxScore = searchParams.get("maxScore");
    const label = searchParams.get("label");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build query with joins - get ALL review fields
    let results = await db
      .select({
        review: reviews,
        submission: submissions,
      })
      .from(reviews)
      .innerJoin(submissions, eq(reviews.submissionId, submissions.id))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    // Apply filters
    if (listingId) {
      results = results.filter((r) => r.submission.listingId === listingId);
    }

    if (minScore) {
      const min = parseInt(minScore, 10);
      results = results.filter((r) => (r.review.overallScore || 0) >= min);
    }

    if (maxScore) {
      const max = parseInt(maxScore, 10);
      results = results.filter((r) => (r.review.overallScore || 0) <= max);
    }

    if (label) {
      results = results.filter((r) => r.review.labels?.includes(label));
    }

    // Return full review data with all fields
    return NextResponse.json({
      reviews: results.map((r) => ({
        id: r.review.id,
        overallScore: r.review.overallScore,
        confidence: r.review.confidence,
        requirementMatchScore: r.review.requirementMatchScore,
        codeQualityScore: r.review.codeQualityScore,
        completenessScore: r.review.completenessScore,
        securityScore: r.review.securityScore,
        summary: r.review.summary,
        detailedNotes: r.review.detailedNotes,
        labels: r.review.labels,
        redFlags: r.review.redFlags,
        matchedRequirements: r.review.matchedRequirements,
        missingRequirements: r.review.missingRequirements,
        modelUsed: r.review.modelUsed,
        tokensUsed: r.review.tokensUsed,
        processingTimeMs: r.review.processingTimeMs,
        estimatedCost: r.review.estimatedCost,
        createdAt: r.review.createdAt,
        submission: {
          id: r.submission.id,
          externalId: r.submission.externalId,
          githubUrl: r.submission.githubUrl,
          githubType: r.submission.githubType,
          owner: r.submission.owner,
          repo: r.submission.repo,
          prNumber: r.submission.prNumber,
          bountyTitle: r.submission.bountyTitle,
          status: r.submission.status,
          createdAt: r.submission.createdAt,
          reviewedAt: r.submission.reviewedAt,
        },
      })),
      pagination: {
        limit,
        offset,
        total: results.length,
      },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
