import { ImageResponse } from 'next/og';
import { SITE_URL } from '@/lib/site';

export const alt = 'Lume for MUJ: every MUJ LMS and NPTEL deadline in one place, with reminders until it’s done';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const HEADLINE = ['Every deadline,', 'all in one place'];
const SUB = 'MUJ LMS and NPTEL deadlines, with reminders until they’re done.';
const HOST = new URL(SITE_URL).host;

/**
 * Figtree, the site's font, subset to this image's text. Built once at deploy; if Google Fonts can't
 * be reached the image still renders in the default font.
 */
async function figtree(weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Figtree:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
    const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return src ? await (await fetch(src)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

function Mark({ size, ink = '#0e0e11' }: { size: number; ink?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="13.2" r="8" fill="none" stroke={ink} strokeWidth="2.6" />
      <path d="M12 13.2V9.6" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="12" cy="3.4" r="2.7" fill="#22c1f1" />
    </svg>
  );
}

const tile = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(180deg, #ffffff 0%, #f1f1f4 100%)',
  boxShadow: '0 20px 36px -12px rgba(14,14,17,0.3), 0 4px 10px -4px rgba(14,14,17,0.12)',
} as const;

/** The link preview shared on WhatsApp, LinkedIn and the like: the landing's headline beside a reminder. */
export default async function OpengraphImage() {
  const [medium, semibold] = await Promise.all([
    figtree(500, HEADLINE.join('') + SUB + HOST + 'Tomorrow, 11:59 PM'),
    figtree(600, 'Lume for MUJReminders' + 'Tutorial 5 is due tomorrow' + 'Computer Organization' + 'Due' + 'Free for MUJ students'),
  ]);
  const fonts = [
    ...(medium ? [{ name: 'Figtree', data: medium, weight: 500 as const, style: 'normal' as const }] : []),
    ...(semibold ? [{ name: 'Figtree', data: semibold, weight: 600 as const, style: 'normal' as const }] : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#f3f3f5',
          backgroundImage: 'radial-gradient(rgba(14,14,17,0.075) 1.3px, transparent 1.6px)',
          backgroundSize: '18px 18px',
          fontFamily: fonts.length ? 'Figtree' : undefined,
          color: '#0e0e11',
        }}
      >
        {/* Words on the left */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '64px 0 56px 72px', width: 700, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ ...tile, width: 84, height: 84, borderRadius: 22 }}>
              <Mark size={46} />
            </div>
            <span style={{ fontSize: 38, fontWeight: 600, letterSpacing: '-0.02em' }}>Lume for MUJ</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 50, fontSize: 80, fontWeight: 500, lineHeight: 1.02, letterSpacing: '-0.035em' }}>
            <span>{HEADLINE[0]}</span>
            <span style={{ color: '#a3a3ac' }}>{HEADLINE[1]}</span>
          </div>

          <p style={{ marginTop: 28, marginBottom: 0, fontSize: 30, fontWeight: 500, lineHeight: 1.3, color: '#62626b', maxWidth: 560 }}>{SUB}</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 'auto' }}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 46,
                padding: '0 20px',
                borderRadius: 14,
                background: '#1d6ef5',
                color: '#ffffff',
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              Free for MUJ students
            </span>
            <span style={{ fontSize: 24, fontWeight: 500, color: '#62626b' }}>{HOST}</span>
          </div>
        </div>

        {/* A reminder, tilted like the landing's floating widgets */}
        <div style={{ position: 'absolute', right: 70, top: 150, display: 'flex', transform: 'rotate(6deg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', width: 400 }}>
            <div style={{ display: 'flex', width: 190, height: 44, borderRadius: '22px 22px 0 0', background: '#f7f7f9' }} />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: 22,
                marginTop: -2,
                borderRadius: '0 26px 26px 26px',
                background: '#f7f7f9',
                boxShadow: '0 2px 6px rgba(14,14,17,0.05), 0 30px 50px -18px rgba(14,14,17,0.24)',
              }}
            >
              <span style={{ marginTop: -36, marginBottom: 18, paddingLeft: 4, fontSize: 24, fontWeight: 600 }}>Reminders</span>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 24,
                  borderRadius: 20,
                  background: '#ffffff',
                  boxShadow: '0 1px 2px rgba(14,14,17,0.04), 0 14px 34px -14px rgba(14,14,17,0.14)',
                }}
              >
                <span style={{ fontSize: 19, fontWeight: 600, color: '#a3a3ac' }}>Computer Organization</span>
                <span style={{ marginTop: 4, fontSize: 28, fontWeight: 600, letterSpacing: '-0.01em' }}>Tutorial 5 is due tomorrow</span>
                <span style={{ marginTop: 20, fontSize: 19, fontWeight: 600, color: '#a3a3ac' }}>Due</span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 8,
                    alignSelf: 'flex-start',
                    padding: '7px 16px',
                    borderRadius: 999,
                    background: 'rgba(34,193,241,0.12)',
                    color: '#0a86b3',
                    fontSize: 21,
                    fontWeight: 500,
                  }}
                >
                  {/* The clock from the landing's chip, drawn with boxes: an inline SVG here collapses to a dash */}
                  <div style={{ display: 'flex', position: 'relative', width: 20, height: 20, flexShrink: 0, borderRadius: 999, border: '2px solid #0a86b3' }}>
                    <div style={{ position: 'absolute', left: 7, top: 3, width: 2, height: 7, borderRadius: 1, background: '#0a86b3' }} />
                    <div style={{ position: 'absolute', left: 7, top: 8, width: 5, height: 2, borderRadius: 1, background: '#0a86b3' }} />
                  </div>
                  <span>Tomorrow, 11:59 PM</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* The blue check tile from the landing, overlapping the card */}
        <div style={{ ...tile, position: 'absolute', right: 400, top: 410, width: 96, height: 96, borderRadius: 26, transform: 'rotate(-8deg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 46, height: 46, borderRadius: 13, background: '#1d6ef5' }}>
            <svg width="26" height="26" viewBox="0 0 20 20">
              <path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
