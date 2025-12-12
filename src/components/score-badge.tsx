"use client";

import { cn } from "@/lib/utils/cn";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ScoreBadge({ score, size = "md", showLabel = true }: ScoreBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-green-500 text-white";
    if (score >= 70) return "bg-emerald-500 text-white";
    if (score >= 50) return "bg-yellow-500 text-white";
    if (score >= 30) return "bg-orange-500 text-white";
    return "bg-red-500 text-white";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Fair";
    if (score >= 30) return "Needs Work";
    return "Poor";
  };

  const sizeClasses = {
    sm: "w-10 h-10 text-sm",
    md: "w-14 h-14 text-lg",
    lg: "w-20 h-20 text-2xl",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-bold",
          getScoreColor(score),
          sizeClasses[size]
        )}
      >
        {score}
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground">{getScoreLabel(score)}</span>
      )}
    </div>
  );
}
