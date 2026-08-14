import { createAdminClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import type { WhatsAppMessage } from "@/types/database";

const WA_API_VERSION = "v20.0";
const WA_BASE_URL = `https://graph.facebook.com/${WA_API_VERSION}`;

interface SendTemplateParams {
  to: string; // E.164 format
  templateName: string;
  languageCode?: string;
  components?: object[];
}

interface SendTextParams {
  to: string;
  text: string;
}

/**
 * Low-level WhatsApp Cloud API client.
 * Always call via the wrapper functions below to ensure logging.
 */
async function callWhatsAppAPI(
  phoneNumberId: string,
  token: string,
  payload: object
): Promise<{ messages: { id: string }[] }> {
  const res = await fetch(
    `${WA_BASE_URL}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new AppError(
      `WhatsApp API error: ${res.status}`,
      "EXTERNAL_API_ERROR",
      502,
      body
    );
  }

  return res.json();
}

/**
 * Sends a pre-approved WhatsApp message template.
 */
export async function sendWhatsAppTemplate(
  tenantId: string,
  phoneNumberId: string,
  token: string,
  params: SendTemplateParams
): Promise<string> {
  const payload = {
    messaging_product: "whatsapp",
    to: params.to,
    type: "template",
    template: {
      name: params.templateName,
      language: { code: params.languageCode ?? "es" },
      components: params.components ?? [],
    },
  };

  const result = await callWhatsAppAPI(phoneNumberId, token, payload);
  const waMessageId = result.messages[0]?.id ?? null;

  await logWhatsAppMessage(tenantId, {
    phone_number: params.to,
    direction: "outbound",
    message_type: "template",
    content: params.templateName,
    template_name: params.templateName,
    wa_message_id: waMessageId,
    status: "sent",
    error_message: null,
  });

  return waMessageId;
}

/**
 * Sends a free-form text message (only within 24h customer-initiated window).
 */
export async function sendWhatsAppText(
  tenantId: string,
  phoneNumberId: string,
  token: string,
  params: SendTextParams
): Promise<string> {
  const payload = {
    messaging_product: "whatsapp",
    to: params.to,
    type: "text",
    text: { body: params.text },
  };

  const result = await callWhatsAppAPI(phoneNumberId, token, payload);
  const waMessageId = result.messages[0]?.id ?? null;

  await logWhatsAppMessage(tenantId, {
    phone_number: params.to,
    direction: "outbound",
    message_type: "text",
    content: params.text,
    wa_message_id: waMessageId,
    template_name: null,
    status: "sent",
    error_message: null,
  });

  return waMessageId;
}

/** Sends an appointment reminder using the tenant's WA credentials */
export async function sendAppointmentReminder(
  tenantId: string,
  appointment: {
    client_phone: string;
    client_name: string;
    service_name: string;
    staff_name: string;
    start_time: string;
    total_price: number;
  },
  credentials: { phone_number_id: string; token: string }
): Promise<void> {
  const date = new Date(appointment.start_time);
  const dateStr = date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const timeStr = date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  await sendWhatsAppTemplate(
    tenantId,
    credentials.phone_number_id,
    credentials.token,
    {
      to: appointment.client_phone,
      templateName: "appointment_reminder",
      languageCode: "es",
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: appointment.client_name },
            { type: "text", text: appointment.service_name },
            { type: "text", text: appointment.staff_name },
            { type: "text", text: `${dateStr} a las ${timeStr}` },
            { type: "text", text: `$${appointment.total_price}` },
          ],
        },
      ],
    }
  );
}

// ─── Internal Logging ─────────────────────────────────────────────────────────

async function logWhatsAppMessage(
  tenantId: string,
  msg: Omit<
    WhatsAppMessage,
    "id" | "tenant_id" | "client_id" | "appointment_id" | "created_at"
  >
): Promise<void> {
  try {
    const supabase = await createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from("whatsapp_messages").insert({
      tenant_id: tenantId,
      ...msg,
    } as any);
  } catch {
    // Log failures are non-fatal
  }
}
