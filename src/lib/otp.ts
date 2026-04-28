/**
 * OTP utilities — generate, store in Firestore, verify, and (optionally) email.
 *
 * Email sending uses EmailJS (client-side, free tier).
 * If EmailJS env vars are not set, the OTP is logged to the console only —
 * useful for local development.
 */
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const OTP_COLLECTION = "otp_verifications";
const OTP_EXPIRY_MS  = 5 * 60 * 1000; // 5 minutes

// ── Generate ──────────────────────────────────────────────────────────────────

/** Returns a zero-padded 4-digit string, e.g. "0847" */
export function generateOTP(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ── Store ─────────────────────────────────────────────────────────────────────

/** Persists a fresh OTP for the given email and returns the code. */
export async function storeOTP(email: string): Promise<string> {
  const otp = generateOTP();
  await addDoc(collection(db, OTP_COLLECTION), {
    email,
    otp,
    expiresAt: Timestamp.fromMillis(Date.now() + OTP_EXPIRY_MS),
    used: false,
    createdAt: Timestamp.now(),
  });
  return otp;
}

// ── Verify ────────────────────────────────────────────────────────────────────

/**
 * Returns true if the OTP is valid (correct, unused, not expired).
 * Marks it as used on success.
 */
export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  const q = query(
    collection(db, OTP_COLLECTION),
    where("email", "==", email),
    where("otp",   "==", otp),
    where("used",  "==", false)
  );

  const snap = await getDocs(q);

  for (const docSnap of snap.docs) {
    const data      = docSnap.data();
    const expiresAt = (data.expiresAt as Timestamp).toMillis();
    if (Date.now() < expiresAt) {
      await updateDoc(doc(db, OTP_COLLECTION, docSnap.id), { used: true });
      return true;
    }
  }

  return false;
}

// ── Send via EmailJS ──────────────────────────────────────────────────────────

/**
 * Sends the OTP to the user's email via EmailJS.
 *
 * Requires these env vars in .env:
 *   VITE_EMAILJS_SERVICE_ID
 *   VITE_EMAILJS_TEMPLATE_ID
 *   VITE_EMAILJS_PUBLIC_KEY
 *
 * If any are missing, the OTP is only logged to the browser console (dev mode).
 */
export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    // Dev fallback — OTP visible in browser console
    console.info(
      `%c[Codelens OTP] Your 4-digit code for ${email} is: ${otp}`,
      "font-size:16px;color:#00ff41;background:#000;padding:4px 8px"
    );
    return;
  }

  // Lazy-load emailjs so it doesn't bloat the main bundle
  const emailjs = await import("@emailjs/browser");
  await emailjs.send(
    serviceId,
    templateId,
    { to_email: email, otp, app_name: "Codelens" },
    publicKey
  );
}

// ── Combined helper ───────────────────────────────────────────────────────────

/** Generate, store, and dispatch OTP in one call. */
export async function dispatchOTP(email: string): Promise<void> {
  const otp = await storeOTP(email);
  await sendOTPEmail(email, otp);
}
