-- Migration: Add working_hours column to tenant_staff
-- This JSONB column stores an array of 7 day-configs (0=Sun..6=Sat)
-- Each entry: { open: boolean, start: number (hour 0-23), end: number (hour 0-23) }

ALTER TABLE tenant_staff
  ADD COLUMN IF NOT EXISTS working_hours JSONB;

COMMENT ON COLUMN tenant_staff.working_hours IS
  'Per-day working hours for the barber. Array of 7 objects indexed 0=Sun..6=Sat, each with {open, start, end}.';
