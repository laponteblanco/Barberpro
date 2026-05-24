export default function ClientsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="h-9 w-60 bg-muted rounded-xl" />
          <div className="h-4 w-80 bg-muted/60 rounded-lg mt-2" />
        </div>
        <div className="w-40 h-11 bg-primary/20 rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-5">
            <div className="h-3 w-24 bg-muted/60 rounded mb-2" />
            <div className="h-8 w-16 bg-muted rounded-lg" />
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-border">
        <div className="p-4 border-b border-border bg-muted/20">
          <div className="h-10 w-80 bg-muted rounded-xl" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted" />
              <div className="space-y-1.5">
                <div className="h-4 w-36 bg-muted rounded" />
                <div className="h-3 w-48 bg-muted/60 rounded" />
              </div>
            </div>
            <div className="w-8 h-8 bg-muted rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
