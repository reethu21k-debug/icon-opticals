// lib/variants.ts
// ── Product Variant Linking — read helpers ────────────────────────────────────
//
// These are storefront (public, RLS-respecting) read helpers used by the
// product detail page and the products listing page. Admin writes live in
// app/api/admin/variant-groups/route.ts via the service-role client.
//
// Design notes:
//  - A product with no membership row simply returns an empty array — no
//    variant logic runs, no extra UI renders. This keeps the feature 100%
//    optional per the brief.
//  - getVariantColorsForProducts() is a single batched lookup (2 queries
//    regardless of how many products are on the page) so listing pages don't
//    pay an N+1 cost just to draw color dots on a few linked products.

import { createClient } from '@/lib/supabase'
import type { ProductImage, ProductVariantSummary } from '@/types'

// ── Color name → swatch hex ────────────────────────────────────────────────────
// Best-effort mapping from the free-text `frame_color` field to a swatch color.
// Falls back to a neutral gray when the color name isn't recognised, so the
// selector never breaks — it just shows a plain gray dot for unusual values.
const COLOR_HEX_MAP: Record<string, string> = {
  black: '#0f172a',
  blue: '#2563eb',
  navy: '#1e3a8a',
  grey: '#6b7280',
  gray: '#6b7280',
  brown: '#78350f',
  tan: '#a16207',
  beige: '#d6c9a8',
  gold: '#ca8a04',
  silver: '#94a3b8',
  red: '#dc2626',
  maroon: '#7f1d1d',
  green: '#16a34a',
  olive: '#65760a',
  pink: '#ec4899',
  purple: '#7c3aed',
  violet: '#7c3aed',
  yellow: '#eab308',
  orange: '#ea580c',
  transparent: '#e2e8f0',
  clear: '#e2e8f0',
  crystal: '#e2e8f0',
  white: '#f8fafc',
  cream: '#fefce8',
  tortoise: '#92400e',
  tortoiseshell: '#92400e',
  gunmetal: '#475569',
}

export function colorToHex(color?: string | null): string {
  if (!color) return '#cbd5e1'
  const key = color.trim().toLowerCase()
  if (COLOR_HEX_MAP[key]) return COLOR_HEX_MAP[key]
  // try the first word — e.g. "Brown Tortoise" -> "brown"
  const firstWord = key.split(/[\s/-]+/)[0]
  return COLOR_HEX_MAP[firstWord] ?? '#94a3b8'
}

// ── Row shapes coming back from Supabase joins ────────────────────────────────
interface VariantProductRow {
  id: string
  name: string
  slug: string
  frame_color: string | null
  final_price: number
  stock: number
  is_active: boolean
  images: ProductImage[] | null
}

function toSummary(p: VariantProductRow, currentId?: string): ProductVariantSummary {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    color: p.frame_color ?? null,
    colorCode: colorToHex(p.frame_color),
    thumbnail: p.images?.[0]?.url ?? null,
    price: p.final_price,
    stock: p.stock,
    is_current: currentId ? p.id === currentId : undefined,
  }
}

/**
 * Returns the full set of sibling variants for a product, INCLUDING the
 * product itself (flagged via `is_current`), sorted so the current product
 * leads the list. Returns `[]` when the product isn't linked to anything —
 * callers should treat that as "render nothing".
 */
export async function getProductVariants(productId: string): Promise<ProductVariantSummary[]> {
  const supabase = createClient()

  const { data: membership } = await supabase
    .from('product_variant_items')
    .select('variant_group_id')
    .eq('product_id', productId)
    .maybeSingle()

  if (!membership) return []

  const { data: items } = await supabase
    .from('product_variant_items')
    .select(`
      product_id,
      products:product_id (
        id, name, slug, frame_color, final_price, stock, is_active, images
      )
    `)
    .eq('variant_group_id', membership.variant_group_id)

  if (!items?.length) return []

  return (items as unknown as { products: VariantProductRow | null }[])
    .map(row => row.products)
    .filter((p): p is VariantProductRow => !!p && p.is_active)
    .map(p => toSummary(p, productId))
    .sort((a, b) => (a.is_current ? -1 : b.is_current ? 1 : 0))
}

/**
 * Batched lookup for listing/grid pages: given a page of product ids, returns
 * a map of `product_id -> sibling variants` (excluding the product itself)
 * using exactly 2 queries no matter how many products are passed in.
 * Products with no variant group simply don't appear in the returned map.
 */
export async function getVariantColorsForProducts(
  productIds: string[],
): Promise<Record<string, ProductVariantSummary[]>> {
  if (!productIds.length) return {}
  const supabase = createClient()

  const { data: memberships } = await supabase
    .from('product_variant_items')
    .select('product_id, variant_group_id')
    .in('product_id', productIds)

  if (!memberships?.length) return {}

  const groupIds = Array.from(new Set(memberships.map((m: { product_id: string; variant_group_id: string }) => m.variant_group_id)))

  const { data: items } = await supabase
    .from('product_variant_items')
    .select(`
      variant_group_id,
      products:product_id ( id, name, slug, frame_color, final_price, stock, is_active, images )
    `)
    .in('variant_group_id', groupIds)

  if (!items?.length) return {}

  const byGroup = new Map<string, ProductVariantSummary[]>()
  for (const row of items as unknown as { variant_group_id: string; products: VariantProductRow | null }[]) {
    const p = row.products
    if (!p || !p.is_active) continue
    const list = byGroup.get(row.variant_group_id) ?? []
    list.push(toSummary(p))
    byGroup.set(row.variant_group_id, list)
  }

  const result: Record<string, ProductVariantSummary[]> = {}
  for (const m of memberships) {
    const siblings = (byGroup.get(m.variant_group_id) ?? []).filter(v => v.id !== m.product_id)
    if (siblings.length) result[m.product_id] = byGroup.get(m.variant_group_id) ?? []
  }
  return result
}