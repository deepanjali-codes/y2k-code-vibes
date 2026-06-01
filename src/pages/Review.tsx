import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TerminalHeader } from "@/components/TerminalHeader";
import { detectLanguage, SupportedLanguage, chunkCode } from "@/lib/ollama";
import { reviewCodeUnified, detectProvider, type AIProvider } from "@/lib/aiProvider";
import { supabase } from "@/lib/supabaseClient";
import { ReviewRecord } from "./History";
import { processFiles, processImageOCR } from "@/lib/fileProcessor";
import { FileCode, FolderOpen, Image, Upload, Download, Copy, Check } from "lucide-react";
import { saveAs } from "file-saver";

const LANGUAGES: SupportedLanguage[] = [
  "javascript","typescript","python","java","c","cpp","go","rust","php",
  "sql","bash","html","css","json","yaml",
];

type InputTab = "paste" | "upload" | "folder" | "screenshot";

function colorizeReview(text: string) {
  return text.split("\n").map((line, i) => {
    let cls = "text-foreground";
    if (line.startsWith("✓") || line.startsWith("✔")) cls = "text-hero-green";
    else if (line.startsWith("✗") || line.startsWith("✖")) cls = "text-destructive";
    else if (line.startsWith("→") || line.startsWith("➜")) cls = "text-hero-blue";
    else if (line.startsWith("📊")) cls = "text-hero-blue font-semibold";
    else if (line.startsWith("💡") || line.startsWith("🧠")) cls = "text-hero-purple font-semibold";
    else if (line.includes("[ CODE REVIEW")) cls = "text-foreground font-bold";
    return <span key={i} className={cls}>{line}{"\n"}</span>;
  });
}

export default function ReviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initState = location.state as { code?: string; language?: string } | null;

  const [tab, setTab] = useState<InputTab>("paste");
  const [code, setCode] = useState(initState?.code || "");
  const [language, setLanguage] = useState<SupportedLanguage>(
    (initState?.language as SupportedLanguage) || "javascript"
  );
  const [review, setReview] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState<string | null>(null);
  const [detectedLang, setDetectedLang] = useState<string>("javascript");
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);

  // AI provider state (auto-detected)
  const [provider, setProvider] = useState<AIProvider>("gemini");
  const [model, setModel] = useState("gemini-2.0-flash");

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef  = useRef<HTMLInputElement>(null);

  // Auto-detect provider on mount
  useEffect(() => {
    detectProvider().then((status) => {
      if (status.connected) {
        setProvider(status.provider);
        setModel(status.activeModel);
      }
    });
  }, []);

  // Auto-detect language from code
  const detectTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(detectTimer.current);
    if (!code.trim()) return;
    detectTimer.current = setTimeout(() => {
      const lang = detectLanguage(code);
      setLanguage(lang);
    }, 500);
    return () => clearTimeout(detectTimer.current);
  }, [code]);

  const handleFiles = useCallback(async (files: File[]) => {
    setProcessing(true);
    try {
      const imgs   = files.filter((f) => f.type.startsWith("image/"));
      const others = files.filter((f) => !f.type.startsWith("image/"));
      let all = "";
      if (others.length) {
        const processed = await processFiles(others);
        all = processed.map((f) => `// === ${f.path} ===\n${f.content}`).join("\n\n");
        if (processed.length) setLanguage(detectLanguage(processed[0].content, processed[0].name));
      }
      for (const img of imgs) {
        const txt = await processImageOCR(img);
        all += (all ? "\n\n" : "") + `// === OCR: ${img.name} ===\n${txt}`;
      }
      if (all) setCode(all);
    } catch (e) { console.error(e); }
    finally { setProcessing(false); }
  }, []);

  const handleReview = useCallback(async () => {
    if (!code.trim()) return;
    setIsLoading(true);
    setReview("");
    setScore(null);
    const lang = language || detectLanguage(code);
    setDetectedLang(lang);
    try {
      const chunks = provider === "ollama" ? chunkCode(code) : [code];
      let full = "";
      for (let i = 0; i < chunks.length; i++) {
        if (chunks.length > 1) { full += `\n// === CHUNK ${i+1}/${chunks.length} ===\n`; setReview(full); }
        await reviewCodeUnified(chunks[i], lang, provider, model, (tok) => { full += tok; setReview(full); });
      }
      const m = full.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
      const sc = m ? parseFloat(m[1]) : null;
      setScore(m ? m[1] : null);
      await supabase.from<ReviewRecord>("reviews").insert({
        code: code.slice(0, 10000), language: lang, review: full, score: sc, input_type: tab,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setReview(`✗ ERROR: ${msg}\n\nCheck your VITE_GEMINI_API_KEY in .env`);
    } finally {
      setIsLoading(false);
    }
  }, [code, language, provider, model, tab]);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(review); }
    catch { const el = document.createElement("textarea"); el.value = review; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    saveAs(new Blob([review], { type: "text/plain;charset=utf-8" }), `code-review-${Date.now()}.txt`);
  };

  const handleDownloadPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Code Review</title><style>body{font-family:monospace;white-space:pre-wrap;padding:2rem;font-size:12px;line-height:1.6;}</style></head><body>${review.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</body></html>`);
    w.document.close(); w.print();
  };

  const terminalStatus = isLoading
    ? `codelens@review ~ analyzing`
    : review
    ? `codelens@review ~ ${detectedLang}`
    : "codelens@review ~ idle";

  return (
    <div className="min-h-screen bg-background">
      <TerminalHeader />

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* ── Input Section ── */}
        <div className="terminal-window mb-4">
          {/* Title bar with tabs */}
          <div className="terminal-titlebar gap-0 flex-wrap">
            <div className="flex items-center gap-1.5 mr-3">
              <div className="w-3 h-3 rounded-full mac-dot-red" />
              <div className="w-3 h-3 rounded-full mac-dot-yellow" />
              <div className="w-3 h-3 rounded-full mac-dot-green" />
            </div>

            {/* Input mode tabs */}
            <div className="flex items-center gap-1 flex-1">
              {(["paste","upload","folder","screenshot"] as InputTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`tab-btn ${tab === t ? "tab-btn-active" : ""}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Language selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              className="ml-auto bg-transparent border border-border rounded px-2 py-0.5 text-xs font-mono text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Content area */}
          {tab === "paste" && (
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={"// paste your code here\nfunction fetchUser(id) {\n  let res;\n  fetch('/api/users/' + id)\n    .then(r => r.json())\n    .then(d => res = d);\n  return res;\n}"}
              className="w-full h-72 bg-transparent p-4 font-mono text-sm text-foreground resize-none focus:outline-none placeholder:text-muted-foreground/40"
              spellCheck={false}
            />
          )}

          {(tab === "upload" || tab === "folder" || tab === "screenshot") && (
            <div
              className={`h-72 flex flex-col items-center justify-center gap-3 border-2 border-dashed m-3 rounded cursor-pointer transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(Array.from(e.dataTransfer.files)); }}
              onClick={() => {
                if (tab === "upload")     fileInputRef.current?.click();
                if (tab === "folder")     folderInputRef.current?.click();
                if (tab === "screenshot") imageInputRef.current?.click();
              }}
            >
              {processing ? (
                <><span className="animate-blink text-primary font-mono">▊</span><span className="font-mono text-xs text-muted-foreground">processing...</span></>
              ) : (
                <>
                  {tab === "upload"     && <FileCode className="h-8 w-8 text-muted-foreground" />}
                  {tab === "folder"     && <FolderOpen className="h-8 w-8 text-muted-foreground" />}
                  {tab === "screenshot" && <Image className="h-8 w-8 text-muted-foreground" />}
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="font-mono text-xs text-muted-foreground">
                    {tab === "screenshot" ? "drop an image or click to browse" : "drop files or click to browse"}
                  </span>
                  {code && <span className="font-mono text-xs text-hero-green">✓ file loaded — switch to paste to view</span>}
                </>
              )}
            </div>
          )}

          <input ref={fileInputRef}   type="file" multiple accept=".js,.jsx,.ts,.tsx,.py,.java,.c,.h,.cpp,.go,.rs,.php,.sql,.sh,.html,.css,.json,.yml,.yaml,.zip" className="hidden" onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))} />
          {/* @ts-expect-error webkitdirectory */}
          <input ref={folderInputRef} type="file" webkitdirectory="true" className="hidden" onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))} />
          <input ref={imageInputRef}  type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))} />
        </div>

        {/* ── Review Button ── */}
        <button
          onClick={handleReview}
          disabled={isLoading || !code.trim()}
          className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 mb-4 text-base"
        >
          {isLoading ? (
            <><span className="animate-blink">▊</span> analyzing code...</>
          ) : (
            "> review code"
          )}
        </button>

        {/* ── Terminal Output ── */}
        <div className="terminal-window">
          {/* Terminal title bar */}
          <div className="terminal-titlebar">
            <div className="w-3 h-3 rounded-full mac-dot-red" />
            <div className="w-3 h-3 rounded-full mac-dot-yellow" />
            <div className="w-3 h-3 rounded-full mac-dot-green" />
            <span className="font-mono text-xs text-muted-foreground ml-2">{terminalStatus}</span>
          </div>

          {/* Output body */}
          <div className="p-4 min-h-[180px]">
            {!review && !isLoading && (
              <div className="font-mono text-sm text-muted-foreground space-y-2">
                <div className="border border-border rounded px-4 py-2 inline-block text-xs">
                  &nbsp;&nbsp;awaiting code submission&nbsp;&nbsp;
                </div>
                <div>&gt; paste code or upload a file</div>
                <div>&gt; press review to begin</div>
                <div className="mt-2"><span className="animate-blink">$</span></div>
              </div>
            )}

            {isLoading && !review && (
              <div className="font-mono text-xs text-muted-foreground space-y-1">
                <div>&gt; sending code to ai core...</div>
                <div>&gt; awaiting response<span className="animate-blink">...</span></div>
              </div>
            )}

            {review && (
              <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap overflow-auto max-h-[500px]">
                {colorizeReview(review)}
                {isLoading && <span className="animate-blink text-primary">▊</span>}
              </pre>
            )}
          </div>

          {/* Bottom action bar — only shown after review */}
          {review && !isLoading && (
            <div className="border-t border-border px-4 py-2 flex flex-wrap items-center gap-2">
              {score && (
                <span className="score-badge">
                  score: <span className="text-hero-blue font-semibold">{score}/10</span>
                </span>
              )}
              <span className="score-badge">{detectedLang}</span>

              <div className="ml-auto flex items-center gap-1">
                <button onClick={handleCopy} className="score-badge hover:bg-muted/50 transition-colors cursor-pointer">
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "copied" : "copy"}
                </button>
                <button onClick={handleDownloadTxt} className="score-badge hover:bg-muted/50 transition-colors cursor-pointer">
                  <Download className="h-3 w-3" /> .txt
                </button>
                <button onClick={handleDownloadPdf} className="score-badge hover:bg-muted/50 transition-colors cursor-pointer">
                  <Download className="h-3 w-3" /> .pdf
                </button>
                <button onClick={() => navigate("/history")} className="score-badge hover:bg-muted/50 transition-colors cursor-pointer text-hero-purple">
                  view history
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
