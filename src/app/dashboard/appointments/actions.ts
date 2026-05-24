"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/supabase/session";
import { revalidatePath } from "next/cache";

interface ServiceRecord {
  duration_minutes: number;
  price: number;
}

export async function createAppointmentAction(formData: FormData) {
  const { tenantId, user: currentUser } = await getSession();
  
  if (!currentUser || !tenantId) {
    throw new Error("Sesión no válida o expirada");
  }

  const adminSupabase = await createAdminClient();
  const is_new_client = formData.get("is_new_client") === "true";
  let client_id = formData.get("client_id")?.toString();

  // If new client, create them first
  if (is_new_client) {
    const name = formData.get("new_client_name")?.toString();
    const phone = formData.get("new_client_phone")?.toString();
    const cedula = formData.get("new_client_cedula")?.toString();

    if (!name || !cedula) throw new Error("Nombre y Cédula son obligatorios para nuevos clientes");

    // Create or check profile
    const { data: profile, error: profileError } = await (adminSupabase as any)
      .from("profiles")
      .upsert({
        full_name: name,
        phone,
        id_number: cedula
      }, { onConflict: 'id_number' })
      .select()
      .single();

    if (profileError) throw new Error(`Error en perfil: ${profileError.message}`);
    client_id = (profile as any).id;

    // Link to tenant as a client
    await (adminSupabase as any).from("clients").upsert({
      id: client_id,
      tenant_id: tenantId,
      full_name: name,
      phone,
      id_number: cedula
    }, { onConflict: 'id' });
  }

  const staff_id = formData.get("staff_id")?.toString();
  const service_id = formData.get("service_id")?.toString();
  const date = formData.get("date")?.toString();
  const time = formData.get("time")?.toString();

  if (!client_id || !staff_id || !service_id || !date || !time) {
    throw new Error("Faltan campos requeridos");
  }

  // Get service details
  const { data: serviceData } = await (adminSupabase as any)
    .from("services")
    .select("duration_minutes, price")
    .eq("id", service_id)
    .single();
  
  const service = serviceData as unknown as ServiceRecord;
  if (!service) throw new Error("Servicio no encontrado");

  const start_time = new Date(`${date}T${time}:00-05:00`);
  const end_time = new Date(start_time.getTime() + (service.duration_minutes || 30) * 60000);

  // Check for conflicts
  const { data: conflict } = await (adminSupabase as any)
    .from("appointments")
    .select("id")
    .eq("staff_id", staff_id)
    .neq("status", "cancelled")
    .lt("start_time", end_time.toISOString())
    .gt("end_time", start_time.toISOString())
    .maybeSingle();

  if (conflict) {
    throw new Error("El barbero ya tiene una cita programada en este horario.");
  }

  const { error } = await (adminSupabase as any).from("appointments").insert({
    tenant_id: tenantId,
    client_id,
    staff_id,
    service_id,
    start_time: start_time.toISOString(),
    end_time: end_time.toISOString(),
    total_price: service.price || 0,
    status: 'pending'
  });

  if (error) {
    console.error("Error inserting appointment:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/appointments");
  return { success: true };
}

export async function updateAppointmentTimeAction(appointmentId: string, newStartTime: string) {
  const { tenantId, user: currentUser } = await getSession();
  if (!tenantId || !currentUser) throw new Error("No autorizado");

  const adminSupabase = await createAdminClient();
  
  const { data: appt } = await (adminSupabase as any)
    .from("appointments")
    .select("*, service:services(duration_minutes)")
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .single();

  if (!appt) throw new Error("Cita no encontrada");

  const start = new Date(newStartTime);
  const duration = (appt.service as any)?.duration_minutes || 30;
  const end = new Date(start.getTime() + duration * 60000);

  const { data: conflict } = await (adminSupabase as any)
    .from("appointments")
    .select("id")
    .eq("staff_id", appt.staff_id)
    .neq("id", appointmentId)
    .neq("status", "cancelled")
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString())
    .maybeSingle();

  if (conflict) {
    throw new Error("El nuevo horario está ocupado por otra cita.");
  }

  const { error } = await (adminSupabase as any)
    .from("appointments")
    .update({
      start_time: start.toISOString(),
      end_time: end.toISOString()
    })
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId);

  if (error) throw error;

  revalidatePath("/dashboard/appointments");
  return { success: true };
}

export async function updateAppointmentStatusAction(appointmentId: string, status: string, paymentMethod?: string) {
  const { tenantId } = await getSession();
  if (!tenantId) throw new Error("No hay sesión activa");

  const adminSupabase = await createAdminClient();

  if (status === "deleted") {
    // Debug: fetch it first
    const { data: apptToDel } = await (adminSupabase as any)
      .from("appointments")
      .select("id, tenant_id")
      .eq("id", appointmentId)
      .maybeSingle();

    console.log(`[DELETE DEBUG] ID to delete: ${appointmentId}`);
    console.log(`[DELETE DEBUG] User Tenant: ${tenantId}`);
    console.log(`[DELETE DEBUG] Found Appt Tenant: ${apptToDel?.tenant_id}`);

    const { error, count } = await (adminSupabase as any)
      .from("appointments")
      .delete({ count: 'exact' })
      .eq("id", appointmentId)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error(`[DELETE ERROR] ${error.message}`);
      throw new Error(`Error al eliminar la cita: ${error.message}`);
    }
    console.log(`[DELETE] Rows affected: ${count}`);
    console.log(`[DELETE] Successfully deleted appointment ${appointmentId}`);
  } else {
    const updates: any = { status };
    if (paymentMethod) {
      updates.payment_method = paymentMethod;
    }

    const { error } = await (adminSupabase as any)
      .from("appointments")
      .update(updates)
      .eq("id", appointmentId)
      .eq("tenant_id", tenantId);

    if (error) {
      throw new Error(`Error al actualizar el estado: ${error.message}`);
    }
  }
  
  revalidatePath("/dashboard/appointments");
  return { success: true };
}

export async function updateAppointmentDetailsAction(appointmentId: string, formData: FormData) {
  const { tenantId } = await getSession();
  if (!tenantId) throw new Error("No hay sesión activa");

  const adminSupabase = await createAdminClient();

  const serviceId = formData.get("service_id") as string;
  const staffId = formData.get("staff_id") as string;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const clientId = formData.get("client_id") as string;

  // Retrieve service duration
  const { data: service } = await (adminSupabase as any)
    .from("services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .single();

  const duration = service?.duration_minutes || 30;
  const start = new Date(`${date}T${time}:00-05:00`);
  const end = new Date(start.getTime() + duration * 60000);

  // Check conflicts
  const { data: conflict } = await (adminSupabase as any)
    .from("appointments")
    .select("id")
    .eq("staff_id", staffId)
    .neq("id", appointmentId)
    .neq("status", "cancelled")
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString())
    .maybeSingle();

  if (conflict) {
    throw new Error("El horario seleccionado está ocupado por otra cita.");
  }

  const updates: any = {
    staff_id: staffId,
    service_id: serviceId,
    start_time: start.toISOString(),
    end_time: end.toISOString()
  };

  if (clientId) {
    updates.client_id = clientId;
  }

  const { error } = await (adminSupabase as any)
    .from("appointments")
    .update(updates)
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId);

  if (error) {
    throw new Error(`Error al actualizar la cita: ${error.message}`);
  }

  revalidatePath("/dashboard/appointments");
  return { success: true };
}
