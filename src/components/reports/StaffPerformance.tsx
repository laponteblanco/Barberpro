"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Award, TrendingUp, DollarSign } from "lucide-react";

const formatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function StaffPerformance({ data: staffData }: { data: any[] }) {
  return (
    <div className="bg-zinc-950 border border-white/5 rounded-[32px] p-8 shadow-2xl space-y-8">
      {/* Ranking Chart */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-bold text-white uppercase tracking-widest">Ranking de Recaudo</span>
          </div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Ingresos por Barbero</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={staffData} layout="vertical" margin={{ left: -20, right: 30 }}>
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }} 
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              />
              <Bar dataKey="revenue" radius={[0, 8, 8, 0]} barSize={24}>
                {staffData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#3f3f46'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cierre de Caja Table */}
      <div className="space-y-4 pt-6 border-t border-white/5">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Detalle de Cierre</h4>
        <div className="space-y-3">
          {staffData.map((member) => (
            <div key={member.name} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-zinc-400 text-xs">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{member.name}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{member.sales} servicios realizados</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-amber-500">${formatter.format(member.revenue)}</p>
                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">Comisión: ${formatter.format(member.commissions)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
