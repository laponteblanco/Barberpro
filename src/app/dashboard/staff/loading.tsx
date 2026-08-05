export default function StaffLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="h-9 w-52 bg-muted rounded-xl" />
          <div className="h-4 w-72 bg-muted/60 rounded-lg mt-2" />
        </div>
        <div className="w-40 h-11 bg-primary/20 rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card rounded-3xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-muted" />
              <div className="w-16 h-6 rounded-lg bg-muted/60" />
            </div>
            <div className="space-y-2">
              <div className="h-6 w-36 bg-muted rounded-lg" />
              <div className="h-4 w-24 bg-muted/60 rounded" />
            </div>
            <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-3 w-16 bg-muted/60 rounded" />
                <div className="h-5 w-10 bg-muted rounded" />
              </div>
              <div className="w-8 h-8 bg-muted rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
