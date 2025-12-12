import { NextRequest, NextResponse } from "next/server";
import { db, reviews, submissions } from "@/lib/db";
import { eq, desc, and, gte, lte } from "drizzle-orm";

// GET /api/reviews - List reviews with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listingId");
    const minScore = searchParams.get("minScore");
    const maxScore = searchParams.get("maxScore");
    const label = searchParams.get("label");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build query with joins
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

    return NextResponse.json({
      reviews: results.map((r) => ({
        ...r.review,
        submission: r.submission,
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
