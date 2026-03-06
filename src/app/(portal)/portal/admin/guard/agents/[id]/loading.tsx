export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Hero bar skeleton */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
        <div className="h-1" style={{ background: "var(--bg-secondary)" }} />
        <div className="flex flex-col lg:flex-row">
          <div className="flex-1 p-5">
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
              <div className="h-16 w-16 rounded-2xl" style={{ background: "var(--bg-secondary)" }} />
              <div className="flex-1">
                <div className="h-6 w-48 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
                <div className="flex gap-2 mt-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-7 w-24 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="lg:w-[280px] border-t lg:border-t-0 lg:border-l grid grid-cols-2 gap-0" style={{ borderColor: "var(--border)" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="py-6 px-3" style={{ background: "var(--bg-secondary)", borderBottom: i < 2 ? "1px solid var(--border)" : undefined, borderRight: i % 2 === 0 ? "1px solid var(--border)" : undefined }}>
                <div className="h-9 w-9 rounded-xl mx-auto mb-2" style={{ background: "var(--bg-primary)" }} />
                <div className="h-5 w-8 rounded mx-auto" style={{ background: "var(--bg-primary)" }} />
              </div>
            ))}
          </div>
        </div>
        <div className="h-10 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }} />
      </div>

      {/* Metric rings skeleton */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4 flex flex-col items-center justify-center h-[140px]" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
            <div className="h-[90px] w-[90px] rounded-full" style={{ background: "var(--bg-secondary)" }} />
          </div>
        ))}
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-lg" style={{ background: "var(--bg-primary)" }} />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="h-80 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
    </div>
  );
}
