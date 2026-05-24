const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function setupStoragePolicies() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log("Configurando políticas de Storage para 'logos'...");

  // Para configurar políticas de Storage, normalmente se hace vía SQL.
  // Intentaremos usar una función RPC si existe, o simplemente informar al usuario.
  // Pero espera, puedo intentar ejecutar SQL si el proyecto tiene habilitada la extensión 'pg_net' o similar.
  // En la mayoría de los casos, necesito que el usuario lo ejecute en el Dashboard.
  
  console.log("Por favor, ejecuta este SQL en tu SQL Editor de Supabase para habilitar las subidas:");
  console.log(`
    -- 1. Permitir que cualquiera lea los logos (Público)
    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'logos');

    -- 2. Permitir que usuarios autenticados suban logos
    CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (
      bucket_id = 'logos' AND auth.role() = 'authenticated'
    );

    -- 3. Permitir que los usuarios actualicen sus propios logos
    CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE USING (
      bucket_id = 'logos' AND auth.role() = 'authenticated'
    );
  `);

  // Intentamos una subida de prueba con el service key para ver si el bucket responde
  const { data, error } = await supabase.storage.from('logos').list();
  if (error) {
    console.error("Error conectando con el bucket:", error.message);
  } else {
    console.log("Conexión con el bucket 'logos' verificada.");
  }
}

setupStoragePolicies();
