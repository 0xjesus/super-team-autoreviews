/**
 * Types for Earn Dashboard Integration
 */

export type EarnLabel =
  | "Shortlisted"
  | "High_Quality"
  | "Mid_Quality"
  | "Low_Quality"
  | "Needs_Review"
  | "Spam";

export interface RedFlag {
  type: string;
  severity: "critical" | "warning" | "info";
  description: string;
  file?: string;
  line?: number;
}

export interface GitHubReviewData {
  // Core scores
  overallScore: number;
  confidence: number;
  requirementMatchScore: number;
  codeQualityScore: number;
  completenessScore: number;
  securityScore: number;

  // Content
  summary: string;
  detailedNotes: string;

  // Labels and flags
  labels: string[];
  earnLabel: EarnLabel;
  redFlags: RedFlag[];

  // Requirements
  matchedRequirements: string[];
  missingRequirements: string[];

  // Metadata
  modelUsed: string;
  tokensUsed: number;
  processingTimeMs: number;
  estimatedCost: number;
  reviewedAt: string;

  // GitHub info
  github: {
    type: "pr" | "repository";
    owner: string;
    repo: string;
    prNumber?: number;
    url: string;
  };
}

export interface ReviewPanelProps {
  submissionId: string;
  review: GitHubReviewData | null;
  onLabelChange?: (label: EarnLabel) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  showFullDetails?: boolean;
  className?: string;
}

export interface ScoreBadgeProps {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export interface LabelsDisplayProps {
  labels: string[];
  earnLabel: EarnLabel;
  onLabelClick?: (label: string) => void;
  className?: string;
}
