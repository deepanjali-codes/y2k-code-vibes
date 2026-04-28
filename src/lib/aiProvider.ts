// Unified AI provider — switches between Gemini (cloud) and Ollama (local)

import { checkOllamaConnection, getAvailableModels, reviewCode as ollamaReview, DEFAULT_MODEL } from "./ollama";
import { checkGeminiConnection, isGeminiConfigured, reviewCodeWithGemini, GEMINI_MODELS, type GeminiModel } from "./gemini";

export type AIProvider = "gemini" | "ollama";

// Read configured provider from env, default to "gemini"
const configuredProvider = (import.meta.env.VITE_AI_PROVIDER || "gemini") as AIProvider;

export interface AIStatus {
  provider: AIProvider;
  connected: boolean;
  models: string[];
  activeModel: string;
}

/**
 * Detect which provider is available, preferring the configured one.
 * Falls back to the other if the preferred one isn't available.
 */
export async function detectProvider(): Promise<AIStatus> {
  // Try configured provider first
  if (configuredProvider === "gemini") {
    if (isGeminiConfigured()) {
      const ok = await checkGeminiConnection();
      if (ok) {
        return {
          provider: "gemini",
          connected: true,
          models: [...GEMINI_MODELS],
          activeModel: GEMINI_MODELS[0],
        };
      }
    }
    // Fallback to Ollama
    const ollamaOk = await checkOllamaConnection();
    if (ollamaOk) {
      const models = await getAvailableModels();
      const preferred = models.find((n) => n.includes(DEFAULT_MODEL)) || models[0] || DEFAULT_MODEL;
      return { provider: "ollama", connected: true, models, activeModel: preferred };
    }
  } else {
    // Configured as ollama — try that first
    const ollamaOk = await checkOllamaConnection();
    if (ollamaOk) {
      const models = await getAvailableModels();
      const preferred = models.find((n) => n.includes(DEFAULT_MODEL)) || models[0] || DEFAULT_MODEL;
      return { provider: "ollama", connected: true, models, activeModel: preferred };
    }
    // Fallback to Gemini
    if (isGeminiConfigured()) {
      const ok = await checkGeminiConnection();
      if (ok) {
        return {
          provider: "gemini",
          connected: true,
          models: [...GEMINI_MODELS],
          activeModel: GEMINI_MODELS[0],
        };
      }
    }
  }

  // Nothing available
  return {
    provider: configuredProvider,
    connected: false,
    models: [],
    activeModel: "",
  };
}

/**
 * Run a code review using whichever provider is active.
 */
export async function reviewCodeUnified(
  code: string,
  language: string,
  provider: AIProvider,
  model: string,
  onToken?: (token: string) => void,
): Promise<string> {
  if (provider === "gemini") {
    return reviewCodeWithGemini(code, language, model as GeminiModel, onToken);
  }
  return ollamaReview(code, language, model, onToken);
}
