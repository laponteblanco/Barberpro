const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function cleanSlug() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log("Limpiando el Slug de la barbería...");

  // Buscamos el tenant que tiene la URL de localhost en el slug
  const { data: tenants, error: fetchError } = await supabase
    .from('tenants')
    .select('id, slug, name');

  if (fetchError) {
    console.error("Error buscando tenants:", fetchError);
    return;
  }

  for (const tenant of tenants) {
    if (tenant.slug && tenant.slug.includes('http')) {
      const newSlug = tenant.name.toLowerCase().replace(/\s+/g, '-');
      console.log(`Actualizando slug de '${tenant.name}' de '${tenant.slug}' a '${newSlug}'`);
      
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ slug: newSlug })
        .eq('id', tenant.id);

      if (updateError) {
        console.error("Error actualizando:", updateError);
      } else {
        console.log("¡Slug limpiado con éxito!");
      }
    }
  }
}

cleanSlug();
