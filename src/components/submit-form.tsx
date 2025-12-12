"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Send, CheckCircle, Sparkles } from "lucide-react";

interface Model {
  id: string;
  name: string;
  description: string;
  recommended: boolean;
  provider?: string;
}

interface SubmitFormProps {
  onSubmit?: (result: { submissionId: string }) => void;
}

export function SubmitForm({ onSubmit }: SubmitFormProps) {
  const [githubUrl, setGithubUrl] = useState("");
  const [listingId, setListingId] = useState("");
  const [bountyTitle, setBountyTitle] = useState("");
  const [bountyDescription, setBountyDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [techStack, setTechStack] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-5.2-2025-12-11");
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [result, setResult] = useState<{ submissionId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch available models on mount
  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch("/api/models");
        const data = await response.json();
        setModels(data.models || []);
        if (data.defaultModel) {
          setSelectedModel(data.defaultModel);
        }
      } catch (err) {
        console.error("Failed to fetch models:", err);
        // Fallback models
        setModels([
          { id: "gpt-5.2-2025-12-11", name: "GPT-5.2", description: "Latest & most capable model", recommended: true, provider: "openai" },
          { id: "gpt-4o", name: "GPT-4o", description: "Best for complex code analysis", recommended: false, provider: "openai" },
        ]);
      } finally {
        setIsLoadingModels(false);
      }
    }
    fetchModels();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalId: `manual-${Date.now()}`,
          listingId: listingId || `listing-${Date.now()}`,
          githubUrl,
          bountyTitle: bountyTitle || "Manual Review",
          bountyDescription: bountyDescription || "",
          requirements: requirements
            ? requirements.split("\n").filter((r) => r.trim())
            : [],
          techStack: techStack
            ? techStack.split(",").map((t) => t.trim()).filter(Boolean)
            : [],
          model: selectedModel,
          triggerReview: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit");
      }

      setResult({ submissionId: data.submission.id });
      onSubmit?.({ submissionId: data.submission.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit GitHub URL for Review</CardTitle>
        <CardDescription>
          Enter a public GitHub repository or pull request URL to start an AI-powered review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium" htmlFor="githubUrl">
              GitHub URL *
            </label>
            <Input
              id="githubUrl"
              type="url"
              placeholder="https://github.com/owner/repo or https://github.com/owner/repo/pull/123"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          {/* Model Selector */}
          <div>
            <label className="text-sm font-medium flex items-center gap-2" htmlFor="model">
              <Sparkles className="w-4 h-4" />
              AI Model
            </label>
            <select
              id="model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isLoadingModels}
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {isLoadingModels ? (
                <option>Loading models...</option>
              ) : (
                models.map((model) => (
                  <option key={model.id} value={model.id}>
                    [{model.provider === "google" ? "Gemini" : "OpenAI"}] {model.name} {model.recommended ? "(Recommended)" : ""} - {model.description}
                  </option>
                ))
              )}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Select the AI model to use for code analysis
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium" htmlFor="listingId">
                Listing ID
              </label>
              <Input
                id="listingId"
                placeholder="Optional listing identifier"
                value={listingId}
                onChange={(e) => setListingId(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="bountyTitle">
                Bounty Title
              </label>
              <Input
                id="bountyTitle"
                placeholder="e.g., Build a Token Swap"
                value={bountyTitle}
                onChange={(e) => setBountyTitle(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="bountyDescription">
              Bounty Description
            </label>
            <textarea
              id="bountyDescription"
              placeholder="Describe the bounty requirements..."
              value={bountyDescription}
              onChange={(e) => setBountyDescription(e.target.value)}
              className="mt-1 w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="requirements">
              Requirements (one per line)
            </label>
            <textarea
              id="requirements"
              placeholder="Implement user authentication&#10;Add unit tests&#10;Deploy to mainnet"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="techStack">
              Tech Stack (comma-separated)
            </label>
            <Input
              id="techStack"
              placeholder="TypeScript, Solana, Anchor, React"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              className="mt-1"
            />
          </div>

          {error && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-950 text-red-600 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="p-3 rounded-md bg-green-50 dark:bg-green-950 text-green-600 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Review triggered! Submission ID: {result.submissionId}
            </div>
          )}

          <Button type="submit" disabled={isLoading || !githubUrl} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit for Review
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
