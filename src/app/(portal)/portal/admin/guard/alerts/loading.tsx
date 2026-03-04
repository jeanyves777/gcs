export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
        <div>
          <div className="h-7 w-36 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
          <div className="h-4 w-44 rounded mt-2" style={{ background: "var(--bg-secondary)" }} />
        </div>
      </div>

      {/* Severity Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-24 rounded-md" style={{ background: "var(--bg-primary)" }} />
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-16 rounded-md" style={{ background: "var(--bg-primary)" }} />
          ))}
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[68px] rounded-xl" style={{ background: "var(--bg-secondary)" }} />
        ))}
      </div>
    </div>
  );
}
