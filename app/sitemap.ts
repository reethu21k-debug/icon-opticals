import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase'
import { SITE } from '@/lib/seo/constants'

const BASE = SITE.url

export const revalidate = 3600 // regenerate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // ── Static pages ──────────────────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url:             BASE,
      lastModified:    now,
      changeFrequency: 'daily',
      priority:        1.0,
    },
    {
      url:             `${BASE}/products`,
      lastModified:    now,
      changeFrequency: 'daily',
      priority:        0.9,
    },
    {
      url:             `${BASE}/products?category=eyeglasses`,
      lastModified:    now,
      changeFrequency: 'daily',
      priority:        0.85,
    },
    {
      url:             `${BASE}/products?category=sunglasses`,
      lastModified:    now,
      changeFrequency: 'daily',
      priority:        0.85,
    },
    {
      url:             `${BASE}/products?category=computer-glasses`,
      lastModified:    now,
      changeFrequency: 'weekly',
      priority:        0.8,
    },
    {
      url:             `${BASE}/products?category=contact-lenses`,
      lastModified:    now,
      changeFrequency: 'weekly',
      priority:        0.8,
    },
    {
      url:             `${BASE}/products?category=progressive`,
      lastModified:    now,
      changeFrequency: 'weekly',
      priority:        0.75,
    },
    {
      url:             `${BASE}/products?gender=kids`,
      lastModified:    now,
      changeFrequency: 'weekly',
      priority:        0.75,
    },
    // Brand pages
    {
      url:             `${BASE}/products?brand=ray-ban`,
      lastModified:    now,
      changeFrequency: 'weekly',
      priority:        0.7,
    },
    {
      url:             `${BASE}/products?brand=titan`,
      lastModified:    now,
      changeFrequency: 'weekly',
      priority:        0.7,
    },
    {
      url:             `${BASE}/products?brand=tommy-hilfiger`,
      lastModified:    now,
      changeFrequency: 'weekly',
      priority:        0.7,
    },
    {
      url:             `${BASE}/products?brand=fastrack`,
      lastModified:    now,
      changeFrequency: 'weekly',
      priority:        0.65,
    },
    {
      url:             `${BASE}/products?brand=scott`,
      lastModified:    now,
      changeFrequency: 'weekly',
      priority:        0.65,
    },
    {
      url:             `${BASE}/products?brand=voyage`,
      lastModified:    now,
      changeFrequency: 'weekly',
      priority:        0.65,
    },
    // Store / service pages
    {
      url:             `${BASE}/store`,
      lastModified:    now,
      changeFrequency: 'monthly',
      priority:        0.8,
    },
    {
      url:             `${BASE}/booking`,
      lastModified:    now,
      changeFrequency: 'monthly',
      priority:        0.8,
    },
  ]

  // ── Dynamic product pages ─────────────────────────────────────────────────
  let productRoutes: MetadataRoute.Sitemap = []
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('products')
      .select('slug, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (data) {
      productRoutes = data.map(p => ({
        url:             `${BASE}/products/${p.slug}`,
        lastModified:    p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: 'weekly' as const,
        priority:        0.7,
      }))
    }
  } catch (err) {
    console.error('[sitemap] Failed to fetch product slugs:', err)
  }

  return [...staticRoutes, ...productRoutes]
}
