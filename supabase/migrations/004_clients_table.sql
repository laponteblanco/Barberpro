-- ============================================================
-- Phase 4: Standalone Clients Table & FK Fix
-- Public booking clients don't have auth accounts, so they
-- cannot live in 'profiles' (which references auth.users).
-- This migration creates a dedicated 'clients' table and
-- re-points the appointments FK accordingly.
-- ============================================================

-- 1. Create clients table (if it doesn't already exist)
create table if not exists public.clients (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  user_id       uuid references public.profiles(id),   -- nullable: only set if they also have an auth account
  full_name     text not null,
  phone         text,
  email         text,
  id_number     text,                                   -- "Cédula"
  avatar_url    text,
  notes         text,
  tags          text[] default '{}',
  loyalty_points integer not null default 0,
  total_visits  integer not null default 0,
  total_spent   numeric(10,2) not null default 0,
  last_visit_at timestamptz,
  whatsapp_opt_in boolean not null default false,
  birth_date    date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tenant_id, id_number)
);

alter table public.clients enable row level security;

-- RLS: Admin client can bypass; regular staff see their tenant's clients
create policy "clients_isolation" on public.clients
  for all using (tenant_id = public.current_tenant_id());

-- Allow public inserts (for the booking portal, which uses the admin client)
create policy "clients_public_insert" on public.clients
  for insert with check (true);

-- 2. Drop the old FK from appointments.client_id -> profiles.id
--    and add a new FK to clients.id
alter table public.appointments
  drop constraint if exists appointments_client_id_fkey;

alter table public.appointments
  add constraint appointments_client_id_fkey
  foreign key (client_id) references public.clients(id);
