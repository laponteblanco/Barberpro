-- Create products table
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  retail_price numeric(10,2) not null,
  cost_price numeric(10,2) default 0,
  stock integer not null default 0,
  low_stock_threshold integer not null default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
create policy "Products isolation" on public.products for all using (tenant_id = public.current_tenant_id());

-- Create product_sales table
create table public.product_sales (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null,
  sold_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.product_sales enable row level security;
create policy "Product sales isolation" on public.product_sales for all using (tenant_id = public.current_tenant_id());
