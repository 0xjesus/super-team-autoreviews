import { NextRequest, NextResponse } from "next/server";
import { getAccuracySummary, calculateAccuracyMetrics } from "@/lib/metrics/accuracy";
import { getQueueConfig, queueManager } from "@/lib/queue";

/**
 * GET /api/metrics - System metrics and accuracy data
 *
 * Returns:
 * - Accuracy metrics (score/label accuracy against human reviews)
 * - Queue system status
 * - Provider configuration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get("details") === "true";

    // Get accuracy summary
    const accuracy = await getAccuracySummary();

    // Get queue configuration
    const queueConfig = getQueueConfig();

    // Get queue health
    let queueHealth;
    try {
      queueHealth = await queueManager.healthCheck();
    } catch {
      queueHealth = { healthy: false, adapter: "unknown", details: "Not configured" };
    }

    // Get provider status
    const providers = {
      openai: !!process.env.OPENAI_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      openrouter: !!process.env.OPENROUTER_API_KEY,
    };

    // Calculate active provider count
    const activeProviders = Object.values(providers).filter(Boolean).length;

    const response: Record<string, unknown> = {
      accuracy: {
        overall: accuracy.overallAccuracy.toFixed(1),
        score: accuracy.scoreAccuracy.toFixed(1),
        label: accuracy.labelAccuracy.toFixed(1),
        validations: accuracy.totalValidations,
        status: accuracy.status,
      },
      queue: {
        adapter: queueHealth.adapter,
        healthy: queueHealth.healthy,
        config: queueConfig,
      },
      providers: {
        configured: providers,
        active: activeProviders,
      },
      system: {
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || "1.0.0",
      },
    };

    // Include detailed metrics if requested
    if (includeDetails) {
      const detailedMetrics = await calculateAccuracyMetrics();
      response.accuracyDetails = {
        confusionMatrix: detailedMetrics.labelConfusionMatrix,
        averageScoreDelta: detailedMetrics.averageScoreDelta.toFixed(2),
        byModel: detailedMetrics.byModel,
      };

      // Get queue stats if available
      try {
        const stats = await queueManager.getStats();
        response.queueStats = stats.stats;
      } catch {
        // Queue stats not available
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
