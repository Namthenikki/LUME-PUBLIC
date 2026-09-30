import { TopBar } from './Shell';

export function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="space-y-5 lg:space-y-6">
      <TopBar />
      <header className="appear">
        <h1 className="text-[clamp(1.9rem,6vw,2.4rem)] font-medium leading-[1.1] tracking-[-0.03em]">{title}</h1>
        <p className="mt-1.5 text-[15px] text-ink-2">{sub}</p>
      </header>
    </div>
  );
}

export const delay = (i: number) => ({ animationDelay: `${Math.min(i, 12) * 45}ms` });
