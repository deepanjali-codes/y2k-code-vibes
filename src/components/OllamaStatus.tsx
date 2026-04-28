import { useEffect, useState } from "react";
import { detectProvider, type AIProvider, type AIStatus } from "@/lib/aiProvider";
import { Wifi, WifiOff, RefreshCw, Cloud, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OllamaStatusProps {
  model: string;
  setModel: (model: string) => void;
  provider: AIProvider;
  setProvider: (p: AIProvider) => void;
}

export function OllamaStatus({ model, setModel, provider, setProvider }: OllamaStatusProps) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setChecking(true);
    const status: AIStatus = await detectProvider();
    setConnected(status.connected);
    setProvider(status.provider);
    setModels(status.models);
    if (status.connected && status.activeModel && !model) {
      setModel(status.activeModel);
    }
    setChecking(false);
  };

  useEffect(() => { check(); }, []);

  const providerLabel = provider === "gemini" ? "GEMINI" : "OLLAMA";
  const ProviderIcon = provider === "gemini" ? Cloud : Monitor;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded border border-border bg-muted/30 font-mono text-xs">
      {connected === null || checking ? (
        <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
      ) : connected ? (
        <Wifi className="h-3 w-3 text-neon-green" />
      ) : (
        <WifiOff className="h-3 w-3 text-destructive" />
      )}

      <ProviderIcon className="h-3 w-3 text-muted-foreground" />

      <span className={connected ? "text-neon-green" : connected === false ? "text-destructive" : "text-muted-foreground"}>
        {connected === null ? "CHECKING..." : connected ? `${providerLabel} CONNECTED` : "AI OFFLINE"}
      </span>

      {connected && models.length > 0 && (
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="ml-auto bg-muted border border-border rounded px-2 py-0.5 text-xs font-mono text-foreground focus:outline-none"
        >
          {models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      )}

      {!connected && connected !== null && (
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-destructive/70 text-[10px]">
            {provider === "gemini"
              ? "Add VITE_GEMINI_API_KEY to .env"
              : "Start Ollama locally"}
          </span>
          <Button variant="ghost" size="sm" onClick={check} className="h-6 text-xs font-mono px-2">
            <RefreshCw className="h-3 w-3 mr-1" /> RETRY
          </Button>
        </div>
      )}
    </div>
  );
}
