import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { TerminalHeader } from "@/components/TerminalHeader";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/app");
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      // Map Firebase error codes to friendly messages
      if (raw.includes("auth/invalid-credential") || raw.includes("INVALID_LOGIN_CREDENTIALS")) {
        setError("Invalid email or password. Please try again.");
      } else if (raw.includes("auth/user-not-found")) {
        setError("No account found with this email. Sign up first.");
      } else if (raw.includes("auth/wrong-password")) {
        setError("Incorrect password. Please try again.");
      } else if (raw.includes("auth/too-many-requests")) {
        setError("Too many failed attempts. Please wait a moment and try again.");
      } else if (raw.includes("auth/network-request-failed")) {
        setError("Network error. Check your internet connection.");
      } else if (raw.includes("auth/invalid-email")) {
        setError("Invalid email format.");
      } else {
        setError(raw.replace("Firebase: ", "").replace(/ \(auth\/.*\)\.?/, ""));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <TerminalHeader />

      {/* Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md terminal-window shadow-xl">
          {/* Title bar */}
          <div className="terminal-titlebar">
            <div className="w-3 h-3 rounded-full mac-dot-red" />
            <div className="w-3 h-3 rounded-full mac-dot-yellow" />
            <div className="w-3 h-3 rounded-full mac-dot-green" />
            <span className="font-mono text-xs text-muted-foreground ml-2">
              codelens@auth ~ login
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <h1 className="font-mono text-2xl font-bold text-foreground flex items-center gap-2">
                <span className="text-hero-blue">&gt;_</span> login
              </h1>
              <p className="font-mono text-xs tracking-[0.15em] text-hero-purple mt-1">
                // ACCESS THE REVIEW TERMINAL
              </p>
            </div>

            {error && (
              <div className="font-mono text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2">
                ✗ {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="font-mono text-xs text-muted-foreground tracking-widest">
                &gt; EMAIL
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="cl-input"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs text-muted-foreground tracking-widest">
                &gt; PASSWORD
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="cl-input"
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="animate-blink">▊</span> authenticating...
                </>
              ) : (
                "> login"
              )}
            </button>

            <p className="font-mono text-xs text-muted-foreground text-center">
              no account?{" "}
              <Link to="/signup" className="text-hero-blue hover:underline">
                create one
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
