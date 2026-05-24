export default function AppointmentsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="h-9 w-40 bg-muted rounded-xl" />
          <div className="h-4 w-60 bg-muted/60 rounded-lg mt-2" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-10 bg-muted rounded-xl" />
          <div className="w-36 h-11 bg-primary/20 rounded-2xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="min-w-[64px] border-r border-border pr-4 space-y-1">
                  <div className="h-5 w-12 bg-muted rounded" />
                  <div className="h-3 w-10 bg-muted/60 rounded" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-4 w-36 bg-muted rounded" />
                  <div className="h-3 w-48 bg-muted/60 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block space-y-1">
                  <div className="h-4 w-16 bg-muted rounded" />
                  <div className="h-3 w-12 bg-muted/60 rounded" />
                </div>
                <div className="w-8 h-8 bg-muted rounded-xl" />
              </div>
            </div>
          ))}
        </div>
        <div className="glass-card rounded-2xl p-5 bg-primary/5 border-primary/10">
          <div className="h-4 w-28 bg-muted rounded mb-4" />
          <div className="space-y-4">
            <div className="flex justify-between">
              <div className="h-3 w-20 bg-muted/60 rounded" />
              <div className="h-4 w-8 bg-muted rounded" />
            </div>
            <div className="flex justify-between">
              <div className="h-3 w-20 bg-muted/60 rounded" />
              <div className="h-4 w-8 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
