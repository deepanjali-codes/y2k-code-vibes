import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { TerminalHeader } from "@/components/TerminalHeader";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await signup(email, password, name || undefined);
      navigate("/app");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed.";
      setError(msg.replace("Firebase: ", "").replace(/ \(auth\/.*\)\.?/, ""));
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
              codelens@auth ~ signup
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <h1 className="font-mono text-2xl font-bold text-foreground flex items-center gap-2">
                <span className="text-hero-blue">&gt;_</span> signup
              </h1>
              <p className="font-mono text-xs tracking-[0.15em] text-hero-purple mt-1">
                // INITIALIZE NEW DEV SESSION
              </p>
            </div>

            {error && (
              <div className="font-mono text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2">
                ✗ {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="font-mono text-xs text-muted-foreground tracking-widest">
                &gt; NAME (OPTIONAL)
              </label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="cl-input"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs text-muted-foreground tracking-widest">
                &gt; EMAIL
              </label>
              <input
                id="signup-email"
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
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="cl-input"
              />
            </div>

            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="animate-blink">▊</span> creating account...
                </>
              ) : (
                "> create account"
              )}
            </button>

            <p className="font-mono text-xs text-muted-foreground text-center">
              already onboard?{" "}
              <Link to="/login" className="text-hero-blue hover:underline">
                login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
