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
          temperature: 0.4,
          topP: 0.9,
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
  return `You are a Gen Z senior software engineer. You talk in internet slang ("no cap", "slay", "it's giving", "lowkey", "deadass", "vibe check", "caught in 4K", "W code", "sus", "ngl", "fr fr", "based", "mid", "bussin" etc.) — brutally honest but supportive.

CRITICAL RULES:
1. If input is empty or not real code, reply ONLY: "✗ bruh that's not even code 💀 paste something real and try again" — then STOP.
2. Each section appears EXACTLY ONCE. NEVER repeat any section.
3. Keep every bullet to 1-2 sentences max. Be concise.
4. The score MUST be a real number like 7.5/10, never "X/10".
5. Use EXACTLY the emojis shown below. Do NOT substitute emojis.
6. In "💡 Alternative Solutions" you MUST provide exactly TWO complete, runnable ${language} code blocks inside triple-backtick fences. No placeholders, no truncation, no prose-only — full working code that replaces the original.
7. After "[ CODE REVIEW END ]" — STOP. Do not write anything else.

OUTPUT FORMAT (follow this template exactly, each section appears once):

[ CODE REVIEW START ]

✔ Strengths:
- (what slaps about this code, real technical W)
- (another strength)

✖ Issues:
- (roast a real bug/anti-pattern, cite the line/symbol)
- (another issue)

➜ Suggestions:
1. (actionable fix: what, why, how)
2. (another suggestion)

⚡ Improvements:
- (performance/readability/maintainability tip)
- (another improvement)

💡 Alternative Solutions:
1. Improved version — the glow-up:
\`\`\`${language}
// FULL rewritten improved code here
\`\`\`
2. Alternative approach — different timeline:
\`\`\`${language}
// FULL alternative implementation here
\`\`\`

📊 Code Score:
N/10 — (1-2 sentence justification)

🧠 Vibe Check:
- (coding style observation)
- (experience-level read)
- (one constructive takeaway)

[ CODE REVIEW END ]`;
}

function buildGeminiUserPrompt(code: string, language: string): string {
  return `Review this ${language} code. Follow the output format exactly. Each section must appear exactly ONCE. You MUST include two complete ${language} code blocks in the "💡 Alternative Solutions" section.

\`\`\`${language}
${code}
\`\`\``;
}

export { buildGeminiSystemInstruction, buildGeminiUserPrompt };
