import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let settled = false;

    const settle = (u: User | null = null) => {
      if (settled) return;
      settled = true;
      setUser(u);
      setLoading(false);
    };

    // Safety timeout — if Firebase never calls back, stop waiting after 5 s
    const timeout = setTimeout(() => {
      if (!settled) {
        console.warn("[Codelens] Firebase auth timed out — continuing as guest.");
        settle(null);
      }
    }, 5000);

    try {
      const unsub = onAuthStateChanged(
        auth,
        (u) => {
          clearTimeout(timeout);
          settle(u);
        },
        (err) => {
          console.error("[Codelens] Firebase auth error:", err);
          clearTimeout(timeout);
          settle(null);
        },
      );

      return () => {
        clearTimeout(timeout);
        unsub();
      };
    } catch (err) {
      // If onAuthStateChanged itself throws (e.g. auth object is broken)
      console.error("[Codelens] Failed to set up auth listener:", err);
      clearTimeout(timeout);
      settle(null);
      return () => clearTimeout(timeout);
    }
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string, name?: string) => {
    const { user: u } = await createUserWithEmailAndPassword(auth, email, password);
    if (name && u) await updateProfile(u, { displayName: name });
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
