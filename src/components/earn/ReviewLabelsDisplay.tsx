"use client";

import React from "react";
import type { LabelsDisplayProps, EarnLabel } from "./types";

/**
 * ReviewLabelsDisplay - Shows AI-suggested labels and the final Earn label
 */

const labelColors: Record<string, string> = {
  // Earn labels
  Shortlisted: "bg-green-500 text-white",
  High_Quality: "bg-blue-500 text-white",
  Mid_Quality: "bg-amber-500 text-white",
  Low_Quality: "bg-orange-500 text-white",
  Needs_Review: "bg-purple-500 text-white",
  Spam: "bg-red-500 text-white",
  // AI labels
  excellent: "bg-green-100 text-green-800",
  "high-quality": "bg-blue-100 text-blue-800",
  "needs-review": "bg-amber-100 text-amber-800",
  "needs-revision": "bg-orange-100 text-orange-800",
  "security-concern": "bg-red-100 text-red-800",
  "potential-plagiarism": "bg-red-100 text-red-800",
  incomplete: "bg-gray-100 text-gray-800",
};

export function ReviewLabelsDisplay({
  labels,
  earnLabel,
  onLabelClick,
  className = "",
}: LabelsDisplayProps) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {/* Primary Earn Label */}
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${labelColors[earnLabel] || "bg-gray-500 text-white"}`}
      >
        {earnLabel.replace("_", " ")}
      </span>

      {/* AI-suggested labels */}
      {labels
        .filter((label) => label !== earnLabel.toLowerCase().replace("_", "-"))
        .map((label) => (
          <span
            key={label}
            onClick={() => onLabelClick?.(label)}
            className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${labelColors[label] || "bg-gray-100 text-gray-700"}`}
          >
            {label.replace(/-/g, " ")}
          </span>
        ))}
    </div>
  );
}

// Compact version for table rows
export function EarnLabelBadge({ label }: { label: EarnLabel }) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${labelColors[label] || "bg-gray-500 text-white"}`}
    >
      {label.replace("_", " ")}
    </span>
  );
}
