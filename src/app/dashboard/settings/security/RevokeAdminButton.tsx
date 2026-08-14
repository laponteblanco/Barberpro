"use client";

import { useState } from "react";
import { UserMinus } from "lucide-react";
import { revokeAdminAction } from "./actions";

export function RevokeAdminButton({ staffId }: { staffId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleRevoke() {
    if (!confirm("¿Estás seguro de que quieres revocar el acceso de administrador a este usuario? Volverá a ser recepcionista/barbero.")) {
      return;
    }

    setLoading(true);
    const res = await revokeAdminAction(staffId);
    if (res.error) {
      alert(res.error);
    }
    setLoading(false);
  }

  return (
    <button 
      onClick={handleRevoke}
      disabled={loading}
      className="px-4 py-2 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      title="Revocar acceso de administrador"
    >
      {loading ? "Revocando..." : <UserMinus className="w-5 h-5" />}
    </button>
  );
}
