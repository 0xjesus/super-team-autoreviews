import { NextRequest, NextResponse } from "next/server";
import { db, submissions, reviews } from "@/lib/db";
import { eq } from "drizzle-orm";

// GET /api/submissions/[id] - Get a single submission with its review
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get submission
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, id))
      .limit(1);

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Get associated review if exists
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.submissionId, id))
      .limit(1);

    return NextResponse.json({
      submission,
      review: review || null,
    });
  } catch (error) {
    console.error("Error fetching submission:", error);
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 }
    );
  }
}

// DELETE /api/submissions/[id] - Delete a submission
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [deleted] = await db
      .delete(submissions)
      .where(eq(submissions.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Error deleting submission:", error);
    return NextResponse.json(
      { error: "Failed to delete submission" },
      { status: 500 }
    );
  }
}
