"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { generateShortCode } from "@/lib/utils";

export async function signUpAction(data: any) {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();
  const { cedula, name, phone, password, role = 'admin' } = data;
  
  // 1. Crear el usuario en Auth
  const virtualEmail = `${cedula}@barberos.app`;
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: virtualEmail,
    password: password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      id_number: cedula,
      role: role
    }
  });

  if (authError) return { error: authError.message };

  const newUser = authData.user;

  // 2. Crear Perfil y flujo específico por rol
  if (newUser) {
    // 2.1 Crear el perfil (sin columna role si da error, pero por ahora asumo que no la tiene)
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: newUser.id,
        full_name: name,
        id_number: cedula,
        phone: phone
      } as any);
      
    if (profileError) return { error: profileError.message };

    // Si es admin, creamos tenant
    if (role === 'admin') {
      // 2.2 Crear el Tenant (La Barbería)
      const { data: tenant, error: tenantError } = await adminSupabase
        .from('tenants')
        .insert({
          name: `Barbería de ${name}`,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          short_code: generateShortCode(name),
          is_active: true
        } as any)
        .select()
        .single();

      if (tenantError) return { error: `Error creando barbería: ${tenantError.message}` };

      const tenantData = tenant as any;

      // 2.3 Asignar al usuario como Administrador del nuevo Tenant
      const { error: staffError } = await adminSupabase
        .from('tenant_staff')
        .insert({
          tenant_id: tenantData.id,
          user_id: newUser.id,
          display_name: name,
          role: 'admin',
          is_active: true
        } as any);

      if (staffError) return { error: `Error asignando permisos: ${staffError.message}` };
    }

    // 3. Iniciar sesión automáticamente tras el registro
    await supabase.auth.signInWithPassword({
      email: virtualEmail,
      password: password
    });
  }

  return { success: true, role };
}
