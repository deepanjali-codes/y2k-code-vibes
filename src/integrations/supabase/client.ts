/**
 * Legacy re-export kept for import-path compatibility.
 * The actual implementation now lives in @/lib/supabaseClient (Firebase-backed shim).
 *
 * Usage (unchanged):
 *   import { supabase } from "@/integrations/supabase/client";
 */
export { supabase } from "@/lib/supabaseClient";