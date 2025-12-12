import { NextRequest, NextResponse } from "next/server";
import { db, submissions, listingContexts } from "@/lib/db";
import { inngest } from "@/lib/inngest";
import { parseGitHubUrl } from "@/lib/github";
import { z } from "zod";

// Schema for webhook payload from earn-service
const EarnWebhookSchema = z.object({
  event: z.enum(["submission.created", "listing.deadline", "batch.review"]),
  data: z.object({
    // For submission.created
    submissionId: z.string().optional(),
    listingId: z.string(),
    githubUrl: z.string().url().optional(),
    applicantId: z.string().optional(),

    // Listing context
    listing: z
      .object({
        title: z.string(),
        description: z.string(),
        requirements: z.array(z.string()).optional(),
        techStack: z.array(z.string()).optional(),
        deadline: z.string().optional(),
      })
      .optional(),

    // For batch.review
    submissionIds: z.array(z.string()).optional(),
  }),
});

// POST /api/webhooks/earn - Receive webhooks from earn-service
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (in production)
    const signature = request.headers.get("x-webhook-signature");
    // TODO: Implement signature verification

    const body = await request.json();
    const webhook = EarnWebhookSchema.parse(body);

    switch (webhook.event) {
      case "submission.created": {
        if (!webhook.data.submissionId || !webhook.data.githubUrl) {
          return NextResponse.json(
            { error: "Missing submissionId or githubUrl" },
            { status: 400 }
          );
        }

        // Parse GitHub URL
        const githubInfo = parseGitHubUrl(webhook.data.githubUrl);

        // Create submission record
        const [submission] = await db
          .insert(submissions)
          .values({
            externalId: webhook.data.submissionId,
            listingId: webhook.data.listingId,
            githubUrl: webhook.data.githubUrl,
            githubType: githubInfo.type,
            owner: githubInfo.owner,
            repo: githubInfo.repo,
            prNumber: githubInfo.prNumber,
            status: "pending",
          })
          .onConflictDoNothing()
          .returning();

        // Store listing context if provided
        if (webhook.data.listing) {
          await db
            .insert(listingContexts)
            .values({
              listingId: webhook.data.listingId,
              title: webhook.data.listing.title,
              description: webhook.data.listing.description,
              requirements: webhook.data.listing.requirements || [],
              techStack: webhook.data.listing.techStack || [],
            })
            .onConflictDoUpdate({
              target: listingContexts.listingId,
              set: {
                title: webhook.data.listing.title,
                description: webhook.data.listing.description,
                requirements: webhook.data.listing.requirements || [],
                techStack: webhook.data.listing.techStack || [],
              },
            });
        }

        return NextResponse.json({
          success: true,
          submissionId: submission?.id,
          message: "Submission recorded",
        });
      }

      case "listing.deadline": {
        // Deadline reached - trigger batch review for all pending submissions
        await inngest.send({
          name: "github/batch.review",
          data: {
            listingId: webhook.data.listingId,
            submissionIds: [], // Empty = all pending
          },
        });

        return NextResponse.json({
          success: true,
          message: "Batch review triggered",
        });
      }

      case "batch.review": {
        // Manual batch review request
        await inngest.send({
          name: "github/batch.review",
          data: {
            listingId: webhook.data.listingId,
            submissionIds: webhook.data.submissionIds || [],
          },
        });

        return NextResponse.json({
          success: true,
          message: "Batch review triggered",
        });
      }

      default:
        return NextResponse.json(
          { error: "Unknown event type" },
          { status: 400 }
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid webhook payload", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
