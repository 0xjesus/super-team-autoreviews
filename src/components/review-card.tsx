"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/score-badge";
import {
  GitBranch,
  GitPullRequest,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Review, Submission } from "@/lib/db/schema";

interface ReviewCardProps {
  review: Review & { submission: Submission };
  onClick?: () => void;
}

export function ReviewCard({ review, onClick }: ReviewCardProps) {
  const { submission } = review;

  const getLabelVariant = (label: string) => {
    switch (label) {
      case "excellent":
      case "high-quality":
        return "success";
      case "security-concern":
      case "potential-plagiarism":
        return "destructive";
      case "needs-review":
      case "needs-revision":
        return "warning";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "analyzing":
      case "fetching":
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {submission.githubType === "pr" ? (
              <GitPullRequest className="w-5 h-5 text-purple-500" />
            ) : (
              <GitBranch className="w-5 h-5 text-blue-500" />
            )}
            <CardTitle className="text-base">
              {submission.owner}/{submission.repo}
              {submission.prNumber && ` #${submission.prNumber}`}
            </CardTitle>
          </div>
          {review.overallScore !== null && (
            <ScoreBadge score={review.overallScore} size="sm" showLabel={false} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Summary */}
          {review.summary && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {review.summary}
            </p>
          )}

          {/* Labels */}
          {review.labels && review.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {review.labels.map((label) => (
                <Badge key={label} variant={getLabelVariant(label)}>
                  {label.replace("-", " ")}
                </Badge>
              ))}
            </div>
          )}

          {/* Red Flags */}
          {review.redFlags && (review.redFlags as any[]).length > 0 && (
            <div className="flex items-center gap-1 text-sm text-orange-600">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {(review.redFlags as any[]).length} red flag
                {(review.redFlags as any[]).length > 1 ? "s" : ""} detected
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              {getStatusIcon(submission.status)}
              <span className="capitalize">{submission.status}</span>
            </div>
            <div className="flex items-center gap-2">
              {review.createdAt && (
                <span>
                  {formatDistanceToNow(new Date(review.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
              <a
                href={submission.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="hover:text-foreground"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
