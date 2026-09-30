export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-3">
        <div className="h-3 w-28 rounded-full bg-surface-3" />
        <div className="h-8 w-72 max-w-full rounded-lg bg-surface-3" />
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card h-[122px]" />
        ))}
      </div>
      <div className="card h-80" />
    </div>
  );
}
