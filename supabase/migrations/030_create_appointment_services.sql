-- Create appointment_services table to properly link multiple services to an appointment
CREATE TABLE IF NOT EXISTS public.appointment_services (
  id             uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id     uuid not null references public.services(id) on delete cascade,
  created_at     timestamptz not null default now()
);

ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow operations for tenant users" ON public.appointment_services 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.appointments 
    WHERE id = appointment_services.appointment_id 
    AND tenant_id = public.current_tenant_id()
  )
);
