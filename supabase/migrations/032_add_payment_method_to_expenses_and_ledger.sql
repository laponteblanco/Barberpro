-- ============================================================
-- BarberOS — Migration 032: Add payment_method to expenses & staff_ledger
-- Allows the cash closing report to discriminate expenses and
-- barber payouts by fund (cash vs. digital), enabling an exact
-- balance for both physical and digital money.
-- ============================================================

-- 1. Create expenses table if it doesn't exist yet
--    (Some tenants may have run the SQL manually; IF NOT EXISTS is safe)
CREATE TABLE IF NOT EXISTS public.expenses (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category    text NOT NULL DEFAULT 'Otros',
  description text,
  amount      numeric(12, 2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'digital')),
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_isolation" ON public.expenses;
CREATE POLICY "expenses_isolation" ON public.expenses
  FOR ALL USING (tenant_id = public.current_tenant_id());

-- 2. Add payment_method to expenses if the table already existed
--    without that column (idempotent via IF NOT EXISTS)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'digital'));

-- 3. Add payment_method to staff_ledger so barber payouts/advances
--    can be tracked per fund (cash vs digital transfer)
ALTER TABLE public.staff_ledger
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'digital'));

-- 4. Performance index for daily queries on expenses
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_created
  ON public.expenses (tenant_id, created_at DESC);

-- 5. Performance index for staff_ledger daily queries
CREATE INDEX IF NOT EXISTS idx_staff_ledger_payment_method
  ON public.staff_ledger (tenant_id, payment_method, created_at DESC);
