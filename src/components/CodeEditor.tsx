import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, FileCode, Image, FolderOpen, FileArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { processFiles, processImageOCR } from "@/lib/fileProcessor";
import { detectLanguage, SupportedLanguage } from "@/lib/ollama";
import { playTypingClick } from "@/lib/sounds";
import { motion } from "framer-motion";

const LANGUAGES: SupportedLanguage[] = [
  "javascript","typescript","python","java","c","cpp","go","rust","php","sql","bash","html","css","json","yaml",
];

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  onReview: () => void;
  isLoading: boolean;
}

export function CodeEditor({ code, setCode, language, setLanguage, onReview, isLoading }: CodeEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [userPickedLang, setUserPickedLang] = useState(false);
  const detectTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced auto-detect on code change (only if user hasn't manually picked a language)
  useEffect(() => {
    if (userPickedLang) return;
    clearTimeout(detectTimerRef.current);
    detectTimerRef.current = setTimeout(() => {
      if (code.trim().length > 20) {
        const detected = detectLanguage(code);
        setLanguage(detected);
      }
    }, 500);
    return () => clearTimeout(detectTimerRef.current);
  }, [code, userPickedLang, setLanguage]);

  const handleFiles = useCallback(async (files: File[]) => {
    setProcessing(true);
    try {
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      const otherFiles = files.filter((f) => !f.type.startsWith("image/"));

      let allCode = "";

      if (otherFiles.length > 0) {
        const processed = await processFiles(otherFiles);
        allCode = processed.map((f) => `// === ${f.path} ===\n${f.content}`).join("\n\n");
        if (processed.length > 0) {
          const detectedLang = detectLanguage(processed[0].content, processed[0].name);
          setLanguage(detectedLang);
        }
      }

      for (const img of imageFiles) {
        const text = await processImageOCR(img);
        allCode += (allCode ? "\n\n" : "") + `// === OCR: ${img.name} ===\n${text}`;
      }

      if (allCode) {
        setCode(allCode);
        if (!otherFiles.length && imageFiles.length > 0) {
          setLanguage(detectLanguage(allCode));
        }
      }
    } catch (err) {
      console.error("File processing error:", err);
    } finally {
      setProcessing(false);
    }
  }, [setCode, setLanguage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) handleFiles(files);
  }, [handleFiles]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="flex flex-col gap-3"
    >
      {/* Language selector + Upload buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={language}
          onChange={(e) => {
            const val = e.target.value as SupportedLanguage;
            setLanguage(val);
            setUserPickedLang(!!val);
          }}
          className="bg-muted border border-border rounded px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">AUTO-DETECT</option>
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>{l.toUpperCase()}</option>
          ))}
        </select>

        <div className="flex gap-1 ml-auto">
          <Button variant="terminal" size="sm" onClick={() => fileInputRef.current?.click()} disabled={processing}>
            <FileCode className="h-3 w-3" /> FILE
          </Button>
          <Button variant="terminal" size="sm" onClick={() => folderInputRef.current?.click()} disabled={processing}>
            <FolderOpen className="h-3 w-3" /> FOLDER
          </Button>
          <Button variant="terminal" size="sm" onClick={() => imageInputRef.current?.click()} disabled={processing}>
            <Image className="h-3 w-3" /> OCR
          </Button>
        </div>

        <input ref={fileInputRef} type="file" multiple accept=".js,.jsx,.ts,.tsx,.py,.java,.c,.h,.cpp,.go,.rs,.php,.sql,.sh,.html,.css,.json,.yml,.yaml,.zip" className="hidden" onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))} />
        {/* @ts-expect-error webkitdirectory is valid */}
        <input ref={folderInputRef} type="file" webkitdirectory="true" className="hidden" onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))} />
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))} />
      </div>

      {/* Code textarea */}
      <div
        className={`relative rounded border-2 transition-colors ${
          dragOver ? "border-primary glow-green" : "border-border"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {dragOver && (
          <div className="absolute inset-0 bg-primary/10 z-10 flex items-center justify-center rounded">
            <div className="flex flex-col items-center gap-2 text-primary font-mono">
              <Upload className="h-8 w-8" />
              <span className="text-sm">DROP FILES HERE</span>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b border-border">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-accent/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-primary/70" />
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {processing ? "PROCESSING..." : `input.${language || "code"}`}
          </span>
          <FileArchive className="h-3 w-3 text-muted-foreground ml-auto" />
        </div>
        <textarea
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            playTypingClick();
          }}
          placeholder={`// Paste your code here or drag & drop files...\n// Supports: files, folders, ZIP archives, screenshots (OCR)\n\nfunction example() {\n  console.log("Hello, world!");\n}`}
          className="w-full h-64 bg-background p-4 font-mono text-sm text-foreground resize-none focus:outline-none placeholder:text-muted-foreground/50"
          spellCheck={false}
        />
      </div>

      {/* Review button */}
      <Button
        variant="neon"
        size="lg"
        onClick={onReview}
        disabled={isLoading || !code.trim()}
        className="w-full text-sm"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="animate-blink">▊</span> ANALYZING CODE...
          </span>
        ) : (
          "▶ RUN CODE REVIEW"
        )}
      </Button>
    </motion.div>
  );
}
