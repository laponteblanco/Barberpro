"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import { Target, Users, Crown } from "lucide-react";

const formatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function ParetoSection({ data: paretoData, topClients }: { data: any[], topClients: any[] }) {
  // Calculate cumulative percentages for Pareto line
  const total = paretoData.reduce((acc, curr) => acc + curr.count, 0);
  let runningSum = 0;
  const processedData = paretoData.map(item => {
    runningSum += item.count;
    return {
      ...item,
      cumulative: Math.round((runningSum / total) * 100)
    };
  });

  return (
    <div className="bg-[#121214] border border-white/5 rounded-[32px] p-8 shadow-2xl space-y-10">
      {/* Pareto Chart */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-indigo-500" />
            <span className="text-xs font-bold text-white uppercase tracking-widest">Pareto de Servicios</span>
          </div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Regla del 80/20</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={processedData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 10 }} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 10 }} unit="%" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              />
              <Bar yAxisId="left" dataKey="count" fill="#312e81" radius={[8, 8, 0, 0]} barSize={40} />
              <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* VIP Clients */}
      <div className="space-y-4 pt-6 border-t border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <Crown className="w-5 h-5 text-amber-500" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Mejores Clientes (VIP)</h4>
        </div>
        <div className="space-y-3">
          {topClients.map((client) => (
            <div key={client.name} className="flex items-center justify-between p-4 bg-white/[0.01] border border-white/5 rounded-2xl hover:bg-white/[0.03] transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Users className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{client.name}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{client.visits} visitas acumuladas</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-white">${formatter.format(client.spent)}</p>
                <div className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-500 text-[8px] font-black uppercase inline-block">
                  {client.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
