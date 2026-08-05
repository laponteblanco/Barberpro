-- Migración: Añadir permisos granulares a los administradores

-- 1. Añadir la columna de permisos a tenant_staff
ALTER TABLE public.tenant_staff 
ADD COLUMN permissions JSONB DEFAULT '{}'::jsonb;

-- 2. Asegurar que los dueños tengan una estructura de permisos válida implícita 
-- (Los dueños siempre tendrán acceso total en la lógica de la app, pero es buena práctica tener el JSON validado).
-- No es necesario rellenar retrospectivamente, pero podemos inicializar con un objeto vacío.
UPDATE public.tenant_staff 
SET permissions = '{}'::jsonb 
WHERE permissions IS NULL;
