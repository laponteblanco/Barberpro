"use client";

import { Trash2 } from "lucide-react";
import { deleteStaffAction } from "@/app/dashboard/staff/actions";
import { useState } from "react";

export function DeleteStaffButton({ staffId, staffName }: { staffId: string, staffName: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de eliminar a ${staffName}? Esta acción no se puede deshacer.`)) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteStaffAction(staffId);
      if (result?.error) {
        alert(result.error);
      }
    } catch (err: any) {
      alert("Error inesperado al eliminar.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2.5 rounded-xl text-zinc-500 hover:text-destructive hover:bg-destructive/10 transition-all active:scale-95 disabled:opacity-50"
      title="Eliminar miembro"
    >
      <Trash2 className="w-4.5 h-4.5" />
    </button>
  );
}
