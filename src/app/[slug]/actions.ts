"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function publicCreateAppointmentAction(
  tenantId: string,
  clientData: { id: string | null; name: string; phone: string; cedula: string },
  appointmentData: { staffId: string; serviceId: string; date: string; time: string }
) {
  const adminSupabase = await createAdminClient();

  let client_id = clientData.id;

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
      // Create a new client record (auto-generated UUID, no auth dependency)
      const { data: newClient, error: clientError } = await (adminSupabase as any)
        .from("clients")
        .insert({
          tenant_id: tenantId,
          full_name: clientData.name,
          phone: clientData.phone,
          id_number: clientData.cedula
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

  // 2. Get service details
  const { data: service } = await (adminSupabase as any)
    .from("services")
    .select("duration_minutes, price")
    .eq("id", appointmentData.serviceId)
    .single();

  if (!service) throw new Error("Servicio no encontrado");

  const start_time = new Date(`${appointmentData.date}T${appointmentData.time}:00-05:00`);
  const end_time = new Date(start_time.getTime() + (service.duration_minutes || 30) * 60000);

  // 3. Insert appointment
  const { error } = await (adminSupabase as any).from("appointments").insert({
    tenant_id: tenantId,
    client_id,
    staff_id: appointmentData.staffId,
    service_id: appointmentData.serviceId,
    start_time: start_time.toISOString(),
    end_time: end_time.toISOString(),
    total_price: service.price || 0,
    status: 'pending'
  });

  if (error) throw new Error("No pudimos agendar tu cita: " + error.message);

  revalidatePath("/dashboard/appointments");
  revalidatePath(`/${tenantId}`);
  
  return { success: true };
}
