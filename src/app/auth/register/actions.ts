"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { generateShortCode } from "@/lib/utils";

export async function signUpAction(data: any) {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();
  const { cedula, name, phone, password, role = 'admin', email, shopName } = data;
  
  // 1. Crear el usuario en Auth (usamos el virtual para mantener login por cédula, pero podríamos usar el real si quisieras. Por ahora conservamos la cédula para el login)
  const virtualEmail = `${cedula}@barberos.app`;
  let newUser: any = null;

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

  if (authError) {
    if (authError.message.includes("already been registered") || authError.message.includes("already exists")) {
      // El usuario ya existe en Auth (por un intento fallido anterior). Lo recuperamos.
      const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === virtualEmail);

      if (!existingUser) {
        return { error: "El usuario ya está registrado, pero no se pudo recuperar la información de sesión." };
      }
      
      // Actualizamos la contraseña y metadata del usuario existente por si acaso
      await adminSupabase.auth.admin.updateUserById(existingUser.id, {
        password: password,
        user_metadata: {
          full_name: name,
          id_number: cedula,
          role: role
        }
      });
      
      newUser = existingUser;
    } else {
      return { error: authError.message };
    }
  } else {
    newUser = authData.user;
  }

  // 2. Crear Perfil y flujo específico por rol
  if (newUser) {
    // 2.1 Crear el perfil (sin columna role si da error, pero por ahora asumo que no la tiene)
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: newUser.id,
        full_name: name,
        id_number: cedula,
        phone: phone,
        email: email
      } as any);
      
    if (profileError) return { error: profileError.message };

    // Si es admin, creamos tenant
    if (role === 'admin') {
      // 2.2 Crear el Tenant (La Barbería)
      const { data: tenant, error: tenantError } = await adminSupabase
        .from('tenants')
        .insert({
          name: shopName,
          slug: shopName.toLowerCase().replace(/\s+/g, '-'),
          short_code: generateShortCode(shopName),
          email: email,
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
