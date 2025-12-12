import { NextResponse } from "next/server";

// Hardcoded default model - latest GPT model
const DEFAULT_MODEL = "gpt-5.2-2025-12-11";

// OpenAI recommended models for code review
const OPENAI_MODELS = [
  { id: "gpt-5.2-2025-12-11", name: "GPT-5.2", description: "Latest & most capable model", recommended: true, provider: "openai" },
  { id: "gpt-4o", name: "GPT-4o", description: "Best for complex code analysis", recommended: false, provider: "openai" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Fast and cost-effective", recommended: false, provider: "openai" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "High quality, larger context", recommended: false, provider: "openai" },
  { id: "o1", name: "o1", description: "Advanced reasoning model", recommended: false, provider: "openai" },
  { id: "o1-mini", name: "o1 Mini", description: "Fast reasoning model", recommended: false, provider: "openai" },
  { id: "o3-mini", name: "o3 Mini", description: "Latest mini reasoning model", recommended: false, provider: "openai" },
];

// Gemini models for code review
const GEMINI_MODELS = [
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro", description: "Most capable Gemini model", recommended: true, provider: "google" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Best for complex reasoning", recommended: false, provider: "google" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Fast with great performance", recommended: false, provider: "google" },
  { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", description: "Most cost-effective", recommended: false, provider: "google" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "Previous gen fast model", recommended: false, provider: "google" },
];

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface OpenAIModelsResponse {
  object: string;
  data: OpenAIModel[];
}

// GET /api/models - List available AI models
export async function GET() {
  try {
    const allModels: Array<{
      id: string;
      name: string;
      description: string;
      recommended: boolean;
      provider: string;
    }> = [];

    // Add OpenAI models if API key is available
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (response.ok) {
          const data: OpenAIModelsResponse = await response.json();

          // Filter to only GPT/o1/o3 models suitable for code review
          const liveModels = data.data
            .filter((model) =>
              model.id.startsWith("gpt-4") ||
              model.id.startsWith("gpt-5") ||
              model.id.startsWith("gpt-3.5") ||
              model.id.startsWith("o1") ||
              model.id.startsWith("o3")
            )
            .map((model) => {
              const known = OPENAI_MODELS.find((r) => r.id === model.id);
              return {
                id: model.id,
                name: known?.name || model.id,
                description: known?.description || `OpenAI model`,
                recommended: known?.recommended || false,
                provider: "openai",
              };
            });

          // Merge with hardcoded models (prioritize hardcoded for descriptions)
          const modelIds = new Set(liveModels.map(m => m.id));
          allModels.push(...liveModels);

          // Add any hardcoded models not in live list (like gpt-5.2)
          for (const model of OPENAI_MODELS) {
            if (!modelIds.has(model.id)) {
              allModels.push(model);
            }
          }
        } else {
          // API failed, use hardcoded OpenAI models
          allModels.push(...OPENAI_MODELS);
        }
      } catch {
        // Network error, use hardcoded OpenAI models
        allModels.push(...OPENAI_MODELS);
      }
    } else {
      // No API key, use hardcoded OpenAI models
      allModels.push(...OPENAI_MODELS);
    }

    // Add Gemini models if API key is available
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      allModels.push(...GEMINI_MODELS);
    }

    // Sort: recommended first, then by provider, then by name
    allModels.sort((a, b) => {
      if (a.recommended && !b.recommended) return -1;
      if (!a.recommended && b.recommended) return 1;
      if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      models: allModels,
      defaultModel: DEFAULT_MODEL,
      providers: {
        openai: !!process.env.OPENAI_API_KEY,
        google: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY),
      },
    });
  } catch (error) {
    console.error("Error fetching models:", error);

    // Return fallback models on error
    const fallbackModels = [...OPENAI_MODELS];
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      fallbackModels.push(...GEMINI_MODELS);
    }

    return NextResponse.json({
      models: fallbackModels,
      defaultModel: DEFAULT_MODEL,
      providers: {
        openai: !!process.env.OPENAI_API_KEY,
        google: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY),
      },
    });
  }
}
