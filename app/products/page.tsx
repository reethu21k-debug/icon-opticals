import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import ProductFilters from '@/components/product/ProductFilters'
import ProductGrid from '@/components/product/ProductGrid'
import { getVariantColorsForProducts } from '@/lib/variants'
import type { ProductFilters as FiltersType } from '@/types'
import { SITE, CATEGORIES } from '@/lib/seo/constants'
import { breadcrumbSchema, collectionPageSchema } from '@/lib/seo/schema'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Record<string, string>
}

// ── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const cat      = searchParams.category
  const brand    = searchParams.brand
  const gender   = searchParams.gender

  const catInfo  = CATEGORIES.find(c => c.slug === cat)
  const label    = catInfo?.label
               ?? (brand ? `${toTitleCase(brand)} Eyewear` : null)
               ?? (gender === 'kids' ? 'Kids Glasses' : null)
               ?? 'All Eyewear'

  const title       = `${label} — Buy Online | Icon Opticals Anantapur`
  const description = catInfo?.description
    ?? `Shop ${label} at Icon Opticals, Anantapur. Premium brands, competitive prices & free eye test.`

  const path = buildPath(searchParams)

  return {
    title,
    description,
    alternates: { canonical: `${SITE.url}${path}` },
    openGraph: {
      title,
      description,
      url: `${SITE.url}${path}`,
    },
  }
}

// ── Data fetching ──────────────────────────────────────────────────────────────
async function getProducts(
  filters: FiltersType,
): Promise<{ products: import('@/types').Product[]; total: number }> {
  const supabase = createClient()

  let query = supabase
    .from('products')
    .select(
      `id, name, slug, brand, category, gender, frame_type, frame_shape,
      frame_color, base_price, discount_percent, final_price, images,
      stock, rating, review_count, tags`,
      { count: 'exact' },
    )
    .eq('is_active', true)

  if (filters.category)    query = query.eq('category', filters.category)
  if (filters.gender)      query = query.eq('gender', filters.gender)
  if (filters.brand)       query = query.eq('brand', filters.brand)
  if (filters.frame_type)  query = query.eq('frame_type', filters.frame_type)
  if (filters.frame_shape) query = query.eq('frame_shape', filters.frame_shape)
  if (filters.min_price)   query = query.gte('final_price', filters.min_price)
  if (filters.max_price)   query = query.lte('final_price', filters.max_price)

  if (filters.search) {
    query = query.textSearch('name', filters.search, { type: 'websearch' })
  }

  switch (filters.sort) {
    case 'price_asc':  query = query.order('final_price', { ascending: true }); break
    case 'price_desc': query = query.order('final_price', { ascending: false }); break
    case 'rating':     query = query.order('rating', { ascending: false }); break
    case 'newest':     query = query.order('created_at', { ascending: false }); break
    case 'featured':
      query = query.eq('is_featured', true).order('created_at', { ascending: false })
      break
    default:
      query = query.order('is_featured', { ascending: false }).order('rating', { ascending: false })
  }

  const page    = Math.max(0, (filters.page || 1) - 1)
  const perPage = 24
  query = query.range(page * perPage, page * perPage + perPage - 1)

  const { data, count, error } = await query

  if (error) {
    console.error('[products] Query error:', error)
    return { products: [], total: 0 }
  }

  return {
    products: (data || []) as unknown as import('@/types').Product[],
    total:    count || 0,
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function ProductsPage({ searchParams }: PageProps) {
  const filters: FiltersType = {
    category:    searchParams.category as FiltersType['category'],
    gender:      searchParams.gender   as FiltersType['gender'],
    brand:       searchParams.brand,
    frame_type:  searchParams.frame_type  as FiltersType['frame_type'],
    frame_shape: searchParams.frame_shape as FiltersType['frame_shape'],
    min_price:   searchParams.min_price ? Number(searchParams.min_price) : undefined,
    max_price:   searchParams.max_price ? Number(searchParams.max_price) : undefined,
    search:      searchParams.search,
    sort:        searchParams.sort as FiltersType['sort'],
    page:        searchParams.page  ? Number(searchParams.page) : 1,
  }

  const { products, total } = await getProducts(filters)
  const variantColorsByProductId = await getVariantColorsForProducts(products.map(p => p.id))

  const catInfo    = CATEGORIES.find(c => c.slug === filters.category)
  const categoryLabel = catInfo?.label
    ?? (filters.brand  ? toTitleCase(filters.brand) : null)
    ?? (filters.gender === 'kids' ? 'Kids Glasses' : null)
    ?? 'All Eyewear'

  // Breadcrumb schema
  const breadcrumbs = [
    { name: 'Home', url: SITE.url },
    { name: 'Products', url: `${SITE.url}/products` },
    ...(filters.category
      ? [{ name: categoryLabel, url: `${SITE.url}/products?category=${filters.category}` }]
      : []),
  ]

  // Collection schema (only for category pages)
  const showCollectionSchema = !!(filters.category || filters.brand) && products.length > 0
  const collectionSchemaData = showCollectionSchema
    ? collectionPageSchema({
        name:        `${categoryLabel} — Icon Opticals`,
        description: catInfo?.description ?? `Shop ${categoryLabel} at Icon Opticals, Anantapur.`,
        url:         `${SITE.url}${buildPath(searchParams)}`,
        products:    products.map(p => ({ name: p.name, slug: p.slug, final_price: p.final_price })),
      })
    : null

  return (
    <>
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(breadcrumbs)) }}
      />
      {collectionSchemaData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchemaData) }}
        />
      )}

      <main className="min-h-screen bg-white">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-8">

          {/* SEO H1 header */}
          <div className="mb-10 text-center lg:text-left">
            <h1
              className="text-4xl lg:text-5xl text-slate-900 tracking-tight"
              style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
            >
              {categoryLabel}
            </h1>
            <p className="text-slate-500 mt-3 text-sm tracking-wide">
              {catInfo?.description ?? 'Discover the perfect eyewear for you'}
            </p>
          </div>

          <div className="flex flex-col">
            <section className="w-full z-20">
              <Suspense fallback={<div className="h-20 w-full rounded bg-slate-50 border border-slate-100 animate-pulse mb-8" />}>
                <ProductFilters initial={filters} totalCount={total} />
              </Suspense>
            </section>

            <section className="w-full">
              <Suspense fallback={<ProductGridSkeleton />}>
                <ProductGrid
                  products={products}
                  total={total}
                  page={filters.page || 1}
                  perPage={24}
                  filters={filters}
                  variantColorsByProductId={variantColorsByProductId}
                />
              </Suspense>
            </section>
          </div>
        </div>
      </main>
    </>
  )
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
          <div className="aspect-[4/5] bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-3 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-5 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function toTitleCase(s: string) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function buildPath(sp: Record<string, string>): string {
  const params = new URLSearchParams()
  const allowed = ['category', 'brand', 'gender', 'sort']
  for (const k of allowed) {
    if (sp[k]) params.set(k, sp[k])
  }
  const qs = params.toString()
  return qs ? `/products?${qs}` : '/products'
}