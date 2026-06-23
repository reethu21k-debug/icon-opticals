export const dynamic = 'force-dynamic'

// app/api/admin/variant-groups/search/route.ts
//
// Admin-only "search existing products" box used by VariantGroupManager.
// Searches by name or brand (this app has no SKU field on `products` —
// the original Lenskart-style brief assumed one, so we search by Name/Brand
// instead, which is the closest equivalent available in this schema).

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const exclude = request.nextUrl.searchParams.get('exclude') ?? undefined

  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const db = createAdminClient()
  const safeQ = q.replace(/[%,]/g, '')

  let query = db
    .from('products')
    .select('id, name, slug, brand, frame_color, images, is_active, stock')
    .eq('is_active', true)
    .or(`name.ilike.%${safeQ}%,brand.ilike.%${safeQ}%`)
    .order('name', { ascending: true })
    .limit(10)

  if (exclude) query = query.neq('id', exclude)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ results: data ?? [] })
}