// Gemini API integration for cloud-based code reviews

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Available Gemini models (free tier supported)
export const GEMINI_MODELS = [
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
      `${GEMINI_API_URL}/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
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
    return res.ok;
  } catch {
    return false;
  }
}

export async function reviewCodeWithGemini(
  code: string,
  language: string,
  model: GeminiModel = "gemini-2.0-flash",
  onToken?: (token: string) => void,
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
    }
  );

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`Gemini API error: ${res.status} ${res.statusText}${errorBody ? ` — ${errorBody}` : ""}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body from Gemini");

  const decoder = new TextDecoder();
  let full = "";

  while (true) {
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
  return `You are a senior code reviewer with a Y2K retro hacker personality. Review the following ${language} code and provide a STRUCTURED review in EXACTLY this format:

[ CODE REVIEW START ]

✔ Strengths:
- (2-3 specific strengths)

✖ Issues:
- (list real bugs, risks, anti-patterns)

➜ Suggestions:
1. (actionable suggestion)
2. (actionable suggestion)
3. (actionable suggestion)

⚡ Improvements:
- (performance, readability, maintainability improvements)

💡 Alternative Solutions:
1. (working improved code snippet)
2. (another correct approach snippet)

📊 Code Score:
X/10 — (brief reason)

🧠 Vibe Check:
- (personality analysis line 1)
- (personality analysis line 2)
- (personality analysis line 3)

[ CODE REVIEW END ]

Here is the code to review:

\`\`\`${language}
${code}
\`\`\``;
}
