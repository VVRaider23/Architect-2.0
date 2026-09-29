/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // Every screen draws itself from data already in the browser, so a screen you've opened
    // can be shown again instantly for a few minutes instead of asking the server again.
    staleTimes: { dynamic: 180 },
  },
};

export default nextConfig;
