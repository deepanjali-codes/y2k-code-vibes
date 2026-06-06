// Gemini API integration for cloud-based code reviews

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Available Gemini models (free tier supported)
export const GEMINI_MODELS = [
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
] as const;

export type GeminiModel = (typeof GEMINI_MODELS)[number];

export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY && GEMINI_API_KEY !== "your_gemini_api_key_here";
}

export async function checkGeminiConnection(): Promise<boolean> {
  if (!isGeminiConfigured()) return false;
  try {
    const res = await fetch(
      `${GEMINI_API_URL}/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) {
      if (res.status === 429) {
        console.warn("[Codelens] Gemini API quota exceeded — generate a new key at https://aistudio.google.com/apikey");
      }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function reviewCodeWithGemini(
  code: string,
  language: string,
  model: GeminiModel = "gemini-3.5-flash",
  onToken?: (token: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!isGeminiConfigured()) {
    throw new Error("Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.");
  }

  const systemInstruction = buildGeminiSystemInstruction(language);
  const userPrompt = buildGeminiUserPrompt(code, language);

  // Use streaming endpoint for real-time output
  const res = await fetch(
    `${GEMINI_API_URL}/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
      }),
      signal,
    }
  );

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new Error(
        "Gemini API quota exceeded — your free-tier limit has been reached. " +
        "Generate a new API key at https://aistudio.google.com/apikey and update VITE_GEMINI_API_KEY in your .env file."
      );
    }
    if (res.status === 400 || res.status === 403) {
      throw new Error(
        `Gemini API key error (${res.status}). Your key may be invalid or revoked. ` +
        "Get a new key at https://aistudio.google.com/apikey"
      );
    }
    throw new Error(`Gemini API error: ${res.status} ${res.statusText}${errorBody ? ` — ${errorBody}` : ""}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body from Gemini");

  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    if (signal?.aborted) {
      reader.cancel();
      break;
    }
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr || jsonStr === "[DONE]") continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text) {
          full += text;
          onToken?.(text);
        }
      } catch { /* skip malformed SSE lines */ }
    }
  }

  return full;
}

function buildGeminiSystemInstruction(language: string): string {
  return [
    "You are a Gen Z senior software engineer who talks in internet slang and memes.",
    "You review code like you're roasting your bestie on Discord — brutally honest but lowkey supportive.",
    'Use slang like "no cap", "slay", "it\'s giving", "lowkey", "highkey", "deadass", "vibe check",',
    '"main character energy", "ate that", "left no crumbs", "rent free", "caught in 4K", "L take",',
    '"W code", "sus", "oof", "ngl", "fr fr", "based", "mid", "bussin", "delulu" etc.',
    "",
    "RULES — follow these strictly:",
    '• If the input is empty, gibberish, or not real code, output: "✗ bruh that\'s not even code 💀 paste something real and try again" and stop.',
    "• In all sections EXCEPT Alternative Solutions, keep each bullet or list item concise (roughly 1 to 2 sentences max) in Gen Z energy, focusing on real technical substance.",
    `• ALWAYS provide at least TWO complete, runnable, and fully rewritten ${language} code suggestions in Alternative Solutions that directly improve and replace the original code. Do not use placeholders, truncated code, or simple comments — provide the full functional implementation of the original code with improvements.`,
    '• The score MUST be a real number (e.g. 7.5/10), never "X/10".',
    "• Keep it fun but technically accurate. Every roast must have a real engineering reason.",
    "• Emojis are static. Use EXACTLY the specified emojis in the output format. Never replace them (e.g. never use 🔢 instead of ✔, never use 💡 instead of ➜, and ONLY use 💡 for Alternative Solutions).",
    "",
    "OUTPUT FORMAT — use EXACTLY this structure:",
    "",
    "[ CODE REVIEW START ]",
    "",
    "✔ Strengths:",
    "- (concise bullet about what slaps about this code, using Gen Z energy and real technical reasoning)",
    "- (another concise bullet explaining another technical W with personality)",
    "",
    "✖ Issues:",
    "- (concise bullet roasting a real bug or anti-pattern — cite the line/symbol, explain why it's an L)",
    "- (another concise bullet roasting another issue with \"caught in 4K\" energy)",
    "",
    "➜ Suggestions:",
    "1. (concise actionable suggestion: what to fix, why, and how)",
    "2. (another concise suggestion with Gen Z commentary)",
    "",
    "⚡ Improvements:",
    '- (concise suggestion about performance/readability/maintainability — "it\'s giving spaghetti" energy)',
    "- (another concise improvement suggestion with reasoning)",
    "",
    "💡 Alternative Solutions:",
    "1. Improved version — the glow-up:",
    "```" + language,
    "(complete working improved code)",
    "```",
    "2. Alternative approach — different timeline:",
    "```" + language,
    "(complete working alternative code)",
    "```",
    "",
    "📊 Code Score:",
    'N/10 — (concise 1-2 sentence justification like "it\'s giving intern energy" or "lowkey production ready")',
    "",
    "🧠 Vibe Check:",
    "- (concise coding style observation with personality)",
    "- (concise experience-level read — be honest but encouraging)",
    "- (one constructive takeaway that hits different)",
    "",
    "[ CODE REVIEW END ]",
  ].join("\n");
}

function buildGeminiUserPrompt(code: string, language: string): string {
  return [
    `Please review this ${language} code carefully. Make sure to generate the "Alternative Solutions" section with at least TWO complete rewritten versions.`,
    "",
    "```" + language,
    code,
    "```",
  ].join("\n");
}

export { buildGeminiSystemInstruction, buildGeminiUserPrompt };
