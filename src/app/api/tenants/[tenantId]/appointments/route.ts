import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/session";
import { getAppointments, createAppointment } from "@/services/appointments.service";
import { toApiError } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const session = await getSession();

  // SEGURIDAD: Verificar acceso al tenant
  if (!session.user || session.tenantId !== tenantId) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Acceso no autorizado." } },
      { status: 403 }
    );
  }

  const url = new URL(_req.url);
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const staffId = url.searchParams.get("staffId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;

  try {
    const data = await getAppointments(tenantId, { from, to, staffId, status });
    return NextResponse.json({ data });
  } catch (err) {
    const { error } = toApiError(err);
    return NextResponse.json({ error }, { status: (err as { statusCode?: number }).statusCode ?? 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "JSON inválido" } },
      { status: 400 }
    );
  }

  try {
    const appointment = await createAppointment(tenantId, body as never);
    return NextResponse.json({ data: appointment }, { status: 201 });
  } catch (err) {
    const { error } = toApiError(err);
    return NextResponse.json({ error }, { status: (err as { statusCode?: number }).statusCode ?? 500 });
  }
}
