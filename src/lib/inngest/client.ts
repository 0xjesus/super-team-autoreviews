import { Inngest } from "inngest";

// Create a single Inngest client for the app
export const inngest = new Inngest({
  id: "superteam-github-reviewer",
  name: "Superteam GitHub Auto-Reviewer",
});

// Event types for type safety
export interface SubmissionReceivedEvent {
  name: "github/submission.received";
  data: {
    submissionId: string;
    externalId: string;
    listingId: string;
    githubUrl: string;
    bountyTitle: string;
    bountyDescription: string;
    requirements: string[];
    techStack: string[];
  };
}

export interface BatchReviewEvent {
  name: "github/batch.review";
  data: {
    listingId: string;
    submissionIds: string[];
  };
}

export interface ReviewCompletedEvent {
  name: "github/review.completed";
  data: {
    submissionId: string;
    externalId: string;
    reviewId: string;
    score: number;
    labels: string[];
  };
}

export type AppEvents =
  | SubmissionReceivedEvent
  | BatchReviewEvent
  | ReviewCompletedEvent;
