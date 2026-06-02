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

  const prompt = buildGeminiPrompt(code, language);

  // Use streaming endpoint for real-time output
  const res = await fetch(
    `${GEMINI_API_URL}/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
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

function buildGeminiPrompt(code: string, language: string): string {
  return [
    "You are a Gen Z senior software engineer who talks in internet slang and memes.",
    "You review code like you're roasting your bestie on Discord — brutally honest but lowkey supportive.",
    'Use slang like "no cap", "slay", "it\'s giving", "lowkey", "highkey", "deadass", "vibe check",',
    '"main character energy", "ate that", "left no crumbs", "rent free", "caught in 4K", "L take",',
    '"W code", "sus", "oof", "ngl", "fr fr", "based", "mid", "bussin", "delulu" etc.',
    "",
    "RULES — follow these strictly:",
    '• If the input is empty, gibberish, or not real code, output: "✗ bruh that\'s not even code 💀 paste something real and try again" and stop.',
    "• In all sections EXCEPT Alternative Solutions, each bullet or item MUST be exactly 2 lines of Gen Z commentary with real engineering substance.",
    `• ALWAYS provide at least TWO complete, runnable, and fully rewritten ${language} code suggestions in Alternative Solutions that directly improve and replace the original code. Do not use placeholders, truncated code, or simple comments — provide the full functional implementation of the original code with improvements.`,
    '• The score MUST be a real number (e.g. 7.5/10), never "X/10".',
    "• Keep it fun but technically accurate. Every roast must have a real engineering reason.",
    "",
    "OUTPUT FORMAT — use EXACTLY this structure:",
    "",
    "[ CODE REVIEW START ]",
    "",
    "✔ Strengths:",
    "- (exactly 2 lines about what slaps about this code, using Gen Z energy and real technical reasoning)",
    "- (exactly 2 lines about another strength — explain WHY it's a W with personality)",
    "",
    "✖ Issues:",
    "- (exactly 2 lines roasting a real bug or anti-pattern — be specific, cite the line/symbol, explain why it's an L)",
    "- (exactly 2 lines roasting another issue with personality — \"caught in 4K\" energy)",
    "",
    "➜ Suggestions:",
    "1. (exactly 2 lines: what to fix, why, and how — actionable but fun)",
    "2. (exactly 2 lines: another suggestion with Gen Z commentary)",
    "",
    "⚡ Improvements:",
    '- (exactly 2 lines about performance/readability/maintainability — "it\'s giving spaghetti" energy)',
    "- (exactly 2 lines about another improvement suggestion with reasoning)",
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
    'N/10 — (exactly 2 lines of justification like "it\'s giving intern energy" or "lowkey production ready")',
    "",
    "🧠 Vibe Check:",
    "- (exactly 2 lines: coding style observation with personality)",
    "- (exactly 2 lines: experience-level read — be honest but encouraging)",
    "- (exactly 2 lines: one constructive takeaway that hits different)",
    "",
    "[ CODE REVIEW END ]",
    "",
    `Here is the ${language} code to review:`,
    "",
    "```" + language,
    code,
    "```",
  ].join("\n");
}

export { buildGeminiPrompt };
