const base = { viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
type P = { className?: string };

export const HomeIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M3.5 9 10 3.5 16.5 9v7a1 1 0 0 1-1 1h-3.5v-5h-4v5H4.5a1 1 0 0 1-1-1z" />
  </svg>
);

export const BellIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M5 13.5V9a5 5 0 0 1 10 0v4.5l1.5 1.5h-13zM8 17.5h4" />
  </svg>
);

export const DoneIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <circle cx="10" cy="10" r="7" />
    <path d="M7 10.3l2 2 4-4.3" />
  </svg>
);

export const SettingsIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M4 6h8M15 6h1M4 14h1M8 14h8" />
    <circle cx="13.5" cy="6" r="1.8" />
    <circle cx="6.5" cy="14" r="1.8" />
  </svg>
);

export const CheckIcon = ({ className }: P) => (
  <svg {...base} strokeWidth={2.4} className={className} aria-hidden>
    <path d="M5 10.5l3.2 3.2L15 7" />
  </svg>
);

export const ClockIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <circle cx="10" cy="10.5" r="6.5" />
    <path d="M10 7.5v3.2l2.2 1.4" />
  </svg>
);

export const OpenIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M11 4h5v5M16 4l-7 7M14 12v3.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5H8" />
  </svg>
);

export const SyncIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M16 10a6 6 0 1 1-1.8-4.3M16 3.5v3.3h-3.3" />
  </svg>
);

export const ChevronIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <path d="M7.5 5l5 5-5 5" />
  </svg>
);

export const CalendarIcon = ({ className }: P) => (
  <svg {...base} className={className} aria-hidden>
    <rect x="3" y="4.5" width="14" height="12.5" rx="3" />
    <path d="M3 8.5h14M7 2.5v3M13 2.5v3" />
  </svg>
);
