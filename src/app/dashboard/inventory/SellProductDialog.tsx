"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ShoppingCart, Minus, Plus, Loader2, X } from "lucide-react";
import { sellProductAction } from "./actions";
import { cn } from "@/lib/utils";

export function SellProductDialog({ product }: { product: any }) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSell = async () => {
    setLoading(true);
    try {
      const result = await sellProductAction(product.id, quantity);
      if (result?.error) {
        alert(result.error);
      } else {
        setIsOpen(false);
        setQuantity(1);
      }
    } catch (error: any) {
      alert(error.message || "Error al procesar la venta");
    } finally {
      setLoading(false);
    }
  };

  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-[92vw] max-w-[400px] bg-zinc-950 border border-white/10 rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <ShoppingCart className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Vender Producto</h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 font-medium">Registrar salida de stock</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2.5 hover:bg-white/10 rounded-2xl transition-colors text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-8 space-y-7">
          <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5 space-y-3">
            <div>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Producto</p>
              <p className="text-white font-bold text-lg leading-tight">{product.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
              <div>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter mb-0.5">Precio Unitario</p>
                <p className="text-sm font-black text-emerald-400">${product.retail_price} COP</p>
              </div>
              <div>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter mb-0.5">Stock Disponible</p>
                <p className="text-sm font-bold text-white">{product.stock} un.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest text-center">Cantidad a Vender</p>
            <div className="flex items-center justify-center gap-8">
              <button 
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-all active:scale-90 border border-white/5 shadow-inner"
              >
                <Minus className="w-6 h-6" />
              </button>
              <span className="text-5xl font-black text-white min-w-[70px] text-center tabular-nums">{quantity}</span>
              <button 
                type="button"
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                disabled={quantity >= product.stock}
                className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-all active:scale-90 border border-white/5 shadow-inner disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/10 flex items-center justify-between shadow-inner">
            <div>
              <p className="text-emerald-500/60 text-[10px] font-black uppercase tracking-widest">Total a Cobrar</p>
              <p className="text-2xl font-black text-emerald-400 tabular-nums">${product.retail_price * quantity} <span className="text-[10px] font-medium opacity-50 ml-1">COP</span></p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <ShoppingCart className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="p-8 bg-zinc-900/50 border-t border-white/5">
          <button
            onClick={handleSell}
            disabled={loading || product.stock <= 0}
            className="w-full h-14 bg-emerald-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
            Confirmar Venta
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2.5 rounded-xl text-emerald-500 hover:bg-emerald-500/10 transition-all active:scale-95 group" 
        title="Vender producto"
      >
        <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
      </button>

      {mounted && typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null}
    </>
  );
}
