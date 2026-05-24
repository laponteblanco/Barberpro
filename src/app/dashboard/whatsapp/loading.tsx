export default function WhatsAppLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-60 bg-muted rounded-xl" />
        <div className="h-4 w-72 bg-muted/60 rounded-lg mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass-card rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-muted" />
            <div className="space-y-2">
              <div className="h-5 w-40 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted/60 rounded" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-14 w-full bg-muted/40 rounded-xl" />
            <div className="h-14 w-full bg-muted/40 rounded-xl" />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <div className="h-5 w-32 bg-muted rounded mb-4" />
          <div className="h-12 w-full bg-muted/40 rounded" />
        </div>
      </div>
    </div>
  );
}
