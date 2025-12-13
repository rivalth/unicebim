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
  id uuid references auth.users not null primary key,
  full_name text,
  monthly_budget_goal numeric
);

-- Transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  amount numeric not null,
  type text check (type in ('income', 'expense')) not null,
  category text not null,
  date timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_user_id_date_idx on public.transactions (user_id, date desc);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
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


