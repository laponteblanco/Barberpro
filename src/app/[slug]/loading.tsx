export default function BookingLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-slate-200 font-sans relative overflow-hidden">
      {/* Background Decor - Matches page.tsx blur orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" 
          style={{ transform: 'translate3d(0,0,0)', willChange: 'filter' }}
        />
        <div 
          className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" 
          style={{ animationDelay: '2s', transform: 'translate3d(0,0,0)', willChange: 'filter' }} 
        />
      </div>

      <div className="max-w-2xl mx-auto py-12 px-6 space-y-12 animate-pulse relative z-10">
        
        {/* WELCOME GREETING SKELETON */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-white/5 shadow-xl shadow-black/20" />
          <div className="space-y-2">
            <div className="h-6 w-40 bg-zinc-800/80 rounded-xl" />
            <div className="h-3 w-48 bg-zinc-800/50 rounded-lg" />
          </div>
        </div>

        {/* PROXIMA CITA SKELETON */}
        <div className="space-y-4">
          <div className="h-4 w-32 bg-zinc-800/80 rounded-lg" />
          
          <div className="glass-card p-5 rounded-2xl border border-white/5 bg-zinc-900/10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-800/80 flex items-center justify-center" />
              <div className="space-y-2">
                <div className="h-4 w-36 bg-zinc-800/80 rounded-lg" />
                <div className="h-3 w-52 bg-zinc-800/50 rounded-md" />
                <div className="h-3 w-24 bg-red-500/10 rounded-md mt-1" />
              </div>
            </div>
            <div className="h-5 w-14 bg-primary/20 rounded-lg" />
          </div>
        </div>

        {/* NUESTROS BARBEROS SKELETON */}
        <div className="space-y-4">
          <div className="h-4 w-40 bg-zinc-800/80 rounded-lg" />
          
          <div className="flex gap-6 overflow-x-hidden py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center gap-3 min-w-[90px]">
                <div className="w-20 h-20 rounded-[32px] bg-zinc-800/80 border border-white/5 shadow-lg" />
                <div className="h-3 w-16 bg-zinc-800/80 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* NUESTROS SERVICIOS SKELETON */}
        <div className="space-y-4">
          <div className="h-4 w-36 bg-zinc-800/80 rounded-lg" />
          
          <div className="grid gap-5">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="glass-card p-6 rounded-[32px] border-white/5 bg-zinc-900/10 flex items-center justify-between"
              >
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 shrink-0 rounded-2xl bg-zinc-800/80 mt-1" />
                  <div className="space-y-2 flex-1">
                    <div className="h-5 w-44 bg-zinc-800/80 rounded-xl" />
                    <div className="h-3 w-56 bg-zinc-800/50 rounded-md" />
                    <div className="h-3 w-16 bg-zinc-800/50 rounded-md" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-primary/20 rounded-lg" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
