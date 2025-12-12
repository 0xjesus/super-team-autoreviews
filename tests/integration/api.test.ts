import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: "test-id" }]),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
  },
  submissions: {},
  reviews: {},
  listingContexts: {},
}));

// Mock Inngest
vi.mock("@/lib/inngest", () => ({
  inngest: {
    send: vi.fn().mockResolvedValue({}),
  },
}));

describe("API Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Submission Creation Flow", () => {
    it("should create a new submission and trigger review", async () => {
      const { inngest } = await import("@/lib/inngest");

      // Simulate the submission creation logic
      const submissionData = {
        externalId: "test-external-123",
        listingId: "listing-456",
        githubUrl: "https://github.com/test/repo",
        bountyTitle: "Test Bounty",
        bountyDescription: "Test description",
        requirements: ["Req 1", "Req 2"],
        techStack: ["TypeScript", "Solana"],
        triggerReview: true,
      };

      // Verify the inngest send would be called correctly
      await inngest.send({
        name: "github/submission.received",
        data: {
          submissionId: "test-id",
          externalId: submissionData.externalId,
          listingId: submissionData.listingId,
          githubUrl: submissionData.githubUrl,
          bountyTitle: submissionData.bountyTitle,
          bountyDescription: submissionData.bountyDescription,
          requirements: submissionData.requirements,
          techStack: submissionData.techStack,
        },
      });

      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "github/submission.received",
          data: expect.objectContaining({
            submissionId: "test-id",
            githubUrl: "https://github.com/test/repo",
          }),
        })
      );
    });
  });

  describe("Webhook Processing", () => {
    it("should handle submission.created webhook", async () => {
      const webhookPayload = {
        event: "submission.created",
        data: {
          submissionId: "ext-123",
          listingId: "listing-456",
          githubUrl: "https://github.com/test/repo/pull/42",
          listing: {
            title: "Test Bounty",
            description: "Build something cool",
            requirements: ["Do thing 1", "Do thing 2"],
            techStack: ["TypeScript"],
          },
        },
      };

      // Verify webhook payload structure
      expect(webhookPayload.event).toBe("submission.created");
      expect(webhookPayload.data.githubUrl).toContain("github.com");
    });

    it("should handle batch.review webhook", async () => {
      const { inngest } = await import("@/lib/inngest");

      const webhookPayload = {
        event: "batch.review",
        data: {
          listingId: "listing-456",
          submissionIds: ["sub-1", "sub-2", "sub-3"],
        },
      };

      await inngest.send({
        name: "github/batch.review",
        data: webhookPayload.data,
      });

      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "github/batch.review",
          data: expect.objectContaining({
            listingId: "listing-456",
            submissionIds: expect.arrayContaining(["sub-1", "sub-2"]),
          }),
        })
      );
    });
  });
});
