-- Add discount_amount to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
