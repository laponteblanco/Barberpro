-- Migración para crear la tabla de historial financiero de barberos (Vales, Consignaciones y Pagos)
CREATE TABLE IF NOT EXISTS public.staff_ledger (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.tenant_staff(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('advance', 'consignment', 'payment')),
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  description text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_quantity integer DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.staff_ledger ENABLE ROW LEVEL SECURITY;

-- Política de aislamiento por inquilino (Tenant)
DROP POLICY IF EXISTS "Staff ledger isolation" ON public.staff_ledger;
CREATE POLICY "Staff ledger isolation" ON public.staff_ledger FOR ALL USING (tenant_id = public.current_tenant_id());
