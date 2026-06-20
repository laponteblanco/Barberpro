import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[100dvh] bg-background text-foreground animate-in fade-in duration-500">
      <div className="relative">
        <div className="w-16 h-16 rounded-3xl border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-pulse" />
        </div>
      </div>
      <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-zinc-500 animate-pulse">
        Cargando BarberOS...
      </p>
    </div>
  );
}
