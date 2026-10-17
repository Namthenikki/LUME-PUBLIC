'use client';

import { useState } from 'react';

/** One day on the usage page's charts. `value` null: not counted that day. */
export type ChartPoint = { label: string; value: number | null; note?: string };

/** Three even steps up to a round top: 0 / 5 / 10 / 15 for a max of 11. */
function scale(max: number) {
  const step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find((s) => s * 3 >= max) ?? Math.ceil(max / 3000) * 1000;
  return { top: step * 3, ticks: [0, step, step * 2, step * 3] };
}

/**
 * A day-by-day chart: columns (daily active) or a line with a soft fill (total students). Hovering,
 * tapping or tabbing to a day shows its numbers beside it. Day labels are "Sat 17 Oct".
 */
export function DayChart({ points, kind, unit }: { points: ChartPoint[]; kind: 'bars' | 'area'; unit: [string, string] }) {
  const [active, setActive] = useState<number | null>(null);
  const n = points.length;
  const { top, ticks } = scale(Math.max(0, ...points.map((p) => p.value ?? 0)));
  const y = (v: number) => (v / top) * 100;
  const center = (i: number) => ((i + 0.5) / n) * 100;
  const tickEvery = Math.ceil(n / 7);
  const amount = (v: number | null) => (v === null ? 'Not counted yet' : `${v} ${v === 1 ? unit[0] : unit[1]}`);
  const line = points.flatMap((p, i) => (p.value === null ? [] : [`${i + 0.5},${top - p.value}`]));

  return (
    <div className="select-none">
      <div className="relative ml-7 h-[150px]" onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}>
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${y(t)}%` }}>
            <span className="absolute -left-7 w-5 -translate-y-1/2 text-right text-[11px] tabular-nums text-ink-3">{t}</span>
          </div>
        ))}

        {kind === 'bars' ? (
          <div className="absolute inset-0 flex items-end">
            {points.map((p, i) => (
              <div key={i} className="relative flex h-full flex-1 items-end justify-center">
                <div
                  className={`w-[min(24px,62%)] rounded-t-[4px] transition-colors ${p.value === null ? 'bg-line' : active === i ? 'bg-[#4a8bf7]' : 'bg-blue'}`}
                  style={{ height: p.value === null ? 3 : p.value === 0 ? 2 : `${y(p.value)}%` }}
                />
                {i === n - 1 && p.value !== null && (
                  <span className="absolute text-[12px] font-semibold tabular-nums text-ink" style={{ bottom: `calc(${y(p.value)}% + 4px)` }}>
                    {p.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <>
            <svg className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${n} ${top}`} preserveAspectRatio="none" aria-hidden>
              {line.length > 1 && <polygon points={`${line[0].split(',')[0]},${top} ${line.join(' ')} ${line.at(-1)!.split(',')[0]},${top}`} className="fill-blue/10" />}
              <polyline points={line.join(' ')} fill="none" className="stroke-blue" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
            {active !== null && <div className="pointer-events-none absolute inset-y-0 w-px bg-ink-3/50" style={{ left: `${center(active)}%` }} />}
            {[active ?? n - 1].map((i) =>
              points[i]?.value == null ? null : (
                <span
                  key={i}
                  className="pointer-events-none absolute size-3 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-card bg-blue"
                  style={{ left: `${center(i)}%`, bottom: `${y(points[i].value!)}%` }}
                />
              ),
            )}
          </>
        )}

        <div className="absolute inset-0 flex">
          {points.map((p, i) => (
            <div
              key={i}
              tabIndex={0}
              role="img"
              aria-label={`${p.label}: ${amount(p.value)}${p.note ? `, ${p.note}` : ''}`}
              className="h-full flex-1 rounded-none outline-none focus-visible:bg-blue/5"
              onPointerEnter={() => setActive(i)}
              onPointerDown={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            />
          ))}
        </div>

        {active !== null && points[active] && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-[120px] rounded-xl bg-card px-3 py-2 shadow-float"
            style={active < n / 2 ? { left: `calc(${((active + 1) / n) * 100}% + 6px)` } : { right: `calc(${100 - (active / n) * 100}% + 6px)` }}
          >
            <p className="text-[14px] font-semibold text-ink">{amount(points[active].value)}</p>
            <p className="text-[12px] text-ink-2">{points[active].label}</p>
            {points[active].note && <p className="text-[12px] text-ink-3">{points[active].note}</p>}
          </div>
        )}
      </div>

      <div className="ml-7 mt-2 flex">
        {points.map((p, i) => {
          const [, date, month] = p.label.split(' ');
          const shown = (n - 1 - i) % tickEvery === 0;
          const first = shown && i < tickEvery;
          return (
            <span key={i} className="flex-1 whitespace-nowrap text-center text-[11px] tabular-nums text-ink-3">
              {shown ? (first || date === '1' ? `${date} ${month}` : date) : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
}
