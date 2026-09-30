/** Numbered setup steps: what to tap in bold, one short line of detail, and optionally the thing to look for. */
export function Steps({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <ol className={`space-y-4 ${className}`}>{children}</ol>;
}

export function Step({ n, title, children, look }: { n: number; title: React.ReactNode; children?: React.ReactNode; look?: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue/10 text-[13px] font-semibold text-blue tabular-nums">{n}</span>
      <div className="min-w-0 flex-1 pt-[3px]">
        <p className="text-[15px] font-medium leading-snug">{title}</p>
        {children && <p className="mt-0.5 text-[14px] leading-snug text-ink-2">{children}</p>}
        {look && <div className="mt-2">{look}</div>}
      </div>
    </li>
  );
}

/** A button or label as it looks on screen, for "tap this". */
export function Pill({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span
      className={`inline-flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-medium ${
        strong ? 'bg-blue text-white' : 'border border-line bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/0.05)]'
      }`}
    >
      {children}
    </span>
  );
}

/** The iOS Share icon (a box with an arrow up), drawn inline so the step shows exactly what to tap. */
export function ShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-blue" aria-label="Share">
      <path d="M12 3v12M8 7l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
