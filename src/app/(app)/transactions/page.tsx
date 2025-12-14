import { redirect } from "next/navigation";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  // Redirect to list page by default
  const sp = await Promise.resolve(searchParams);
  const monthParam = typeof sp?.month === "string" ? sp.month : undefined;
  const searchParamsString = monthParam ? `?month=${encodeURIComponent(monthParam)}` : "";
  redirect(`/transactions/list${searchParamsString}`);
}
