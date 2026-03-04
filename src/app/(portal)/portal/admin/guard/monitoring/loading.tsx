export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-48 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
        <div className="h-4 w-64 rounded mt-2" style={{ background: "var(--bg-secondary)" }} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
        ))}
      </div>
      <div className="h-64 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
      <div className="h-64 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
    </div>
  );
}
