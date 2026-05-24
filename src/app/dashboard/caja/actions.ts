"use server";

import { openCashSession, closeCashSession } from "@/services/cash.service";
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
