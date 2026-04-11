import { useState } from "react";
import { Copy, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { saveAs } from "file-saver";

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
    // Simple PDF download using a printable page
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

  // Colorize specific markers in the review
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
        <pre className="p-4 font-mono text-xs leading-relaxed overflow-auto max-h-[500px] whitespace-pre-wrap">
          {colorize(review)}
          {isStreaming && <span className="animate-blink text-primary">▊</span>}
        </pre>
      </div>
    </motion.div>
  );
}
