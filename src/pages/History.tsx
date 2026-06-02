import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { TerminalHeader } from "@/components/TerminalHeader";
import { Trash2, RotateCcw, Download, Eye, Inbox, Copy, Check } from "lucide-react";
import { saveAs } from "file-saver";

export interface ReviewRecord {
  id: string;
  code: string;
  language: string;
  review: string;
  score: number | null;
  input_type: string;
  created_at: string;
  user_id?: string;
}

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

function extractScore(review: string) {
  const m = review.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
  return m ? m[1] : "—";
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reviews, setReviews]   = useState<ReviewRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<ReviewRecord | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      const q = supabase
        .from<ReviewRecord>("reviews")
        .order("created_at", { ascending: false });
      if (user?.uid) q.eq("user_id", user.uid);
      const { data } = await q.select("*");
      setReviews(data || []);
      setLoading(false);
    };
    loadHistory();
  }, [user]);

  const deleteReview = async (id: string) => {
    await supabase.from("reviews").eq("id", id).delete();
    setReviews((r) => r.filter((x) => x.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const rerun = (r: ReviewRecord) => {
    navigate("/app", { state: { code: r.code, language: r.language } });
  };

  const downloadTxt = (r: ReviewRecord) => {
    saveAs(new Blob([r.review], { type: "text/plain;charset=utf-8" }), `review-${r.id.slice(0,8)}.txt`);
  };

  const downloadPdf = (r: ReviewRecord) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Code Review</title><style>body{font-family:monospace;white-space:pre-wrap;padding:2rem;font-size:12px;line-height:1.6;}</style></head><body>${r.review.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div className="min-h-screen bg-background">
      <TerminalHeader />

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Heading */}
        <div className="mb-5">
          <p className="font-mono text-xs tracking-[0.2em] text-hero-purple uppercase mb-1">
            // ARCHIVE
          </p>
          <h1 className="font-mono text-3xl font-bold text-foreground">
            review history
          </h1>
        </div>

        {loading ? (
          <div className="font-mono text-sm text-muted-foreground">
            <span className="animate-blink">▊</span> loading history...
          </div>
        ) : reviews.length === 0 ? (
          /* ── Empty state ── */
          <div className="terminal-window">
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Inbox className="h-10 w-10" />
              <p className="font-mono text-sm">
                no reviews yet — go judge some code.
              </p>
            </div>
            <div className="terminal-titlebar border-t border-b-0">
              <div className="w-3 h-3 rounded-full mac-dot-red" />
              <div className="w-3 h-3 rounded-full mac-dot-yellow" />
              <div className="w-3 h-3 rounded-full mac-dot-green" />
              <span className="font-mono text-xs text-muted-foreground ml-2">
                codelens@history ~ idle
              </span>
            </div>
            <div className="p-4 font-mono text-sm text-muted-foreground">
              &gt; select an entry to view
            </div>
          </div>
        ) : (
          /* ── Two-panel layout ── */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left — review list */}
            <div className="flex flex-col gap-2">
              {reviews.map((r) => {
                const sc = extractScore(r.review);
                const date = new Date(r.created_at).toLocaleDateString("en-GB", {
                  day: "2-digit", month: "short", year: "numeric",
                });
                const isActive = selected?.id === r.id;

                return (
                  <div
                    key={r.id}
                    className={`terminal-window cursor-pointer transition-all ${
                      isActive ? "ring-2 ring-primary/50" : "hover:ring-1 hover:ring-border"
                    }`}
                    onClick={() => setSelected(isActive ? null : r)}
                  >
                    <div className="p-3 flex flex-wrap items-center gap-2">
                      {/* Language badge */}
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground">
                        {r.language}
                      </span>

                      {/* Input type */}
                      <span className="font-mono text-xs text-muted-foreground">
                        {r.input_type || "paste"}
                      </span>

                      {/* Score */}
                      <span className="font-mono text-xs text-hero-blue font-semibold">
                        {sc}/10
                      </span>

                      {/* Date */}
                      <span className="font-mono text-xs text-muted-foreground ml-auto">
                        {date}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="border-t border-border px-3 py-2 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelected(r)}
                        className="flex items-center gap-1 font-mono text-xs px-2 py-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                        title="View"
                      >
                        <Eye className="h-3 w-3" /> view
                      </button>
                      <button
                        onClick={() => rerun(r)}
                        className="flex items-center gap-1 font-mono text-xs px-2 py-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                        title="Re-run"
                      >
                        <RotateCcw className="h-3 w-3" /> re-run
                      </button>
                      <button
                        onClick={() => downloadPdf(r)}
                        className="flex items-center gap-1 font-mono text-xs px-2 py-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                        title="Download PDF"
                      >
                        <Download className="h-3 w-3" /> pdf
                      </button>
                      <button
                        onClick={() => deleteReview(r.id)}
                        className="flex items-center gap-1 font-mono text-xs px-2 py-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors ml-auto"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" /> delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right — terminal preview */}
            <div className="terminal-window h-fit sticky top-16">
              <div className="terminal-titlebar">
                <div className="w-3 h-3 rounded-full mac-dot-red" />
                <div className="w-3 h-3 rounded-full mac-dot-yellow" />
                <div className="w-3 h-3 rounded-full mac-dot-green" />
                <span className="font-mono text-xs text-muted-foreground ml-2">
                  {selected
                    ? `codelens@history ~ ${selected.language}`
                    : "codelens@history ~ idle"}
                </span>
              </div>

              <div className="p-4 min-h-[200px]">
                {!selected ? (
                  <div className="font-mono text-sm text-muted-foreground">
                    &gt; select an entry to view
                  </div>
                ) : (
                  <>
                    <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap overflow-auto max-h-[500px]">
                      {colorizeReview(selected.review)}
                    </pre>

                    {/* Bottom actions */}
                    <div className="border-t border-border mt-4 pt-3 flex flex-wrap items-center gap-2">
                      <span className="score-badge">
                        score: <span className="text-hero-blue font-semibold">{extractScore(selected.review)}/10</span>
                      </span>
                      <span className="score-badge">{selected.language}</span>
                      <div className="ml-auto flex gap-1">
                        <button
                          onClick={() => downloadTxt(selected)}
                          className="score-badge hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <Download className="h-3 w-3" /> .txt
                        </button>
                        <button
                          onClick={() => downloadPdf(selected)}
                          className="score-badge hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <Download className="h-3 w-3" /> .pdf
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
