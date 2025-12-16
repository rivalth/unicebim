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

-- Yemekhane Endeksi: Kullanıcının okulda bir öğün yemek fiyatı (TL)
-- Bu değer, bakiyeyi "kaç öğün yemek" olarak göstermek için kullanılır
alter table public.profiles
  add column if not exists meal_price numeric check (meal_price is null or meal_price > 0);

-- Burs Günü Geri Sayımı: Bir sonraki gelir/burs tarihi
-- Kullanıcının bir sonraki gelir gününü belirlemesi için (örn: KYK burs günü)
alter table public.profiles
  add column if not exists next_income_date date;

-- Profil Fotoğrafı: Kullanıcının profil fotoğrafının Supabase Storage'daki URL'i
alter table public.profiles
  add column if not exists avatar_url text;

-- Verify columns exist (optional check - comment out if not needed)
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'profiles'
--   and column_name in ('monthly_budget_goal', 'monthly_fixed_expenses', 'meal_price', 'next_income_date');

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

-- Wallets (Micro-wallets: Nakit, Banka, Yemekhane Kartı, Akbil, vb.)
-- Öğrencilerin farklı "cüzdanlarında" olan paralarını takip eder
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  balance numeric not null default 0 check (balance >= 0),
  is_default boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists wallets_user_id_idx on public.wallets (user_id);
-- Her kullanıcı için sadece bir default wallet olabilir (partial unique index)
create unique index if not exists wallets_one_default_per_user_idx on public.wallets (user_id)
  where (is_default = true);

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
  -- Micro-wallets: İşlem hangi cüzdandan yapıldı (opsiyonel, null ise default wallet)
  -- Note: Foreign key constraint added in migration section below
  wallet_id uuid,
  -- Description/Note: Optional user-provided description for the transaction
  description text,
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
-- wallet_id index added in migration section below (after column is created)

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
-- First, update any invalid categories to a default valid value based on transaction type
do $$
begin
  -- Fix invalid income categories (set to default: 'KYK/Burs')
  update public.transactions
  set category = 'KYK/Burs'
  where type::text = 'income'
    and category not in ('KYK/Burs', 'Aile Harçlığı', 'Freelance/Ek İş');

  -- Fix invalid expense categories (set to default: 'Beslenme')
  update public.transactions
  set category = 'Beslenme'
  where type::text = 'expense'
    and category not in ('Sosyal/Keyif', 'Beslenme', 'Ulaşım', 'Sabitler', 'Okul');
end;
$$;

-- Now add the constraint (after cleaning invalid data)
alter table public.transactions drop constraint if exists transactions_category_valid;
alter table public.transactions
  add constraint transactions_category_valid check (
    category in (
      'KYK/Burs', 'Aile Harçlığı', 'Freelance/Ek İş',  -- Income categories
      'Sosyal/Keyif', 'Beslenme', 'Ulaşım', 'Sabitler', 'Okul'  -- Expense categories
    )
  );

-- Ensure category matches type (if table already existed)
-- Data cleaning already handled above, so we can safely add the constraint
alter table public.transactions drop constraint if exists transactions_category_matches_type;
alter table public.transactions
  add constraint transactions_category_matches_type check (
    (
      type::text = 'income' and category in ('KYK/Burs', 'Aile Harçlığı', 'Freelance/Ek İş')
    ) or (
      type::text = 'expense' and category in ('Sosyal/Keyif', 'Beslenme', 'Ulaşım', 'Sabitler', 'Okul')
    )
  );

-- Add wallet_id column to transactions if it doesn't exist (migration for existing tables)
alter table public.transactions
  add column if not exists wallet_id uuid;

-- Add description column to transactions if it doesn't exist (migration for existing tables)
-- Optional text field with max length constraint enforced at application level (500 chars)
alter table public.transactions
  add column if not exists description text check (description is null or length(description) <= 500);

-- Add foreign key constraint for wallet_id (only if wallets table exists)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'wallets') then
    -- Drop existing foreign key if it exists (in case of re-running)
    alter table public.transactions drop constraint if exists transactions_wallet_id_fkey;
    -- Add foreign key constraint
    alter table public.transactions
      add constraint transactions_wallet_id_fkey 
      foreign key (wallet_id) references public.wallets(id) on delete set null;
  end if;
end;
$$;

-- Ensure wallet_id index exists (safe to run multiple times)
create index if not exists transactions_wallet_id_idx on public.transactions (wallet_id);

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
-- Drop existing function first to allow return type changes (description field added).
drop function if exists public.get_transactions_page(timestamptz, timestamptz, integer, timestamptz, uuid);

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
  date timestamptz,
  description text
)
language sql
stable
security invoker
set search_path = public
as $$
  select t.id, t.amount, t.type, t.category, t.date, t.description
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
alter table public.wallets enable row level security;

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

-- Wallets policies
drop policy if exists "wallets_select_own" on public.wallets;
create policy "wallets_select_own" on public.wallets
  for select using (auth.uid() = user_id);

drop policy if exists "wallets_insert_own" on public.wallets;
create policy "wallets_insert_own" on public.wallets
  for insert with check (auth.uid() = user_id);

drop policy if exists "wallets_update_own" on public.wallets;
create policy "wallets_update_own" on public.wallets
  for update using (auth.uid() = user_id);

drop policy if exists "wallets_delete_own" on public.wallets;
create policy "wallets_delete_own" on public.wallets
  for delete using (auth.uid() = user_id);

-- Optional: auto-create profile row on signup + default wallets
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

  -- Auto-create default wallets for new users: Nakit and Banka
  -- Only create if they don't exist (idempotent check)
  if not exists (select 1 from public.wallets where user_id = new.id and name = 'Nakit') then
    insert into public.wallets (user_id, name, balance, is_default)
    values (new.id, 'Nakit', 0, true);
  end if;
  
  if not exists (select 1 from public.wallets where user_id = new.id and name = 'Banka') then
    insert into public.wallets (user_id, name, balance, is_default)
    values (new.id, 'Banka', 0, false);
  end if;

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

-- ---------------------------------------------------------------------------
-- Storage Bucket for Profile Avatars
-- ---------------------------------------------------------------------------
-- Note: Storage buckets and policies must be created via Supabase Dashboard
-- because storage.objects table ownership restrictions prevent SQL-based policy creation.
--
-- IMPORTANT: Follow these steps in Supabase Dashboard:
--
-- STEP 1: Create Storage Bucket
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "New bucket"
-- 3. Name: avatars
-- 4. Public bucket: YES (toggle on)
-- 5. File size limit: 5242880 (5MB)
-- 6. Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
-- 7. Click "Create bucket"
--
-- STEP 2: Create RLS Policies
-- After creating the bucket, go to Storage → avatars → Policies
-- Create the following policies (click "New Policy" for each):
--
-- Policy 1: "Users can upload their own avatar"
--   Target roles: authenticated
--   Operation: INSERT
--   Policy definition (SQL):
--   (
--     bucket_id = 'avatars' AND
--     auth.uid()::text = (string_to_array(name, '/'))[1]
--   )
--
-- Policy 2: "Users can update their own avatar"
--   Target roles: authenticated
--   Operation: UPDATE
--   Policy definition (SQL):
--   (
--     bucket_id = 'avatars' AND
--     auth.uid()::text = (string_to_array(name, '/'))[1]
--   )
--
-- Policy 3: "Users can delete their own avatar"
--   Target roles: authenticated
--   Operation: DELETE
--   Policy definition (SQL):
--   (
--     bucket_id = 'avatars' AND
--     auth.uid()::text = (string_to_array(name, '/'))[1]
--   )
--
-- Policy 4: "Avatars are publicly readable"
--   Target roles: anon, authenticated
--   Operation: SELECT
--   Policy definition (SQL):
--   (bucket_id = 'avatars')
--
-- ALTERNATIVE: If you have service_role access, you can try the SQL below
-- (but it may still fail due to permissions - use Dashboard method instead):
--
-- insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- values (
--   'avatars',
--   'avatars',
--   true,
--   5242880,
--   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
-- )
-- on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Upcoming Payments (Gelecek Ödemeler)
-- ---------------------------------------------------------------------------
-- Kullanıcıların gelecekteki ödemelerini (yurt, kira, fatura vb.) takip eder.
-- Bu ödemeler henüz ödenmemiş olsa bile bütçe hesaplamalarına dahil edilir.
-- Sistem, mevcut harcama trendine göre ödemeyi karşılayamayacağını uyarır.

create table if not exists public.upcoming_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null check (length(name) > 0 and length(name) <= 200),
  amount numeric not null check (amount > 0),
  due_date date not null,
  is_paid boolean not null default false,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists upcoming_payments_user_id_idx on public.upcoming_payments (user_id);
create index if not exists upcoming_payments_user_id_due_date_idx on public.upcoming_payments (user_id, due_date asc);
create index if not exists upcoming_payments_user_id_is_paid_idx on public.upcoming_payments (user_id, is_paid) where (is_paid = false);

-- Auto-update updated_at timestamp
create or replace function public.update_upcoming_payments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists upcoming_payments_update_updated_at on public.upcoming_payments;
create trigger upcoming_payments_update_updated_at
  before update on public.upcoming_payments
  for each row
  execute procedure public.update_upcoming_payments_updated_at();

-- Auto-set paid_at when is_paid changes to true
create or replace function public.set_upcoming_payment_paid_at()
returns trigger
language plpgsql
as $$
begin
  if new.is_paid = true and (old.is_paid is null or old.is_paid = false) then
    new.paid_at = timezone('utc'::text, now());
  elsif new.is_paid = false then
    new.paid_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists upcoming_payments_set_paid_at on public.upcoming_payments;
create trigger upcoming_payments_set_paid_at
  before insert or update on public.upcoming_payments
  for each row
  execute procedure public.set_upcoming_payment_paid_at();

-- RLS Policies for upcoming_payments
alter table public.upcoming_payments enable row level security;

drop policy if exists "upcoming_payments_select_own" on public.upcoming_payments;
create policy "upcoming_payments_select_own" on public.upcoming_payments
  for select using (auth.uid() = user_id);

drop policy if exists "upcoming_payments_insert_own" on public.upcoming_payments;
create policy "upcoming_payments_insert_own" on public.upcoming_payments
  for insert with check (auth.uid() = user_id);

drop policy if exists "upcoming_payments_update_own" on public.upcoming_payments;
create policy "upcoming_payments_update_own" on public.upcoming_payments
  for update using (auth.uid() = user_id);

drop policy if exists "upcoming_payments_delete_own" on public.upcoming_payments;
create policy "upcoming_payments_delete_own" on public.upcoming_payments
  for delete using (auth.uid() = user_id);

-- RPC Function: Get total unpaid upcoming payments amount
create or replace function public.get_unpaid_upcoming_payments_total(
  p_user_id uuid default auth.uid()
)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(amount), 0)
  from public.upcoming_payments
  where user_id = p_user_id
    and is_paid = false
    and due_date >= current_date;
$$;

grant execute on function public.get_unpaid_upcoming_payments_total(uuid) to authenticated;

-- RPC Function: Get upcoming payments with payment feasibility analysis
create or replace function public.get_upcoming_payments_with_analysis(
  p_user_id uuid default auth.uid()
)
returns table (
  id uuid,
  name text,
  amount numeric,
  due_date date,
  is_paid boolean,
  paid_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  days_until_due integer,
  total_unpaid_amount numeric
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_today date := current_date;
begin
  return query
  select
    up.id,
    up.name,
    up.amount,
    up.due_date,
    up.is_paid,
    up.paid_at,
    up.created_at,
    up.updated_at,
    (up.due_date - v_today)::integer as days_until_due,
    (select coalesce(sum(up2.amount), 0) from public.upcoming_payments up2 where up2.user_id = p_user_id and up2.is_paid = false and up2.due_date >= v_today) as total_unpaid_amount
  from public.upcoming_payments up
  where up.user_id = p_user_id
    and (up.is_paid = false or up.due_date >= v_today - interval '30 days')
  order by up.due_date asc, up.created_at asc;
end;
$$;

grant execute on function public.get_upcoming_payments_with_analysis(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Subscriptions (Abonelikler)
-- ---------------------------------------------------------------------------
-- Kullanıcıların düzenli aboneliklerini (Netflix, Spotify, Kira vb.) takip eder.
-- Her abonelik için otomatik logo bulma desteği (icon_url) ve yenileme günü takibi.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null check (length(name) > 0 and length(name) <= 200),
  amount numeric not null check (amount > 0),
  currency text not null default 'TL' check (length(currency) > 0 and length(currency) <= 10),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  icon_url text, -- Logo URL'i (unavatar.io veya diğer servislerden)
  is_active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add next_renewal_date column if it doesn't exist (for existing tables)
alter table public.subscriptions
  add column if not exists next_renewal_date date;

-- Migration: If renewal_day column exists, migrate to next_renewal_date
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'renewal_day'
  ) then
    -- Migrate existing data: calculate next_renewal_date from renewal_day
    update public.subscriptions
    set next_renewal_date = (
      case
        when extract(day from current_date) <= renewal_day then
          make_date(extract(year from current_date)::integer, extract(month from current_date)::integer, renewal_day)
        else
          make_date(
            case when extract(month from current_date) = 12 then extract(year from current_date)::integer + 1 else extract(year from current_date)::integer end,
            case when extract(month from current_date) = 12 then 1 else extract(month from current_date)::integer + 1 end,
            renewal_day
          )
      end
    )
    where next_renewal_date is null;
    
    -- Drop old column
    alter table public.subscriptions drop column if exists renewal_day;
  end if;
end;
$$;

-- Set default for next_renewal_date if null (for new rows)
-- Default: 1 month from now
do $$
begin
  update public.subscriptions
  set next_renewal_date = (current_date + interval '1 month')
  where next_renewal_date is null;
end;
$$;

-- Add NOT NULL constraint after migration
alter table public.subscriptions
  alter column next_renewal_date set not null;

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_user_id_is_active_idx on public.subscriptions (user_id, is_active) where (is_active = true);
create index if not exists subscriptions_user_id_next_renewal_date_idx on public.subscriptions (user_id, next_renewal_date);

-- Auto-update updated_at timestamp
create or replace function public.update_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists subscriptions_update_updated_at on public.subscriptions;
create trigger subscriptions_update_updated_at
  before update on public.subscriptions
  for each row
  execute procedure public.update_subscriptions_updated_at();

-- RLS Policies for subscriptions
alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own" on public.subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own" on public.subscriptions
  for update using (auth.uid() = user_id);

drop policy if exists "subscriptions_delete_own" on public.subscriptions;
create policy "subscriptions_delete_own" on public.subscriptions
  for delete using (auth.uid() = user_id);

-- RPC Function: Get total monthly subscriptions cost
create or replace function public.get_monthly_subscriptions_total(
  p_user_id uuid default auth.uid()
)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    sum(
      case
        when billing_cycle = 'monthly' then amount
        when billing_cycle = 'yearly' then amount / 12
        else 0
      end
    ),
    0
  )
  from public.subscriptions
  where user_id = p_user_id
    and is_active = true;
$$;

grant execute on function public.get_monthly_subscriptions_total(uuid) to authenticated;

-- RPC Function: Get upcoming subscription renewals (within next N days)
-- Drop existing function first if return type changed
drop function if exists public.get_upcoming_subscription_renewals(uuid, integer);

create or replace function public.get_upcoming_subscription_renewals(
  p_user_id uuid default auth.uid(),
  p_days_ahead integer default 7
)
returns table (
  id uuid,
  name text,
  amount numeric,
  currency text,
  billing_cycle text,
  next_renewal_date date,
  icon_url text,
  days_until_renewal integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    s.id,
    s.name,
    s.amount,
    s.currency,
    s.billing_cycle,
    s.next_renewal_date,
    s.icon_url,
    (s.next_renewal_date - current_date)::integer as days_until_renewal
  from public.subscriptions s
  where s.user_id = p_user_id
    and s.is_active = true
    and s.next_renewal_date >= current_date
    and (s.next_renewal_date - current_date)::integer <= p_days_ahead
  order by s.next_renewal_date asc;
$$;

grant execute on function public.get_upcoming_subscription_renewals(uuid, integer) to authenticated;


