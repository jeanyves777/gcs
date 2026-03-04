export default function Loading() {
  return (
    <div className="space-y-6 max-w-3xl animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
        <div>
          <div className="h-7 w-52 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
          <div className="h-4 w-72 rounded mt-2" style={{ background: "var(--bg-secondary)" }} />
        </div>
      </div>
      <div className="h-72 rounded-xl" style={{ background: "var(--bg-secondary)" }} />
    </div>
  );
}
