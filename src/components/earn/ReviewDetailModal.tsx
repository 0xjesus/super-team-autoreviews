"use client";

import React from "react";
import type { GitHubReviewData, EarnLabel } from "./types";
import { ReviewScoreBadge } from "./ReviewScoreBadge";
import { ReviewLabelsDisplay } from "./ReviewLabelsDisplay";

/**
 * ReviewDetailModal - Full-screen modal for detailed review inspection
 *
 * Shows all review data including code quality details, security findings,
 * and the complete AI analysis notes.
 */

interface ReviewDetailModalProps {
  review: GitHubReviewData;
  isOpen: boolean;
  onClose: () => void;
  onLabelChange?: (label: EarnLabel) => void;
}

export function ReviewDetailModal({
  review,
  isOpen,
  onClose,
  onLabelChange,
}: ReviewDetailModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ReviewScoreBadge score={review.overallScore} size="lg" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  GitHub Review Analysis
                </h2>
                <p className="text-sm text-gray-500">
                  {review.github.owner}/{review.github.repo}
                  {review.github.prNumber && ` #${review.github.prNumber}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Labels */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Labels</h3>
              <ReviewLabelsDisplay
                labels={review.labels}
                earnLabel={review.earnLabel}
                onLabelClick={onLabelChange ? (l) => onLabelChange(l as EarnLabel) : undefined}
              />
            </div>

            {/* Summary */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Summary</h3>
              <p className="text-gray-600">{review.summary}</p>
            </div>

            {/* Score Breakdown */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Score Breakdown</h3>
              <div className="grid grid-cols-5 gap-3">
                <ScoreCard
                  label="Overall"
                  score={review.overallScore}
                  description="Combined weighted score"
                />
                <ScoreCard
                  label="Requirements"
                  score={review.requirementMatchScore}
                  description="Bounty requirements matching"
                />
                <ScoreCard
                  label="Code Quality"
                  score={review.codeQualityScore}
                  description="Code style and best practices"
                />
                <ScoreCard
                  label="Completeness"
                  score={review.completenessScore}
                  description="Feature implementation"
                />
                <ScoreCard
                  label="Security"
                  score={review.securityScore}
                  description="Security analysis"
                />
              </div>
            </div>

            {/* Requirements Analysis */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-green-700 mb-2">
                  Matched Requirements ({review.matchedRequirements.length})
                </h3>
                <ul className="space-y-1">
                  {review.matchedRequirements.map((req, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-700 mb-2">
                  Missing Requirements ({review.missingRequirements.length})
                </h3>
                <ul className="space-y-1">
                  {review.missingRequirements.map((req, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Red Flags */}
            {review.redFlags.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-red-800 mb-3">
                  Red Flags ({review.redFlags.length})
                </h3>
                <div className="space-y-2">
                  {review.redFlags.map((flag, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 bg-white rounded p-3"
                    >
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          flag.severity === "critical"
                            ? "bg-red-200 text-red-800"
                            : flag.severity === "warning"
                              ? "bg-amber-200 text-amber-800"
                              : "bg-blue-200 text-blue-800"
                        }`}
                      >
                        {flag.severity}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{flag.description}</p>
                        {flag.file && (
                          <p className="text-xs text-gray-500 mt-1">
                            File: {flag.file}
                            {flag.line && ` (line ${flag.line})`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Notes */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Full AI Analysis Notes
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                {review.detailedNotes}
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Review Metadata
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <MetadataItem label="Model" value={review.modelUsed} />
                <MetadataItem
                  label="Confidence"
                  value={`${Math.round(review.confidence * 100)}%`}
                />
                <MetadataItem
                  label="Tokens Used"
                  value={review.tokensUsed.toLocaleString()}
                />
                <MetadataItem
                  label="Processing Time"
                  value={`${(review.processingTimeMs / 1000).toFixed(2)}s`}
                />
                <MetadataItem
                  label="Estimated Cost"
                  value={`$${review.estimatedCost.toFixed(4)}`}
                />
                <MetadataItem
                  label="Reviewed At"
                  value={new Date(review.reviewedAt).toLocaleString()}
                />
                <MetadataItem
                  label="GitHub Type"
                  value={review.github.type === "pr" ? "Pull Request" : "Repository"}
                />
                <MetadataItem
                  label="Repository"
                  value={`${review.github.owner}/${review.github.repo}`}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-between items-center">
            <a
              href={review.github.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View on GitHub
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  score,
  description,
}: {
  label: string;
  score: number;
  description: string;
}) {
  const colorClass =
    score >= 80
      ? "text-green-600 bg-green-50"
      : score >= 60
        ? "text-blue-600 bg-blue-50"
        : score >= 40
          ? "text-amber-600 bg-amber-50"
          : "text-red-600 bg-red-50";

  return (
    <div className={`rounded-lg p-3 ${colorClass}`}>
      <div className="text-2xl font-bold">{score}</div>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs opacity-75">{description}</div>
    </div>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium text-gray-900">{value}</div>
    </div>
  );
}
