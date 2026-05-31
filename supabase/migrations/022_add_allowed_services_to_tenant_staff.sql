-- Migration: Add allowed_services column to tenant_staff
-- This array will store the IDs of services that a specific staff member is allowed to perform.

ALTER TABLE public.tenant_staff
ADD COLUMN allowed_services uuid[] DEFAULT '{}';

COMMENT ON COLUMN public.tenant_staff.allowed_services IS 'Array of service IDs that this staff member can perform.';
