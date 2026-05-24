"use client";

import { useState, useEffect } from "react";
import { X, Calendar, ChevronLeft, ChevronRight, ShoppingBag, RotateCcw, Loader2 } from "lucide-react";
import { getSalesByDateAction } from "./actions";
import { ReverseSaleButton } from "./ReverseSaleButton";

export function SalesHistoryCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSales();
    }
  }, [selectedDate, isOpen]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const data = await getSalesByDateAction(selectedDate);
      setSales(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-[24px] bg-indigo-500 text-white shadow-2xl shadow-indigo-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[60] group"
      >
        <Calendar className="w-7 h-7 group-hover:rotate-12 transition-transform" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:justify-end p-4 sm:p-8 pointer-events-none">
          <div className="w-full max-w-md bg-[#121214] border border-white/10 rounded-[32px] shadow-[0_0_100px_-20px_rgba(0,0,0,0.8)] pointer-events-auto animate-in slide-in-from-right-10 duration-500 flex flex-col max-h-[80vh]">
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <ShoppingBag className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Historial Diario</h2>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1 font-medium italic">Consulta de ventas pasadas</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2.5 hover:bg-white/10 rounded-2xl transition-colors text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Date Selector */}
            <div className="p-6 bg-zinc-900/20 border-b border-white/5 flex items-center justify-between gap-4 shrink-0">
              <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <ChevronLeft className="w-5 h-5 text-zinc-500" />
              </button>
              <div className="flex-1 text-center">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-white font-black uppercase tracking-widest text-xs outline-none cursor-pointer hover:text-indigo-400 transition-colors"
                />
              </div>
              <button onClick={() => changeDate(1)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <ChevronRight className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Sales List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest animate-pulse">Buscando registros...</p>
                </div>
              ) : sales.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto border border-white/5">
                    <X className="w-8 h-8 text-zinc-700" />
                  </div>
                  <p className="text-zinc-500 text-sm italic">Sin ventas este día</p>
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

            {/* Footer Summary */}
            {!loading && sales.length > 0 && (
              <div className="p-6 bg-zinc-900/50 border-t border-white/5 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Total del Día</p>
                    <p className="text-2xl font-black text-white">
                      ${sales.reduce((acc, s) => acc + (s.total_price || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Unidades</p>
                    <p className="text-xl font-black text-indigo-500">
                      {sales.reduce((acc, s) => acc + s.quantity, 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
