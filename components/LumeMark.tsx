/** The Lume mark: a clock face with a cyan deadline dot at 12. */
export function LumeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="13.2" r="8" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <path d="M12 13.2V9.6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="12" cy="3.4" r="2.7" fill="var(--color-cyan)" />
    </svg>
  );
}

/**
 * The public pages' logo: the mark and "Lume for MUJ", the same name the site gives search engines, so
 * Google shows it rather than the host's name.
 */
export function LumeWordmark() {
  return (
    <a href="/" className="flex min-h-11 items-center gap-2 text-[19px] font-semibold tracking-[-0.02em]">
      <LumeMark className="size-6 text-ink" />
      <span>
        Lume <span className="font-medium text-ink-3">for MUJ</span>
      </span>
    </a>
  );
}
