import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AsciiBox } from "@/components/AsciiBox";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    if (!isLogin && !displayName.trim()) {
      setError("Display name is required.");
      setLoading(false);
      return;
    }

    // Bug fix: pass displayName to signUp so user details are saved
    const { error: authError } = isLogin
      ? await signIn(email, password)
      : await signUp(email, password, displayName.trim());

    if (authError) {
      setError(authError.message);
    } else if (!isLogin) {
      setSuccess("Check your email to confirm your account!");
    }
    setLoading(false);
  };

  // Bug fix: clear all fields + errors when switching between login/signup modes
  const switchMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setSuccess("");
    setEmail("");
    setPassword("");
    setDisplayName("");
    setShowPassword(false);
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
            {/* Display name — only shown on signup */}
            {!isLogin && (
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase tracking-wider">
                  DISPLAY NAME
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-muted border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="your_username"
                  autoComplete="name"
                />
              </div>
            )}

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
                autoComplete="email"
              />
            </div>

            {/* Bug fix: Show/hide password toggle button */}
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase tracking-wider">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-muted border border-border rounded px-3 py-2 pr-10 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
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
              onClick={switchMode}
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
