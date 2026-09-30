import { LumeMark } from '../LumeMark';

/** A glossy app-icon tile. */
export function Tile({ size = 76, children, className = '' }: { size?: number; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`grid place-items-center rounded-[26%] bg-linear-to-b from-white to-[#f1f1f4] shadow-tile ${className}`}
      style={{ width: size, height: size }}
    >
      {children}
    </div>
  );
}

export function AppTile() {
  return (
    <Tile size={88}>
      <LumeMark className="size-11 text-ink" />
    </Tile>
  );
}

export function CheckTile() {
  return (
    <Tile size={78}>
      <span className="grid size-9 place-items-center rounded-[10px] bg-blue shadow-[inset_0_-2px_0_rgb(0_0_0/0.15)]">
        <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
          <path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Tile>
  );
}

export function AlarmTile() {
  return (
    <Tile size={80}>
      <svg viewBox="0 0 48 48" className="size-11" aria-hidden>
        <path d="M20 5h8M24 5v5" stroke="#3b3b44" strokeWidth="3" strokeLinecap="round" />
        <path d="M36 10l3 3" stroke="#3b3b44" strokeWidth="3" strokeLinecap="round" />
        <circle cx="24" cy="27" r="16" fill="#fff" stroke="#2a2a31" strokeWidth="3" />
        {[...Array(12)].map((_, i) => {
          const a = (i * Math.PI) / 6;
          return (
            <line
              key={i}
              x1={24 + Math.sin(a) * 12.5}
              y1={27 - Math.cos(a) * 12.5}
              x2={24 + Math.sin(a) * 14}
              y2={27 - Math.cos(a) * 14}
              stroke="#9a9aa3"
              strokeWidth="1.2"
            />
          );
        })}
        <path d="M24 27V17.5" stroke="#2a2a31" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M24 27l6.5 4" stroke="var(--color-red)" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="24" cy="27" r="1.8" fill="#2a2a31" />
      </svg>
    </Tile>
  );
}

export function StickyNote() {
  return (
    <div className="relative w-[214px] bg-sticky px-5 pb-8 pt-7 shadow-float [clip-path:polygon(0_0,100%_0,100%_100%,6%_100%,0_94%)]">
      <span className="absolute left-1/2 top-2 size-3.5 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ff8a80,#e53935)] shadow-[0_2px_3px_rgb(0_0_0/0.3)]" />
      <p className="font-hand text-[19px] leading-[1.3] text-[#2b2616]">Finish COA Tutorial 5 before tomorrow night. Quiz on Friday!</p>
    </div>
  );
}

/** A card with a folder tab, like the reference's stacked papers. */
export function Folder({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute -top-5 left-0 h-8 w-[46%] rounded-t-[18px] bg-[#f7f7f9]" />
      <div className="relative rounded-[22px] rounded-tl-none bg-[#f7f7f9] p-4 shadow-float">
        <p className="-mt-1 mb-3 px-1 text-[15px] font-semibold">{title}</p>
        {children}
      </div>
    </div>
  );
}

export function ReminderCard() {
  return (
    <Folder title="Reminders" className="w-[290px]">
      <div className="rounded-[16px] bg-white p-4 shadow-card">
        <p className="text-[12px] text-ink-3">Computer Organization</p>
        <p className="mt-0.5 font-semibold">Tutorial 5 is due tomorrow</p>
        <p className="mt-3 text-[12px] text-ink-3">Due</p>
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-cyan/12 px-2.5 py-1 text-[13px] font-medium text-[#0a86b3]">
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8 5v3l2 1.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Tomorrow, 11:59 PM
        </span>
      </div>
    </Folder>
  );
}

const WEEK = [
  { badge: 'bg-red', n: 1, title: 'Tutorial 5', course: 'COA', left: '1 day', fill: 0.86, bar: 'bg-orange' },
  { badge: 'bg-orange', n: 3, title: 'Assignment 3', course: 'Statistics', left: '6 days', fill: 0.42, bar: 'bg-cyan' },
  { badge: 'bg-cyan', n: 2, title: 'Java Assignment', course: 'OOP', left: '38 days', fill: 0.12, bar: 'bg-cyan' },
];

export function WeekCard() {
  return (
    <Folder title="Due soon" className="w-[330px]">
      <div className="space-y-2">
        {WEEK.map((t) => (
          <div key={t.title} className="flex items-center gap-3 rounded-[14px] bg-white px-3 py-2.5 shadow-card">
            <span className={`grid size-5 shrink-0 place-items-center rounded-[6px] text-[11px] font-bold text-white ${t.badge}`}>{t.n}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{t.title}</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-[#ececf0]">
                <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${t.fill * 100}%` }} />
              </div>
            </div>
            <span className="shrink-0 text-[12px] text-ink-2">{t.left}</span>
          </div>
        ))}
      </div>
    </Folder>
  );
}

export function SourcesCard() {
  return (
    <Folder title="Sources" className="w-[300px]">
      <div className="flex gap-3 pb-1">
        <SourceTile label="MUJ LMS" color="#1d6ef5" glyph="M" />
        <SourceTile label="NPTEL" color="#f59e0b" glyph="N" />
      </div>
    </Folder>
  );
}

function SourceTile({ label, color, glyph }: { label: string; color: string; glyph: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Tile size={74}>
        <span className="text-[30px] font-bold tracking-[-0.04em]" style={{ color }}>
          {glyph}
        </span>
      </Tile>
      <span className="text-[12px] text-ink-2">{label}</span>
    </div>
  );
}
