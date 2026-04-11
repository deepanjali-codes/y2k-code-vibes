import { useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { TerminalHeader } from "@/components/TerminalHeader";
import { AsciiBox } from "@/components/AsciiBox";
import { CodeEditor } from "@/components/CodeEditor";
import { ReviewOutput } from "@/components/ReviewOutput";
import { OllamaStatus } from "@/components/OllamaStatus";
import { reviewCode, detectLanguage, SupportedLanguage, chunkCode } from "@/lib/ollama";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

export default function ReviewPage() {
  const location = useLocation();
  const { user } = useAuth();
  const initState = location.state as { code?: string; language?: string } | null;

  const [code, setCode] = useState(initState?.code || "");
  const [language, setLanguage] = useState<SupportedLanguage>(
    (initState?.language as SupportedLanguage) || "javascript"
  );
  const [model, setModel] = useState("");
  const [review, setReview] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReview = useCallback(async () => {
    if (!code.trim() || !model) return;
    setIsLoading(true);
    setReview("");

    const detectedLang = language || detectLanguage(code);

    try {
      const chunks = chunkCode(code);
      let fullReview = "";

      for (let i = 0; i < chunks.length; i++) {
        if (chunks.length > 1) {
          fullReview += `\n// === CHUNK ${i + 1}/${chunks.length} ===\n`;
          setReview(fullReview);
        }
        await reviewCode(chunks[i], detectedLang, model, (token) => {
          fullReview += token;
          setReview(fullReview);
        });
      }

      // Extract score
      const scoreMatch = fullReview.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : null;

      // Save to history
      if (user) {
        await supabase.from("reviews").insert({
          user_id: user.id,
          code: code.slice(0, 10000),
          language: detectedLang,
          review: fullReview,
          score,
          input_type: "text",
        });
      }
    } catch (err: any) {
      setReview(`\n✖ ERROR: ${err.message}\n\nMake sure Ollama is running at localhost:11434\nand the model "${model}" is available.\n\nTry: ollama run ${model}`);
    } finally {
      setIsLoading(false);
    }
  }, [code, language, model, user]);

  return (
    <div className="min-h-screen bg-background">
      <TerminalHeader />

      <div className="container max-w-4xl mx-auto p-4 pt-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <AsciiBox title="AI CODE REVIEW TERMINAL" />
        </motion.div>

        <div className="flex flex-col gap-4">
          <OllamaStatus model={model} setModel={setModel} />
          <CodeEditor
            code={code}
            setCode={setCode}
            language={language}
            setLanguage={setLanguage}
            onReview={handleReview}
            isLoading={isLoading}
          />
          <ReviewOutput review={review} isStreaming={isLoading} />
        </div>
      </div>

      {/* Scanline effect in dark mode */}
      <div className="fixed inset-0 pointer-events-none z-50 dark:block hidden">
        <div className="w-full h-px bg-primary/5 animate-scanline" />
      </div>
    </div>
  );
}
