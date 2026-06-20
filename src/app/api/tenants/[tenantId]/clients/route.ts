import { NextRequest, NextResponse } from "next/server";
import { getClients, createClient2 } from "@/services/clients.service";
import { getSession } from "@/lib/supabase/session";
import { toApiError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
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

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const offset = Number(url.searchParams.get("offset") ?? 0);

  try {
    const result = await getClients(tenantId, { search, limit, offset });
    return NextResponse.json(result);
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
  const session = await getSession();

  // SEGURIDAD: Verificar acceso al tenant
  if (!session.user || session.tenantId !== tenantId) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Acceso no autorizado." } },
      { status: 403 }
    );
  }

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
    const client = await createClient2(tenantId, body as never);
    return NextResponse.json({ data: client }, { status: 201 });
  } catch (err) {
    const { error } = toApiError(err);
    return NextResponse.json({ error }, { status: (err as { statusCode?: number }).statusCode ?? 500 });
  }
}
