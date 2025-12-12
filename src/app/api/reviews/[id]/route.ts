import { NextRequest, NextResponse } from "next/server";
import { db, reviews, submissions } from "@/lib/db";
import { eq } from "drizzle-orm";

// GET /api/reviews/[id] - Get a single review with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [result] = await db
      .select({
        review: reviews,
        submission: submissions,
      })
      .from(reviews)
      .innerJoin(submissions, eq(reviews.submissionId, submissions.id))
      .where(eq(reviews.id, id))
      .limit(1);

    if (!result) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...result.review,
      submission: result.submission,
    });
  } catch (error) {
    console.error("Error fetching review:", error);
    return NextResponse.json(
      { error: "Failed to fetch review" },
      { status: 500 }
    );
  }
}
