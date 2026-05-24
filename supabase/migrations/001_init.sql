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
  short_code  text unique, -- short code for staff login
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
  display_name   text,
  avatar_url     text,
  phone          text,
  access_pin     text, -- access pin for barber login
  specialties    text[] not null default '{}',
  working_hours  jsonb not null default '{}',
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
