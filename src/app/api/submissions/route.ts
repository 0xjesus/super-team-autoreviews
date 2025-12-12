import { NextRequest, NextResponse } from "next/server";
import { db, submissions, listingContexts } from "@/lib/db";
import { inngest } from "@/lib/inngest";
import { parseGitHubUrl } from "@/lib/github";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Schema for creating a new submission
const CreateSubmissionSchema = z.object({
  externalId: z.string().min(1),
  listingId: z.string().optional(), // Optional - defaults to manual-{timestamp}
  githubUrl: z.string().url(),
  // Bounty context (can be provided or fetched from listing)
  bountyTitle: z.string().optional(),
  bountyDescription: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  techStack: z.array(z.string()).optional(),
  // Optional model selection
  model: z.string().optional(),
  // Whether to auto-trigger review
  triggerReview: z.boolean().default(true),
});

// GET /api/submissions - List submissions with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listingId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let query = db.select().from(submissions);

    if (listingId) {
      query = query.where(eq(submissions.listingId, listingId)) as typeof query;
    }

    if (status) {
      query = query.where(eq(submissions.status, status)) as typeof query;
    }

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json({
      submissions: results,
      pagination: {
        limit,
        offset,
        total: results.length,
      },
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

// POST /api/submissions - Create a new submission and optionally trigger review
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = CreateSubmissionSchema.parse(body);

    // Check if submission already exists
    const existing = await db
      .select()
      .from(submissions)
      .where(eq(submissions.externalId, data.externalId))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Submission already exists", submission: existing[0] },
        { status: 409 }
      );
    }

    // Parse GitHub URL to determine type
    const githubInfo = parseGitHubUrl(data.githubUrl);

    // Default listingId for manual submissions
    const listingId = data.listingId || `manual-${Date.now()}`;

    // Create the submission
    const [submission] = await db
      .insert(submissions)
      .values({
        externalId: data.externalId,
        listingId,
        githubUrl: data.githubUrl,
        githubType: githubInfo.type,
        owner: githubInfo.owner,
        repo: githubInfo.repo,
        prNumber: githubInfo.prNumber,
        bountyTitle: data.bountyTitle || null,
        status: "pending",
      })
      .returning();

    // Get or create listing context
    let bountyTitle = data.bountyTitle || "";
    let bountyDescription = data.bountyDescription || "";
    let requirements = data.requirements || [];
    let techStack = data.techStack || [];

    if (!bountyTitle) {
      // Try to get from existing listing context
      const [existingContext] = await db
        .select()
        .from(listingContexts)
        .where(eq(listingContexts.listingId, listingId))
        .limit(1);

      if (existingContext) {
        bountyTitle = existingContext.title || "";
        bountyDescription = existingContext.description || "";
        requirements = existingContext.requirements || [];
        techStack = existingContext.techStack || [];
      }
    } else {
      // Store the listing context
      await db
        .insert(listingContexts)
        .values({
          listingId,
          title: bountyTitle,
          description: bountyDescription,
          requirements,
          techStack,
        })
        .onConflictDoUpdate({
          target: listingContexts.listingId,
          set: {
            title: bountyTitle,
            description: bountyDescription,
            requirements,
            techStack,
          },
        });
    }

    // Trigger review if requested
    let reviewTriggered = false;
    if (data.triggerReview) {
      try {
        await inngest.send({
          name: "github/submission.received",
          data: {
            submissionId: submission.id,
            externalId: submission.externalId,
            listingId,
            githubUrl: submission.githubUrl,
            bountyTitle,
            bountyDescription,
            requirements,
            techStack,
            model: data.model, // Pass selected model
          },
        });
        reviewTriggered = true;
      } catch (inngestError) {
        // Inngest not configured - submission stays in pending
        console.warn("Inngest not configured, submission will stay pending:", inngestError);
      }
    }

    return NextResponse.json({
      submission,
      reviewTriggered,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating submission:", error);
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }
}
