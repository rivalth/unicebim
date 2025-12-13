import { redirect } from "next/navigation";

import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    logger.warn("AuthLayout.getUser failed", { message: error.message });
  }

  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      {children}
    </div>
  );
}


