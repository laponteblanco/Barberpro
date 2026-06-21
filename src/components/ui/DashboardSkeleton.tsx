import { Loader2 } from "lucide-react";

export default function DashboardSkeleton() {
  return (
    <div className="flex-1 min-h-[80vh] flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 relative z-50">
        <div>
          <div className="h-10 w-48 bg-white/5 rounded-lg animate-pulse mb-2"></div>
          <div className="h-4 w-32 bg-white/5 rounded-md animate-pulse"></div>
        </div>
        
        <div className="h-12 w-48 bg-white/5 rounded-2xl animate-pulse"></div>
        <div className="h-10 w-32 bg-white/5 rounded-xl animate-pulse"></div>
      </div>

      {/* Main Calendar Content Skeleton */}
      <div className="flex-1 bg-zinc-900/40 border border-white/5 rounded-2xl flex items-center justify-center relative overflow-hidden">
        {/* Subtle background pulse */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] to-white/[0.05] animate-pulse"></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-3xl border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-pulse" />
            </div>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 animate-pulse">
            Cargando Interfaz...
          </p>
        </div>
      </div>
    </div>
  );
}
