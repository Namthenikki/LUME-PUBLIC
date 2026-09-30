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
