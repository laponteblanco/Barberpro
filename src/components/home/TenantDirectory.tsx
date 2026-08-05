"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Compass, Search, ExternalLink } from "lucide-react";

export function TenantDirectory({ initialTenants }: { initialTenants: any[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTenants = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return initialTenants;
    return initialTenants.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        (t.slug && t.slug.toLowerCase().includes(query)) ||
        (t.city && t.city.toLowerCase().includes(query))
    );
  }, [searchQuery, initialTenants]);

  return (
    <section className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white mb-2 flex items-center gap-3">
            <Compass className="w-8 h-8 text-indigo-400" />
            Directorio para Clientes
          </h2>
          <p className="text-slate-400">¿Eres cliente? Busca tu barbería y agenda tu próxima cita.</p>
        </div>
        
        <div className="relative group max-w-sm w-full">
          <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder="Buscar por nombre o ciudad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-12 pr-4 bg-black/20 border border-slate-700/50 rounded-2xl text-base placeholder:text-slate-500 outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all text-white font-medium shadow-inner"
          />
        </div>
      </div>

      {filteredTenants.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenants.map((tenant) => {
            const initials = tenant.name
              .split(" ")
              .slice(0, 2)
              .map((w: string) => w[0])
              .join("")
              .toUpperCase();
            
            return (
              <Link 
                href={`/${tenant.slug}`}
                key={tenant.id}
                className="group p-6 bg-slate-800/30 border border-slate-700/50 hover:border-indigo-500/50 rounded-3xl transition-all duration-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] hover:-translate-y-1 flex flex-col justify-between h-[200px] relative overflow-hidden"
              >
                <div className="flex items-start gap-5 relative z-10">
                  <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-slate-800 to-black border border-slate-700/50 flex items-center justify-center overflow-hidden shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-500">
                    {tenant.logo_url ? (
                      <Image 
                        src={tenant.logo_url} 
                        alt={tenant.name}
                        width={64}
                        height={64} 
                        className="w-full h-full object-contain p-2" 
                      />
                    ) : (
                      <span className="text-xl font-black text-indigo-400">
                        {initials || "B"}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white text-lg truncate group-hover:text-indigo-400 transition-colors">
                      {tenant.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium truncate mt-1">
                      📍 {tenant.city || "Sede Principal"}
                    </p>
                  </div>
                </div>

                <div className="w-full mt-4 h-12 bg-white/5 group-hover:bg-indigo-500 text-slate-300 group-hover:text-white font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 text-sm shadow-md">
                  <span>Agendar Cita</span>
                  <ExternalLink className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-700/50 rounded-3xl bg-white/[0.01]">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <Compass className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No hay barberías disponibles</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            {searchQuery 
              ? "Ninguna barbería coincide con tu búsqueda." 
              : "Sé el primero en registrar tu negocio en la plataforma."}
          </p>
        </div>
      )}
    </section>
  );
}
