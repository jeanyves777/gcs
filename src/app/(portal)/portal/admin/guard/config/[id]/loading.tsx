export default function Loading() {
  return (
    <div className="space-y-6 max-w-4xl animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
        <div className="flex-1">
          <div className="h-7 w-48 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
          <div className="h-4 w-56 rounded mt-2" style={{ background: "var(--bg-secondary)" }} />
        </div>
      </div>
      <div className="h-96 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
      <div className="h-20 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
      <div className="h-48 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
    </div>
  );
}
