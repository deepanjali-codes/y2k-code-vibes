/**
 * Firebase shim that exposes the same `.from(table)` API surface
 * that the frontend pages use via  `import { supabase } from "@/lib/supabaseClient"`.
 *
 * Only the methods actually used by this project are implemented:
 *   supabase.from("reviews")
 *     .select("*").eq("user_id", uid).order("created_at", { ascending: false })
 *     .insert({ ... })
 *     .delete().eq("id", id)
 *
 * No frontend file needs to change.
 */
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderDir = { ascending: boolean };

interface FirestoreDoc {
  id: string;
  [key: string]: unknown;
}

// ─── Query builder ────────────────────────────────────────────────────────────

class QueryBuilder {
  private _table: string;
  private _filters: Array<{ field: string; value: unknown }> = [];
  private _orderField?: string;
  private _orderAsc = true;

  constructor(table: string) {
    this._table = table;
  }

  // Chainable: .eq("field", value)
  eq(field: string, value: unknown): this {
    this._filters.push({ field, value });
    return this;
  }

  // Chainable: .order("field", { ascending: bool })
  order(field: string, opts?: OrderDir): this {
    this._orderField = field;
    this._orderAsc   = opts?.ascending ?? true;
    return this;
  }

  // Terminal: .select("*")  — returns { data, error }
  async select(_columns = "*"): Promise<{ data: FirestoreDoc[] | null; error: Error | null }> {
    try {
      const colRef = collection(db, this._table);
      const constraints = [
        ...this._filters.map((f) => where(f.field, "==", f.value)),
        ...(this._orderField
          ? [orderBy(this._orderField, this._orderAsc ? "asc" : "desc")]
          : []),
      ];
      const q = query(colRef, ...constraints);
      const snap = await getDocs(q);

      const data: FirestoreDoc[] = snap.docs.map((d) => {
        const raw = d.data();
        // Convert Firestore Timestamps → ISO strings so the UI keeps working
        const converted: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(raw)) {
          converted[k] = v instanceof Timestamp ? v.toDate().toISOString() : v;
        }
        return { id: d.id, ...converted };
      });

      return { data, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  // Terminal: .insert({ ... })  — returns { data, error }
  async insert(record: Record<string, unknown>): Promise<{ data: FirestoreDoc | null; error: Error | null }> {
    try {
      const colRef = collection(db, this._table);
      const docRef = await addDoc(colRef, {
        ...record,
        created_at: serverTimestamp(),
      });
      return { data: { id: docRef.id, ...record }, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  // Terminal: .delete()  — must be chained with .eq("id", id) first
  async delete(): Promise<{ error: Error | null }> {
    const idFilter = this._filters.find((f) => f.field === "id");
    if (!idFilter) return { error: new Error("delete() requires .eq('id', value)") };
    try {
      await deleteDoc(doc(db, this._table, String(idFilter.value)));
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  }
}

// ─── Shim entry point ─────────────────────────────────────────────────────────

/**
 * Drop-in replacement for the Supabase client.
 * Only `from()` is exposed — that's all the project uses.
 */
export const supabase = {
  from(table: string) {
    return new QueryBuilder(table);
  },
};
