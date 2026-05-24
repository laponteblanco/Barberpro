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

    // 1. Buscar el cliente
    // Nota: Usamos profiles porque la tabla clients parece no existir en la migración inicial
    // y los clientes están vinculados a perfiles.
    const { data: client, error: clientError } = await (supabase as any)
      .from("profiles")
      .select("*")
      .eq("id_number", idNumber)
      .single();

    if (clientError || !client) {
      // Si no existe el perfil, intentamos buscar en la tabla clients por si acaso existe
      const { data: clientTable, error: clientTableError } = await (supabase as any)
        .from("clients")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id_number", idNumber)
        .maybeSingle();

      if (clientTableError || !clientTable) {
        return NextResponse.json({ client: null });
      }
      
      // Si se encontró en la tabla clients, lo usamos
      return NextResponse.json({
        client: clientTable,
        history: []
      });
    }

    // 2. Buscar historial de citas (últimas 10)
    const { data: history } = await (supabase as any)
      .from("appointments")
      .select("*, service:services(*), staff:tenant_staff(*, profiles(*))")
      .eq("client_id", client.id)
      .neq("status", "deleted")
      .order("start_time", { ascending: false })
      .limit(10);

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
