// lib/seo/metadata.ts
// ✅ UPDATED: Fixed icons config - added favicon.ico, fixed svg reference
import type { Metadata } from 'next'
import { SITE, BUSINESS, OG_IMAGE, TWITTER_IMAGE } from './constants'

/** Base metadata applied to every page (root layout) */
export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE.url),

  title: {
    default:  'Icon Opticals — Premium Eyewear in Anantapur',
    template: '%s | Icon Opticals',
  },

  description: SITE.description,

  keywords: [
    'eyeglasses Anantapur',
    'spectacles Anantapur',
    'sunglasses Anantapur',
    'contact lenses Anantapur',
    'eye test Anantapur',
    'optical store Anantapur',
    'Ray-Ban Anantapur',
    'Titan eyewear Anantapur',
    'computer glasses',
    'blue light glasses',
    'progressive lenses',
    'Icon Opticals',
    'eyewear Andhra Pradesh',
    'prescription glasses India',
  ],

  authors:   [{ name: BUSINESS.legalName, url: SITE.url }],
  creator:   BUSINESS.legalName,
  publisher: BUSINESS.legalName,

  alternates: {
    canonical: SITE.url,
  },

  robots: {
    index:             true,
    follow:            true,
    googleBot: {
      index:               true,
      follow:              true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet':       -1,
    },
  },

  openGraph: {
    type:        'website',
    locale:      SITE.locale,
    url:         SITE.url,
    siteName:    SITE.name,
    title:       'Icon Opticals — Premium Eyewear in Anantapur',
    description: SITE.shortDescription,
    images: [
      {
        url:    OG_IMAGE,
        width:  1200,
        height: 630,
        alt:    'Icon Opticals — Premium Eyewear Store, Anantapur',
      },
    ],
  },

  twitter: {
    card:        'summary_large_image',
    title:       'Icon Opticals — Premium Eyewear in Anantapur',
    description: SITE.shortDescription,
    images:      [TWITTER_IMAGE],
    creator:     '@iconopticals',
  },

  icons: {
    icon: [
      { url: '/favicon.ico',        sizes: 'any' },          // ✅ added .ico
      { url: '/favicon.svg',        type: 'image/svg+xml' }, // ✅ SVG (modern browsers)
      { url: '/favicon-16x16.png',  sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png',  sizes: '32x32', type: 'image/png' },
    ],
    apple:   [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    // removed invalid mask-icon (favicon.svg now exists)
    other:   [{ rel: 'mask-icon', url: '/favicon.svg', color: '#0f172a' }],
  },

  manifest: '/site.webmanifest',

  category: 'shopping',

  verification: {
    // google: 'YOUR_GOOGLE_SITE_VERIFICATION_TOKEN', // add when available
  },
}

/** Build canonical URL from a path */
export function canonical(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  return `${SITE.url}${clean}`
}

/** Page-level metadata builder for static pages */
export function pageMetadata(opts: {
  title:       string
  description: string
  path:        string
  ogImage?:    string
  noIndex?:    boolean
}): Metadata {
  const ogImg = opts.ogImage ?? OG_IMAGE
  return {
    title:       opts.title,
    description: opts.description,
    alternates:  { canonical: canonical(opts.path) },
    robots: opts.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title:       opts.title,
      description: opts.description,
      url:         canonical(opts.path),
      images:      [{ url: ogImg, width: 1200, height: 630 }],
    },
    twitter: {
      title:       opts.title,
      description: opts.description,
      images:      [ogImg],
    },
  }
}