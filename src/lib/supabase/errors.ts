export type PostgrestErrorLike = {
  code?: string;
  message?: string;
};

/**
 * Supabase/PostgREST error when a table is missing from schema cache.
 *
 * Common causes:
 * - The SQL schema was not created in the current Supabase project
 * - Schema cache not refreshed after creating tables
 * - The app is pointing to the wrong Supabase URL/project
 */
export function isMissingTableError(error: unknown): error is Required<PostgrestErrorLike> {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as PostgrestErrorLike).code === "PGRST205"
  );
}


