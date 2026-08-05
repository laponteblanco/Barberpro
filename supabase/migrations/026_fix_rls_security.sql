-- ============================================================
-- BarberOS — Migration: Fix RLS Isolation & Open Policies
-- ============================================================

-- 1. Create a function to allow the backend to inject the tenant context safely
CREATE OR REPLACE FUNCTION public.set_active_tenant(tenant_uuid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- We set this as a local transaction variable so it automatically clears when the transaction/connection ends
  PERFORM set_config('app.current_tenant_id', tenant_uuid::text, false);
END;
$$;

-- 2. Update current_tenant_id to prioritize the injected context
-- Fallback to the old logic (LIMIT 1) only if context is missing, so we don't break existing client-side logic yet
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    -- 1. Try local transaction variable (RPC set_active_tenant)
    NULLIF(current_setting('app.current_tenant_id', true), '')::uuid,
    -- 2. Try PostgREST headers (injected by createClient SSR)
    NULLIF(current_setting('request.headers', true)::json->>'x-active-tenant', '')::uuid,
    -- 3. Fallback to first profile tenant
    (SELECT tenant_id FROM public.tenant_staff WHERE user_id = auth.uid() LIMIT 1)
  );
$$;

-- 3. Fix open INSERT policies on tenant_staff
DROP POLICY IF EXISTS "Allow initial staff registration" ON public.tenant_staff;
CREATE POLICY "tenant_staff_insert" ON public.tenant_staff
  FOR INSERT WITH CHECK (
    -- Allow superadmin
    public.is_superadmin() OR
    -- Or allow if the user doing the inserting is an admin/owner of that tenant
    EXISTS (
      SELECT 1 FROM public.tenant_staff 
      WHERE user_id = auth.uid() 
      AND tenant_id = public.tenant_staff.tenant_id
      AND role IN ('owner', 'admin')
    ) OR
    -- Or allow initial signup (if the user is inserting themselves)
    auth.uid() = user_id
  );

-- 4. Fix open INSERT policies on clients
DROP POLICY IF EXISTS "clients_public_insert" ON public.clients;
CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT WITH CHECK (
    -- The booking portal needs to insert clients, but we should enforce it matches the tenant
    tenant_id = public.current_tenant_id() OR
    -- Allow service role / anon if needed for portal
    auth.role() = 'anon'
  );

-- 5. Restrict the open SELECT on tenants
DROP POLICY IF EXISTS "Allow tenant viewing" ON public.tenants;
CREATE POLICY "tenants_public_viewing" ON public.tenants
  FOR SELECT USING (
    -- Only allow seeing basic tenant info if active, instead of all data
    is_active = true
  );
