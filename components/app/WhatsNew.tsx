import { WHATS_NEW } from '@/lib/whats-new';

/** The "What's new" list in the update banners. */
export function WhatsNew({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <p className="text-[13px] font-semibold">What’s new</p>
      <ul className="mt-1.5 space-y-1.5">
        {WHATS_NEW.map((item) => (
          <li key={item} className="flex gap-2 text-[13px] leading-snug text-ink-2">
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-blue" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
