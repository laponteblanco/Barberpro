"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Trophy, Download } from "lucide-react";
import { MonthlyFinancialRecord } from "@/services/analytics.service";
import { cn } from "@/lib/utils";

const formatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload as MonthlyFinancialRecord;
    return (
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 min-w-[240px]">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
            {d.month} {d.year}
          </span>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-white">
            MARGEN {d.margenPorcentaje.toFixed(1)}%
          </span>
        </div>
        <div className="flex flex-col gap-2 text-[10px]">
          <div className="flex justify-between items-center text-zinc-400">
            <span className="flex items-center gap-1.5">💈 Servicios</span>
            <span className="font-bold text-white">{formatter.format(d.ingresosServicios)}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400">
            <span className="flex items-center gap-1.5">🧴 Productos</span>
            <span className="font-bold text-white">{formatter.format(d.ingresosProductos)}</span>
          </div>
          <div className="flex justify-between items-center text-red-400">
            <span className="flex items-center gap-1.5">🔴 Comisiones</span>
            <span className="font-bold">-{formatter.format(d.comisionesBarberos)}</span>
          </div>
          <div className="flex justify-between items-center text-red-400">
            <span className="flex items-center gap-1.5">🔴 Gastos</span>
            <span className="font-bold">-{formatter.format(d.gastosOperativos)}</span>
          </div>
          <div className="border-t border-white/10 mt-1 pt-2 flex justify-between items-center text-emerald-400">
            <span className="flex items-center gap-1.5 font-black">🟢 GANANCIA NETA</span>
            <span className="font-black text-sm">{formatter.format(d.gananciaNeta)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function FinancialEvolution({ data, currentYear }: { data: MonthlyFinancialRecord[], currentYear: number }) {
  const router = useRouter();
  const [view, setView] = useState<'chart'|'table'|'both'>('both');

  const totalNetProfit = data.reduce((sum, d) => sum + d.gananciaNeta, 0);
  const avgMonthlyProfit = data.length > 0 ? totalNetProfit / data.length : 0;
  
  const peakMonth = data.length > 0 
    ? data.reduce((max, d) => d.gananciaNeta > max.gananciaNeta ? d : max, data[0])
    : null;
    
  const lastMonth = data.length > 0 ? data[data.length - 1] : null;
  const lastMoM = lastMonth ? lastMonth.crecimientoMoM : 0;

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`/dashboard/reports?year=${e.target.value}`);
  };

  return (
    <div className="bg-zinc-950 border border-white/5 rounded-[32px] p-8 shadow-2xl flex flex-col gap-8">
      {/* Header and Controls */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-amber-500" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Evolución de Ganancias Mes a Mes
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={currentYear} 
            onChange={handleYearChange}
            className="h-10 px-4 bg-zinc-900 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:border-amber-500"
          >
            <option value={new Date().getFullYear()}>Este Año ({new Date().getFullYear()})</option>
            <option value={new Date().getFullYear() - 1}>Año Anterior ({new Date().getFullYear() - 1})</option>
          </select>

          <div className="flex bg-zinc-900 border border-white/5 rounded-xl p-1">
            <button onClick={() => setView('chart')} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all", view==='chart' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white")}>Gráfico</button>
            <button onClick={() => setView('table')} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all", view==='table' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white")}>Tabla</button>
            <button onClick={() => setView('both')} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all", view==='both' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white")}>Ambas</button>
          </div>
          
          <button className="h-10 px-4 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center gap-2 hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 active:scale-95">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-amber-500/20 transition-all" />
          <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-amber-500" /> Ganancia Neta Anual
          </h5>
          <p className="text-2xl font-black text-white">{formatter.format(totalNetProfit)}</p>
        </div>
        
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-all" />
          <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-blue-500" /> Promedio Mensual
          </h5>
          <p className="text-2xl font-black text-white">{formatter.format(avgMonthlyProfit)}</p>
        </div>
        
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-all" />
          <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-emerald-500" /> Mes Pico
          </h5>
          <p className="text-2xl font-black text-white">
            {peakMonth ? peakMonth.month : '-'} <span className="text-sm text-emerald-500 ml-2">{peakMonth ? formatter.format(peakMonth.gananciaNeta) : ''}</span>
          </p>
        </div>
        
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden group">
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -mr-10 -mt-10 transition-all ${lastMoM >= 0 ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20' : 'bg-red-500/10 group-hover:bg-red-500/20'}`} />
          <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
            {lastMoM >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />} Crecimiento MoM
          </h5>
          <p className={`text-2xl font-black ${lastMoM >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {lastMoM > 0 ? '+' : ''}{lastMoM.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      {(view === 'chart' || view === 'both') && (
        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }} dy={10} />
              <YAxis yAxisId="left" tickFormatter={(value) => `$${(value/1000000).toFixed(1)}M`} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }} dx={-10} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700, color: '#71717a' }} />
              <Bar yAxisId="left" dataKey="totalIngresos" name="Ingresos Brutos" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={32} />
              <Bar yAxisId="left" dataKey="totalEgresos" name="Costos/Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={32} />
              <Line yAxisId="left" type="monotone" dataKey="gananciaNeta" name="Ganancia Neta" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      {(view === 'table' || view === 'both') && (
        <div className="overflow-x-auto custom-scrollbar mt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Mes</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Ingresos Servicios</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Venta Productos</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-red-500/70">Comisiones (-)</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-red-500/70">Gastos (-)</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-500">Ganancia Neta</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Margen %</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Crecimiento</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-all">
                  <td className="py-4 px-4 text-xs font-bold text-white">{row.month}</td>
                  <td className="py-4 px-4 text-xs font-medium text-zinc-300">{formatter.format(row.ingresosServicios)}</td>
                  <td className="py-4 px-4 text-xs font-medium text-zinc-300">{formatter.format(row.ingresosProductos)}</td>
                  <td className="py-4 px-4 text-xs font-bold text-red-400">-{formatter.format(row.comisionesBarberos)}</td>
                  <td className="py-4 px-4 text-xs font-bold text-red-400">-{formatter.format(row.gastosOperativos)}</td>
                  <td className="py-4 px-4 text-sm font-black text-emerald-400">{formatter.format(row.gananciaNeta)}</td>
                  <td className="py-4 px-4 text-xs font-bold text-zinc-400">{row.margenPorcentaje.toFixed(1)}%</td>
                  <td className="py-4 px-4 text-xs font-bold flex items-center gap-1">
                    {row.crecimientoMoM > 0 ? (
                      <><span className="text-emerald-500">+{row.crecimientoMoM.toFixed(1)}%</span> <TrendingUp className="w-3 h-3 text-emerald-500" /></>
                    ) : row.crecimientoMoM < 0 ? (
                      <><span className="text-red-500">{row.crecimientoMoM.toFixed(1)}%</span> <TrendingDown className="w-3 h-3 text-red-500" /></>
                    ) : (
                      <span className="text-zinc-500">0%</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
