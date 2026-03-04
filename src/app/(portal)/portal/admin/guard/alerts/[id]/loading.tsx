export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
        <div className="flex-1">
          <div className="h-7 w-64 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
          <div className="h-4 w-96 rounded mt-2" style={{ background: "var(--bg-secondary)" }} />
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-28 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-32 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
          <div className="h-48 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
        </div>
        <div className="space-y-4">
          <div className="h-52 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
          <div className="h-32 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
        </div>
      </div>
    </div>
  );
}
