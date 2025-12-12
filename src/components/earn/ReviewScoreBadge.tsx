"use client";

import React from "react";
import type { ScoreBadgeProps, EarnLabel } from "./types";

/**
 * ReviewScoreBadge - Displays overall score with color coding
 *
 * Compatible with Earn Dashboard styling conventions.
 */

function getScoreColor(score: number): string {
  if (score >= 85) return "bg-green-100 text-green-800 border-green-200";
  if (score >= 70) return "bg-blue-100 text-blue-800 border-blue-200";
  if (score >= 50) return "bg-amber-100 text-amber-800 border-amber-200";
  if (score >= 30) return "bg-orange-100 text-orange-800 border-orange-200";
  return "bg-red-100 text-red-800 border-red-200";
}

function getScoreLabel(score: number): EarnLabel {
  if (score >= 85) return "Shortlisted";
  if (score >= 70) return "High_Quality";
  if (score >= 50) return "Mid_Quality";
  if (score >= 30) return "Low_Quality";
  return "Spam";
}

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
};

export function ReviewScoreBadge({
  score,
  label,
  size = "md",
  showLabel = true,
  className = "",
}: ScoreBadgeProps) {
  const colorClass = getScoreColor(score);
  const sizeClass = sizeClasses[size];
  const displayLabel = label || getScoreLabel(score);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${colorClass} ${sizeClass} ${className}`}
    >
      <span className="font-bold">{score}</span>
      {showLabel && (
        <>
          <span className="opacity-50">|</span>
          <span>{displayLabel.replace("_", " ")}</span>
        </>
      )}
    </span>
  );
}

// Also export a minimal version for tight spaces
export function ReviewScoreCompact({ score }: { score: number }) {
  const colorClass = getScoreColor(score);
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${colorClass}`}
    >
      {score}
    </span>
  );
}
