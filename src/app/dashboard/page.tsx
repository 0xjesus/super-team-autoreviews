"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewCard } from "@/components/review-card";
import { ReviewDetail } from "@/components/review-detail";
import { SubmitForm } from "@/components/submit-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, Filter } from "lucide-react";
import type { Review, Submission } from "@/lib/db/schema";

type ReviewWithSubmission = Review & { submission: Submission };

export default function DashboardPage() {
  const [reviews, setReviews] = useState<ReviewWithSubmission[]>([]);
  const [selectedReview, setSelectedReview] = useState<ReviewWithSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [minScore, setMinScore] = useState("");

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (minScore) params.set("minScore", minScore);

      const response = await fetch(`/api/reviews?${params.toString()}`);
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const filteredReviews = reviews.filter((review) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      review.submission.owner?.toLowerCase().includes(query) ||
      review.submission.repo?.toLowerCase().includes(query) ||
      review.submission.githubUrl.toLowerCase().includes(query)
    );
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">GitHub Auto-Review Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered code reviews for Superteam Earn submissions
          </p>
        </div>
        <Button onClick={fetchReviews} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="reviews" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="submit">Submit New</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-6">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by repo or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Min score"
                type="number"
                min="0"
                max="100"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="w-24"
              />
              <Button variant="secondary" size="sm" onClick={fetchReviews}>
                Apply
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reviews list */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Recent Reviews ({filteredReviews.length})
              </h2>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredReviews.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {filteredReviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onClick={() => setSelectedReview(review)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No reviews found</p>
                  <p className="text-sm mt-1">Submit a GitHub URL to get started</p>
                </div>
              )}
            </div>

            {/* Review detail */}
            <div>
              {selectedReview ? (
                <ReviewDetail review={selectedReview} />
              ) : (
                <div className="flex items-center justify-center h-[400px] border-2 border-dashed rounded-lg text-muted-foreground">
                  <p>Select a review to see details</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="submit">
          <div className="max-w-2xl">
            <SubmitForm
              onSubmit={() => {
                // Refresh after submission
                setTimeout(fetchReviews, 2000);
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
