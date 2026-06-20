-- Add indexes to improve multi-tenant query performance

-- 1. Appointments
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON public.appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON public.appointments(staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);

-- 2. Clients
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON public.clients(tenant_id);

-- 3. Services
CREATE INDEX IF NOT EXISTS idx_services_tenant_id ON public.services(tenant_id);

-- 4. Tenant Staff
CREATE INDEX IF NOT EXISTS idx_tenant_staff_tenant_id ON public.tenant_staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_staff_user_id ON public.tenant_staff(user_id);

-- 5. Agenda Blocks
CREATE INDEX IF NOT EXISTS idx_agenda_blocks_tenant_id ON public.agenda_blocks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agenda_blocks_staff_id ON public.agenda_blocks(staff_id);
CREATE INDEX IF NOT EXISTS idx_agenda_blocks_start_time ON public.agenda_blocks(start_time);

-- 6. Products
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products(tenant_id);
