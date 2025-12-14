import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

const SUPABASE_TEST_URL = process.env.SUPABASE_TEST_URL;
const SUPABASE_TEST_ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY;
const SUPABASE_TEST_SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

const hasEnv = Boolean(SUPABASE_TEST_URL && SUPABASE_TEST_ANON_KEY && SUPABASE_TEST_SERVICE_ROLE_KEY);

if (!hasEnv) {
  describe.skip("RLS integration (requires Supabase test env)", () => {
    it("skipped: missing SUPABASE_TEST_* env vars", () => {
      expect(true).toBe(true);
    });
  });
} else {
  describe("RLS integration (requires Supabase test env)", () => {
  const testRunId = crypto.randomUUID();
  const password = "Test12345!"; // test-only

  const email1 = `rls.user1+${testRunId}@example.com`;
  const email2 = `rls.user2+${testRunId}@example.com`;

  const admin = createClient<Database>(SUPABASE_TEST_URL!, SUPABASE_TEST_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userClient1 = createClient<Database>(SUPABASE_TEST_URL!, SUPABASE_TEST_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const userClient2 = createClient<Database>(SUPABASE_TEST_URL!, SUPABASE_TEST_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId1: string;
  let userId2: string;
  let tx1Id: string;
  let tx2Id: string;

  beforeAll(async () => {
    const { data: u1, error: e1 } = await admin.auth.admin.createUser({
      email: email1,
      password,
      email_confirm: true,
    });
    if (e1) throw e1;
    if (!u1.user) throw new Error("Failed to create user1");
    userId1 = u1.user.id;

    const { data: u2, error: e2 } = await admin.auth.admin.createUser({
      email: email2,
      password,
      email_confirm: true,
    });
    if (e2) throw e2;
    if (!u2.user) throw new Error("Failed to create user2");
    userId2 = u2.user.id;

    // Sign in as both users to establish auth context for RLS.
    const { error: s1 } = await userClient1.auth.signInWithPassword({ email: email1, password });
    if (s1) throw s1;
    const { error: s2 } = await userClient2.auth.signInWithPassword({ email: email2, password });
    if (s2) throw s2;

    const nowIso = new Date().toISOString();

    const { data: tx1, error: t1 } = await admin
      .from("transactions")
      .insert({ user_id: userId1, amount: 10, type: "expense", category: "Beslenme", date: nowIso })
      .select("id")
      .single();
    if (t1) throw t1;
    tx1Id = tx1.id;

    const { data: tx2, error: t2 } = await admin
      .from("transactions")
      .insert({ user_id: userId2, amount: 20, type: "expense", category: "Ulaşım", date: nowIso })
      .select("id")
      .single();
    if (t2) throw t2;
    tx2Id = tx2.id;
  });

  afterAll(async () => {
    // Cleanup transactions first (in case cascades are not configured in the test project).
    if (tx1Id) await admin.from("transactions").delete().eq("id", tx1Id);
    if (tx2Id) await admin.from("transactions").delete().eq("id", tx2Id);

    // Delete users (should cascade to profiles and other rows if FK cascades are configured).
    if (userId1) await admin.auth.admin.deleteUser(userId1);
    if (userId2) await admin.auth.admin.deleteUser(userId2);
  });

  it("user1 cannot read user2's transaction", async () => {
    const { data, error } = await userClient1
      .from("transactions")
      .select("id, user_id")
      .eq("id", tx2Id)
      .maybeSingle();

    // With RLS, this should look like "not found" rather than a hard error.
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("user2 cannot read user1's transaction", async () => {
    const { data, error } = await userClient2
      .from("transactions")
      .select("id, user_id")
      .eq("id", tx1Id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("each user only sees own rows in list queries", async () => {
    const { data: list1, error: e1 } = await userClient1.from("transactions").select("user_id");
    expect(e1).toBeNull();
    expect((list1 ?? []).every((r) => r.user_id === userId1)).toBe(true);

    const { data: list2, error: e2 } = await userClient2.from("transactions").select("user_id");
    expect(e2).toBeNull();
    expect((list2 ?? []).every((r) => r.user_id === userId2)).toBe(true);
  });

  it("user1 cannot update user2's transaction", async () => {
    const { error } = await userClient1
      .from("transactions")
      .update({ amount: 999 })
      .eq("id", tx2Id);

    // RLS should prevent this update
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501"); // PostgreSQL permission denied error code
  });

  it("user1 cannot delete user2's transaction", async () => {
    const { error } = await userClient1.from("transactions").delete().eq("id", tx2Id);

    // RLS should prevent this deletion
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("user1 can only read own profile", async () => {
    const { data: ownProfile, error: e1 } = await userClient1
      .from("profiles")
      .select("id")
      .eq("id", userId1)
      .maybeSingle();
    expect(e1).toBeNull();
    expect(ownProfile?.id).toBe(userId1);

    const { data: otherProfile, error: e2 } = await userClient1
      .from("profiles")
      .select("id")
      .eq("id", userId2)
      .maybeSingle();
    expect(e2).toBeNull();
    expect(otherProfile).toBeNull(); // RLS should hide other user's profile
  });

  it("user1 can only update own profile", async () => {
    const { error: ownUpdate } = await userClient1
      .from("profiles")
      .update({ full_name: "Updated Name" })
      .eq("id", userId1);
    expect(ownUpdate).toBeNull();

    const { error: otherUpdate } = await userClient1
      .from("profiles")
      .update({ full_name: "Hacked Name" })
      .eq("id", userId2);
    expect(otherUpdate).not.toBeNull();
    expect(otherUpdate?.code).toBe("42501");
  });

  let fixedExpense1Id: string;
  let fixedExpense2Id: string;

  it("user1 can create own fixed expense", async () => {
    const { data, error } = await userClient1
      .from("fixed_expenses")
      .insert({ name: "Test Expense 1", amount: 100 })
      .select("id")
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBeDefined();
    fixedExpense1Id = data.id;
  });

  it("user1 cannot read user2's fixed expenses", async () => {
    // First, create a fixed expense for user2
    const { data: fe2, error: e2 } = await admin
      .from("fixed_expenses")
      .insert({ user_id: userId2, name: "User2 Expense", amount: 200 })
      .select("id")
      .single();
    expect(e2).toBeNull();
    fixedExpense2Id = fe2.id;

    // user1 should not see user2's fixed expense
    const { data: list, error } = await userClient1.from("fixed_expenses").select("user_id, id");
    expect(error).toBeNull();
    expect((list ?? []).every((fe) => fe.user_id === userId1)).toBe(true);
    expect((list ?? []).some((fe) => fe.id === fixedExpense2Id)).toBe(false);
  });

  it("user1 cannot update user2's fixed expense", async () => {
    const { error } = await userClient1
      .from("fixed_expenses")
      .update({ amount: 999 })
      .eq("id", fixedExpense2Id);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("user1 cannot delete user2's fixed expense", async () => {
    const { error } = await userClient1.from("fixed_expenses").delete().eq("id", fixedExpense2Id);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
  });

  afterAll(async () => {
    // Cleanup fixed expenses
    if (fixedExpense1Id) await admin.from("fixed_expenses").delete().eq("id", fixedExpense1Id);
    if (fixedExpense2Id) await admin.from("fixed_expenses").delete().eq("id", fixedExpense2Id);

    // Cleanup transactions first (in case cascades are not configured in the test project).
    if (tx1Id) await admin.from("transactions").delete().eq("id", tx1Id);
    if (tx2Id) await admin.from("transactions").delete().eq("id", tx2Id);

    // Delete users (should cascade to profiles and other rows if FK cascades are configured).
    if (userId1) await admin.auth.admin.deleteUser(userId1);
    if (userId2) await admin.auth.admin.deleteUser(userId2);
  });
  });
}


