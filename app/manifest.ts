import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lume',
    short_name: 'Lume',
    description: 'Every Manipal LMS and NPTEL deadline in one place, with reminders until it is done.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#f3f3f5',
    theme_color: '#ffffff',
    icons: [
      { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
