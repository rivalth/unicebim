import Link from "next/link";
import { redirect } from "next/navigation";

import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/logo";

export const dynamic = "force-dynamic";

export default async function AuthLayout({
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
    // "Auth session missing!" is expected for unauthenticated visitors.
    if (error.message !== "Auth session missing!") {
      logger.warn("AuthLayout.getUser failed", { message: error.message });
    }
  }

  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="transition-opacity hover:opacity-80"
            aria-label="UniCebim Ana Sayfa"
          >
            <Logo width={24} height={24} showText textClassName="text-lg" />
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Ana sayfa
          </Link>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}


