/**
 * Accuracy Metrics Tracking
 *
 * Tracks AI review accuracy against human reviews for continuous improvement.
 * Stores validation results in the database for reporting.
 */

import { db, historicalValidations } from "../db";
import { eq, sql, and, gte, lte } from "drizzle-orm";

export interface ValidationResult {
  submissionId: string;
  aiScore: number;
  aiLabel: string;
  humanScore: number;
  humanLabel: string;
  scoreAccurate: boolean;
  labelAccurate: boolean;
  scoreDelta: number;
}

export interface AccuracyMetrics {
  totalValidations: number;
  scoreAccuracy: number; // Percentage of scores within tolerance
  labelAccuracy: number; // Percentage of matching/adjacent labels
  averageScoreDelta: number;
  labelConfusionMatrix: Record<string, Record<string, number>>;
  byModel: Record<string, {
    count: number;
    scoreAccuracy: number;
    labelAccuracy: number;
  }>;
  trend: {
    period: string;
    accuracy: number;
  }[];
}

// Label adjacency for "close enough" matching
const ADJACENT_LABELS: Record<string, string[]> = {
  Shortlisted: ["High_Quality"],
  High_Quality: ["Shortlisted", "Mid_Quality"],
  Mid_Quality: ["High_Quality", "Low_Quality", "Needs_Review"],
  Low_Quality: ["Mid_Quality", "Spam", "Needs_Review"],
  Needs_Review: ["Mid_Quality", "Low_Quality"],
  Spam: ["Low_Quality"],
};

// Default score tolerance (points)
const SCORE_TOLERANCE = 15;

/**
 * Check if AI score is within acceptable range of human score
 */
export function isScoreAccurate(
  aiScore: number,
  humanScore: number,
  tolerance = SCORE_TOLERANCE
): boolean {
  return Math.abs(aiScore - humanScore) <= tolerance;
}

/**
 * Check if AI label matches or is adjacent to human label
 */
export function isLabelAccurate(aiLabel: string, humanLabel: string): boolean {
  if (aiLabel === humanLabel) return true;
  return ADJACENT_LABELS[humanLabel]?.includes(aiLabel) || false;
}

/**
 * Record a validation result
 */
export async function recordValidation(
  submissionId: string,
  aiScore: number,
  aiLabel: string,
  humanScore: number,
  humanLabel: string
): Promise<ValidationResult> {
  const scoreAccurate = isScoreAccurate(aiScore, humanScore);
  const labelAccurate = isLabelAccurate(aiLabel, humanLabel);
  const scoreDelta = aiScore - humanScore;

  try {
    await db.insert(historicalValidations).values({
      submissionId,
      aiScore,
      aiLabel,
      humanScore,
      humanLabel,
      scoreAccurate,
      labelAccurate,
      scoreDelta,
    });
  } catch (error) {
    console.error("Failed to record validation:", error);
  }

  return {
    submissionId,
    aiScore,
    aiLabel,
    humanScore,
    humanLabel,
    scoreAccurate,
    labelAccurate,
    scoreDelta,
  };
}

/**
 * Calculate overall accuracy metrics
 */
export async function calculateAccuracyMetrics(
  startDate?: Date,
  endDate?: Date
): Promise<AccuracyMetrics> {
  try {
    // Build date filter
    const dateConditions = [];
    if (startDate) {
      dateConditions.push(gte(historicalValidations.createdAt, startDate));
    }
    if (endDate) {
      dateConditions.push(lte(historicalValidations.createdAt, endDate));
    }

    // Fetch all validations in range
    const validations = await db
      .select()
      .from(historicalValidations)
      .where(dateConditions.length > 0 ? and(...dateConditions) : undefined);

    if (validations.length === 0) {
      return {
        totalValidations: 0,
        scoreAccuracy: 0,
        labelAccuracy: 0,
        averageScoreDelta: 0,
        labelConfusionMatrix: {},
        byModel: {},
        trend: [],
      };
    }

    // Calculate metrics
    const scoreAccurateCount = validations.filter((v) => v.scoreAccurate).length;
    const labelAccurateCount = validations.filter((v) => v.labelAccurate).length;
    const totalScoreDelta = validations.reduce(
      (sum, v) => sum + Math.abs(v.scoreDelta || 0),
      0
    );

    // Build confusion matrix
    const confusionMatrix: Record<string, Record<string, number>> = {};
    for (const v of validations) {
      if (!v.humanLabel || !v.aiLabel) continue;
      if (!confusionMatrix[v.humanLabel]) {
        confusionMatrix[v.humanLabel] = {};
      }
      confusionMatrix[v.humanLabel][v.aiLabel] =
        (confusionMatrix[v.humanLabel][v.aiLabel] || 0) + 1;
    }

    return {
      totalValidations: validations.length,
      scoreAccuracy: (scoreAccurateCount / validations.length) * 100,
      labelAccuracy: (labelAccurateCount / validations.length) * 100,
      averageScoreDelta: totalScoreDelta / validations.length,
      labelConfusionMatrix: confusionMatrix,
      byModel: {}, // Would need to join with reviews table
      trend: [], // Would need time-series aggregation
    };
  } catch (error) {
    console.error("Failed to calculate accuracy metrics:", error);
    return {
      totalValidations: 0,
      scoreAccuracy: 0,
      labelAccuracy: 0,
      averageScoreDelta: 0,
      labelConfusionMatrix: {},
      byModel: {},
      trend: [],
    };
  }
}

/**
 * Get accuracy summary for display
 */
export async function getAccuracySummary(): Promise<{
  overallAccuracy: number;
  scoreAccuracy: number;
  labelAccuracy: number;
  totalValidations: number;
  status: "good" | "acceptable" | "needs_improvement";
}> {
  const metrics = await calculateAccuracyMetrics();

  // Combined accuracy (average of score and label accuracy)
  const overallAccuracy = (metrics.scoreAccuracy + metrics.labelAccuracy) / 2;

  // Status based on accuracy thresholds
  let status: "good" | "acceptable" | "needs_improvement";
  if (overallAccuracy >= 80) {
    status = "good";
  } else if (overallAccuracy >= 65) {
    status = "acceptable";
  } else {
    status = "needs_improvement";
  }

  return {
    overallAccuracy,
    scoreAccuracy: metrics.scoreAccuracy,
    labelAccuracy: metrics.labelAccuracy,
    totalValidations: metrics.totalValidations,
    status,
  };
}

/**
 * Map internal label to Earn label (for consistency)
 */
export function mapToEarnLabel(
  score: number,
  labels: string[]
): "Shortlisted" | "High_Quality" | "Mid_Quality" | "Low_Quality" | "Needs_Review" | "Spam" {
  // Critical issues always need review
  if (labels.includes("security-concern") || labels.includes("potential-plagiarism")) {
    return "Needs_Review";
  }

  // Score-based mapping
  if (score >= 85) return "Shortlisted";
  if (score >= 70) return "High_Quality";
  if (score >= 50) return "Mid_Quality";
  if (score >= 30) return "Low_Quality";
  return "Spam";
}
