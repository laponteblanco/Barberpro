-- ============================================================
-- BarberOS — Supabase Migration v1
-- Multi-tenant Barbershop SaaS
-- ============================================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- TENANTS (barbershops)
-- ============================================================
create table public.tenants (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  phone       text,
  email       text,
  address     text,
  city        text,
  country     char(2) not null default 'VE',
  timezone    text not null default 'America/Caracas',
  currency    char(3) not null default 'USD',
  whatsapp_number text,
  whatsapp_token  text,
  settings    jsonb not null default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.tenants enable row level security;

-- ============================================================
-- PROFILES (unified user data)
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  phone       text,
  id_number   text unique, -- "Cédula"
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ============================================================
-- TENANT STAFF
-- ============================================================
create type staff_role as enum ('owner', 'admin', 'barber');

create table public.tenant_staff (
  id             uuid primary key default uuid_generate_v4(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  role           staff_role not null default 'barber',
  is_active      boolean not null default true,
  is_available   boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (tenant_id, user_id)
);

alter table public.tenant_staff enable row level security;

-- ============================================================
-- SERVICES
-- ============================================================
create table public.services (
  id                uuid primary key default uuid_generate_v4(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  name              text not null,
  duration_minutes  integer not null,
  price             numeric(10,2) not null,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.services enable row level security;

-- ============================================================
-- APPOINTMENTS
-- ============================================================
create type appointment_status as enum ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

create table public.appointments (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  client_id     uuid not null references public.profiles(id),
  staff_id      uuid not null references public.tenant_staff(id),
  service_id    uuid not null references public.services(id),
  start_time    timestamptz not null,
  end_time      timestamptz not null,
  status        appointment_status not null default 'pending',
  total_price   numeric(10,2) not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.appointments enable row level security;

-- ============================================================
-- RLS HELPERS & POLICIES
-- ============================================================

-- Function to get the current tenant_id for the logged in user
create or replace function public.current_tenant_id()
returns uuid language sql stable as $$
  select tenant_id from public.tenant_staff where user_id = auth.uid() limit 1;
$$;

-- PROFILES: Users can manage their own profile
create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);
create policy "Allow profile creation during signup" on public.profiles for insert with check (true);

-- TENANTS: Authenticated users can create a tenant
create policy "Allow tenant creation" on public.tenants for insert with check (auth.role() = 'authenticated');
create policy "Allow tenant viewing" on public.tenants for select using (true);

-- STAFF: Isolation and initial registration
create policy "Staff isolation" on public.tenant_staff for all using (tenant_id = public.current_tenant_id());
create policy "Allow initial staff registration" on public.tenant_staff for insert with check (true);

-- SERVICES: Isolation
create policy "Services isolation" on public.services for all using (tenant_id = public.current_tenant_id());

-- APPOINTMENTS: Isolation
create policy "Appointments isolation" on public.appointments for all using (tenant_id = public.current_tenant_id());
-- ============================================================
-- Phase 2: Finance & Compensation
-- ============================================================

-- Extend staff with compensation settings
alter table public.tenant_staff 
add column compensation_type text check (compensation_type in ('percentage', 'rent', 'both')),
add column commission_rate numeric(5,2) default 0,
add column rent_amount numeric(10,2) default 0,
add column rent_period text check (rent_period in ('daily', 'weekly', 'monthly'));

-- Transactions table
create table public.barber_transactions (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  staff_id      uuid not null references public.tenant_staff(id) on delete cascade,
  amount        numeric(10,2) not null,
  type          text not null check (type in ('commission', 'rent_deduction', 'bonus', 'penalty')),
  reference_id  uuid, -- appointment_id or similar
  created_at    timestamptz not null default now()
);

alter table public.barber_transactions enable row level security;
create policy "transactions_isolation" on public.barber_transactions for all using (tenant_id = public.current_tenant_id());

-- Cash sessions (Daily closing)
create table public.cash_sessions (
  id                uuid primary key default uuid_generate_v4(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  opened_by         uuid not null references auth.users(id),
  opened_at         timestamptz not null default now(),
  closed_at         timestamptz,
  opening_balance   numeric(10,2) not null,
  expected_balance  numeric(10,2),
  actual_balance    numeric(10,2),
  status            text not null default 'open' check (status in ('open', 'closed'))
);

alter table public.cash_sessions enable row level security;
create policy "cash_sessions_isolation" on public.cash_sessions for all using (tenant_id = public.current_tenant_id());

-- RPC for commission calculation
create or replace function public.calculate_barber_commission(p_appointment_id uuid)
returns void language plpgsql security definer as $$
declare
  v_staff_id uuid;
  v_tenant_id uuid;
  v_price numeric;
  v_rate numeric;
begin
  select staff_id, tenant_id, total_price into v_staff_id, v_tenant_id, v_price
  from public.appointments where id = p_appointment_id;

  select commission_rate into v_rate 
  from public.tenant_staff where id = v_staff_id;

  if v_rate > 0 then
    insert into public.barber_transactions (tenant_id, staff_id, amount, type, reference_id)
    values (v_tenant_id, v_staff_id, (v_price * v_rate / 100), 'commission', p_appointment_id);
  end if;
end;
$$;
-- ============================================================
-- Phase 5: Business Intelligence & Analytics
-- ============================================================

-- Function to get top barbers by revenue
create or replace function public.get_top_barbers(p_tenant_id uuid, p_limit integer default 5)
returns table (
  barber_name text,
  total_revenue numeric,
  appointment_count bigint
) language sql stable as $$
  select 
    p.full_name as barber_name,
    sum(a.total_price) as total_revenue,
    count(a.id) as appointment_count
  from public.appointments a
  join public.tenant_staff ts on a.staff_id = ts.id
  join public.profiles p on ts.user_id = p.id
  where a.tenant_id = p_tenant_id and a.status = 'completed'
  group by p.full_name
  order by total_revenue desc
  limit p_limit;
$$;

-- Function to get service popularity
create or replace function public.get_service_stats(p_tenant_id uuid)
returns table (
  service_name text,
  usage_count bigint,
  revenue numeric
) language sql stable as $$
  select 
    s.name as service_name,
    count(a.id) as usage_count,
    sum(a.total_price) as revenue
  from public.appointments a
  join public.services s on a.service_id = s.id
  where a.tenant_id = p_tenant_id and a.status = 'completed'
  group by s.name
  order by usage_count desc;
$$;

-- Client-side stats function
create or replace function public.get_client_stats(p_client_id uuid)
returns json language plpgsql stable as $$
declare
  v_stats json;
begin
  select json_build_object(
    'total_visits', count(*),
    'total_spent', coalesce(sum(total_price), 0),
    'favorite_service', (
      select s.name 
      from public.appointments a2
      join public.services s on a2.service_id = s.id
      where a2.client_id = p_client_id
      group by s.name
      order by count(*) desc
      limit 1
    )
  ) into v_stats
  from public.appointments
  where client_id = p_client_id and status = 'completed';
  
  return v_stats;
end;
$$;
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
-- ============================================================
-- Phase X: Superadmin Profile Flag
-- ============================================================

-- 1. Add is_superadmin column to profiles
ALTER TABLE public.profiles ADD COLUMN is_superadmin BOOLEAN NOT NULL DEFAULT false;

-- 2. (Optional but helpful) A function to check if current user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT is_superadmin FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;
