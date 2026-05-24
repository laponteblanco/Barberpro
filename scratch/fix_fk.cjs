const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fixRelationships() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log("Creando el puente entre 'tenant_staff' y 'profiles'...");

  // Para esto necesitamos el SQL Editor. Como no puedo entrar directo, informo al usuario.
  // Pero espera, puedo intentar ver si puedo ejecutar una función RPC que ejecute SQL si está habilitada.
  // Si no, te daré el código exacto para el SQL Editor.
  
  console.log("Copia y pega esto en tu SQL Editor de Supabase y dale a RUN:");
  console.log(`
    -- 1. Crear la relación que falta
    ALTER TABLE public.tenant_staff 
    DROP CONSTRAINT IF EXISTS tenant_staff_user_id_fkey;

    ALTER TABLE public.tenant_staff
    ADD CONSTRAINT tenant_staff_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE;

    -- 2. Asegurar que los perfiles sean visibles para el admin client
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow admin to read all profiles" ON public.profiles
    FOR SELECT USING (true);
  `);
}

fixRelationships();
