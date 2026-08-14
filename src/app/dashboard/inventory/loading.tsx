export default function InventoryLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-56 bg-muted rounded-xl" />
          <div className="h-4 w-72 bg-muted/60 rounded-lg mt-2" />
        </div>
        <div className="w-40 h-10 bg-primary/20 rounded-xl" />
      </div>
      <div className="glass-card rounded-2xl overflow-hidden py-20 flex items-center justify-center">
        <div className="space-y-3 flex flex-col items-center">
          <div className="w-12 h-12 bg-muted rounded-xl" />
          <div className="h-4 w-48 bg-muted/60 rounded" />
        </div>
      </div>
    </div>
  );
}
