import { Loader2, Scissors } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[100dvh] bg-[#020617] text-white animate-in fade-in duration-500 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[30%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[50vw] h-[50vw] bg-indigo-500/10 blur-[120px] rounded-full mix-blend-screen opacity-50" />
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Container */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
          <div className="w-20 h-20 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 flex items-center justify-center relative z-10 shadow-2xl">
            <Scissors className="w-10 h-10 text-indigo-400" />
          </div>
          
          {/* Spinner Ring */}
          <div className="absolute -inset-4 rounded-[2rem] border-2 border-indigo-500/20 border-t-indigo-400 animate-spin" style={{ animationDuration: '3s' }} />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-white mb-2">
          BarberOS
        </h1>
        <div className="flex items-center gap-2 text-indigo-400/80">
          <Loader2 className="w-4 h-4 animate-spin" />
          <p className="text-xs font-bold uppercase tracking-[0.2em]">
            Cargando datos...
          </p>
        </div>
      </div>
    </div>
  );
}
