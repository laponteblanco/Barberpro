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
