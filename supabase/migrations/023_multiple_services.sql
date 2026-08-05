-- ============================================================
-- Phase 23: Multiple Services per Appointment
-- ============================================================

-- 1. Create the new join table
CREATE TABLE IF NOT EXISTS public.appointment_services (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(appointment_id, service_id)
);

-- Enable RLS
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

-- Policy: staff can read/write their tenant's appointment services
CREATE POLICY "Appointment services isolation" ON public.appointment_services 
  FOR ALL USING (
    appointment_id IN (
      SELECT id FROM public.appointments WHERE tenant_id = public.current_tenant_id()
    )
  );

-- 2. Migrate existing data from appointments.service_id to the new table
INSERT INTO public.appointment_services (appointment_id, service_id)
SELECT id, service_id FROM public.appointments
ON CONFLICT DO NOTHING;

-- 3. Drop the old service_id column safely
-- We will keep it for a moment just in case, but let's drop the NOT NULL constraint first
-- so inserts without it succeed. We can fully drop it after confirming everything works.
ALTER TABLE public.appointments ALTER COLUMN service_id DROP NOT NULL;

-- Create an index to speed up the join
CREATE INDEX IF NOT EXISTS idx_appt_services_appt_id ON public.appointment_services(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appt_services_service_id ON public.appointment_services(service_id);
