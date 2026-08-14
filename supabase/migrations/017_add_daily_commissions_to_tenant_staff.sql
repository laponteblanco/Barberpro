-- ============================================================
-- BarberOS — Migration: Add daily_commission_rates to tenant_staff
-- ============================================================

ALTER TABLE public.tenant_staff 
ADD COLUMN IF NOT EXISTS daily_commission_rates jsonb DEFAULT '{}'::jsonb;
