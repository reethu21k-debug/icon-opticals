import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/seo/constants'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow:     '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/private/',
          '/checkout/',
          '/cart/',
          '/account/',
          '/orders/',
          '/wishlist/',
          '/auth/',
          '/unsubscribe/',
          '/booking/confirmed/',
        ],
      },
      // Block AI crawlers from scraping product data
      {
        userAgent: 'GPTBot',
        disallow:  '/',
      },
      {
        userAgent: 'ChatGPT-User',
        disallow:  '/',
      },
      {
        userAgent: 'CCBot',
        disallow:  '/',
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host:    SITE.url,
  }
}
