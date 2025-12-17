import { redirect } from "next/navigation";

import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { UserMenu } from "@/components/navigation/user-menu";
import { Logo } from "@/components/brand/logo";
import { getCachedUser } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ChevronDown } from "lucide-react";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCachedUser();

  if (!user) redirect("/login");

  // Fetch profile data for user menu
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  // Extract profile data for user menu (don't use mapProfileRow since we only need these fields)
  const avatarUrl = profile?.avatar_url ?? null;
  const fullName = profile?.full_name ?? null;

  return (
    <div className="min-h-screen pb-safe-area-inset-bottom">
      {/* Desktop Header */}
      <header className="hidden border-b md:block">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/dashboard">
              <Logo width={20} height={20} showText textClassName="text-sm" />
            </Link>
            <nav className="flex items-center gap-2 sm:gap-3 text-sm">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground">
                  Dashboard
                  <ChevronDown className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>Dashboard</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">Genel Bakış</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/stats">İstatistikler</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/reports">Raporlar</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/subscriptions">Abonelikler</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground">
                  İşlemler
                  <ChevronDown className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/transactions/list">Liste</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/transactions/stats">İstatistikler</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/transactions/charts">Grafikler</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground">
                  Raporlar
                  <ChevronDown className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>Raporlar</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/reports">Detaylı Rapor Oluştur</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground">
                  Araçlar
                  <ChevronDown className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>Araçlar</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/tools/bill-splitter">Hesap Bölücü</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <UserMenu avatarUrl={avatarUrl} fullName={fullName} email={user.email ?? null} />
          </div>
        </div>
      </header>

      {/* Mobile Header (simplified) */}
      <header className="border-b md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link className="text-sm font-semibold tracking-tight" href="/dashboard">
            UniCebim
          </Link>
          <UserMenu avatarUrl={avatarUrl} fullName={fullName} email={user.email ?? null} />
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 sm:py-8 md:py-10 pb-24 md:pb-10">
        {children}
      </main>

      {/* Bottom Navigation (Mobile only) */}
      <BottomNav />
    </div>
  );
}


