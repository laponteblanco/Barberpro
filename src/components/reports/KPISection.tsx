"use client";

import { DollarSign, TrendingUp, Users, Target, ArrowUpRight, ArrowDownRight, Scissors, Package } from "lucide-react";
import { cn } from "@/lib/utils";

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
      value: formatter.format(data.totalServiceRevenue || 0),
      icon: Scissors,
      color: "indigo",
      iconBg: "bg-indigo-500/10 border-indigo-500/20 text-indigo-500",
      glowBg: "bg-indigo-500/5 group-hover:bg-indigo-500/10"
    },
    {
      title: "Ingresos Productos",
      value: formatter.format(data.totalProductRevenue || 0),
      icon: Package,
      color: "emerald",
      iconBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
      glowBg: "bg-emerald-500/5 group-hover:bg-emerald-500/10"
    },
    {
      title: "Ganancia Neta",
      value: formatter.format(data.netProfit || 0),
      icon: Target,
      color: "amber",
      iconBg: "bg-amber-500/10 border-amber-500/20 text-amber-500",
      glowBg: "bg-amber-500/5 group-hover:bg-amber-500/10"
    },
    {
      title: "Ticket Promedio",
      value: formatter.format(data.avgTicket || 0),
      icon: TrendingUp,
      color: "purple",
      iconBg: "bg-purple-500/10 border-purple-500/20 text-purple-500",
      glowBg: "bg-purple-500/5 group-hover:bg-purple-500/10"
    },
    {
      title: "Tasa Retención",
      value: `${(data.retention || 0).toFixed(1)}%`,
      icon: Users,
      color: "blue",
      iconBg: "bg-blue-500/10 border-blue-500/20 text-blue-500",
      glowBg: "bg-blue-500/5 group-hover:bg-blue-500/10"
    }
  ];

  const filteredKpis = role === "barber" 
    ? kpis.filter(kpi => kpi.title !== "Ingresos Productos")
    : kpis;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 xl:gap-4">
      {filteredKpis.map((kpi) => {
        const valLen = kpi.value.length;
        const textSize = valLen > 14 
          ? "text-base xl:text-lg" 
          : valLen > 11 
          ? "text-lg xl:text-xl" 
          : "text-xl xl:text-2xl";

        return (
          <div 
            key={kpi.title} 
            className="bg-zinc-950 border border-white/5 rounded-3xl p-5 xl:p-6 shadow-xl hover:border-white/10 transition-all group relative overflow-hidden flex flex-col justify-between"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0", kpi.iconBg)}>
                <kpi.icon className="w-5 h-5" />
              </div>
              {(kpi as any).change && (
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black",
                  (kpi as any).trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                )}>
                  {(kpi as any).trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {(kpi as any).change}
                </div>
              )}
            </div>
            
            <div className="min-w-0">
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1 truncate">{kpi.title}</p>
              <h3 
                className={cn("font-black text-white tracking-tight tabular-nums truncate leading-tight", textSize)}
                title={kpi.value}
              >
                {kpi.value}
              </h3>
            </div>

            {/* Glow Effect */}
            <div className={cn("absolute -bottom-10 -right-10 w-24 h-24 blur-[50px] transition-all rounded-full pointer-events-none", kpi.glowBg)} />
          </div>
        );
      })}
    </div>
  );
}

