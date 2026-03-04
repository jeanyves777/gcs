export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-44 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
          <div className="h-4 w-56 rounded mt-2" style={{ background: "var(--bg-secondary)" }} />
        </div>
        <div className="h-9 w-28 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
        ))}
      </div>
    </div>
  );
}
