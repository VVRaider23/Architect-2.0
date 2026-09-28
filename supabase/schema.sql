-- Architect 2.0 · optional database for real sign-in.
-- Run this once in Supabase → SQL Editor. Each signed-in user gets one row holding their workspace,
-- projects and audit trail. Row-level security means people can only read and write their own row.

create table if not exists public.app_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb       not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "Read own state"   on public.app_state;
drop policy if exists "Insert own state" on public.app_state;
drop policy if exists "Update own state" on public.app_state;
drop policy if exists "Delete own state" on public.app_state;

create policy "Read own state"   on public.app_state for select using (auth.uid() = user_id);
create policy "Insert own state" on public.app_state for insert with check (auth.uid() = user_id);
create policy "Update own state" on public.app_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Delete own state" on public.app_state for delete using (auth.uid() = user_id);
