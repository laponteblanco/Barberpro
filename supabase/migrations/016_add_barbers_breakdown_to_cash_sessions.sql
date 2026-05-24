-- ============================================================
-- BarberOS — Migration: Add barbers_breakdown to cash_sessions
-- ============================================================

ALTER TABLE public.cash_sessions 
ADD COLUMN IF NOT EXISTS barbers_breakdown jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS expected_cash numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS expected_digital numeric(10,2) DEFAULT 0;
