import { redirect } from "next/navigation";

import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";

import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

async function ensureProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  fullName?: unknown,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logger.warn("ensureProfile.select failed", { code: error.code, message: error.message });
    return;
  }

  if (data) return;

  const { error: insertError } = await supabase.from("profiles").insert({
    id: userId,
    full_name: typeof fullName === "string" ? fullName : null,
  });

  if (insertError) {
    logger.warn("ensureProfile.insert failed", {
      code: insertError.code,
      message: insertError.message,
    });
  }
}

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.warn("AppLayout.getUser failed", { message: error.message });
  }

  if (!user) redirect("/login");

  await ensureProfile(supabase, user.id, user.user_metadata?.full_name);

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link className="text-sm font-semibold tracking-tight" href="/dashboard">
              UniCebim
            </Link>
            <nav className="flex items-center gap-3 text-sm text-muted-foreground">
              <Link className="hover:text-foreground" href="/dashboard">
                Dashboard
              </Link>
              <Link className="hover:text-foreground" href="/transactions">
                İşlemler
              </Link>
            </nav>
          </div>
          <form action={logoutAction}>
            <Button size="sm" variant="outline" type="submit">
              Çıkış
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}


