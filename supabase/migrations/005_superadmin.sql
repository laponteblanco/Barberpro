-- ============================================================
-- Phase X: Superadmin Profile Flag
-- ============================================================

-- 1. Add is_superadmin column to profiles
ALTER TABLE public.profiles ADD COLUMN is_superadmin BOOLEAN NOT NULL DEFAULT false;

-- 2. (Optional but helpful) A function to check if current user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT is_superadmin FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;
