"use server";

import { openCashSession, closeCashSession, verifySecurityPin, deleteCashSession, updateClosedCashSession } from "@/services/cash.service";
import { revalidatePath } from "next/cache";

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
