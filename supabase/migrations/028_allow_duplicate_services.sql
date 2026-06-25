-- ============================================================
-- Phase 28: Allow duplicate services in appointments
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'appointment_services') THEN
    ALTER TABLE public.appointment_services
      DROP CONSTRAINT IF EXISTS appointment_services_appointment_id_service_id_key;
  END IF;
END $$;
