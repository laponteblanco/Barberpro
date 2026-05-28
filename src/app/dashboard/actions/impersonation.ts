"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setImpersonatedAdmin(staffId: string) {
  const cookieStore = await cookies();
  cookieStore.set("impersonated_staff_id", staffId, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function clearImpersonatedAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete("impersonated_staff_id");
  revalidatePath("/dashboard");
  return { success: true };
}
