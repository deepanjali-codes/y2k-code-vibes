/* eslint-disable react-refresh/only-export-components */
/**
 * Firebase Auth hook with 4-digit OTP verification.
 *
 * Auth flow:
 *   1. signUp / signIn — validate credentials, sign user OUT, send OTP
 *   2. confirmOTP      — verify OTP code, sign user back IN permanently
 *   3. resendOTP       — generate + send a fresh OTP for the pending email
 *
 * Public API shape (unchanged from before for all consumers):
 *   user, session, loading, signUp, signIn, signOut
 * New additions:
 *   otpPending, confirmOTP, resendOTP
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { dispatchOTP, verifyOTP } from "@/lib/otp";

// ── Compat types (same shape as Supabase — pages use user.id) ─────────────────

export type User    = FirebaseUser & { id: string };
export interface Session { user: User }

// ── Context shape ─────────────────────────────────────────────────────────────

interface AuthContextType {
  user:        User | null;
  session:     Session | null;
  loading:     boolean;
  otpPending:  boolean;
  signUp:      (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn:      (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut:     () => Promise<void>;
  confirmOTP:  (otp: string) => Promise<{ error: Error | null }>;
  resendOTP:   () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── Helper: wrap Firebase user → add `.id` alias ──────────────────────────────

function wrapUser(fb: FirebaseUser): User {
  return Object.assign(fb, { id: fb.uid }) as User;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  // Only set after OTP is confirmed — this is the "real" authenticated user
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // OTP flow state (in-memory only, never persisted)
  const [otpPending,  setOtpPending]  = useState(false);
  const pendingEmail  = useRef<string>("");
  const pendingPass   = useRef<string>("");
  const pendingName   = useRef<string | undefined>(undefined);
  const pendingIsNew  = useRef(false);        // true = signup, false = signin

  // ── Auth state listener ──────────────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && !otpPending) {
        // Only expose user if OTP has been verified (no pending state)
        const wrapped = wrapUser(fbUser);
        setUser(wrapped);
        setSession({ user: wrapped });
      } else {
        setUser(null);
        setSession(null);
      }
      setLoading(false);
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // intentionally not in deps — otpPending managed manually

  // ── Internal: start OTP challenge ────────────────────────────────────────

  async function startOTPChallenge(email: string): Promise<{ error: Error | null }> {
    try {
      await dispatchOTP(email);
      // Hide the Firebase user from context while OTP is pending
      setUser(null);
      setSession(null);
      setOtpPending(true);
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  }

  // ── signUp ────────────────────────────────────────────────────────────────

  const signUp = async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<{ error: Error | null }> => {
    try {
      // Create the Firebase account
      const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) await updateProfile(fbUser, { displayName });

      // Immediately sign out — user must pass OTP before getting access
      await firebaseSignOut(auth);

      // Store credentials so confirmOTP can sign back in
      pendingEmail.current = email;
      pendingPass.current  = password;
      pendingName.current  = displayName;
      pendingIsNew.current = true;

      return startOTPChallenge(email);
    } catch (e) {
      return { error: e as Error };
    }
  };

  // ── signIn ────────────────────────────────────────────────────────────────

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null }> => {
    try {
      // Validate credentials (will throw if wrong)
      await signInWithEmailAndPassword(auth, email, password);

      // Sign out immediately — OTP gate
      await firebaseSignOut(auth);

      // Store credentials for confirmOTP
      pendingEmail.current = email;
      pendingPass.current  = password;
      pendingIsNew.current = false;

      return startOTPChallenge(email);
    } catch (e) {
      return { error: e as Error };
    }
  };

  // ── confirmOTP ────────────────────────────────────────────────────────────

  const confirmOTP = async (otp: string): Promise<{ error: Error | null }> => {
    try {
      const valid = await verifyOTP(pendingEmail.current, otp);
      if (!valid) {
        return { error: new Error("Invalid or expired OTP. Please try again.") };
      }

      // OTP correct — sign back in permanently
      const { user: fbUser } = await signInWithEmailAndPassword(
        auth,
        pendingEmail.current,
        pendingPass.current
      );

      const wrapped = wrapUser(fbUser);
      setOtpPending(false);
      setUser(wrapped);
      setSession({ user: wrapped });

      // Clear sensitive pending state
      pendingEmail.current = "";
      pendingPass.current  = "";
      pendingName.current  = undefined;

      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  // ── resendOTP ─────────────────────────────────────────────────────────────

  const resendOTP = async (): Promise<{ error: Error | null }> => {
    if (!pendingEmail.current) {
      return { error: new Error("No pending session. Please start over.") };
    }
    try {
      await dispatchOTP(pendingEmail.current);
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  // ── signOut ───────────────────────────────────────────────────────────────

  const signOut = async () => {
    setOtpPending(false);
    setUser(null);
    setSession(null);
    pendingEmail.current = "";
    pendingPass.current  = "";
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, otpPending, signUp, signIn, signOut, confirmOTP, resendOTP }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
