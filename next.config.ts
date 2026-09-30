import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Dev-mode fetch logging would print students' LMS feed links, which contain personal tokens.
  logging: false,
  // Some browsers ask for /favicon.ico whatever the page says; give them the app icon.
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/icons/192.png' }];
  },
};

export default nextConfig;
