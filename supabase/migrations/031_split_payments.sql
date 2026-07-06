-- ============================================================
-- BarberOS — Migration: Support split payments (mixed)
-- ============================================================

-- Add new columns for tracking split amounts
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS split_cash_amount numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS split_digital_amount numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS split_digital_method text CHECK (split_digital_method IN ('card', 'nequi', 'daviplata', 'transfer'));

-- Drop existing payment_method constraint and recreate it to include 'split'
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_payment_method_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_payment_method_check CHECK (payment_method IN ('cash', 'card', 'nequi', 'daviplata', 'transfer', 'split'));
