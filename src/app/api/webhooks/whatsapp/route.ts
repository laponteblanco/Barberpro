/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  const entries = body?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      for (const status of value?.statuses ?? []) {
        await handleStatusUpdate(status, phoneNumberId);
      }
      for (const message of value?.messages ?? []) {
        await handleInboundMessage(message, phoneNumberId, value?.contacts?.[0]);
      }
    }
  }
  return NextResponse.json({ ok: true });
}

async function handleStatusUpdate(status: { id: string; status: string }, _phoneNumberId: string) {
  const supabase = await createAdminClient();
  const db = supabase as any;
  const statusMap: Record<string, string> = { delivered: "delivered", read: "read", failed: "failed" };
  const mappedStatus = statusMap[status.status];
  if (!mappedStatus) return;
  await db.from("whatsapp_messages").update({ status: mappedStatus }).eq("wa_message_id", status.id);
}

async function handleInboundMessage(
  message: { from: string; type: string; text?: { body: string }; id: string },
  _phoneNumberId: string,
  contact?: { profile?: { name?: string } }
) {
  const supabase = await createAdminClient();
  const db = supabase as any;

  const { data: clients } = await db
    .from("clients")
    .select("id, tenant_id")
    .eq("phone", `+${message.from}`)
    .limit(1);

  const clientRecord = clients?.[0];
  if (clientRecord) {
    await db.from("whatsapp_messages").insert({
      tenant_id: clientRecord.tenant_id,
      client_id: clientRecord.id,
      wa_message_id: message.id,
      direction: "inbound",
      phone_number: `+${message.from}`,
      message_type: "text",
      content: message.text?.body ?? `[${message.type}]`,
      template_name: null,
      status: "delivered",
      error_message: null,
    });
  }
}
