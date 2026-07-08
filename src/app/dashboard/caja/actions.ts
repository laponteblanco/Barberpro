"use server";

import { openCashSession, closeCashSession, verifySecurityPin, deleteCashSession, updateClosedCashSession } from "@/services/cash.service";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/server";
import { getCashSessionDetailsById } from "@/services/cash.service";

export async function openCashAction(openingBalance: number) {
  try {
    const res = await openCashSession(openingBalance);
    if (res.success) {
      revalidatePath("/dashboard/caja");
    }
    return res;
  } catch (err: any) {
    return { success: false, error: err.message || "Error desconocido" };
  }
}

export async function closeCashAction(actualBalance: number, barbersBreakdown?: any[]) {
  try {
    const res = await closeCashSession(actualBalance, barbersBreakdown);
    if (res.success) {
      revalidatePath("/dashboard/caja");
    }
    return res;
  } catch (err: any) {
    return { success: false, error: err.message || "Error desconocido" };
  }
}

export async function verifySecurityPinAction(pin: string) {
  return await verifySecurityPin(pin);
}

export async function deleteCashSessionAction(sessionId: string) {
  try {
    const res = await deleteCashSession(sessionId);
    if (res.success) {
      revalidatePath("/dashboard/caja");
    }
    return res;
  } catch (err: any) {
    return { success: false, error: err.message || "Error desconocido" };
  }
}

export async function updateCashSessionAction(sessionId: string, actualBalance: number, barbersBreakdown?: any[]) {
  try {
    const res = await updateClosedCashSession(sessionId, actualBalance, barbersBreakdown);
    if (res.success) {
      revalidatePath("/dashboard/caja");
    }
    return res;
  } catch (err: any) {
    return { success: false, error: err.message || "Error desconocido" };
  }
}

export async function uploadClosingReportAction(formData: FormData) {
  try {
    const { tenantId } = await getSession();
    if (!tenantId) return { success: false, error: "No session" };

    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file provided" };

    const adminSupabase = await createAdminClient();
    const filePath = `reports/${tenantId}_cierre_${Date.now()}.pdf`;

    const { error: uploadError } = await adminSupabase.storage
      .from("avatars") // Re-using avatars bucket since it is public
      .upload(filePath, file, {
        contentType: "application/pdf"
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: { publicUrl } } = adminSupabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    return { success: true, url: publicUrl };
  } catch (err: any) {
    return { success: false, error: err.message || "Error desconocido" };
  }
}

export async function getCashSessionDetailsByIdAction(sessionId: string) {
  try {
    const details = await getCashSessionDetailsById(sessionId);
    return details;
  } catch (err: any) {
    console.error("Error in getCashSessionDetailsByIdAction:", err);
    return null;
  }
}
