export const dynamic = 'force-dynamic'

// app/api/admin/products/route.ts
//
// Server-side API for admin product create / update / delete.
// Uses createAdminClient() (service role key) so it bypasses RLS entirely.
// The admin products page must call this instead of touching Supabase directly.

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient, createServerClientInstance } from '@/lib/supabase'

// ── Cache invalidation ────────────────────────────────────────────────────────
// The homepage (`revalidate = 600`) and product detail pages
// (`revalidate = 300`) use time-based ISR for performance. Whenever an admin
// creates, updates, archives, restores, or deletes a product, we must bust
// those caches on demand so the storefront reflects the change immediately
// instead of waiting out the revalidation window.
function revalidateStorefront(...slugs: (string | null | undefined)[]) {
  revalidatePath('/')
  revalidatePath('/products')
  for (const slug of slugs) {
    if (slug) revalidatePath(`/products/${slug}`)
  }
}

// ── Auth guard ────────────────────────────────────────────────────────────────
// Verifies the caller is a logged-in admin (role = 'admin' in profiles).
// Returns the user id, or null if not authorised.

async function requireAdmin(): Promise<string | null> {
  try {
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((profile as { role: string } | null)?.role !== 'admin') return null
    return user.id
  } catch {
    return null
  }
}

// ── Slug uniqueness helper ────────────────────────────────────────────────────
// Checks if a slug already exists (optionally excluding a specific product id).
// If it does, appends -2, -3, … until a free slot is found.

async function ensureUniqueSlug(
  db: ReturnType<typeof createAdminClient>,
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  let candidate = baseSlug
  let suffix = 2

  while (true) {
    let query = db
      .from('products')
      .select('id')
      .eq('slug', candidate)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query.maybeSingle()

    // If no row found (or query errored), the slug is free
    if (error || !data) return candidate

    // Collision — try the next suffix
    candidate = `${baseSlug}-${suffix}`
    suffix++
  }
}

// ── PUT /api/admin/products — update an existing product ─────────────────────

export async function PUT(request: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id, ...payload } = body

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Product id is required' }, { status: 400 })
  }

  const db = createAdminClient() // service role — bypasses RLS

  // Grab the pre-update slug so we can bust the old detail page's cache too,
  // in case this update changes the slug (or flips is_active).
  const { data: existing } = await db
    .from('products')
    .select('slug')
    .eq('id', id)
    .maybeSingle()

  // ── Ensure slug uniqueness on update ──────────────────────────────────────
  if (payload.slug && typeof payload.slug === 'string') {
    payload.slug = await ensureUniqueSlug(db, payload.slug, id)
  }

  const { data, error } = await db
    .from('products')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[api/admin/products] Update failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidateStorefront((existing as { slug: string } | null)?.slug, data?.slug)

  return NextResponse.json({ success: true, product: data })
}

// ── POST /api/admin/products — create a new product ──────────────────────────

export async function POST(request: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const db = createAdminClient()

  // ── Ensure slug uniqueness on insert ──────────────────────────────────────
  if (payload.slug && typeof payload.slug === 'string') {
    payload.slug = await ensureUniqueSlug(db, payload.slug)
  } else if (payload.name && typeof payload.name === 'string') {
    // Derive a base slug from name if none was provided
    const base = (payload.name as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    payload.slug = await ensureUniqueSlug(db, base)
  }

  const { data, error } = await db
    .from('products')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('[api/admin/products] Insert failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidateStorefront(data?.slug)

  return NextResponse.json({ success: true, product: data })
}

// ── DELETE /api/admin/products?id=xxx — archive (or permanently delete) ──────
// Pass ?permanent=true to hard-delete the row instead of just archiving it.

export async function DELETE(request: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Product id is required' }, { status: 400 })
  }
  const permanent = request.nextUrl.searchParams.get('permanent') === 'true'

  const db = createAdminClient()

  // Grab the slug up front — we need it to bust the detail page's cache,
  // and it's gone from the table after a hard delete.
  const { data: existing } = await db
    .from('products')
    .select('slug')
    .eq('id', id)
    .maybeSingle()

  const { error } = permanent
    ? await db.from('products').delete().eq('id', id)
    : await db.from('products').update({ is_active: false }).eq('id', id)

  if (error) {
    console.error('[api/admin/products] Delete failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidateStorefront((existing as { slug: string } | null)?.slug)

  return NextResponse.json({ success: true })
}

// ── PATCH /api/admin/products?id=xxx — restore an archived product ───────────

export async function PATCH(request: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Product id is required' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data, error } = await db
    .from('products')
    .update({ is_active: true })
    .eq('id', id)
    .select('slug')
    .single()

  if (error) {
    console.error('[api/admin/products] Restore failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidateStorefront(data?.slug)

  return NextResponse.json({ success: true })
}