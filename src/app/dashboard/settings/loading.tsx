export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-44 bg-muted rounded-xl" />
        <div className="h-4 w-64 bg-muted/60 rounded-lg mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-5 bg-muted rounded" />
            <div className="h-5 w-32 bg-muted rounded" />
          </div>
          <div className="h-12 w-full bg-muted/40 rounded mb-6" />
          <div className="h-12 w-full bg-muted rounded-xl" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-48 bg-muted/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
