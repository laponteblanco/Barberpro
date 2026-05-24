-- ============================================================
-- BarberOS — Migration: Fix RLS Recursion on current_tenant_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT tenant_id FROM public.tenant_staff WHERE user_id = auth.uid() LIMIT 1;
$$;
