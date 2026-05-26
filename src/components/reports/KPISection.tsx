"use client";

import { DollarSign, TrendingUp, Users, Target, ArrowUpRight, ArrowDownRight, Scissors, Package } from "lucide-react";


// Fixed formatter for hydration stability
const formatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function KPISection({ data, role }: { data: any; role?: string }) {
  const kpis = [
    {
      title: "Ingresos Servicios",
      value: formatter.format(data.totalServiceRevenue),
      icon: Scissors,
      color: "indigo"
    },
    {
      title: "Ingresos Productos",
      value: formatter.format(data.totalProductRevenue),
      icon: Package,
      color: "emerald"
    },
    {
      title: "Ganancia Neta",
      value: formatter.format(data.netProfit),
      icon: Target,
      color: "amber"
    },
    {
      title: "Ticket Promedio",
      value: formatter.format(data.avgTicket),
      icon: TrendingUp,
      color: "purple"
    },
    {
      title: "Tasa Retención",
      value: `${data.retention.toFixed(1)}%`,
      icon: Users,
      color: "blue"
    }
  ];

  const filteredKpis = role === "barber" 
    ? kpis.filter(kpi => kpi.title !== "Ingresos Productos")
    : kpis;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
      {filteredKpis.map((kpi) => (
        <div key={kpi.title} className="bg-zinc-950 border border-white/5 rounded-[32px] p-7 shadow-xl hover:border-white/10 transition-all group relative overflow-hidden">
          <div className="flex items-start justify-between mb-4">
            <div className={`w-12 h-12 rounded-2xl bg-${kpi.color}-500/10 flex items-center justify-center border border-${kpi.color}-500/20`}>
              <kpi.icon className={`w-6 h-6 text-${kpi.color}-500`} />
            </div>
            {(kpi as any).change && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${
                (kpi as any).trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
              }`}>
                {(kpi as any).trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {(kpi as any).change}
              </div>
            )}
          </div>
          
          <div>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">{kpi.title}</p>
            <h3 className="text-3xl font-black text-white tracking-tighter">{kpi.value}</h3>
          </div>

          {/* Glow Effect */}
          <div className={`absolute -bottom-10 -right-10 w-24 h-24 bg-${kpi.color}-500/5 blur-[50px] group-hover:bg-${kpi.color}-500/10 transition-all rounded-full`} />
        </div>
      ))}
    </div>
  );
}
