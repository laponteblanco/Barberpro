"use client";

import { ShoppingBag, Flame, TrendingUp, Scissors, Percent, DollarSign } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const hours = ['8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm'];

const formatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function InventoryOperations({ heatmap, topProducts }: { heatmap: any, topProducts: any[] }) {
  const [metric, setMetric] = useState<'servicios' | 'ocupacion' | 'ingresos'>('servicios');
  const [hoveredCell, setHoveredCell] = useState<{ dayIndex: number, hourIndex: number } | null>(null);

  const hoursList: string[] = heatmap?.hours || ['8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm'];
  const cells = heatmap?.cells || [];
  const peakInsight = heatmap?.peakInsight || "No hay suficientes datos registrados para determinar el pico de ocupación.";
  const daysList = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Helper para color y valores
  const getCellConfig = (cell: any) => {
    let valueStr = "";
    let bgColor = "#FFFFFF"; // Sin actividad
    let textColor = "transparent";

    if (!cell) return { valueStr, bgColor, textColor };

    if (metric === 'servicios') {
      const v = cell.serviciosAtendidos || 0;
      if (v === 0) {
        bgColor = "rgba(255, 255, 255, 0.02)";
      } else if (v <= 3) {
        bgColor = "#FEE2E2"; textColor = "#1E293B"; valueStr = v.toString();
      } else if (v <= 6) {
        bgColor = "#FCA5A5"; textColor = "#1E293B"; valueStr = v.toString();
      } else if (v <= 9) {
        bgColor = "#EF4444"; textColor = "#FFFFFF"; valueStr = v.toString();
      } else {
        bgColor = "#DC2626"; textColor = "#FFFFFF"; valueStr = v.toString();
      }
    } else if (metric === 'ocupacion') {
      const v = cell.porcentajeOcupacion || 0;
      if (v === 0) {
        bgColor = "rgba(255, 255, 255, 0.02)";
      } else if (v <= 25) {
        bgColor = "#FEE2E2"; textColor = "#1E293B"; valueStr = `${v}%`;
      } else if (v <= 50) {
        bgColor = "#FCA5A5"; textColor = "#1E293B"; valueStr = `${v}%`;
      } else if (v <= 75) {
        bgColor = "#EF4444"; textColor = "#FFFFFF"; valueStr = `${v}%`;
      } else {
        bgColor = "#DC2626"; textColor = "#FFFFFF"; valueStr = `${v}%`;
      }
    } else if (metric === 'ingresos') {
      const v = cell.ingresosTotales || 0;
      if (v === 0) {
        bgColor = "rgba(255, 255, 255, 0.02)";
      } else if (v <= 50000) {
        bgColor = "#FEE2E2"; textColor = "#1E293B"; valueStr = `$${(v/1000).toFixed(0)}k`;
      } else if (v <= 150000) {
        bgColor = "#FCA5A5"; textColor = "#1E293B"; valueStr = `$${(v/1000).toFixed(0)}k`;
      } else if (v <= 300000) {
        bgColor = "#EF4444"; textColor = "#FFFFFF"; valueStr = `$${(v/1000).toFixed(0)}k`;
      } else {
        bgColor = "#DC2626"; textColor = "#FFFFFF"; valueStr = `$${(v/1000).toFixed(0)}k`;
      }
    }

    return { valueStr, bgColor, textColor };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Top Products */}
      <div className="bg-zinc-950 border border-white/5 rounded-[32px] p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <ShoppingBag className="w-5 h-5 text-emerald-500" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Productos Más Vendidos</h4>
        </div>

        <div className="space-y-4">
          {topProducts.map((product) => (
            <div key={product.name} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:border-emerald-500/20 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-emerald-500 border border-white/5 font-black text-xs">
                  {product.sold}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{product.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <TrendingUp className="w-3 h-3 text-emerald-500/50" />
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Recaudo: {formatter.format(product.revenue)}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-[9px] font-black uppercase tracking-widest ${product.stock <= 5 ? 'text-amber-500' : 'text-zinc-600'}`}>
                  Stock: {product.stock}
                </p>
                {product.stock <= 5 && <div className="w-1 h-1 bg-amber-500 rounded-full inline-block mt-1 animate-pulse" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap Ocupación */}
      <div className="bg-zinc-950 border border-white/5 rounded-[32px] p-8 shadow-2xl flex flex-col justify-between overflow-visible">
        <div>
          <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Flame className="w-5 h-5 text-red-500" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Mapa de Calor: Ocupación</h4>
              </div>
              
              {/* Selector de Métricas */}
              <div className="flex bg-zinc-900 border border-white/5 p-1 rounded-xl w-fit">
                <button 
                  onClick={() => setMetric('servicios')}
                  className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5", metric === 'servicios' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}
                >
                  <Scissors className="w-3 h-3" /> Servicios
                </button>
                <button 
                  onClick={() => setMetric('ocupacion')}
                  className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5", metric === 'ocupacion' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}
                >
                  <Percent className="w-3 h-3" /> Ocupación
                </button>
                <button 
                  onClick={() => setMetric('ingresos')}
                  className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5", metric === 'ingresos' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}
                >
                  <DollarSign className="w-3 h-3" /> Ingresos
                </button>
              </div>
            </div>

            {/* Leyenda Dinámica */}
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-zinc-600 font-bold uppercase">Baja</span>
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded-[4px] bg-[#FFFFFF] border border-zinc-700/50" />
                  <div className="w-4 h-4 rounded-[4px] bg-[#FEE2E2]" />
                  <div className="w-4 h-4 rounded-[4px] bg-[#FCA5A5]" />
                  <div className="w-4 h-4 rounded-[4px] bg-[#EF4444]" />
                  <div className="w-4 h-4 rounded-[4px] bg-[#DC2626]" />
                </div>
                <span className="text-[8px] text-zinc-600 font-bold uppercase">Alta</span>
              </div>
              <div className="flex gap-1 text-[8px] font-bold text-zinc-500 text-center uppercase mt-0.5">
                <span className="w-4 text-center">0</span>
                <span className="w-4 text-center">{metric === 'servicios' ? '1-3' : metric === 'ocupacion' ? '25%' : '50k'}</span>
                <span className="w-4 text-center">{metric === 'servicios' ? '4-6' : metric === 'ocupacion' ? '50%' : '150k'}</span>
                <span className="w-4 text-center">{metric === 'servicios' ? '7-9' : metric === 'ocupacion' ? '75%' : '300k'}</span>
                <span className="w-4 text-center">{metric === 'servicios' ? '10+' : metric === 'ocupacion' ? '100' : '300+'}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar pb-2">
            <div className="min-w-full flex flex-col gap-2">
              {/* Header Horas */}
              <div 
                className="grid gap-1 mb-1 text-[8px] font-black uppercase text-zinc-500"
                style={{ gridTemplateColumns: `45px repeat(${hoursList.length}, minmax(32px, 1fr))` }}
              >
                <div />
                {hoursList.map((h: string, j: number) => (
                  <div 
                    key={h} 
                    className={cn("text-center truncate rounded px-1 transition-all", hoveredCell?.hourIndex === j && "bg-white/5 text-white")}
                  >
                    {h}
                  </div>
                ))}
              </div>

              {daysList.map((dayName, i) => (
                <div 
                  key={dayName} 
                  className={cn("grid gap-1 items-center transition-all rounded-lg", hoveredCell?.dayIndex === i && "bg-white/[0.03]")}
                  style={{ gridTemplateColumns: `45px repeat(${hoursList.length}, minmax(32px, 1fr))` }}
                >
                  <div className={cn("text-[9px] font-black uppercase px-2 transition-all", hoveredCell?.dayIndex === i ? "text-white" : "text-zinc-500")}>
                    {dayName}
                  </div>
                  {hoursList.map((_, j) => {
                    const cell = cells[i]?.[j];
                    const { valueStr, bgColor, textColor } = getCellConfig(cell);
                    const avgTime = cell?.serviciosAtendidos > 0 ? Math.round(cell.minutosTotales / cell.serviciosAtendidos) : 0;
                    const isHovered = hoveredCell?.dayIndex === i && hoveredCell?.hourIndex === j;

                    return (
                      <div 
                        key={`${i}-${j}`} 
                        onMouseEnter={() => setHoveredCell({ dayIndex: i, hourIndex: j })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={cn(
                          "relative aspect-square rounded-lg transition-all cursor-pointer border shadow-inner flex items-center justify-center font-black text-[10px]",
                          cell?.serviciosAtendidos === 0 ? "border-white/5 text-transparent" : "border-black/5 hover:scale-110 hover:-translate-y-1 z-10 hover:shadow-xl",
                          isHovered && "ring-2 ring-white/20"
                        )}
                        style={{ backgroundColor: bgColor, color: textColor }}
                      >
                        {valueStr}
                        
                        {/* Tooltip Enriquecido */}
                        {isHovered && cell && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-zinc-900 border border-white/10 rounded-2xl p-4 shadow-2xl z-50 pointer-events-none text-left flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-100">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                                {dayName} - {cell.hour}
                              </span>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-white">
                                {cell.porcentajeOcupacion}% OCUP.
                              </span>
                            </div>
                            <div className="flex flex-col gap-2 text-[10px]">
                              <div className="flex justify-between items-center text-zinc-400">
                                <span className="flex items-center gap-1.5"><Scissors className="w-3 h-3 text-amber-500" /> Servicios</span>
                                <span className="font-bold text-white">{cell.serviciosAtendidos} citas</span>
                              </div>
                              <div className="flex justify-between items-center text-zinc-400">
                                <span className="flex items-center gap-1.5"><Percent className="w-3 h-3 text-emerald-500" /> Ocupación</span>
                                <span className="font-bold text-white">{cell.porcentajeOcupacion}% <span className="text-[8px] font-normal text-zinc-500">({cell.serviciosAtendidos} de {cell.capacidadMaxima})</span></span>
                              </div>
                              <div className="flex justify-between items-center text-zinc-400">
                                <span className="flex items-center gap-1.5"><DollarSign className="w-3 h-3 text-blue-500" /> Recaudo est.</span>
                                <span className="font-bold text-white">{formatter.format(cell.ingresosTotales)}</span>
                              </div>
                              <div className="flex justify-between items-center text-zinc-400">
                                <span className="flex items-center gap-1.5"><Flame className="w-3 h-3 text-red-500" /> Promedio cita</span>
                                <span className="font-bold text-white">{avgTime > 0 ? `${avgTime} min` : '-'}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <p className="mt-8 text-[9px] text-zinc-500 leading-relaxed border-t border-white/5 pt-4">
          <span className="font-bold text-amber-500">✓</span> {peakInsight}
        </p>
      </div>
    </div>
  );
}
