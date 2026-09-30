import type { TaskType } from '@/lib/sources/types';

/** A white panel with a title, as in the dashboard mockup. */
export function Panel({
  title,
  action,
  className = '',
  children,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex min-w-0 flex-col rounded-[20px] bg-card p-4 shadow-card sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const TYPE_CHIP: Record<TaskType, { label: string; className: string }> = {
  assignment: { label: 'Assignment', className: 'bg-cyan/15 text-[#0a86b3] dark:text-cyan' },
  quiz: { label: 'Quiz', className: 'bg-orange/15 text-[#b45309] dark:text-orange' },
  other: { label: 'Other', className: 'bg-chip text-ink-2' },
};

export function TypeChip({ type }: { type: TaskType }) {
  const chip = TYPE_CHIP[type];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${chip.className}`}>{chip.label}</span>;
}

const SOURCE_CHIP = {
  manipal: { label: 'MUJ', className: 'bg-blue/12 text-blue' },
  nptel: { label: 'NPTEL', className: 'bg-orange/15 text-[#b45309]' },
  iitm: { label: 'IITM', className: 'bg-red/12 text-red' },
};

export function SourceChip({ source }: { source: keyof typeof SOURCE_CHIP }) {
  const chip = SOURCE_CHIP[source];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${chip.className}`}>{chip.label}</span>;
}

export const SOURCE_NAME = { manipal: 'Manipal LMS', nptel: 'NPTEL', iitm: 'IITM BS' } as const;
