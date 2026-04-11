import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { TerminalHeader } from "@/components/TerminalHeader";
import { AsciiBox } from "@/components/AsciiBox";
import { Button } from "@/components/ui/button";
import { Trash2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface ReviewRecord {
  id: string;
  code: string;
  language: string;
  review: string;
  score: number | null;
  input_type: string;
  created_at: string;
}

export default function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setReviews(data || []);
    setLoading(false);
  };

  const deleteReview = async (id: string) => {
    await supabase.from("reviews").delete().eq("id", id);
    setReviews((r) => r.filter((x) => x.id !== id));
  };

  const rerun = (record: ReviewRecord) => {
    navigate("/", { state: { code: record.code, language: record.language } });
  };

  const extractScore = (review: string): string => {
    const match = review.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
    return match ? match[1] : "—";
  };

  return (
    <div className="min-h-screen bg-background">
      <TerminalHeader />
      <div className="container max-w-4xl mx-auto p-4 pt-6">
        <AsciiBox title="REVIEW HISTORY" className="mb-6" />

        {loading ? (
          <div className="text-center font-mono text-sm text-muted-foreground">
            <span className="animate-blink">▊</span> LOADING HISTORY...
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center font-mono text-sm text-muted-foreground py-12">
            NO REVIEWS FOUND. GO REVIEW SOME CODE!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {reviews.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="rounded border border-border bg-card"
                >
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  >
                    <span className="text-xs font-mono text-primary font-bold">
                      {extractScore(r.review)}/10
                    </span>
                    <span className="text-xs font-mono text-muted-foreground uppercase">
                      {r.language}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground ml-auto">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {r.input_type}
                    </span>
                    {expanded === r.id ? (
                      <ChevronUp className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>

                  <AnimatePresence>
                    {expanded === r.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border p-3">
                          <pre className="font-mono text-xs text-foreground whitespace-pre-wrap max-h-60 overflow-auto mb-3">
                            {r.review}
                          </pre>
                          <div className="flex gap-2">
                            <Button variant="terminal" size="sm" onClick={() => rerun(r)}>
                              <RotateCcw className="h-3 w-3" /> RE-RUN
                            </Button>
                            <Button variant="terminal" size="sm" onClick={() => deleteReview(r.id)} className="text-destructive">
                              <Trash2 className="h-3 w-3" /> DELETE
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
