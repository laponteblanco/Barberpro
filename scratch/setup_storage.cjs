const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function setupStorage() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log("Configurando storage para logos...");

  // Intentar crear el bucket 'logos' si no existe
  const { data, error } = await supabase.storage.createBucket('logos', {
    public: true,
    fileSizeLimit: 2097152, // 2MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
  });

  if (error && error.message === 'Bucket already exists') {
    console.log("El bucket 'logos' ya existe.");
  } else if (error) {
    console.error("Error al crear el bucket:", error);
  } else {
    console.log("Bucket 'logos' creado con éxito.");
  }

  // Asegurar que la política pública de lectura existe (aunque el bucket sea público, a veces se necesitan políticas de RLS)
  // Nota: Mediante el cliente no podemos ejecutar SQL, pero el createBucket con public:true suele ser suficiente.
}

setupStorage();
