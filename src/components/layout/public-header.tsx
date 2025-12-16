"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

interface PublicHeaderProps {
  /**
   * Whether the user is authenticated (has an active session).
   */
  isAuthenticated?: boolean;
}

export function PublicHeader({ isAuthenticated = false }: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="banner"
    >
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="transition-opacity hover:opacity-80"
          aria-label="UniCebim Ana Sayfa"
        >
          <Logo width={48} height={48} showText textClassName="text-lg" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/#features">Özellikler</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/#faq">SSS</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/about">Hakkımızda</Link>
          </Button>
          {isAuthenticated ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Yönetim Paneli</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Giriş</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Kayıt ol</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menüyü aç/kapat"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </Button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="border-t md:hidden"
          role="menu"
          aria-label="Mobil menü"
        >
          <div className="mx-auto w-full max-w-5xl px-6 py-4 space-y-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Link href="/#features">Özellikler</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Link href="/#faq">SSS</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Link href="/about">Hakkımızda</Link>
            </Button>
            {isAuthenticated ? (
              <Button
                asChild
                size="sm"
                className="w-full justify-start"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link href="/dashboard">Yönetim Paneli</Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link href="/login">Giriş</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link href="/register">Kayıt ol</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

