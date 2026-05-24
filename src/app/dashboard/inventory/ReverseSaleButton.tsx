"use client";

import { useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { reverseSaleAction } from "./actions";

export function ReverseSaleButton({ saleId, productName, quantity }: { saleId: string, productName: string, quantity: number }) {
  const [loading, setLoading] = useState(false);

  const handleReverse = async () => {
    if (!confirm(`¿Estás seguro de reversar la venta de ${quantity}x ${productName}? El stock se devolverá al inventario.`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await reverseSaleAction(saleId);
      if (result?.error) {
        alert(result.error);
      }
    } catch (err: any) {
      alert("Error al reversar la venta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleReverse}
      disabled={loading}
      className="p-2 hover:bg-red-500/10 rounded-xl text-zinc-500 hover:text-red-500 transition-all group"
      title="Reversar venta"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <RotateCcw className="w-4 h-4 group-hover:rotate-[-45deg] transition-transform" />
      )}
    </button>
  );
}
