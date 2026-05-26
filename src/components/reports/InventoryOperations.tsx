"use client";

import { ShoppingBag, Flame, TrendingUp } from "lucide-react";

const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const hours = ['8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm'];

const formatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function InventoryOperations({ heatmap: heatmapData, topProducts }: { heatmap: number[][], topProducts: any[] }) {
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
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Revenue: ${formatter.format(product.revenue)}</p>
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
      <div className="bg-zinc-950 border border-white/5 rounded-[32px] p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-red-500" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Mapa de Calor: Ocupación</h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-zinc-600 font-bold uppercase">Baja</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-red-500/10" />
              <div className="w-3 h-3 rounded-sm bg-red-500/40" />
              <div className="w-3 h-3 rounded-sm bg-red-500/70" />
              <div className="w-3 h-3 rounded-sm bg-red-500" />
            </div>
            <span className="text-[8px] text-zinc-600 font-bold uppercase">Alta</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {/* Header Horas */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-2 mb-2">
            <div />
            {hours.map(h => (
              <div key={h} className="text-[8px] text-zinc-600 font-black uppercase text-center">{h}</div>
            ))}
          </div>

          {heatmapData.map((row, i) => (
            <div key={days[i]} className="grid grid-cols-[60px_repeat(7,1fr)] gap-2">
              <div className="text-[9px] text-zinc-500 font-black uppercase flex items-center">{days[i]}</div>
              {row.map((intensity, j) => (
                <div 
                  key={`${i}-${j}`} 
                  className="aspect-square rounded-lg transition-all hover:scale-110 cursor-pointer border border-white/5 shadow-inner"
                  style={{ 
                    backgroundColor: `rgba(239, 68, 68, ${intensity})`,
                    opacity: intensity < 0.2 ? 0.3 : 1
                  }}
                  title={`Ocupación: ${Math.round(intensity * 100)}%`}
                />
              ))}
            </div>
          ))}
        </div>
        
        <p className="mt-8 text-[9px] text-zinc-500 leading-relaxed italic border-t border-white/5 pt-4">
          Tip BI: Los sábados entre 10am y 2pm representan tu pico máximo. Considera reforzar el staff en este horario.
        </p>
      </div>
    </div>
  );
}
