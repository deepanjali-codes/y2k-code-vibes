import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AsciiBox } from "@/components/AsciiBox";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, RotateCcw, ShieldCheck } from "lucide-react";

// ── Step type ─────────────────────────────────────────────────────────────────
type Step = "credentials" | "otp";

export default function AuthPage() {
  // ── Credentials step state ────────────────────────────────────────────────
  const [step,         setStep]        = useState<Step>("credentials");
  const [isLogin,      setIsLogin]     = useState(true);
  const [email,        setEmail]       = useState("");
  const [password,     setPassword]    = useState("");
  const [displayName,  setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ── OTP step state ────────────────────────────────────────────────────────
  const [otp,      setOtp]      = useState("");
  const [resent,   setResent]   = useState(false);

  // ── Shared state ──────────────────────────────────────────────────────────
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, confirmOTP, resendOTP } = useAuth();

  // ── Step 1: Submit credentials ────────────────────────────────────────────
  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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

    const { error: authError } = isLogin
      ? await signIn(email, password)
      : await signUp(email, password, displayName.trim());

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Credentials OK — transition to OTP step
    setOtp("");
    setError("");
    setLoading(false);
    setStep("otp");
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 4) {
      setError("Enter the full 4-digit code.");
      return;
    }
    setError("");
    setLoading(true);

    const { error: otpError } = await confirmOTP(otp);
    if (otpError) {
      setError(otpError.message);
      setOtp("");
    }
    setLoading(false);
  };

  // ── Auto-submit when all 4 digits entered ─────────────────────────────────
  const handleOTPChange = async (value: string) => {
    setOtp(value);
    setError("");
    if (value.length === 4) {
      setLoading(true);
      const { error: otpError } = await confirmOTP(value);
      if (otpError) {
        setError(otpError.message);
        setOtp("");
      }
      setLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    setResent(false);
    setError("");
    const { error: resendError } = await resendOTP();
    if (resendError) {
      setError(resendError.message);
    } else {
      setOtp("");
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    }
  };

  // ── Switch login ↔ signup ────────────────────────────────────────────────
  const switchMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setEmail("");
    setPassword("");
    setDisplayName("");
    setShowPassword(false);
    setStep("credentials");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <AnimatePresence mode="wait">

        {/* ── Step 1: Credentials ─────────────────────────────────────── */}
        {step === "credentials" && (
          <motion.div
            key="credentials"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-6">
              <AsciiBox
                title={isLogin ? "LOGIN TERMINAL" : "SIGNUP TERMINAL"}
                className="inline-block"
              />
            </div>

            <div className="rounded border border-border bg-card p-6">
              <form onSubmit={handleCredentials} className="flex flex-col gap-4">

                {/* Display name — signup only */}
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
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs font-mono text-destructive">ERROR: {error}</p>
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
        )}

        {/* ── Step 2: OTP Verification ────────────────────────────────── */}
        {step === "otp" && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-6">
              <AsciiBox title="OTP VERIFICATION" className="inline-block" />
            </div>

            <div className="rounded border border-border bg-card p-6">
              {/* Icon + description */}
              <div className="flex flex-col items-center gap-3 mb-6">
                <ShieldCheck className="h-8 w-8 text-primary animate-pulse" />
                <p className="text-xs font-mono text-center text-muted-foreground leading-relaxed">
                  SECURE TRANSMISSION INITIATED<br />
                  <span className="text-foreground">A 4-digit access code</span> has been dispatched
                  to<br />
                  <span className="text-primary font-bold">{email}</span>
                </p>
                <p className="text-[10px] font-mono text-muted-foreground/60">
                  CODE EXPIRES IN 5 MINUTES // ENTER TO AUTHENTICATE
                </p>
              </div>

              <form onSubmit={handleOTP} className="flex flex-col items-center gap-5">
                {/* 4-digit OTP input */}
                <InputOTP
                  maxLength={4}
                  value={otp}
                  onChange={handleOTPChange}
                  pattern={REGEXP_ONLY_DIGITS}
                  disabled={loading}
                >
                  <InputOTPGroup className="gap-3">
                    {[0, 1, 2, 3].map((i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="
                          h-14 w-14 text-2xl font-mono font-bold
                          border-2 border-border rounded-md
                          bg-muted text-foreground
                          data-[active=true]:border-primary
                          data-[active=true]:ring-2 data-[active=true]:ring-primary/30
                          transition-all duration-150
                          first:rounded-l-md last:rounded-r-md
                        "
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>

                {error && (
                  <p className="text-xs font-mono text-destructive text-center">
                    ✖ {error}
                  </p>
                )}

                {resent && (
                  <p className="text-xs font-mono text-green-500 text-center animate-fade-in">
                    ✔ NEW CODE TRANSMITTED
                  </p>
                )}

                <Button
                  variant="neon"
                  type="submit"
                  disabled={loading || otp.length !== 4}
                  className="w-full"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-blink">▊</span> VERIFYING...
                    </span>
                  ) : "▶ VERIFY ACCESS CODE"}
                </Button>

                {/* Resend + back */}
                <div className="flex items-center justify-between w-full text-xs font-mono text-muted-foreground">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="flex items-center gap-1 hover:text-primary transition-colors disabled:opacity-40"
                  >
                    <RotateCcw className="h-3 w-3" /> RESEND CODE
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep("credentials"); setError(""); setOtp(""); }}
                    className="hover:text-primary transition-colors"
                  >
                    ← BACK
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
