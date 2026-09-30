import { ImageResponse } from 'next/og';

/**
 * App icons, drawn from the Lume mark: 192.png, 512.png, maskable-512.png (extra padding for
 * Android's shape masks), apple-180.png (the iPhone Home Screen icon) and badge.png (the monochrome
 * status-bar icon).
 */
const ICONS: Record<string, { size: number; scale: number; badge?: boolean }> = {
  '192.png': { size: 192, scale: 0.56 },
  '512.png': { size: 512, scale: 0.56 },
  'maskable-512.png': { size: 512, scale: 0.44 },
  'apple-180.png': { size: 180, scale: 0.56 },
  'badge.png': { size: 96, scale: 0.8, badge: true },
};

export function generateStaticParams() {
  return Object.keys(ICONS).map((file) => ({ file }));
}

export async function GET(_req: Request, ctx: RouteContext<'/icons/[file]'>) {
  const icon = ICONS[(await ctx.params).file];
  if (!icon) return new Response('Not found', { status: 404 });
  const mark = Math.round(icon.size * icon.scale);
  const ink = icon.badge ? '#ffffff' : '#0e0e11';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: icon.badge ? 'transparent' : 'linear-gradient(180deg, #ffffff 0%, #eeeef2 100%)',
        }}
      >
        <svg width={mark} height={mark} viewBox="0 0 24 24">
          <circle cx="12" cy="13.2" r="8" fill="none" stroke={ink} strokeWidth="2.6" />
          <path d="M12 13.2V9.6" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="12" cy="3.4" r="2.7" fill={icon.badge ? '#ffffff' : '#22c1f1'} />
        </svg>
      </div>
    ),
    { width: icon.size, height: icon.size },
  );
}
