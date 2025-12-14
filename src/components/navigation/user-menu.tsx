"use client";

import * as React from "react";
import Link from "next/link";
import { useTransition } from "react";
import { LogOut, User, Settings, ChevronDown } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  avatarUrl?: string | null;
  fullName?: string | null;
  email?: string | null;
};

export function UserMenu({ avatarUrl, fullName, email }: UserMenuProps) {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      // Redirect will happen via logoutAction
    });
  };

  const displayName = fullName || email?.split("@")[0] || "Kullanıcı";
  const displayEmail = email || "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors",
          "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
          "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
        )}
      >
        <Avatar src={avatarUrl} fallback={displayName} size="sm" />
        <span className="hidden sm:inline-block max-w-[120px] truncate font-medium">
          {displayName}
        </span>
        <ChevronDown className="hidden sm:block size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {displayEmail && (
              <p className="text-xs leading-none text-muted-foreground truncate">{displayEmail}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center">
            <User className="mr-2 size-4" />
            <span>Profil</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center">
            <Settings className="mr-2 size-4" />
            <span>Ayarlar</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isPending}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="mr-2 size-4" />
          <span>{isPending ? "Çıkış yapılıyor..." : "Çıkış Yap"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
