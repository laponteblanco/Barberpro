"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function publicCreateAppointmentAction(
  tenantId: string,
  clientData: { 
    id: string | null; 
    name: string; 
    phone: string; 
    cedula: string; 
    birthDate?: string; 
    email?: string; 
    notes?: string;
  },
  appointmentData: { staffId: string; serviceIds: string[]; date: string; time: string }
) {
  const adminSupabase = await createAdminClient();

  let client_id = clientData.id;

  // Verify that the client_id actually exists in the clients table for this tenant
  if (client_id) {
    const { data: exists } = await (adminSupabase as any)
      .from("clients")
      .select("id")
      .eq("id", client_id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!exists) {
      // If it doesn't exist in clients, check if it is a profile ID that is linked to a client
      const { data: linkedClient } = await (adminSupabase as any)
        .from("clients")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("user_id", client_id)
        .maybeSingle();

      if (linkedClient) {
        client_id = linkedClient.id;
      } else {
        // If not found, reset client_id to null so it will be searched or created by cedula below
        client_id = null;
      }
    }
  }

  // 1. If no client ID provided, find or create in the CLIENTS table
  //    (not profiles — public clients don't have auth accounts)
  if (!client_id) {
    // First, try to find an existing client by id_number within this tenant
    const { data: existing } = await (adminSupabase as any)
      .from("clients")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id_number", clientData.cedula)
      .maybeSingle();

    if (existing) {
      client_id = existing.id;
    } else {
      // Check if there is an existing profile for this cedula to proactively link it
      const { data: profile } = await (adminSupabase as any)
        .from("profiles")
        .select("id")
        .eq("id_number", clientData.cedula)
        .maybeSingle();

      // Create a new client record (auto-generated UUID, no auth dependency)
      const { data: newClient, error: clientError } = await (adminSupabase as any)
        .from("clients")
        .insert({
          tenant_id: tenantId,
          user_id: profile?.id || null,
          full_name: clientData.name,
          phone: clientData.phone,
          id_number: clientData.cedula,
          birth_date: clientData.birthDate || null,
          email: clientData.email || null,
          notes: clientData.notes || null
        })
        .select("id")
        .single();

      if (clientError || !newClient) {
        console.error("Error creating client:", clientError);
        throw new Error("No pudimos registrar tus datos de cliente.");
      }
      client_id = newClient.id;
    }
  }

  // 1.5. Validate that client doesn't already have an active appointment (pending or confirmed)
  const { data: activeAppointment, error: activeError } = await (adminSupabase as any)
    .from("appointments")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("client_id", client_id)
    .in("status", ["pending", "confirmed"])
    .maybeSingle();

  if (activeError) {
    console.error("Error checking active appointments:", activeError);
  }

  if (activeAppointment) {
    throw new Error("Ya tienes una cita activa programada. Completa o cancela tu cita antes de agendar otra.");
  }

  if (!appointmentData.serviceIds || appointmentData.serviceIds.length === 0) {
    throw new Error("Debe seleccionar al menos un servicio");
  }

  // 2. Get service details
  const { data: services } = await (adminSupabase as any)
    .from("services")
    .select("id, duration_minutes, price")
    .in("id", appointmentData.serviceIds);

  if (!services || services.length === 0) throw new Error("Servicios no encontrados");

  const serviceMap = new Map(services.map((s: any) => [s.id, s]));
  const total_duration = appointmentData.serviceIds.reduce((acc: number, id: string) => {
    const s = serviceMap.get(id);
    return acc + (s?.duration_minutes || 30);
  }, 0);
  const total_price = appointmentData.serviceIds.reduce((acc: number, id: string) => {
    const s = serviceMap.get(id);
    return acc + Number(s?.price || 0);
  }, 0);

  if (appointmentData.isFragmented && appointmentData.fragmentedSlots) {
    const slots = appointmentData.fragmentedSlots;

    // 2.5. Check conflicts for all slots first
    for (const slot of slots) {
      const start = new Date(`${appointmentData.date}T${slot.startTime}:00-05:00`);
      const end = new Date(start.getTime() + slot.duration * 60000);
      const { data: conflict } = await (adminSupabase as any)
        .from("appointments")
        .select("id")
        .eq("staff_id", appointmentData.staffId)
        .in("status", ["pending", "confirmed", "completed"])
        .lt("start_time", end.toISOString())
        .gt("end_time", start.toISOString())
        .maybeSingle();

      if (conflict) {
        throw new Error(`El horario ${slot.startTime} ya no está disponible para el servicio ${slot.name}. Por favor, selecciona otro horario.`);
      }
    }

    // 3. Insert all fragmented appointments
    for (const slot of slots) {
      const start = new Date(`${appointmentData.date}T${slot.startTime}:00-05:00`);
      const end = new Date(start.getTime() + slot.duration * 60000);
      const servicePrice = Number(serviceMap.get(slot.serviceId)?.price || 0);

      const { data: appt, error } = await (adminSupabase as any).from("appointments").insert({
        tenant_id: tenantId,
        client_id,
        staff_id: appointmentData.staffId,
        service_id: slot.serviceId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        total_price: servicePrice,
        status: 'pending'
      }).select('id').single();

      if (error) {
        throw new Error("No pudimos agendar tu cita: " + error.message);
      }

      await (adminSupabase as any).from("appointment_services").insert({
        appointment_id: appt.id,
        service_id: slot.serviceId
      });
    }

  } else {
    // Normal continuous appointment
    const start_time = new Date(`${appointmentData.date}T${appointmentData.time}:00-05:00`);
    const end_time = new Date(start_time.getTime() + total_duration * 60000);

    // 2.5. Validate that barber (staff_id) doesn't have overlapping appointments
    const { data: overlappingAppointment, error: overlapError } = await (adminSupabase as any)
      .from("appointments")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("staff_id", appointmentData.staffId)
      .in("status", ["pending", "confirmed", "completed"])
      .lt("start_time", end_time.toISOString())
      .gt("end_time", start_time.toISOString())
      .maybeSingle();

    if (overlapError) {
      console.error("Error checking overlapping appointments:", overlapError);
    }

    if (overlappingAppointment) {
      throw new Error("El barbero ya tiene una cita programada en este horario. Por favor selecciona otro espacio.");
    }

    // 3. Insert appointment
    const { data: appt, error } = await (adminSupabase as any).from("appointments").insert({
      tenant_id: tenantId,
      client_id,
      staff_id: appointmentData.staffId,
      service_id: appointmentData.serviceIds[0], // fallback
      start_time: start_time.toISOString(),
      end_time: end_time.toISOString(),
      total_price: total_price,
      status: 'pending'
    }).select('id').single();

    if (error) throw new Error("No pudimos agendar tu cita: " + error.message);

    // 4. Insert appointment services
    const apptServices = appointmentData.serviceIds.map((id: string) => ({
      appointment_id: appt.id,
      service_id: id
    }));

    await (adminSupabase as any)
      .from("appointment_services")
      .insert(apptServices);
  }

  revalidatePath("/dashboard/appointments");
  revalidatePath(`/${tenantId}`);
  
  return { success: true };
}

export async function publicCancelAppointmentAction(
  tenantId: string,
  appointmentId: string,
  clientId: string
) {
  const adminSupabase = await createAdminClient();

  // Verify the appointment belongs to the tenant and the client (allow either clients.id or profiles.id / user_id)
  const { data: appointment, error: fetchError } = await (adminSupabase as any)
    .from("appointments")
    .select("id, client_id, clients(id, user_id)")
    .eq("id", appointmentId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (fetchError || !appointment) {
    throw new Error("Cita no encontrada.");
  }

  const matchesClient = 
    appointment.client_id === clientId || 
    appointment.clients?.id === clientId || 
    appointment.clients?.user_id === clientId;

  if (!matchesClient) {
    throw new Error("No tienes permiso para cancelar esta cita.");
  }

  // Update status to 'cancelled'
  const { error: updateError } = await (adminSupabase as any)
    .from("appointments")
    .update({ status: 'cancelled' })
    .eq("id", appointmentId);

  if (updateError) {
    throw new Error("No pudimos cancelar tu cita: " + updateError.message);
  }

  revalidatePath("/dashboard/appointments");
  revalidatePath(`/${tenantId}`);

  return { success: true };
}
