export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Minimal Supabase Database typing for UniCebim.
 *
 * Keep in sync with the SQL schema in Supabase:
 * - `profiles`
 * - `transactions`
 *
 * Note: Supabase/PostgREST may serialize some Postgres types (e.g. `numeric`)
 * as strings at runtime depending on configuration. We treat `numeric` fields as
 * `number` at the type level for ergonomic app code, and validate/convert at boundaries.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          monthly_budget_goal: number | null;
          monthly_fixed_expenses: number | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          monthly_budget_goal?: number | null;
          monthly_fixed_expenses?: number | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          monthly_budget_goal?: number | null;
          monthly_fixed_expenses?: number | null;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: "income" | "expense";
          category: string;
          date: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: "income" | "expense";
          category: string;
          date?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          type?: "income" | "expense";
          category?: string;
          date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}


