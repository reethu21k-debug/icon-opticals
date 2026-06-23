export const dynamic = 'force-dynamic'

// app/api/admin/variant-groups/route.ts
//
// Admin-only API for the optional "Product Variant Linking" feature.
// Uses createAdminClient() (service role) so it bypasses RLS, same pattern
// as app/api/admin/products/route.ts. The admin UI must call this instead of
// touching the variant tables directly from the browser.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { colorToHex } from '@/lib/variants'
import type { ProductVariantSearchResult } from '@/types'

interface VariantRow {
  id: string
  name: string
  slug: string
  brand: string
  frame_color: string | null
  images: { url: string; public_id: string; is_primary: boolean }[] | null
  stock: number
  final_price: number
  is_active: boolean
}

function toSearchResult(p: VariantRow): ProductVariantSearchResult {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    frame_color: p.frame_color,
    images: p.images ?? [],
    is_active: p.is_active,
    stock: p.stock,
  }
}

// ── GET /api/admin/variant-groups?product_id=xxx ──────────────────────────────
// Returns the current linking state for a single product, for the edit drawer.
export async function GET(request: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const productId = request.nextUrl.searchParams.get('product_id')
  if (!productId) {
    return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: membership, error: memErr } = await db
    .from('product_variant_items')
    .select('variant_group_id')
    .eq('product_id', productId)
    .maybeSingle()

  if (memErr) {
    return NextResponse.json({ error: memErr.message }, { status: 500 })
  }

  if (!membership) {
    return NextResponse.json({ enabled: false, group_id: null, variants: [] })
  }

  const { data: items, error } = await db
    .from('product_variant_items')
    .select(`
      product_id,
      products:product_id ( id, name, slug, brand, frame_color, images, stock, final_price, is_active )
    `)
    .eq('variant_group_id', membership.variant_group_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const variants = (items as unknown as { products: VariantRow | null }[] | null || [])
    .map(row => row.products)
    .filter((p): p is VariantRow => !!p && p.id !== productId)
    .map(p => ({ ...toSearchResult(p), colorCode: colorToHex(p.frame_color) }))

  return NextResponse.json({ enabled: true, group_id: membership.variant_group_id, variants })
}

// ── POST /api/admin/variant-groups — create/update the link set ──────────────
// Body: { product_id: string, variant_product_ids: string[] }
// Fully replaces the membership set in one atomic DB call (see migration
// 002_add_product_variant_linking.sql -> set_product_variant_group()).
export async function POST(request: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { product_id?: string; variant_product_ids?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const productId = body.product_id
  const variantIds = Array.from(new Set((body.variant_product_ids ?? []).filter(Boolean)))

  if (!productId || typeof productId !== 'string') {
    return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
  }
  if (variantIds.includes(productId)) {
    return NextResponse.json({ error: 'A product cannot be linked to itself' }, { status: 400 })
  }
  if (variantIds.length === 0) {
    return NextResponse.json(
      { error: 'Select at least one product to link, or turn the toggle off to disable variant linking.' },
      { status: 400 },
    )
  }

  const db = createAdminClient()

  const { data: groupId, error } = await db.rpc('set_product_variant_group', {
    p_product_id: productId,
    p_variant_ids: variantIds,
  })

  if (error) {
    console.error('[api/admin/variant-groups] save failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, group_id: groupId })
}

// ── DELETE /api/admin/variant-groups?product_id=xxx ───────────────────────────
// Turns linking OFF for a single product. If that leaves the group with only
// one member, the DB trigger removes the group automatically.
export async function DELETE(request: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const productId = request.nextUrl.searchParams.get('product_id')
  if (!productId) {
    return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db.from('product_variant_items').delete().eq('product_id', productId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}