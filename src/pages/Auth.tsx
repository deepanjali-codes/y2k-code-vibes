import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AsciiBox } from "@/components/AsciiBox";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError("All fields are required.");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    const { error: authError } = isLogin
      ? await signIn(email, password)
      : await signUp(email, password);

    if (authError) {
      setError(authError.message);
    } else if (!isLogin) {
      setSuccess("Check your email to confirm your account!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <AsciiBox title={isLogin ? "LOGIN TERMINAL" : "SIGNUP TERMINAL"} className="inline-block" />
        </div>

        <div className="rounded border border-border bg-card p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase tracking-wider">
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-muted border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase tracking-wider">
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-muted border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs font-mono text-destructive">ERROR: {error}</p>
            )}
            {success && (
              <p className="text-xs font-mono text-neon-green">{success}</p>
            )}

            <Button variant="neon" type="submit" disabled={loading} className="w-full">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-blink">▊</span> PROCESSING...
                </span>
              ) : isLogin ? "▶ LOGIN" : "▶ CREATE ACCOUNT"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(""); setSuccess(""); }}
              className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Need an account? SIGNUP" : "Have an account? LOGIN"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
