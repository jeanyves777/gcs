export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-36 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
          <div className="h-4 w-28 rounded mt-2" style={{ background: "var(--bg-secondary)" }} />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
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
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
        ))}
      </div>
    </div>
  );
}
