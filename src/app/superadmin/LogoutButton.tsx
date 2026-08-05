"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const handleLogout = async () => {
    const supabase = createClient();
    document.cookie = "active_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure";
    document.cookie = "impersonated_staff_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure";
    document.cookie = "skip_admin_selector=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure";
    document.cookie = "x-active-tenant=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure";
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <button 
      type="button" 
      onClick={handleLogout} 
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-medium text-sm"
    >
      <LogOut className="w-4 h-4" />
      Cerrar Sesión
    </button>
  );
}
