"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TransactionHistory, { type TransactionRow } from "@/features/transactions/transaction-history";
import { ALL_CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/features/transactions/categories";

type ListTransactionsResponse = {
  transactions: TransactionRow[];
  nextCursor?: string | null;
};

export default function TransactionHistoryPaginated({
  month,
  initialTransactions,
  initialNextCursor,
  pageSize = 50,
}: {
  month: string; // YYYY-MM
  initialTransactions: TransactionRow[];
  initialNextCursor: string | null;
  pageSize?: number;
}) {
  const [transactions, setTransactions] = React.useState<TransactionRow[]>(initialTransactions);
  const [nextCursor, setNextCursor] = React.useState<string | null>(initialNextCursor);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");

  const allowedCategories = React.useMemo(() => {
    if (typeFilter === "income") return INCOME_CATEGORIES as readonly string[];
    if (typeFilter === "expense") return EXPENSE_CATEGORIES as readonly string[];
    return ALL_CATEGORIES as readonly string[];
  }, [typeFilter]);

  React.useEffect(() => {
    if (categoryFilter === "all") return;
    if (!allowedCategories.includes(categoryFilter)) setCategoryFilter("all");
  }, [allowedCategories, categoryFilter]);

  const filteredTransactions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (q && !t.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [transactions, query, typeFilter, categoryFilter]);

  const loadMore = async () => {
    if (!nextCursor) return;

    setError(null);
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("month", month);
      params.set("limit", String(pageSize));
      params.set("cursor", nextCursor);

      const res = await fetch(`/api/transactions?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? "İşlemler yüklenemedi. Lütfen tekrar deneyin.");
        return;
      }

      const data = (await res.json()) as ListTransactionsResponse;
      const incoming = Array.isArray(data.transactions) ? data.transactions : [];

      setTransactions((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        const merged = [...prev];
        for (const t of incoming) {
          if (seen.has(t.id)) continue;
          merged.push(t);
          seen.add(t.id);
        }
        return merged;
      });

      setNextCursor(data.nextCursor ?? null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="tx-search" className="text-xs text-muted-foreground">
            Ara
          </Label>
          <Input
            id="tx-search"
            placeholder="Kategoriye göre ara (örn: Beslenme)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="tx-type" className="text-xs text-muted-foreground">
            Tür
          </Label>
          <select
            id="tx-type"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | "income" | "expense")}
          >
            <option value="all">Tümü</option>
            <option value="income">Gelir</option>
            <option value="expense">Gider</option>
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="tx-category" className="text-xs text-muted-foreground">
            Kategori
          </Label>
          <select
            id="tx-category"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Tümü</option>
            {allowedCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {transactions.length > 0 && filteredTransactions.length === 0 ? (
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          <p>Filtreye uygun işlem bulunamadı.</p>
          <div className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuery("");
                setTypeFilter("all");
                setCategoryFilter("all");
              }}
            >
              Filtreleri temizle
            </Button>
          </div>
        </div>
      ) : (
        <TransactionHistory transactions={filteredTransactions} />
      )}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {nextCursor ? (
        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={loadMore} disabled={isLoading}>
            {isLoading ? "Yükleniyor..." : "Daha fazla yükle"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}


