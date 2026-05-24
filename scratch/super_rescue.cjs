const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function superRescue() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const email = 'luisaponteblanco@gmail.com';
  const userId = '027ee4b2-cf8c-4e04-8489-56d289a49fca';

  console.log("Iniciando Súper Rescate (Basic Schema) para:", email);

  // 1. Restaurar perfil
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: 'Luis Aponte (Admin)'
  });
  if (profileError) console.log("Error perfil:", profileError.message);
  else console.log("Perfil restaurado/actualizado.");

  // 2. Restaurar tenant
  let tenantId;
  const { data: existingTenant } = await supabase.from('tenants').select('*').limit(1).maybeSingle();
  
  if (existingTenant) {
    tenantId = existingTenant.id;
    console.log("Tenant existente encontrado:", existingTenant.name);
  } else {
    const { data: newTenant, error: tenantError } = await supabase.from('tenants').insert({
      name: 'Moon City Barber',
      slug: 'moon-city-barber',
      is_active: true
    }).select().single();
    
    if (tenantError) {
      console.log("Error creando tenant:", tenantError.message);
      return;
    }
    tenantId = newTenant.id;
    console.log("Nuevo tenant creado con éxito.");
  }

  // 3. Restaurar staff link
  const { error: staffError } = await supabase.from('tenant_staff').upsert({
    tenant_id: tenantId,
    user_id: userId,
    role: 'admin',
    is_active: true
  }, { onConflict: 'tenant_id, user_id' });

  if (staffError) console.log("Error staff:", staffError.message);
  else console.log("Permisos de administrador concedidos con éxito.");

  console.log("¡Rescate completado! Ya puedes entrar al sistema.");
}

superRescue();
