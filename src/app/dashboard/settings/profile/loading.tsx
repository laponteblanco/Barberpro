export default function ProfileLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex flex-col gap-6">
        <div className="w-32 h-6 bg-zinc-900 rounded-lg" />
        <div className="space-y-2">
          <div className="h-9 w-64 bg-zinc-900 rounded-xl" />
          <div className="h-4 w-96 bg-zinc-900/60 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="h-64 bg-zinc-900 rounded-3xl" />
          <div className="h-32 bg-zinc-900 rounded-3xl" />
        </div>
        <div className="lg:col-span-2">
          <div className="h-[600px] bg-zinc-900 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
