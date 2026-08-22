/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this app so Next.js doesn't infer it from an
  // unrelated lockfile higher up the tree (this is a standalone UI-only build).
  turbopack: {
    root: __dirname,
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: require('./package.json').version,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '**' },
      { protocol: 'https', hostname: 'placehold.co', pathname: '**' },
      { protocol: 'https', hostname: '263287aa5419e9b58bb2e04b67172265.r2.cloudflarestorage.com', pathname: '**' },
      { protocol: 'https', hostname: '*.r2.dev', pathname: '**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
