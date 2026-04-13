import { useState, useEffect, useMemo } from "react";
import { Copy, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { saveAs } from "file-saver";

const ASCII_FRAMES = [
  `   ╔═══════════════════════════╗
   ║  ◄◄ SCANNING AST ►►      ║
   ╚═══════════════════════════╝`,
  `   ╔═══════════════════════════╗
   ║  ◄◄ PARSING TOKENS ►►    ║
   ╚═══════════════════════════╝`,
  `   ╔═══════════════════════════╗
   ║  ◄◄ ANALYZING FLOW ►►    ║
   ╚═══════════════════════════╝`,
  `   ╔═══════════════════════════╗
   ║  ◄◄ CHECKING TYPES ►►    ║
   ╚═══════════════════════════╝`,
  `   ╔═══════════════════════════╗
   ║  ◄◄ LINTING STYLE ►►     ║
   ╚═══════════════════════════╝`,
  `   ╔═══════════════════════════╗
   ║  ◄◄ SCORING CODE ►►      ║
   ╚═══════════════════════════╝`,
];

const CODE_SNIPPETS = [
  `  if (node.type === "FunctionDeclaration") {
    analyzeComplexity(node.body);
  }`,
  `  const tokens = lexer.tokenize(source);
  parser.consume(tokens, { strict: true });`,
  `  for (const rule of lintRules) {
    violations.push(...rule.check(ast));
  }`,
  `  const score = (quality * 0.4) + (style * 0.3)
              + (security * 0.3);`,
  `  traverse(ast, {
    enter(path) { checkUnusedVars(path); }
  });`,
  `  const cfg = buildControlFlowGraph(fn);
  detectDeadCode(cfg.nodes);`,
  `  match pattern {
    Err(e) => report_vulnerability(e),
    Ok(_) => continue,
  }`,
  `  SELECT complexity, maintainability
  FROM metrics WHERE file = $1;`,
];

const SPINNER_CHARS = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function AsciiLoadingAnimation() {
  const [frame, setFrame] = useState(0);
  const [snippetIdx, setSnippetIdx] = useState(0);
  const [spinnerIdx, setSpinnerIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const i1 = setInterval(() => setFrame((f) => (f + 1) % ASCII_FRAMES.length), 2000);
    const i2 = setInterval(() => setSnippetIdx((s) => (s + 1) % CODE_SNIPPETS.length), 3000);
    const i3 = setInterval(() => setSpinnerIdx((s) => (s + 1) % SPINNER_CHARS.length), 80);
    const i4 = setInterval(() => setProgress((p) => (p >= 98 ? 10 : p + Math.random() * 8)), 500);
    return () => { clearInterval(i1); clearInterval(i2); clearInterval(i3); clearInterval(i4); };
  }, []);

  const bar = useMemo(() => {
    const filled = Math.floor(progress / 5);
    return "█".repeat(filled) + "░".repeat(20 - filled);
  }, [progress]);

  return (
    <div className="flex flex-col gap-3 py-2 select-none">
      {/* ASCII frame */}
      <pre className="text-primary text-glow-green text-center text-[10px] leading-tight">
        {ASCII_FRAMES[frame]}
      </pre>

      {/* Progress bar */}
      <div className="flex items-center gap-2 justify-center">
        <span className="text-primary text-xs font-mono">{SPINNER_CHARS[spinnerIdx]}</span>
        <span className="text-muted-foreground text-[10px] font-mono">[{bar}]</span>
        <span className="text-primary text-[10px] font-mono">{Math.floor(progress)}%</span>
      </div>

      {/* Random code snippet */}
      <div className="mx-auto max-w-xs">
        <pre className="text-muted-foreground/60 text-[10px] leading-snug font-mono text-center whitespace-pre-wrap">
          {CODE_SNIPPETS[snippetIdx]}
        </pre>
      </div>
    </div>
  );
}

interface ReviewOutputProps {
  review: string;
  isStreaming: boolean;
}

export function ReviewOutput({ review, isStreaming }: ReviewOutputProps) {
  const [copied, setCopied] = useState(false);

  if (!review && !isStreaming) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(review);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([review], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `code-review-${Date.now()}.txt`);
  };

  const handleDownloadPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>Code Review</title>
      <style>body{font-family:monospace;white-space:pre-wrap;padding:2rem;font-size:12px;line-height:1.6;}</style>
      </head><body>${review.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body></html>
    `);
    w.document.close();
    w.print();
  };

  const colorize = (text: string) => {
    return text
      .split("\n")
      .map((line, i) => {
        let className = "text-foreground";
        if (line.startsWith("✔")) className = "text-neon-green";
        else if (line.startsWith("✖")) className = "text-destructive";
        else if (line.startsWith("➜") || line.startsWith("⚡")) className = "text-neon-cyan";
        else if (line.startsWith("💡")) className = "text-neon-pink";
        else if (line.startsWith("📊")) className = "text-primary";
        else if (line.startsWith("🧠")) className = "text-accent";
        else if (line.includes("[ CODE REVIEW")) className = "text-primary font-bold text-glow-green";
        return (
          <span key={i} className={className}>
            {line}
            {"\n"}
          </span>
        );
      });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          {isStreaming ? (
            <span className="flex items-center gap-1">
              <span className="animate-blink text-primary">▊</span> STREAMING OUTPUT...
            </span>
          ) : (
            "REVIEW COMPLETE"
          )}
        </span>
        {review && !isStreaming && (
          <div className="flex gap-1">
            <Button variant="terminal" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "COPIED" : "COPY"}
            </Button>
            <Button variant="terminal" size="sm" onClick={handleDownloadTxt}>
              <Download className="h-3 w-3" /> TXT
            </Button>
            <Button variant="terminal" size="sm" onClick={handleDownloadPdf}>
              <Download className="h-3 w-3" /> PDF
            </Button>
          </div>
        )}
      </div>

      <div className="rounded border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b border-border">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-primary/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-accent/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-neon-cyan/70" />
          </div>
          <span className="text-xs font-mono text-muted-foreground">output.review</span>
        </div>

        {/* ASCII loading animation shown while streaming with no content yet */}
        {isStreaming && !review && <AsciiLoadingAnimation />}

        <pre className="p-4 font-mono text-xs leading-relaxed overflow-auto max-h-[500px] whitespace-pre-wrap">
          {colorize(review)}
          {isStreaming && <span className="animate-blink text-primary">▊</span>}
        </pre>
      </div>
    </motion.div>
  );
}
