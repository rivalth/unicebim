"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, BarChart3, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddTransactionModal } from "@/features/transactions/add-transaction-modal";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPattern?: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Home,
    matchPattern: (pathname) => pathname.startsWith("/dashboard"),
  },
  {
    href: "/transactions/list",
    label: "İşlemler",
    icon: Wallet,
    matchPattern: (pathname) => pathname.startsWith("/transactions"),
  },
  {
    href: "/dashboard/stats",
    label: "İstatistikler",
    icon: BarChart3,
    matchPattern: (pathname) =>
      pathname.startsWith("/dashboard/stats") ||
      pathname.startsWith("/dashboard/reports") ||
      pathname.startsWith("/transactions/stats") ||
      pathname.startsWith("/transactions/charts"),
  },
  {
    href: "/profile",
    label: "Profil",
    icon: User,
    matchPattern: (pathname) => pathname.startsWith("/profile"),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="relative mx-auto flex h-16 max-w-5xl items-center justify-around">
          {/* Left side items */}
          <div className="flex items-center justify-around flex-1">
            {navItems.slice(0, 2).map((item) => {
              const Icon = item.icon;
              const isActive = item.matchPattern
                ? item.matchPattern(pathname)
                : pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-5", isActive && "stroke-[2.5]")} />
                  <span className="text-[10px] font-medium leading-none">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Center FAB (Floating Action Button) */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-10">
            <button
              onClick={() => setIsModalOpen(true)}
              className={cn(
                "flex size-16 items-center justify-center rounded-full",
                "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
                "transition-all duration-200 hover:scale-110 hover:shadow-xl hover:shadow-primary/30",
                "active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
              aria-label="Yeni işlem ekle"
            >
              <Plus className="size-7" strokeWidth={2.5} />
            </button>
          </div>

          {/* Right side items */}
          <div className="flex items-center justify-around flex-1">
            {navItems.slice(2).map((item) => {
              const Icon = item.icon;
              const isActive = item.matchPattern
                ? item.matchPattern(pathname)
                : pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-5", isActive && "stroke-[2.5]")} />
                  <span className="text-[10px] font-medium leading-none">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
        {/* Safe area inset for devices with home indicator */}
        <div className="h-safe-area-inset-bottom bg-background" />
      </nav>

      <AddTransactionModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}
