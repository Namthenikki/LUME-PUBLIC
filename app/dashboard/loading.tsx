/** Shown the instant a tab is tapped, while the page's data loads. */
export default function Loading() {
  const bar = 'rounded-full bg-chip';
  return (
    <div className="space-y-5 lg:space-y-6" aria-busy="true" aria-label="Loading">
      <div className="hidden h-7 lg:block" />
      <div className="space-y-2.5">
        <div className={`${bar} h-9 w-56 animate-pulse`} />
        <div className={`${bar} h-4 w-72 max-w-full animate-pulse`} />
      </div>
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`space-y-3 rounded-[20px] bg-card p-5 shadow-card ${i > 0 ? 'hidden lg:block' : ''}`}>
            <div className={`${bar} h-4 w-28 animate-pulse`} />
            <div className={`${bar} mx-auto h-11 w-48 animate-pulse`} />
            <div className={`${bar} mx-auto h-4 w-36 animate-pulse`} />
          </div>
        ))}
      </div>
      <div className="space-y-4 rounded-[20px] bg-card p-5 shadow-card">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-[22px] shrink-0 animate-pulse rounded-full bg-chip" />
            <div className="flex-1 space-y-2">
              <div className={`${bar} h-4 w-40 animate-pulse`} />
              <div className={`${bar} h-3 w-56 max-w-full animate-pulse`} />
            </div>
            <div className={`${bar} h-4 w-14 animate-pulse`} />
          </div>
        ))}
      </div>
    </div>
  );
}
