import { NextRequest, NextResponse } from "next/server";
import { getBIAnalytics } from "@/services/analytics.service";
import { getSession } from "@/lib/supabase/session";
import { toApiError } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const session = await getSession();

  // SEGURIDAD: Verificar que el usuario esté logueado y tenga acceso a este tenantId
  if (!session.user || session.tenantId !== tenantId) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "No tienes permiso para acceder a estos datos." } },
      { status: 403 }
    );
  }

  try {
    const stats = await getBIAnalytics("month"); // Por defecto mes
    return NextResponse.json({ data: stats });
  } catch (err) {
    const { error } = toApiError(err);
    return NextResponse.json(
      { error },
      { status: (err as { statusCode?: number }).statusCode ?? 500 }
    );
  }
}
