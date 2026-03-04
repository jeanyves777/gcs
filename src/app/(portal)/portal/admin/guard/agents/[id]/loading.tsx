export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
        <div className="flex-1">
          <div className="h-7 w-48 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
          <div className="h-4 w-72 rounded mt-2" style={{ background: "var(--bg-secondary)" }} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
        ))}
      </div>
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: "var(--bg-secondary)" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-md" style={{ background: "var(--bg-primary)" }} />
        ))}
      </div>
      <div className="h-80 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
    </div>
  );
}
