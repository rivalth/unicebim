import { redirect } from "next/navigation";

import Link from "next/link";

import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getCachedUser } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCachedUser();

  if (!user) redirect("/login");

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


