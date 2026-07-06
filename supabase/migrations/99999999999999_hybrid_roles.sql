-- 1. Añadir columna 'user_id' a la tabla de barberos si no existe
ALTER TABLE public.barbers 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 2. Índice para acelerar búsquedas por user_id
CREATE INDEX IF NOT EXISTS idx_barbers_user_id ON public.barbers(user_id);

-- 3. Actualizar políticas RLS de citas (appointments)
-- Eliminar la política anterior (Ajusta el nombre según tu base de datos actual)
DROP POLICY IF EXISTS "Dueños pueden ver todas las citas, barberos las suyas" ON public.appointments;

-- Crear nueva política RLS que soporta rol híbrido
CREATE POLICY "Dueños pueden ver todas las citas, barberos las suyas" ON public.appointments
FOR SELECT
USING (
  -- Condición 1: Es dueño de la tienda a la que pertenece esta cita
  EXISTS (
    SELECT 1 FROM public.shops s 
    WHERE s.id = appointments.shop_id AND s.owner_id = auth.uid()
  )
  OR
  -- Condición 2: Es el barbero asignado a esta cita (y su user_id coincide)
  EXISTS (
    SELECT 1 FROM public.barbers b 
    WHERE b.id = appointments.barber_id AND b.user_id = auth.uid()
  )
);

-- NOTA: Repetir esta estructura de política para INSERT, UPDATE, DELETE 
-- y para otras tablas relacionadas como 'schedules' o 'services'.
