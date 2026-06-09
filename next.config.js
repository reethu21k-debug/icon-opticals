/** @type {import('next').NextConfig} */
const nextConfig = {
  // ─────────────────────────────────────────────────────────────────────────
  // FIX: pdfkit reads AFM font-metric files at runtime using __dirname +
  // dynamic string paths (e.g. path.join(__dirname, 'data', fontName+'.afm')).
  // Vercel's static file tracer (@vercel/nft) cannot detect these dynamic
  // requires, so it omits the /data/ directory from the function bundle.
  // Result: PDF generation throws ENOENT and generate-invoice returns 500 —
  // the caller (store-billing / accept-order) swallows the HTTP error, the
  // order appears to succeed, but no invoice, email, or WhatsApp is sent.
  //
  // Fix: explicitly include ALL pdfkit files so they are present on disk
  // inside the serverless function at runtime.
  // ─────────────────────────────────────────────────────────────────────────
  outputFileTracingIncludes: {
    '/api/generate-invoice': ['./node_modules/pdfkit/**/*'],
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/**',
      },
      {
        protocol: 'https',
        hostname: '**.lenskart.com',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 640, 768, 1024, 1280, 1440, 1920],
    imageSizes: [64, 128, 256, 400, 800],
    minimumCacheTTL: 86400,
    dangerouslyAllowSVG: false,
  },

  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  experimental: {
    optimizePackageImports: ['lucide-react'],
    // Keep pdfkit and cloudinary as external (native require) so that
    // Node.js resolves them from node_modules at runtime rather than
    // having webpack attempt to bundle them. Works in tandem with
    // outputFileTracingIncludes above.
    serverComponentsExternalPackages: ['pdfkit', 'cloudinary'],
  },

  async headers() {
    const ContentSecurityPolicy = [
      "default-src 'self'",
      // MediaPipe loads from CDN when local /mediapipe/ files are missing.
      // jsdelivr is the CDN fallback; unpkg and cdnjs kept for compatibility.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co https://*.lenskart.com https://static1.lenskart.com https://static5.lenskart.com https://picsum.photos",
      // jsdelivr and unpkg needed for MediaPipe WASM + model binary CDN fallback
      "connect-src 'self' https://*.supabase.co https://res.cloudinary.com https://graph.facebook.com https://www.google-analytics.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
      // WASM execution required for MediaPipe
      "worker-src 'self' blob:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control',   value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-XSS-Protection',          value: '1; mode=block' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          // camera=(self) allows webcam access on the try-on page
          { key: 'Permissions-Policy',        value: 'camera=(self), microphone=(), geolocation=(self), interest-cohort=()' },
          { key: 'Content-Security-Policy',   value: ContentSecurityPolicy },
        ],
      },
      {
        source: '/(.+)\\.(ico|png|jpg|jpeg|webp|avif|svg|woff2|woff)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, stale-while-revalidate=86400, immutable',
          },
        ],
      },
      // MediaPipe WASM + data files — long cache, immutable
      {
        source: '/mediapipe/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/site.webmanifest',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
          { key: 'Content-Type',  value: 'application/manifest+json' },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ]
  },

  async redirects() {
    return []
  },

  async rewrites() {
    return []
  },
}

module.exports = nextConfig