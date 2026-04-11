const OLLAMA_URL = "http://localhost:11434";

export interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

export async function checkOllamaConnection(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getAvailableModels(): Promise<string[]> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    const data = await res.json();
    return (data.models || []).map((m: { name: string }) => m.name);
  } catch {
    return [];
  }
}

const SUPPORTED_LANGUAGES = [
  "javascript", "typescript", "python", "java", "c", "cpp", "go",
  "rust", "php", "sql", "bash", "html", "css", "json", "yaml",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function detectLanguage(code: string, filename?: string): SupportedLanguage {
  if (filename) {
    const ext = filename.split(".").pop()?.toLowerCase();
    const extMap: Record<string, SupportedLanguage> = {
      js: "javascript", jsx: "javascript", mjs: "javascript",
      ts: "typescript", tsx: "typescript",
      py: "python", java: "java", c: "c", h: "c",
      cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp",
      go: "go", rs: "rust", php: "php", sql: "sql",
      sh: "bash", bash: "bash", html: "html", htm: "html",
      css: "css", json: "json", yml: "yaml", yaml: "yaml",
    };
    if (ext && extMap[ext]) return extMap[ext];
  }
  // Simple heuristics
  if (code.includes("def ") && code.includes(":")) return "python";
  if (code.includes("fn ") && code.includes("->")) return "rust";
  if (code.includes("func ") && code.includes("package ")) return "go";
  if (code.includes("<?php")) return "php";
  if (code.includes("public static void main")) return "java";
  if (code.includes("#include")) return "c";
  if (code.includes("SELECT ") || code.includes("INSERT ")) return "sql";
  if (code.includes("<!DOCTYPE") || code.includes("<html")) return "html";
  if (code.includes("import ") && code.includes("from ")) return "typescript";
  if (code.includes("const ") || code.includes("let ") || code.includes("function ")) return "javascript";
  return "javascript";
}

function buildPrompt(code: string, language: string): string {
  return `You are a senior code reviewer. Review the following ${language} code and provide a STRUCTURED review in EXACTLY this format:

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

export async function reviewCode(
  code: string,
  language: string,
  model: string = "deepseek-coder",
  onToken?: (token: string) => void,
): Promise<string> {
  const prompt = buildPrompt(code, language);

  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const parsed: OllamaResponse = JSON.parse(line);
        full += parsed.response;
        onToken?.(parsed.response);
      } catch { /* skip malformed */ }
    }
  }

  return full;
}

export function chunkCode(code: string, size: number = 3000): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < code.length; i += size) {
    chunks.push(code.slice(i, i + size));
  }
  return chunks;
}
