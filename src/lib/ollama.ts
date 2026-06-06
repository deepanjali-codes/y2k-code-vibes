// Read Ollama URL from environment variable, fallback to default localhost
const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || "http://localhost:11434";

// Default model from env (used as initial preference when auto-selecting)
export const DEFAULT_MODEL = import.meta.env.VITE_OLLAMA_DEFAULT_MODEL || "deepseek-coder";

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
    try { JSON.parse(trimmed); return "json"; } catch { /* not JSON */ }
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


export async function reviewCode(
  code: string,
  language: string,
  model: string = DEFAULT_MODEL,
  onToken?: (token: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const systemInstruction = buildOllamaSystemInstruction(language);
  const userPrompt = buildOllamaUserPrompt(code, language);

  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: userPrompt,
      system: systemInstruction,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(
      `Ollama error: ${res.status} ${res.statusText}${errorBody ? ` — ${errorBody}` : ""}`
    );
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    if (signal?.aborted) { reader.cancel(); break; }
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const parsed: OllamaResponse = JSON.parse(line);
        full += parsed.response;
        onToken?.(parsed.response);
      } catch { /* skip malformed lines */ }
    }
  }

  return full;
}

function buildOllamaSystemInstruction(language: string): string {
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
    "- (concise bullet about what slaps, using Gen Z energy and real technical reasoning)",
    "- (another concise bullet explaining another strength — explain WHY it's a W with personality)",
    "",
    "✖ Issues:",
    "- (concise bullet roasting a real bug — cite the line/symbol, explain why it's an L)",
    "- (another concise bullet roasting another issue with \"caught in 4K\" energy)",
    "",
    "➜ Suggestions:",
    "1. (concise actionable suggestion: what to fix, why, and how)",
    "2. (another concise suggestion with Gen Z commentary)",
    "",
    "⚡ Improvements:",
    '- (concise suggestion about perf/readability — \"it\'s giving spaghetti\" energy)',
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
    "- (concise experience-level read — honest but encouraging)",
    "- (one constructive takeaway that hits different)",
    "",
    "[ CODE REVIEW END ]",
  ].join("\n");
}

function buildOllamaUserPrompt(code: string, language: string): string {
  return [
    `Please review this ${language} code carefully. Make sure to generate the "Alternative Solutions" section with at least TWO complete rewritten versions.`,
    "",
    "```" + language,
    code,
    "```",
  ].join("\n");
}

