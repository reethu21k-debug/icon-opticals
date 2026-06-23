export const dynamic = 'force-dynamic'

// app/api/products/[slug]/route.ts
//
// Public read endpoint matching the API contract from the feature brief:
//   { product, variants: [{ id, name, slug, color, colorCode, thumbnail, price, stock }] }
//
// The product detail page (app/products/[slug]/page.tsx) fetches this data
// directly via server components for SEO/performance reasons and does NOT
// call this route — it's provided as a stable, documented contract for any
// future client-side or mobile consumer that needs the same data over HTTP.
// `variants` is always `[]` for products that aren't linked.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getProductVariants } from '@/lib/variants'

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = createClient()

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (error || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const allVariants = await getProductVariants(product.id)
  // Exclude the current product itself — callers get the base product
  // separately in `product`, and `variants` lists the other colors only.
  const variants = allVariants.filter(v => !v.is_current)

  return NextResponse.json({ product, variants })
}