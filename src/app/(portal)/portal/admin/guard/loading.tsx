export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
          <div>
            <div className="h-7 w-48 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
            <div className="h-4 w-64 rounded mt-2" style={{ background: "var(--bg-secondary)" }} />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
          <div className="h-9 w-32 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
        </div>
      </div>

      {/* Threat Level + Stats Row */}
      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 h-28 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
        <div className="lg:col-span-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
          ))}
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
        ))}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 h-80 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
        <div className="lg:col-span-3 h-80 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
      </div>
    </div>
  );
}
