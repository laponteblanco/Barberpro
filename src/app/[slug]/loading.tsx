export default function BookingLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      {/* Background decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 text-center space-y-6 animate-pulse">
        {/* Logo placeholder */}
        <div className="w-24 h-24 mx-auto rounded-[32px] bg-white/5 border border-white/10" />
        
        {/* Title placeholder */}
        <div className="space-y-3">
          <div className="h-8 w-48 bg-white/5 rounded-2xl mx-auto" />
          <div className="h-4 w-32 bg-white/5 rounded-xl mx-auto" />
        </div>

        {/* Card placeholder */}
        <div className="max-w-sm mx-auto px-6">
          <div className="bg-zinc-900/20 border border-white/5 rounded-[40px] p-8 space-y-4 backdrop-blur-3xl">
            <div className="h-4 w-40 bg-white/5 rounded-xl mx-auto" />
            <div className="h-14 bg-white/5 rounded-2xl" />
            <div className="h-14 bg-primary/20 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
