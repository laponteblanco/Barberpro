-- 1. Asegurar índice para acelerar búsquedas por user_id en la tabla de staff
CREATE INDEX IF NOT EXISTS idx_tenant_staff_user_id ON public.tenant_staff(user_id);

-- 2. Actualizar políticas RLS de citas (appointments)
-- Eliminar políticas restrictivas anteriores (Ajusta los nombres según tu BD)
DROP POLICY IF EXISTS "Dueños pueden ver todas las citas, barberos las suyas" ON public.appointments;

-- Crear nueva política RLS adaptada al esquema real (tenant_staff y tenants)
CREATE POLICY "Dueños pueden ver todas, staff solo las suyas" ON public.appointments
FOR SELECT
USING (
  -- Condición 1: El usuario es 'owner' de este tenant_id
  EXISTS (
    SELECT 1 FROM public.tenant_staff ts 
    WHERE ts.tenant_id = appointments.tenant_id 
      AND ts.user_id = auth.uid()
      AND ts.role = 'owner'
  )
  OR
  -- Condición 2: El usuario es el empleado asignado (staff_id) a esta cita
  EXISTS (
    SELECT 1 FROM public.tenant_staff ts 
    WHERE ts.id = appointments.staff_id 
      AND ts.user_id = auth.uid()
  )
);

-- NOTA: Repetir esta estructura de política para INSERT, UPDATE, DELETE 
-- y para otras tablas relacionadas.
