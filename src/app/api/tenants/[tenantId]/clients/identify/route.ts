import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const { searchParams } = request.nextUrl;
    const idNumber = searchParams.get("id_number");

    if (!idNumber) {
      return NextResponse.json({ error: "Falta el número de identificación" }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // 1. Buscar si existe en profiles primero
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("*")
      .eq("id_number", idNumber)
      .maybeSingle();

    let client = null;

    if (profile) {
      // Si existe el perfil, buscamos si tiene un registro en la tabla 'clients' para este tenant por user_id
      const { data: tenantClient } = await (supabase as any)
        .from("clients")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", profile.id)
        .maybeSingle();

      if (tenantClient) {
        client = tenantClient;
      } else {
        // Si no tiene registro por user_id, buscamos por id_number
        const { data: clientByIdNumber } = await (supabase as any)
          .from("clients")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("id_number", idNumber)
          .maybeSingle();

        if (clientByIdNumber) {
          // Si encontramos el cliente por id_number pero tiene user_id = null,
          // lo curamos/vinculamos de forma automática enlazando el user_id del perfil.
          if (!clientByIdNumber.user_id) {
            const { data: updatedClient, error: updateError } = await (supabase as any)
              .from("clients")
              .update({ user_id: profile.id })
              .eq("id", clientByIdNumber.id)
              .select("*")
              .single();
            
            if (updateError) {
              console.error("ERROR DE AUTO-CURACION:", updateError);
            }
            client = updatedClient || clientByIdNumber;
          } else {
            client = clientByIdNumber;
          }
        } else {
          // Si no tiene registro en 'clients' en absoluto, lo creamos nuevo
          const { data: newClient, error: createError } = await (supabase as any)
            .from("clients")
            .insert({
              tenant_id: tenantId,
              user_id: profile.id,
              full_name: profile.full_name || "Cliente Migrado",
              phone: profile.phone,
              id_number: profile.id_number
            })
            .select("*")
            .single();

          if (!createError && newClient) {
            client = newClient;
          } else {
            console.error("Error linking profile to client:", createError);
            // Fallback final
            const { data: fallbackClient } = await (supabase as any)
              .from("clients")
              .select("*")
              .eq("tenant_id", tenantId)
              .eq("id_number", idNumber)
              .maybeSingle();
            client = fallbackClient;
          }
        }
      }
    } else {
      // Si no existe el perfil, buscamos directamente en 'clients' por su id_number
      const { data: tenantClient } = await (supabase as any)
        .from("clients")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id_number", idNumber)
        .maybeSingle();

      client = tenantClient;
    }

    if (!client) {
      return NextResponse.json({ client: null });
    }

    // 2. Buscar historial de citas (últimas 10) usando el client.id o client.user_id para máxima robustez
    let query = (supabase as any)
      .from("appointments")
      .select("*, service:services(*), staff:tenant_staff(*, profiles(*))")
      .order("start_time", { ascending: false })
      .limit(10);

    if (client.user_id) {
      query = query.or(`client_id.eq.${client.id},client_id.eq.${client.user_id}`);
    } else {
      query = query.eq("client_id", client.id);
    }

    const { data: history } = await query;

    return NextResponse.json({
      client,
      history: history || []
    });
  } catch (err: any) {
    console.error("Identify API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
