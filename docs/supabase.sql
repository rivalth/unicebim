-- UniCebim - Supabase Database Setup (MVP)
--
-- Run this script in Supabase SQL Editor.
--
-- Includes:
-- - `profiles` and `transactions` tables
-- - Suggested indexes
-- - RLS enablement + policies
-- - Optional trigger to auto-create profile on signup

-- UUID generator (preferred over uuid-ossp in Supabase examples)
create extension if not exists "pgcrypto";

-- Profiles (users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  full_name text,
  monthly_budget_goal numeric,
  monthly_fixed_expenses numeric
);

-- Backfill profiles for existing users (one-time safety net).
insert into public.profiles (id, full_name)
select u.id, u.raw_user_meta_data->>'full_name'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- If tables already exist, ensure new MVP columns are present.
-- These ALTER statements are idempotent (safe to run multiple times).
alter table public.profiles
  add column if not exists monthly_budget_goal numeric;

alter table public.profiles
  add column if not exists monthly_fixed_expenses numeric;

-- Verify columns exist (optional check - comment out if not needed)
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'profiles'
--   and column_name in ('monthly_budget_goal', 'monthly_fixed_expenses');

-- Fixed Expenses (individual monthly fixed expenses)
create table if not exists public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  amount numeric not null check (amount > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists fixed_expenses_user_id_idx on public.fixed_expenses (user_id);
create index if not exists fixed_expenses_user_id_created_at_idx on public.fixed_expenses (user_id, created_at desc);

-- Enums (optional but recommended for stronger constraints)
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'transaction_type'
  ) then
    create type public.transaction_type as enum ('income', 'expense');
  end if;
end;
$$;

-- Transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  type public.transaction_type not null,
  category text not null,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Database-level category validation: ensures category is one of the allowed values.
  -- This provides defense-in-depth alongside application-level validation (Zod schemas).
  -- Valid categories must match those defined in src/features/transactions/categories.ts
  constraint transactions_category_valid check (
    category in (
      'KYK/Burs', 'Aile Harçlığı', 'Freelance/Ek İş',  -- Income categories
      'Sosyal/Keyif', 'Beslenme', 'Ulaşım', 'Sabitler', 'Okul'  -- Expense categories
    )
  ),
  -- Ensure category matches transaction type (e.g., income categories only with income type)
  constraint transactions_category_matches_type check (
    (
      type::text = 'income' and category in ('KYK/Burs', 'Aile Harçlığı', 'Freelance/Ek İş')
    ) or (
      type::text = 'expense' and category in ('Sosyal/Keyif', 'Beslenme', 'Ulaşım', 'Sabitler', 'Okul')
    )
  )
);

create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_user_id_date_idx on public.transactions (user_id, date desc);

-- ---------------------------------------------------------------------------
-- Migrations / hardening (safe-ish to run multiple times)
-- ---------------------------------------------------------------------------

-- Ensure cascading deletes for existing foreign keys (if tables were created earlier without ON DELETE CASCADE).
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles
  add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade;

alter table public.fixed_expenses drop constraint if exists fixed_expenses_user_id_fkey;
alter table public.fixed_expenses
  add constraint fixed_expenses_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.transactions drop constraint if exists transactions_user_id_fkey;
alter table public.transactions
  add constraint transactions_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

-- Ensure amount is positive (if table already existed)
alter table public.transactions drop constraint if exists transactions_amount_positive;
alter table public.transactions
  add constraint transactions_amount_positive check (amount > 0);

-- Ensure category is one of the valid categories (if table already existed)
-- Database-level validation provides defense-in-depth alongside application-level validation
alter table public.transactions drop constraint if exists transactions_category_valid;
alter table public.transactions
  add constraint transactions_category_valid check (
    category in (
      'KYK/Burs', 'Aile Harçlığı', 'Freelance/Ek İş',  -- Income categories
      'Sosyal/Keyif', 'Beslenme', 'Ulaşım', 'Sabitler', 'Okul'  -- Expense categories
    )
  );

-- Ensure category matches type (if table already existed)
alter table public.transactions drop constraint if exists transactions_category_matches_type;
alter table public.transactions
  add constraint transactions_category_matches_type check (
    (
      type::text = 'income' and category in ('KYK/Burs', 'Aile Harçlığı', 'Freelance/Ek İş')
    ) or (
      type::text = 'expense' and category in ('Sosyal/Keyif', 'Beslenme', 'Ulaşım', 'Sabitler', 'Okul')
    )
  );

-- Best-effort: convert existing `transactions.type` from text to enum.
do $$
declare
  r record;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'type'
      and udt_name <> 'transaction_type'
  ) then
    -- Drop old check constraints that may block the type conversion.
    for r in
      select c.conname
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'transactions'
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) like '%type%'
        and pg_get_constraintdef(c.oid) like '%income%'
        and pg_get_constraintdef(c.oid) like '%expense%'
    loop
      execute format('alter table public.transactions drop constraint if exists %I', r.conname);
    end loop;

    begin
      alter table public.transactions
        alter column type type public.transaction_type using type::public.transaction_type;
    exception when others then
      -- Leave as-is if conversion fails; app-level validation still applies.
      null;
    end;
  end if;
end;
$$;

-- Sync profiles.monthly_fixed_expenses from fixed_expenses via triggers (data integrity).
create or replace function public.sync_monthly_fixed_expenses()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_total numeric;
begin
  v_user_id := coalesce(new.user_id, old.user_id);

  select coalesce(sum(amount), 0) into v_total
  from public.fixed_expenses
  where user_id = v_user_id;

  update public.profiles
  set monthly_fixed_expenses = v_total
  where id = v_user_id;

  return null;
end;
$$;

drop trigger if exists fixed_expenses_sync_monthly_total on public.fixed_expenses;
create trigger fixed_expenses_sync_monthly_total
  after insert or update or delete on public.fixed_expenses
  for each row execute procedure public.sync_monthly_fixed_expenses();

-- Backfill for existing rows (safe to run multiple times).
update public.profiles p
set monthly_fixed_expenses = coalesce((
  select sum(fe.amount)
  from public.fixed_expenses fe
  where fe.user_id = p.id
), 0);

-- Monthly summary RPC (RLS-safe: uses auth.uid())
create or replace function public.get_monthly_summary(
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  income_total numeric,
  expense_total numeric,
  net_total numeric,
  fixed_expenses_paid numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(sum(case when type::text = 'income' then amount else 0 end), 0) as income_total,
    coalesce(sum(case when type::text = 'expense' then amount else 0 end), 0) as expense_total,
    coalesce(sum(case when type::text = 'income' then amount else 0 end), 0)
      - coalesce(sum(case when type::text = 'expense' then amount else 0 end), 0) as net_total,
    coalesce(sum(case when type::text = 'expense' and category = 'Sabitler' then amount else 0 end), 0) as fixed_expenses_paid
  from public.transactions
  where user_id = auth.uid()
    and date >= p_start
    and date < p_end;
$$;

grant execute on function public.get_monthly_summary(timestamptz, timestamptz) to authenticated;

-- Transactions pagination RPC (keyset pagination; RLS-safe via auth.uid()).
create or replace function public.get_transactions_page(
  p_start timestamptz,
  p_end timestamptz,
  p_limit integer,
  p_cursor_date timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  id uuid,
  amount numeric,
  type public.transaction_type,
  category text,
  date timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select t.id, t.amount, t.type, t.category, t.date
  from public.transactions t
  where t.user_id = auth.uid()
    and t.date >= p_start
    and t.date < p_end
    and (
      p_cursor_date is null
      or t.date < p_cursor_date
      or (p_cursor_id is not null and t.date = p_cursor_date and t.id < p_cursor_id)
    )
  order by t.date desc, t.id desc
  limit case
    when p_limit is null or p_limit < 1 then 50
    when p_limit > 500 then 500
    else p_limit
  end;
$$;

grant execute on function public.get_transactions_page(timestamptz, timestamptz, integer, timestamptz, uuid) to authenticated;

-- Expense category totals RPC (for dashboard breakdown; avoids transferring full transaction history).
create or replace function public.get_expense_category_totals(
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  category text,
  total numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select t.category, coalesce(sum(t.amount), 0) as total
  from public.transactions t
  where t.user_id = auth.uid()
    and t.type::text = 'expense'
    and t.date >= p_start
    and t.date < p_end
  group by t.category
  order by total desc;
$$;

grant execute on function public.get_expense_category_totals(timestamptz, timestamptz) to authenticated;

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.fixed_expenses enable row level security;
alter table public.transactions enable row level security;

-- Profiles policies
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Fixed Expenses policies
drop policy if exists "fixed_expenses_select_own" on public.fixed_expenses;
create policy "fixed_expenses_select_own" on public.fixed_expenses
  for select using (auth.uid() = user_id);

drop policy if exists "fixed_expenses_insert_own" on public.fixed_expenses;
create policy "fixed_expenses_insert_own" on public.fixed_expenses
  for insert with check (auth.uid() = user_id);

drop policy if exists "fixed_expenses_update_own" on public.fixed_expenses;
create policy "fixed_expenses_update_own" on public.fixed_expenses
  for update using (auth.uid() = user_id);

drop policy if exists "fixed_expenses_delete_own" on public.fixed_expenses;
create policy "fixed_expenses_delete_own" on public.fixed_expenses
  for delete using (auth.uid() = user_id);

-- Transactions policies
drop policy if exists "tx_select_own" on public.transactions;
create policy "tx_select_own" on public.transactions
  for select using (auth.uid() = user_id);

drop policy if exists "tx_insert_own" on public.transactions;
create policy "tx_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "tx_update_own" on public.transactions;
create policy "tx_update_own" on public.transactions
  for update using (auth.uid() = user_id);

drop policy if exists "tx_delete_own" on public.transactions;
create policy "tx_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

-- Optional: auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Rate limiting (serverless-friendly, DB-backed)
--
-- Why:
-- - Vercel/serverless has no durable in-memory store.
-- - We avoid external services (Redis) by using Postgres atomic upserts.
--
-- Notes:
-- - The table is NOT readable/writable by anon/authenticated users.
-- - Only the SECURITY DEFINER function is executable and returns a boolean.
-- - We prune old buckets best-effort inside the function.
-- ---------------------------------------------------------------------------

create table if not exists public.rate_limits (
  key text not null,
  bucket timestamp with time zone not null,
  count integer not null default 1,
  primary key (key, bucket)
);

create index if not exists rate_limits_bucket_idx on public.rate_limits (bucket desc);

alter table public.rate_limits enable row level security;

revoke all on table public.rate_limits from anon, authenticated;

create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_bucket timestamptz;
  v_count integer;
begin
  if p_key is null or length(p_key) = 0 then
    return true;
  end if;

  if p_limit is null or p_limit <= 0 then
    return true;
  end if;

  if p_window_seconds is null or p_window_seconds <= 0 then
    return true;
  end if;

  -- Bucket start timestamp aligned to window size.
  v_bucket := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits (key, bucket, count)
  values (p_key, v_bucket, 1)
  on conflict (key, bucket) do update
    set count = public.rate_limits.count + 1
  returning count into v_count;

  -- Best-effort pruning to keep the table bounded.
  delete from public.rate_limits where bucket < (v_now - interval '2 days');

  return v_count <= p_limit;
end;
$$;

grant execute on function public.check_rate_limit(text, integer, integer) to anon, authenticated;


