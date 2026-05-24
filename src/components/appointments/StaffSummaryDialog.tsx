"use client";

import { X, Scissors, DollarSign, CheckCircle2, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface StaffSummaryDialogProps {
  barber: any;
  appointments: any[];
  onClose: () => void;
}

export function StaffSummaryDialog({ barber, appointments, onClose }: StaffSummaryDialogProps) {
  const completedAppts = appointments.filter(a => a.status === 'completed' || a.status === 'confirmed');
  
  const totalValue = completedAppts.reduce((acc, a) => acc + (a.service?.price || 0), 0);
  const commissionValue = totalValue * (barber.commission_rate / 100);

  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-[#121214] border border-white/10 rounded-[40px] shadow-[0_0_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {barber.avatar_url ? (
                <img src={barber.avatar_url} alt={barber.display_name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-zinc-600" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">{barber.display_name}</h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">Resumen Diario de Servicios</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-colors text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 p-8 bg-zinc-950/20 shrink-0">
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-1">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Recaudo Total</p>
            <p className="text-2xl font-black text-white">{formatter.format(totalValue)}</p>
          </div>
          <div className="p-5 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
            <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-black">Tu Comisión ({barber.commission_rate}%)</p>
            <p className="text-2xl font-black text-indigo-400">{formatter.format(commissionValue)}</p>
          </div>
        </div>

        {/* Services List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 sticky top-0 bg-[#121214] py-2 z-10">Servicios Terminados</h4>
          <div className="space-y-3">
            {completedAppts.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-zinc-800 mx-auto" />
                <p className="text-zinc-600 text-sm italic">No hay servicios completados hoy</p>
              </div>
            ) : (
              completedAppts.map((appt) => (
                <div key={appt.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center">
                      <Scissors className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{appt.service?.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        <p className="text-[10px] text-zinc-500 font-medium">{appt.client?.full_name}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-400">{formatter.format(appt.service?.price || 0)}</p>
                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">Comisión: {formatter.format((appt.service?.price || 0) * (barber.commission_rate / 100))}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-zinc-900/50 border-t border-white/5 text-center shrink-0">
          <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
            {completedAppts.length} servicios totales hoy · Comisión del {barber.commission_rate}% aplicada
          </p>
        </div>
      </div>
    </div>
  );
}
