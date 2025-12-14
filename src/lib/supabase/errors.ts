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
export function isMissingTableError(
  error: unknown,
): error is { code: "PGRST205"; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as PostgrestErrorLike).code === "PGRST205" &&
    typeof (error as PostgrestErrorLike).message === "string"
  );
}

/**
 * Supabase/PostgREST error when an RPC function is missing.
 *
 * Common causes:
 * - SQL migrations not applied (new function not created)
 * - Schema cache not refreshed
 */
export function isMissingRpcFunctionError(
  error: unknown,
): error is { code: "PGRST202" | string; message: string } {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as PostgrestErrorLike).message === "string"
  ) {
    const msg = (error as PostgrestErrorLike).message!;
    const code = "code" in error ? (error as PostgrestErrorLike).code : undefined;

    if (code === "PGRST202") return true;

    // Defensive fallback: PostgREST may return varying codes/messages depending on version.
    if (msg.includes("Could not find the function") || msg.includes("function") && msg.includes("does not exist")) {
      return true;
    }
  }

  return false;
}


