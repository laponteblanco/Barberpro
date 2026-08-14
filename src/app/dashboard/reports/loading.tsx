export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-44 bg-muted rounded-xl" />
          <div className="h-4 w-72 bg-muted/60 rounded-lg mt-2" />
        </div>
        <div className="w-32 h-9 bg-muted rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 min-h-[400px] flex items-center justify-center">
          <div className="space-y-3 flex flex-col items-center">
            <div className="w-12 h-12 bg-muted rounded-xl" />
            <div className="h-4 w-48 bg-muted/60 rounded" />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-24 bg-muted/60 rounded" />
                <div className="h-6 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
