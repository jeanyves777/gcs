export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
          <div className="h-4 w-64 rounded mt-2" style={{ background: "var(--bg-secondary)" }} />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
          <div className="h-9 w-32 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
        </div>
      </div>
      <div className="h-24 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
        ))}
      </div>
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 h-72 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
        <div className="lg:col-span-3 h-72 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
      </div>
    </div>
  );
}
