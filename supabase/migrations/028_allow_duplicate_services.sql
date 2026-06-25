-- ============================================================
-- Phase 28: Allow duplicate services in appointments
-- ============================================================

-- Drop the unique constraint that prevents adding the same service multiple times
ALTER TABLE public.appointment_services
  DROP CONSTRAINT IF EXISTS appointment_services_appointment_id_service_id_key;
