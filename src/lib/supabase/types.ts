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
          meal_price: number | null;
          next_income_date: string | null;
          avatar_url: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          monthly_budget_goal?: number | null;
          monthly_fixed_expenses?: number | null;
          meal_price?: number | null;
          next_income_date?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          monthly_budget_goal?: number | null;
          monthly_fixed_expenses?: number | null;
          meal_price?: number | null;
          next_income_date?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      fixed_expenses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          amount?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fixed_expenses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          balance: number;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          balance?: number;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          balance?: number;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: "income" | "expense";
          category: string;
          date: string;
          wallet_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: "income" | "expense";
          category: string;
          date?: string;
          wallet_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          type?: "income" | "expense";
          category?: string;
          date?: string;
          wallet_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_rate_limit: {
        Args: {
          p_key: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      get_monthly_summary: {
        Args: {
          p_start: string;
          p_end: string;
        };
        Returns: Array<{
          income_total: number;
          expense_total: number;
          net_total: number;
          fixed_expenses_paid: number;
        }>;
      };
      get_transactions_page: {
        Args: {
          p_start: string;
          p_end: string;
          p_limit: number;
          p_cursor_date?: string | null;
          p_cursor_id?: string | null;
        };
        Returns: Array<{
          id: string;
          amount: number;
          type: "income" | "expense";
          category: string;
          date: string;
        }>;
      };
      get_expense_category_totals: {
        Args: {
          p_start: string;
          p_end: string;
        };
        Returns: Array<{
          category: string;
          total: number;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}


