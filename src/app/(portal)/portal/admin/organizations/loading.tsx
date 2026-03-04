export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
          <div>
            <div className="h-7 w-44 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
            <div className="h-4 w-64 rounded mt-2" style={{ background: "var(--bg-secondary)" }} />
          </div>
        </div>
        <div className="h-9 w-40 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
        ))}
      </div>

      {/* Search */}
      <div className="h-11 rounded-lg" style={{ background: "var(--bg-secondary)" }} />

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
        <div className="h-10" style={{ background: "var(--bg-tertiary)" }} />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 border-t" style={{ borderColor: "var(--border)" }} />
        ))}
      </div>
    </div>
  );
}
