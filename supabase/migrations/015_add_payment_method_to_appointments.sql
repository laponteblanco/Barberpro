-- ============================================================
-- BarberOS — Migration: Add payment_method to appointments
-- ============================================================

ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('cash', 'card', 'nequi', 'daviplata', 'transfer'));

-- Default existing completed/confirmed appointments to 'cash' if null
UPDATE public.appointments 
SET payment_method = 'cash' 
WHERE status IN ('completed', 'confirmed') AND payment_method IS NULL;
