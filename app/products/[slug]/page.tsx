import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Star, Truck, RotateCcw, ShieldCheck } from 'lucide-react'
import ProductGallery from '@/components/product/ProductGallery'
import ProductActions from '@/components/product/ProductActions'
import ReviewList from '@/components/product/ReviewList'
import type { Metadata } from 'next'
import type { Product, Review } from '@/types'
import { SITE } from '@/lib/seo/constants'
import { productSchema, breadcrumbSchema } from '@/lib/seo/schema'

export const revalidate    = 300
export const dynamicParams = true

interface PageProps { params: { slug: string } }

// ── Data helpers ──────────────────────────────────────────────────────────────
async function getProduct(slug: string): Promise<Product | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  return data as Product | null
}

async function getReviews(productId: string): Promise<Review[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('reviews')
    .select('id, rating, title, body, images, is_verified, created_at, profile:profiles(full_name, avatar_url)')
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .range(0, 9)
  return ((data || []) as unknown) as Review[]
}

export async function generateStaticParams() {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('products')
      .select('slug')
      .eq('is_active', true)
      .range(0, 200)
    return (data || []).map((p: { slug: string }) => ({ slug: p.slug }))
  } catch {
    return []
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await getProduct(params.slug)
  if (!product) return { title: 'Product Not Found' }

  const title       = `${product.name} — ${product.brand} | Icon Opticals Anantapur`
  const description = product.description
    ?? `Buy ${product.name} by ${product.brand} at Icon Opticals, Anantapur. ${
        product.discount_percent > 0 ? `Save ${Math.round(product.discount_percent)}% — ₹${product.final_price.toLocaleString('en-IN')}. ` : ''
      }Free eye test with purchase.`

  const imageUrl = product.images?.find((i: { is_primary?: boolean }) => i.is_primary)?.url
                ?? product.images?.[0]?.url
                ?? `${SITE.url}/og-image.jpg`

  return {
    title,
    description,
    alternates: { canonical: `${SITE.url}/products/${product.slug}` },
    openGraph: {
      title,
      description,
      url:    `${SITE.url}/products/${product.slug}`,
      type:   'website',
      images: [{ url: imageUrl, width: 800, height: 800, alt: product.name }],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      [imageUrl],
    },
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function ProductPage({ params }: PageProps) {
  const product = await getProduct(params.slug)
  if (!product) notFound()

  const reviews  = await getReviews(product.id)
  const discount = Math.round(product.discount_percent)

  const breadcrumbs = [
    { name: 'Home',     url: SITE.url },
    { name: 'Products', url: `${SITE.url}/products` },
    { name: toTitleCase(product.category), url: `${SITE.url}/products?category=${product.category}` },
    { name: product.name, url: `${SITE.url}/products/${product.slug}` },
  ]

  return (
    <>
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema(product)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(breadcrumbs)) }}
      />

      <main className="min-h-screen bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">

          {/* ── Breadcrumbs ─────────────────────────────────────────────── */}
          <nav
            aria-label="Breadcrumb"
            className="text-[9px] uppercase tracking-[0.2em] font-medium text-slate-400 mb-10 flex items-center gap-3 flex-wrap"
          >
            <a href="/" className="hover:text-slate-900 transition-colors">Boutique</a>
            <span className="text-slate-300" aria-hidden>/</span>
            <a href="/products" className="hover:text-slate-900 transition-colors">Collections</a>
            <span className="text-slate-300" aria-hidden>/</span>
            <a href={`/products?category=${product.category}`} className="hover:text-slate-900 transition-colors">
              {product.category.replace(/-/g, ' ')}
            </a>
            <span className="text-slate-300" aria-hidden>/</span>
            <span className="text-slate-900">{product.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24">

            {/* ── Gallery ─────────────────────────────────────────────── */}
            <div className="w-full">
              <ProductGallery images={product.images} productName={product.name} />
            </div>

            {/* ── Details ─────────────────────────────────────────────── */}
            <div className="flex flex-col pt-2">

              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.25em] mb-4">
                {product.brand}
              </p>

              <h1
                className="text-4xl md:text-5xl text-slate-900 leading-tight mb-6 tracking-tight"
                style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
              >
                {product.name}
              </h1>

              {product.review_count > 0 && (
                <div className="flex items-center gap-3 mb-8">
                  <div className="flex items-center gap-0.5" aria-label={`Rating: ${product.rating} out of 5`}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        size={14}
                        strokeWidth={1}
                        className={s <= Math.round(product.rating) ? 'fill-slate-900 stroke-slate-900' : 'fill-transparent stroke-slate-300'}
                      />
                    ))}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-semibold text-slate-900">{product.rating.toFixed(1)}</span>
                    <span className="text-[10px] uppercase tracking-[0.1em] text-slate-400">
                      ({product.review_count} Client Reviews)
                    </span>
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div className="flex items-baseline gap-4 mb-2">
                <span className="text-2xl font-medium text-slate-900 tracking-wide">
                  ₹{product.final_price.toLocaleString('en-IN')}
                </span>
                {discount > 0 && (
                  <>
                    <span className="text-sm text-slate-400 line-through decoration-slate-300">
                      ₹{product.base_price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-900">
                      [-{discount}%]
                    </span>
                  </>
                )}
              </div>
              <p className="text-[9px] uppercase tracking-[0.15em] text-slate-400 mb-10">
                Complimentary Shipping · Lens pricing determined upon selection
              </p>

              <div className="mb-10">
                <ProductActions product={product} />
              </div>

              {/* Frame specs */}
              <div className="border-y border-slate-200 py-8 mb-10">
                <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] mb-6">
                  Frame Specifications
                </h2>
                <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                  {(([
                    ['Type',         product.frame_type?.replace('-', ' ')],
                    ['Silhouette',   product.frame_shape],
                    ['Color',        product.frame_color],
                    ['Material',     product.frame_material],
                    ['Fit',          product.gender],
                    ['Availability', product.stock > 0 ? 'In Stock' : 'Archived'],
                  ] as [string, string | null | undefined][]).filter(([, v]) => v)).map(([label, value]) => (
                    <div key={label}>
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest block mb-1">{label}</span>
                      <span className="text-sm font-medium text-slate-900 capitalize">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {product.description && (
                <div className="mb-12 max-w-xl">
                  <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] mb-4">
                    The Design
                  </h2>
                  <p className="text-sm text-slate-600 font-light leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200">
                {[
                  { icon: Truck,       title: 'Complimentary Delivery', desc: 'On domestic orders' },
                  { icon: RotateCcw,   title: '7-Day Return',           desc: 'Seamless exchanges' },
                  { icon: ShieldCheck, title: '1-Year Warranty',        desc: 'Craftsmanship guarantee' },
                ].map(t => (
                  <div key={t.title} className="flex flex-col items-start group">
                    <t.icon size={20} strokeWidth={1} className="text-slate-900 mb-4 transition-transform duration-500 group-hover:-translate-y-1" />
                    <p className="text-[9px] font-bold text-slate-900 uppercase tracking-[0.1em] leading-tight mb-2">{t.title}</p>
                    <p className="text-[10px] text-slate-500 font-light leading-snug">{t.desc}</p>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {reviews.length > 0 && (
            <div className="mt-32 pt-16 border-t border-slate-900">
              <ReviewList
                reviews={reviews}
                productId={product.id}
                totalCount={product.review_count}
                avgRating={product.rating}
              />
            </div>
          )}

        </div>
      </main>
    </>
  )
}

function toTitleCase(s: string) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}