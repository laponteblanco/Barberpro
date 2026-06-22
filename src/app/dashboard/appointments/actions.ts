"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/supabase/session";
import { revalidatePath } from "next/cache";
import { runInBackground } from "@/lib/background-tasks";

interface ServiceRecord {
  duration_minutes: number;
  price: number;
}

export async function createAppointmentAction(formData: FormData) {
  const { tenantId, user: currentUser } = await getSession();
  
  if (!currentUser || !tenantId) {
    return { error: "Sesión no válida o expirada" };
  }

  const adminSupabase = await createAdminClient();
  const is_new_client = formData.get("is_new_client") === "true";
  let client_id = formData.get("client_id")?.toString();

  // If new client, create them first
  if (is_new_client) {
    const name = formData.get("new_client_name")?.toString();
    const phone = formData.get("new_client_phone")?.toString();
    const cedula = formData.get("new_client_cedula")?.toString();
    const birth_date = formData.get("new_client_birth_date")?.toString() || null;
    const email = formData.get("new_client_email")?.toString() || null;
    const notes = formData.get("new_client_notes")?.toString() || null;

    if (!name || !cedula || !phone) return { error: "Nombre, Teléfono y Cédula son obligatorios para nuevos clientes" };

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

    if (profileError) return { error: `Error en perfil: ${profileError.message}` };
    client_id = (profile as any).id;

    // Link to tenant as a client
    await (adminSupabase as any).from("clients").upsert({
      id: client_id,
      tenant_id: tenantId,
      full_name: name,
      phone,
      id_number: cedula,
      birth_date,
      email,
      notes
    }, { onConflict: 'id' });
  }

  const staff_id = formData.get("staff_id")?.toString();
  const service_ids_str = formData.get("service_ids")?.toString();
  const date = formData.get("date")?.toString();
  const time = formData.get("time")?.toString();

  if (!client_id || !staff_id || !service_ids_str || !date || !time) {
    return { error: "Faltan campos requeridos" };
  }

  const service_ids = JSON.parse(service_ids_str) as string[];
  if (!Array.isArray(service_ids) || service_ids.length === 0) {
    return { error: "Debe seleccionar al menos un servicio" };
  }

  // Get service details
  const { data: servicesData } = await (adminSupabase as any)
    .from("services")
    .select("id, duration_minutes, price")
    .in("id", service_ids);
  
  if (!servicesData || servicesData.length === 0) return { error: "Servicios no encontrados" };

  const total_duration = servicesData.reduce((acc: number, s: any) => acc + (s.duration_minutes || 30), 0);
  const total_price = servicesData.reduce((acc: number, s: any) => acc + Number(s.price || 0), 0);

  const start_time = new Date(`${date}T${time}:00-05:00`);
  const end_time = new Date(start_time.getTime() + total_duration * 60000);

  // Check for conflicts
  const { data: conflict } = await (adminSupabase as any)
    .from("appointments")
    .select("id")
    .eq("staff_id", staff_id)
    .in("status", ["pending", "confirmed", "completed"])
    .lt("start_time", end_time.toISOString())
    .gt("end_time", start_time.toISOString())
    .maybeSingle();

  if (conflict) {
    return { error: "El barbero ya tiene una cita programada en este horario." };
  }

  // Use the first service_id as a fallback for the old column if it still exists
  const { data: appt, error } = await (adminSupabase as any).from("appointments").insert({
    tenant_id: tenantId,
    client_id,
    staff_id,
    service_id: service_ids[0], 
    start_time: start_time.toISOString(),
    end_time: end_time.toISOString(),
    total_price: total_price,
    status: 'pending'
  }).select('id').single();

  if (error) {
    console.error("Error inserting appointment:", error);
    return { error: error.message };
  }

  // Insert into appointment_services
  const apptServices = service_ids.map(id => ({
    appointment_id: appt.id,
    service_id: id
  }));

  const { error: asError } = await (adminSupabase as any)
    .from("appointment_services")
    .insert(apptServices);
  
  if (asError) {
    console.error("Error linking services:", asError);
    // Ignore error for now, or maybe rollback if it was critical
  }

  if (error) {
    console.error("Error inserting appointment:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/appointments");

  runInBackground("Send WhatsApp Confirmation", async () => {
    // Aquí iría la lógica pesada: consultar API de WhatsApp, esperar respuesta, guardar log
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`[WhatsApp] Confirmación de cita enviada asincrónicamente para la cita ${appt.id}`);
  });

  return { success: true };
}

export async function updateAppointmentTimeAction(appointmentId: string, newStartTime: string) {
  const { tenantId, user: currentUser } = await getSession();
  if (!tenantId || !currentUser) return { error: "No autorizado" };

  const adminSupabase = await createAdminClient();
  
  const { data: appt } = await (adminSupabase as any)
    .from("appointments")
    .select("*, service:services(duration_minutes)")
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .single();

  if (!appt) return { error: "Cita no encontrada" };

  const start = new Date(newStartTime);
  const duration = (appt.service as any)?.duration_minutes || 30;
  const end = new Date(start.getTime() + duration * 60000);

  const { data: conflict } = await (adminSupabase as any)
    .from("appointments")
    .select("id")
    .eq("staff_id", appt.staff_id)
    .neq("id", appointmentId)
    .in("status", ["pending", "confirmed", "completed"])
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString())
    .maybeSingle();

  if (conflict) {
    return { error: "El nuevo horario está ocupado por otra cita." };
  }

  const { error } = await (adminSupabase as any)
    .from("appointments")
    .update({
      start_time: start.toISOString(),
      end_time: end.toISOString()
    })
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/appointments");
  return { success: true };
}

export async function updateAppointmentStatusAction(appointmentId: string, status: string, paymentMethod?: string) {
  const { tenantId } = await getSession();
  if (!tenantId) return { error: "No hay sesión activa" };

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
      return { error: `Error al eliminar la cita: ${error.message}` };
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
      return { error: `Error al actualizar el estado: ${error.message}` };
    }
  }
  
  revalidatePath("/dashboard/appointments");

  if (status === "confirmed" || status === "completed") {
    runInBackground("Send WhatsApp Status Update", async () => {
      // Simular tarea pesada o envío real
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`[WhatsApp] Actualización de estado (${status}) enviada asincrónicamente para la cita ${appointmentId}`);
    });
  }

  return { success: true };
}

export async function updateAppointmentDetailsAction(appointmentId: string, formData: FormData) {
  const { tenantId } = await getSession();
  if (!tenantId) return { error: "No hay sesión activa" };

  const adminSupabase = await createAdminClient();

  const serviceIdsStr = formData.get("service_ids") as string;
  const staffId = formData.get("staff_id") as string;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const clientId = formData.get("client_id") as string;

  let serviceIds: string[] = [];
  try {
    serviceIds = JSON.parse(serviceIdsStr);
  } catch (e) {
    // fallback if it's sent as a single string ID
    serviceIds = [formData.get("service_id") as string].filter(Boolean);
  }

  if (serviceIds.length === 0) return { error: "Debe seleccionar al menos un servicio" };

  // Retrieve service duration and price
  const { data: servicesData } = await (adminSupabase as any)
    .from("services")
    .select("id, duration_minutes, price")
    .in("id", serviceIds);

  const duration = servicesData?.reduce((acc: number, s: any) => acc + (s.duration_minutes || 30), 0) || 30;
  const totalPrice = servicesData?.reduce((acc: number, s: any) => acc + Number(s.price || 0), 0) || 0;

  const start = new Date(`${date}T${time}:00-05:00`);
  const end = new Date(start.getTime() + duration * 60000);

  // Check conflicts
  const { data: conflict } = await (adminSupabase as any)
    .from("appointments")
    .select("id")
    .eq("staff_id", staffId)
    .neq("id", appointmentId)
    .in("status", ["pending", "confirmed", "completed"])
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString())
    .maybeSingle();

  if (conflict) {
    return { error: "El horario seleccionado está ocupado por otra cita." };
  }

  const updates: any = {
    staff_id: staffId,
    service_id: serviceIds[0], // fallback
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    total_price: totalPrice
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
    return { error: `Error al actualizar la cita: ${error.message}` };
  }

  // Update appointment_services relation
  await (adminSupabase as any).from("appointment_services").delete().eq("appointment_id", appointmentId);
  const apptServices = serviceIds.map(id => ({
    appointment_id: appointmentId,
    service_id: id
  }));
  await (adminSupabase as any).from("appointment_services").insert(apptServices);

  revalidatePath("/dashboard/appointments");
  return { success: true };
}

export async function createAgendaBlockAction(staffId: string, startTime: string, durationMinutes: number, reason: string = "Bloqueo") {
  const { tenantId, user: currentUser } = await getSession();
  if (!tenantId || !currentUser) return { error: "No autorizado" };

  const adminSupabase = await createAdminClient();
  
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  // Check conflicts with appointments
  const { data: apptConflict } = await (adminSupabase as any)
    .from("appointments")
    .select("id")
    .eq("staff_id", staffId)
    .in("status", ["pending", "confirmed", "completed"])
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString())
    .maybeSingle();

  if (apptConflict) {
    return { error: "El horario seleccionado choca con una cita existente." };
  }

  // Check conflicts with other blocks
  const { data: blockConflict } = await (adminSupabase as any)
    .from("agenda_blocks")
    .select("id")
    .eq("staff_id", staffId)
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString())
    .maybeSingle();

  if (blockConflict) {
    return { error: "El horario seleccionado ya está bloqueado." };
  }

  const { error } = await (adminSupabase as any).from("agenda_blocks").insert({
    tenant_id: tenantId,
    staff_id: staffId,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    reason: reason
  });

  if (error) {
    return { error: `Error al crear bloqueo: ${error.message}` };
  }

  revalidatePath("/dashboard/appointments");
  return { success: true };
}

export async function deleteAgendaBlockAction(blockId: string) {
  const { tenantId, user: currentUser } = await getSession();
  if (!tenantId || !currentUser) return { error: "No autorizado" };

  const adminSupabase = await createAdminClient();
  
  const { error } = await (adminSupabase as any)
    .from("agenda_blocks")
    .delete()
    .eq("id", blockId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { error: `Error al eliminar bloqueo: ${error.message}` };
  }

  revalidatePath("/dashboard/appointments");
  return { success: true };
}

