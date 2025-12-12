"use client";

import React, { useState } from "react";
import type { ReviewPanelProps, EarnLabel } from "./types";
import { ReviewScoreBadge } from "./ReviewScoreBadge";
import { ReviewLabelsDisplay } from "./ReviewLabelsDisplay";

/**
 * GitHubReviewPanel - Main component for displaying GitHub auto-review results
 *
 * Designed to integrate into the Earn sponsor dashboard.
 * Shows scores, labels, requirements matching, and detailed notes.
 */

export function GitHubReviewPanel({
  submissionId,
  review,
  onLabelChange,
  onRefresh,
  isLoading = false,
  showFullDetails = false,
  className = "",
}: ReviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(showFullDetails);

  if (isLoading) {
    return (
      <div className={`p-4 border rounded-lg bg-gray-50 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span className="text-sm text-gray-600">Analyzing submission...</span>
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className={`p-4 border rounded-lg bg-gray-50 ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">No AI review available</span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Request Review
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ReviewScoreBadge score={review.overallScore} size="lg" />
            <div className="text-sm text-gray-500">
              <span className="font-medium">Confidence: </span>
              {Math.round(review.confidence * 100)}%
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="text-sm text-gray-500 hover:text-gray-700"
                title="Refresh review"
              >
                Refresh
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {isExpanded ? "Show Less" : "Show More"}
            </button>
          </div>
        </div>

        {/* Labels */}
        <div className="mt-3">
          <ReviewLabelsDisplay
            labels={review.labels}
            earnLabel={review.earnLabel}
            onLabelClick={onLabelChange ? (l) => onLabelChange(l as EarnLabel) : undefined}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="p-4">
        <p className="text-sm text-gray-700">{review.summary}</p>
      </div>

      {/* Score Breakdown */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          <ScoreItem label="Requirements" score={review.requirementMatchScore} />
          <ScoreItem label="Code Quality" score={review.codeQualityScore} />
          <ScoreItem label="Completeness" score={review.completenessScore} />
          <ScoreItem label="Security" score={review.securityScore} />
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t">
          {/* Requirements */}
          <div className="p-4 border-b">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Requirements</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h5 className="text-xs font-medium text-green-700 mb-1">Matched</h5>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  {review.matchedRequirements.length > 0 ? (
                    review.matchedRequirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-green-500">+</span>
                        {req}
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-400">None matched</li>
                  )}
                </ul>
              </div>
              <div>
                <h5 className="text-xs font-medium text-red-700 mb-1">Missing</h5>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  {review.missingRequirements.length > 0 ? (
                    review.missingRequirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-red-500">-</span>
                        {req}
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-400">None missing</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Red Flags */}
          {review.redFlags.length > 0 && (
            <div className="p-4 border-b bg-red-50">
              <h4 className="text-sm font-medium text-red-900 mb-2">Red Flags</h4>
              <ul className="text-xs space-y-1">
                {review.redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        flag.severity === "critical"
                          ? "bg-red-200 text-red-800"
                          : flag.severity === "warning"
                            ? "bg-amber-200 text-amber-800"
                            : "bg-blue-200 text-blue-800"
                      }`}
                    >
                      {flag.severity}
                    </span>
                    <span className="text-gray-700">{flag.description}</span>
                    {flag.file && (
                      <span className="text-gray-400">({flag.file})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Detailed Notes */}
          <div className="p-4 border-b">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Detailed Analysis</h4>
            <div className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded max-h-64 overflow-y-auto">
              {review.detailedNotes}
            </div>
          </div>

          {/* Metadata */}
          <div className="p-4 bg-gray-50">
            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
              <span>Model: {review.modelUsed}</span>
              <span>Tokens: {review.tokensUsed.toLocaleString()}</span>
              <span>Time: {(review.processingTimeMs / 1000).toFixed(1)}s</span>
              <span>Cost: ${review.estimatedCost.toFixed(4)}</span>
              <span>Reviewed: {new Date(review.reviewedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* GitHub Link */}
          <div className="p-4 border-t">
            <a
              href={review.github.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View on GitHub
              <span className="text-xs text-gray-400">
                ({review.github.type === "pr" ? `PR #${review.github.prNumber}` : "Repository"})
              </span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreItem({ label, score }: { label: string; score: number }) {
  const colorClass =
    score >= 80
      ? "text-green-600"
      : score >= 60
        ? "text-blue-600"
        : score >= 40
          ? "text-amber-600"
          : "text-red-600";

  return (
    <div className="bg-gray-50 rounded p-2">
      <div className={`text-lg font-bold ${colorClass}`}>{score}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
