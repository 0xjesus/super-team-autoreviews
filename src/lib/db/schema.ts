import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  timestamp,
  jsonb,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Submissions table - stores GitHub PR/repo submissions
export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    externalId: varchar("external_id", { length: 255 }).unique().notNull(),
    listingId: varchar("listing_id", { length: 255 }).notNull(),
    githubUrl: text("github_url").notNull(),
    githubType: varchar("github_type", { length: 20 }).notNull(), // 'pr' | 'repository'

    // GitHub metadata
    owner: varchar("owner", { length: 255 }),
    repo: varchar("repo", { length: 255 }),
    prNumber: integer("pr_number"),
    defaultBranch: varchar("default_branch", { length: 100 }),

    // Bounty info (denormalized for quick access)
    bountyTitle: text("bounty_title"),

    // Status tracking
    status: varchar("status", { length: 50 }).default("pending").notNull(),
    errorMessage: text("error_message"),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_submissions_listing").on(table.listingId),
    index("idx_submissions_status").on(table.status),
    index("idx_submissions_external").on(table.externalId),
  ]
);

// Listing contexts - bounty/listing requirements for matching
export const listingContexts = pgTable(
  "listing_contexts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: varchar("listing_id", { length: 255 }).unique().notNull(),
    title: text("title"),
    description: text("description"),
    requirements: jsonb("requirements").$type<string[]>(),
    techStack: text("tech_stack").array(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_listing_contexts_listing").on(table.listingId)]
);

// Reviews - AI-generated reviews
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .references(() => submissions.id, { onDelete: "cascade" })
      .notNull(),

    // Scores
    overallScore: integer("overall_score"),
    confidence: decimal("confidence", { precision: 3, scale: 2 }),

    // Score breakdown
    requirementMatchScore: integer("requirement_match_score"),
    codeQualityScore: integer("code_quality_score"),
    completenessScore: integer("completeness_score"),
    securityScore: integer("security_score"),

    // Output for sponsors
    summary: text("summary"),
    detailedNotes: text("detailed_notes"),
    labels: text("labels").array(),

    // Red flags
    redFlags: jsonb("red_flags").$type<RedFlag[]>().default([]),

    // Requirement matching details
    matchedRequirements: jsonb("matched_requirements").$type<string[]>(),
    missingRequirements: jsonb("missing_requirements").$type<string[]>(),

    // Metadata
    modelUsed: varchar("model_used", { length: 100 }),
    tokensUsed: integer("tokens_used"),
    processingTimeMs: integer("processing_time_ms"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_reviews_submission").on(table.submissionId),
    index("idx_reviews_score").on(table.overallScore),
  ]
);

// GitHub content cache
export const githubContentCache = pgTable(
  "github_content_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    githubUrl: text("github_url").notNull(),
    contentHash: varchar("content_hash", { length: 64 }),

    // Metadata
    fileCount: integer("file_count"),
    totalLines: integer("total_lines"),
    languages: jsonb("languages").$type<Record<string, number>>(),

    // Processed content
    fileTree: jsonb("file_tree").$type<FileTreeNode[]>(),
    keyFiles: jsonb("key_files").$type<KeyFile[]>(),

    // TTL
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("idx_github_cache_url").on(table.githubUrl),
    index("idx_github_cache_expires").on(table.expiresAt),
  ]
);

// Analysis chunks for large repos
export const analysisChunks = pgTable(
  "analysis_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .references(() => submissions.id, { onDelete: "cascade" })
      .notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    filePaths: text("file_paths").array(),
    contentSummary: text("content_summary"),
    analysisResult: jsonb("analysis_result"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_chunks_submission").on(table.submissionId)]
);

// Historical validations for accuracy tracking
export const historicalValidations = pgTable("historical_validations", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id").references(() => submissions.id),

  // Human decision
  humanScore: integer("human_score"),
  humanDecision: varchar("human_decision", { length: 50 }),

  // AI comparison
  aiScore: integer("ai_score"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  review: one(reviews, {
    fields: [submissions.id],
    references: [reviews.submissionId],
  }),
  chunks: many(analysisChunks),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  submission: one(submissions, {
    fields: [reviews.submissionId],
    references: [submissions.id],
  }),
}));

// Types
export interface RedFlag {
  type:
    | "hardcoded-secret"
    | "security-vulnerability"
    | "copied-code"
    | "missing-tests"
    | "incomplete-implementation"
    | "gas-inefficiency";
  severity: "critical" | "warning" | "info";
  description: string;
  file?: string;
  line?: number;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

export interface KeyFile {
  path: string;
  language: string;
  content: string;
  importance: "critical" | "high" | "medium" | "low";
}

// Type exports
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type ListingContext = typeof listingContexts.$inferSelect;
export type NewListingContext = typeof listingContexts.$inferInsert;
