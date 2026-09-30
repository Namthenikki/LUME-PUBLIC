import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

/** Browser-tab icon: the Lume mark on a rounded light tile. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 16,
          background: 'linear-gradient(180deg, #ffffff 0%, #eeeef2 100%)',
        }}
      >
        <svg width="42" height="42" viewBox="0 0 24 24">
          <circle cx="12" cy="13.2" r="8" fill="none" stroke="#0e0e11" strokeWidth="2.6" />
          <path d="M12 13.2V9.6" stroke="#0e0e11" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="12" cy="3.4" r="2.7" fill="#22c1f1" />
        </svg>
      </div>
    ),
    size,
  );
}
