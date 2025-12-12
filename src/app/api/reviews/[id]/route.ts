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

// DELETE /api/reviews/[id] - Delete a review and its submission
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // The id here is the submissionId from the demo
    // First try to delete by submission id (cascade will delete reviews)
    const deleted = await db
      .delete(submissions)
      .where(eq(submissions.id, id))
      .returning();

    if (deleted.length === 0) {
      // Try by review id
      const reviewDeleted = await db
        .delete(reviews)
        .where(eq(reviews.id, id))
        .returning();

      if (reviewDeleted.length === 0) {
        return NextResponse.json({ error: "Review not found" }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true, message: "Review deleted" });
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    );
  }
}
