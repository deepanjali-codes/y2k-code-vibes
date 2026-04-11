import { useEffect, useState } from "react";
import { checkOllamaConnection, getAvailableModels } from "@/lib/ollama";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OllamaStatusProps {
  model: string;
  setModel: (model: string) => void;
}

export function OllamaStatus({ model, setModel }: OllamaStatusProps) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setChecking(true);
    const ok = await checkOllamaConnection();
    setConnected(ok);
    if (ok) {
      const m = await getAvailableModels();
      setModels(m);
      if (m.length > 0 && !model) {
        const preferred = m.find((n) => n.includes("deepseek-coder")) || m.find((n) => n.includes("codellama")) || m[0];
        setModel(preferred);
      }
    }
    setChecking(false);
  };

  useEffect(() => { check(); }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded border border-border bg-muted/30 font-mono text-xs">
      {connected === null || checking ? (
        <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
      ) : connected ? (
        <Wifi className="h-3 w-3 text-neon-green" />
      ) : (
        <WifiOff className="h-3 w-3 text-destructive" />
      )}

      <span className={connected ? "text-neon-green" : connected === false ? "text-destructive" : "text-muted-foreground"}>
        {connected === null ? "CHECKING..." : connected ? "OLLAMA CONNECTED" : "OLLAMA OFFLINE"}
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
        <Button variant="ghost" size="sm" onClick={check} className="ml-auto h-6 text-xs font-mono px-2">
          <RefreshCw className="h-3 w-3 mr-1" /> RETRY
        </Button>
      )}
    </div>
  );
}
