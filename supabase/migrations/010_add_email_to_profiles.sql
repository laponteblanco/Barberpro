-- ============================================================
-- BarberOS — Migration: Add email to profiles
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
