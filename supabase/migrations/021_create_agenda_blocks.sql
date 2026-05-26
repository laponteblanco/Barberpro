-- Migration: Create agenda_blocks table
-- Used to block out times for lunch, permissions, etc.

CREATE TABLE public.agenda_blocks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.tenant_staff(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agenda_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agenda blocks isolation" ON public.agenda_blocks 
  FOR ALL USING (tenant_id = public.current_tenant_id());
