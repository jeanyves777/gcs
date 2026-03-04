export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
          <div className="h-4 w-64 rounded mt-2" style={{ background: "var(--bg-secondary)" }} />
        </div>
        <div className="h-9 w-36 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
        ))}
      </div>
    </div>
  );
}
