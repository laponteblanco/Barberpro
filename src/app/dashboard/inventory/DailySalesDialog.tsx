"use client";

import { useState } from "react";
import { X, ShoppingBag, Calendar, ArrowRight } from "lucide-react";
import { ReverseSaleButton } from "./ReverseSaleButton";

export function DailySalesDialog({ sales }: { sales: any[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute inset-0 z-10 w-full h-full cursor-pointer"
        title="Ver detalle de ventas"
      />

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <ShoppingBag className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Ventas de Hoy</h2>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Historial detallado
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2.5 hover:bg-white/10 rounded-2xl transition-colors text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {sales.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-zinc-500 text-sm italic">No hay ventas registradas hoy</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sales.map((sale) => (
                    <div key={sale.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-white/10 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold text-xs border border-white/5">
                          {sale.quantity}x
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{sale.product?.name || "Producto"}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                            {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-400">${(sale.total_price || 0).toLocaleString()}</p>
                          <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">Total</p>
                        </div>
                        <ReverseSaleButton 
                          saleId={sale.id} 
                          productName={sale.product?.name || "Producto"} 
                          quantity={sale.quantity} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 bg-zinc-900/30 border-t border-white/5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              <span>Total Unidades: <span className="text-white ml-1">{sales.reduce((acc, s) => acc + s.quantity, 0)}</span></span>
              <span className="flex items-center gap-2">
                Click en <ArrowRight className="w-3 h-3 text-red-500/50" /> para reversar
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
