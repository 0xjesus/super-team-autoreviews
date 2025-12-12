"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreBadge } from "@/components/score-badge";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Code,
  ListChecks,
  FileCode,
} from "lucide-react";
import type { Review, Submission, RedFlag } from "@/lib/db/schema";

interface ReviewDetailProps {
  review: Review & { submission: Submission };
}

export function ReviewDetail({ review }: ReviewDetailProps) {
  const { submission } = review;
  const redFlags = (review.redFlags || []) as RedFlag[];
  const matchedRequirements = (review.matchedRequirements || []) as string[];
  const missingRequirements = (review.missingRequirements || []) as string[];

  return (
    <div className="space-y-6">
      {/* Header with scores */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                {submission.owner}/{submission.repo}
                {submission.prNumber && ` #${submission.prNumber}`}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {submission.githubType === "pr" ? "Pull Request" : "Repository"} Review
              </p>
            </div>
            {review.overallScore !== null && (
              <ScoreBadge score={review.overallScore} size="lg" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Score breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ScoreItem
              label="Requirements"
              score={review.requirementMatchScore}
              icon={<ListChecks className="w-4 h-4" />}
            />
            <ScoreItem
              label="Code Quality"
              score={review.codeQualityScore}
              icon={<Code className="w-4 h-4" />}
            />
            <ScoreItem
              label="Completeness"
              score={review.completenessScore}
              icon={<FileCode className="w-4 h-4" />}
            />
            <ScoreItem
              label="Security"
              score={review.securityScore}
              icon={<Shield className="w-4 h-4" />}
            />
          </div>

          {/* Labels */}
          {review.labels && review.labels.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              {review.labels.map((label) => (
                <Badge key={label} variant={getLabelVariant(label)}>
                  {label.replace("-", " ")}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {review.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{review.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Detailed tabs */}
      <Tabs defaultValue="requirements" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="redflags">
            Red Flags {redFlags.length > 0 && `(${redFlags.length})`}
          </TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="meta">Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="requirements" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Matched Requirements */}
                {matchedRequirements.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-600 flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4" />
                      Matched Requirements
                    </h4>
                    <ul className="space-y-1">
                      {matchedRequirements.map((req, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-green-500">✓</span>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing Requirements */}
                {missingRequirements.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-600 flex items-center gap-2 mb-2">
                      <XCircle className="w-4 h-4" />
                      Missing Requirements
                    </h4>
                    <ul className="space-y-1">
                      {missingRequirements.map((req, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-red-500">✗</span>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {matchedRequirements.length === 0 && missingRequirements.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No specific requirements were tracked for this review.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redflags" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {redFlags.length > 0 ? (
                <div className="space-y-3">
                  {redFlags.map((flag, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${
                        flag.severity === "critical"
                          ? "border-red-200 bg-red-50 dark:bg-red-950"
                          : flag.severity === "warning"
                            ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950"
                            : "border-blue-200 bg-blue-50 dark:bg-blue-950"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle
                          className={`w-4 h-4 mt-0.5 ${
                            flag.severity === "critical"
                              ? "text-red-500"
                              : flag.severity === "warning"
                                ? "text-yellow-500"
                                : "text-blue-500"
                          }`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                flag.severity === "critical"
                                  ? "destructive"
                                  : flag.severity === "warning"
                                    ? "warning"
                                    : "secondary"
                              }
                            >
                              {flag.severity}
                            </Badge>
                            <span className="text-sm font-medium">
                              {flag.type.replace(/-/g, " ")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {flag.description}
                          </p>
                          {flag.file && (
                            <p className="text-xs text-muted-foreground mt-1 font-mono">
                              {flag.file}
                              {flag.line && `:${flag.line}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <p>No red flags detected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {review.detailedNotes ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto">
                    {review.detailedNotes}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No detailed notes available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meta" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Model Used</dt>
                  <dd className="font-mono">{review.modelUsed || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tokens Used</dt>
                  <dd className="font-mono">{review.tokensUsed?.toLocaleString() || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Confidence</dt>
                  <dd className="font-mono">
                    {review.confidence ? `${(Number(review.confidence) * 100).toFixed(0)}%` : "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Processing Time</dt>
                  <dd className="font-mono">
                    {review.processingTimeMs ? `${review.processingTimeMs}ms` : "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">GitHub URL</dt>
                  <dd>
                    <a
                      href={submission.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline break-all"
                    >
                      {submission.githubUrl}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Reviewed At</dt>
                  <dd>
                    {submission.reviewedAt
                      ? new Date(submission.reviewedAt).toLocaleString()
                      : "N/A"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScoreItem({
  label,
  score,
  icon,
}: {
  label: string;
  score: number | null;
  icon: React.ReactNode;
}) {
  const getColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="flex flex-col items-center p-3 rounded-lg bg-muted">
      <div className="flex items-center gap-1 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className={`text-2xl font-bold ${score !== null ? getColor(score) : "text-gray-400"}`}>
        {score !== null ? score : "-"}
      </span>
    </div>
  );
}

function getLabelVariant(label: string) {
  switch (label) {
    case "excellent":
    case "high-quality":
      return "success" as const;
    case "security-concern":
    case "potential-plagiarism":
      return "destructive" as const;
    case "needs-review":
    case "needs-revision":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
}
