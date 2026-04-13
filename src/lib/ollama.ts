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
      js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
      ts: "typescript", tsx: "typescript", mts: "typescript",
      py: "python", pyw: "python", pyi: "python",
      java: "java", kt: "java",
      c: "c", h: "c",
      cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp", hxx: "cpp",
      go: "go", rs: "rust", php: "php", sql: "sql",
      sh: "bash", bash: "bash", zsh: "bash",
      html: "html", htm: "html", svg: "html",
      css: "css", scss: "css", sass: "css", less: "css",
      json: "json", jsonc: "json",
      yml: "yaml", yaml: "yaml",
    };
    if (ext && extMap[ext]) return extMap[ext];
  }

  const trimmed = code.trim();
  if (!trimmed) return "javascript";

  // Definitive single-token matches (order matters — most specific first)
  if (trimmed.startsWith("<?php") || trimmed.includes("<?php")) return "php";
  if (trimmed.startsWith("#!/bin/bash") || trimmed.startsWith("#!/bin/sh") || trimmed.startsWith("#!/usr/bin/env bash")) return "bash";
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || (trimmed.startsWith("<") && trimmed.includes("</") && /<[a-zA-Z][^>]*>/.test(trimmed))) return "html";
  if (/^\s*\{[\s\S]*\}\s*$/.test(trimmed) && !trimmed.includes("=")) {
    try { JSON.parse(trimmed); return "json"; } catch {}
  }
  if (/^---\s*\n/.test(trimmed) || /^[a-zA-Z_]+\s*:\s*.+/m.test(trimmed) && !trimmed.includes("{") && !trimmed.includes("(")) return "yaml";

  // SQL — strong keywords
  if (/\b(SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\b/i.test(trimmed)) return "sql";

  // CSS — selectors and properties
  if (/[.#@][a-zA-Z][\w-]*\s*\{/.test(trimmed) || /\b(margin|padding|display|font-size|background|color)\s*:/.test(trimmed)) return "css";

  // Rust — strong indicators
  if (/\bfn\s+\w+\s*(<[^>]+>)?\s*\(/.test(trimmed) && (trimmed.includes("->") || trimmed.includes("let mut ") || trimmed.includes("impl ") || trimmed.includes("use std::"))) return "rust";
  if (trimmed.includes("println!") || trimmed.includes("vec!") || /\blet\s+mut\b/.test(trimmed)) return "rust";

  // Go — package + func
  if (/\bpackage\s+\w+/.test(trimmed) && /\bfunc\s+/.test(trimmed)) return "go";
  if (trimmed.includes("fmt.Println") || trimmed.includes("func main()")) return "go";

  // Java — class with public/private
  if (/\b(public|private|protected)\s+(static\s+)?(void|int|String|class)\b/.test(trimmed)) return "java";
  if (trimmed.includes("System.out.println")) return "java";

  // Python — def/class with colon, import without from braces, or shebang
  if (/\bdef\s+\w+\s*\(.*\)\s*(->\s*\w+\s*)?:/.test(trimmed)) return "python";
  if (/\bclass\s+\w+.*:\s*$/.test(trimmed.split("\n")[0] || "")) return "python";
  if (/^\s*(import\s+\w+|from\s+\w+\s+import)\b/m.test(trimmed) && !trimmed.includes("require(") && !trimmed.includes("{")) return "python";
  if (trimmed.includes("print(") && !trimmed.includes("console.") && !trimmed.includes("println")) return "python";

  // C/C++ — preprocessor directives
  if (/^#include\s*[<"]/.test(trimmed)) {
    if (trimmed.includes("iostream") || trimmed.includes("std::") || trimmed.includes("cout") || trimmed.includes("class ")) return "cpp";
    return "c";
  }
  if (trimmed.includes("std::") || trimmed.includes("cout") || trimmed.includes("nullptr")) return "cpp";
  if (trimmed.includes("printf(") || trimmed.includes("malloc(") || trimmed.includes("int main(")) return "c";

  // Bash — commands and syntax
  if (/\b(echo|export|source|chmod|grep|awk|sed|curl|wget)\b/.test(trimmed) && !trimmed.includes("import")) return "bash";
  if (/\bif\s+\[/.test(trimmed) || /\bfor\s+\w+\s+in\b/.test(trimmed)) return "bash";

  // TypeScript vs JavaScript
  const hasTS = /\b(interface\s+\w+|type\s+\w+\s*=|:\s*(string|number|boolean|void|any|unknown|never)\b|<[A-Z]\w*>|as\s+\w+)/.test(trimmed);
  if (hasTS) return "typescript";

  // JavaScript fallback — common patterns
  if (/\b(const|let|var|function|=>|require\(|module\.exports|console\.)\b/.test(trimmed)) return "javascript";

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
