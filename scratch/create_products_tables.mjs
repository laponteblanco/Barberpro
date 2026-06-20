import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const queries = [
`
create table if not exists public.products (
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
`,
`alter table public.products enable row level security;`,
`
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Products isolation' AND tablename = 'products'
    ) THEN
        CREATE POLICY "Products isolation" ON public.products FOR ALL USING (tenant_id = public.current_tenant_id());
    END IF;
END
$$;
`,
`
create table if not exists public.product_sales (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null,
  sold_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
`,
`alter table public.product_sales enable row level security;`,
`
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Product sales isolation' AND tablename = 'product_sales'
    ) THEN
        CREATE POLICY "Product sales isolation" ON public.product_sales FOR ALL USING (tenant_id = public.current_tenant_id());
    END IF;
END
$$;
`
];

async function run() {
  for (const sql of queries) {
    console.log(`Running: ${sql.trim().split('\\n')[0]}...`);
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    
    if (error) {
      console.log('RPC failed, trying direct PostgREST SQL executing endpoint...');
      try {
        const res = await fetch('https://vsslcbsdvxbsfivcfxfd.supabase.co/pg', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc2xjYnNkdnhic2ZpdmNmeGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU5MTA1OCwiZXhwIjoyMDk1MTY3MDU4fQ.i1lG7x3dhAaGBvVgz6toa_PMrAALlYULgSvSDRk0JSk`
          },
          body: JSON.stringify({ query: sql })
        });
        
        if (!res.ok) {
          console.error(`Direct approach failed for "${sql}":`, await res.text());
        } else {
          console.log(`✅ Success (Direct): ${sql.trim().split('\\n')[0]}...`);
        }
      } catch (e) {
        console.error('Exception on direct request:', e.message);
      }
    } else {
      console.log(`✅ Success (RPC): ${sql.trim().split('\\n')[0]}...`, data);
    }
  }
}

run();
