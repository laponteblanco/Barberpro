-- Add composite indexes to improve multi-tenant query performance

-- 1. Appointments (Dashboard Calendar & Staff filtering)
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_time ON public.appointments(tenant_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_staff_time ON public.appointments(tenant_id, staff_id, start_time);

-- 2. Agenda Blocks (Availability)
CREATE INDEX IF NOT EXISTS idx_agenda_blocks_tenant_staff_time ON public.agenda_blocks(tenant_id, staff_id, start_time);

-- 3. Tenant Staff (Session validation)
CREATE INDEX IF NOT EXISTS idx_tenant_staff_user_active ON public.tenant_staff(user_id, is_active);

-- 4. Clients (Tenant lookup)
-- Note: idx_clients_tenant_id already exists from 024, but let's add composite if needed. 
-- For now, the existing single index is fine.

