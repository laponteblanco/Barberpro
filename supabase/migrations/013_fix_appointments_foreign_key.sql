-- ============================================================
-- Phase 13: Robust Appointments Foreign Key & Client Data Migration
-- Drops the old FK pointing to 'profiles' (which fails if there
-- is existing appointment data) and safely migrates all existing
-- client relationships to the 'clients' table before recreating
-- the foreign key referencing the 'clients' table.
-- ============================================================

DO $$
DECLARE
  r RECORD;
  existing_client_id UUID;
BEGIN
  -- 1. Ensure the appointments_client_id_fkey constraint is dropped so we can modify the data safely
  ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;

  -- 2. Ensure clients table exists
  CREATE TABLE IF NOT EXISTS public.clients (
    id            uuid primary key default uuid_generate_v4(),
    tenant_id     uuid not null references public.tenants(id) on delete cascade,
    user_id       uuid references public.profiles(id),
    full_name     text not null,
    phone         text,
    email         text,
    id_number     text,
    avatar_url    text,
    notes         text,
    tags          text[] default '{}',
    loyalty_points integer not null default 0,
    total_visits  integer not null default 0,
    total_spent   numeric(10,2) not null default 0,
    last_visit_at timestamptz,
    whatsapp_opt_in boolean not null default false,
    birth_date    date,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    unique (tenant_id, id_number)
  );

  -- 3. Loop through all distinct profiles/client IDs referenced in appointments
  FOR r IN 
    SELECT DISTINCT a.client_id as profile_id, a.tenant_id, p.full_name, p.phone, p.id_number
    FROM public.appointments a
    LEFT JOIN public.profiles p ON a.client_id = p.id
  LOOP
    -- Check if there is already a client in the clients table with this profile_id (id)
    SELECT id INTO existing_client_id FROM public.clients WHERE id = r.profile_id;
    
    IF existing_client_id IS NULL THEN
      -- Check if there is already a client with the same (tenant_id, id_number)
      SELECT id INTO existing_client_id FROM public.clients 
      WHERE tenant_id = r.tenant_id AND id_number = COALESCE(r.id_number, 'MIG-' || substring(r.profile_id::text from 1 for 8));
      
      IF existing_client_id IS NOT NULL THEN
        -- A client with this id_number already exists under a different ID.
        -- We should update the appointments to point to this existing client.
        UPDATE public.appointments 
        SET client_id = existing_client_id 
        WHERE client_id = r.profile_id AND tenant_id = r.tenant_id;
      ELSE
        -- Insert a new client with the same ID as the profile so no appointment updates are needed for this one
        INSERT INTO public.clients (id, tenant_id, user_id, full_name, phone, id_number)
        VALUES (
          r.profile_id,
          r.tenant_id,
          r.profile_id,
          COALESCE(r.full_name, 'Cliente Migrado'),
          r.phone,
          COALESCE(r.id_number, 'MIG-' || substring(r.profile_id::text from 1 for 8))
        );
      END IF;
    END IF;
  END LOOP;

  -- 4. Clean up any invalid or orphaned appointments that don't match any clients in the table
  -- (If any remain, delete them or handle them to prevent FK failure)
  -- DELETE FROM public.appointments WHERE client_id NOT IN (SELECT id FROM public.clients);

  -- 5. Finally, add the foreign key constraint pointing to the clients table
  ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id);
END $$;
