export const dynamic = 'force-dynamic'

// app/api/admin/customers/route.ts
//
// Admin Customers API
//   GET /api/admin/customers          → paginated customer list with aggregated stats
//   Query params:
//     page         (number, default 0)
//     search       (string, searches full_name, email, phone)
//     sort         ('name'|'orders'|'spent'|'last_purchase'|'created', default 'created')
//     order        ('asc'|'desc', default 'desc')
//     min_spent    (number)
//     max_spent    (number)
//     date_from    (ISO date string)
//     date_to      (ISO date string)
//     has_orders   ('true'|'false')
//
// GET /api/admin/customers/[id]  → handled in [id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance, createAdminClient } from '@/lib/supabase'

const PER_PAGE = 25

export async function GET(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if ((profile as { role?: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Query params ────────────────────────────────────────────────────────────
  const { searchParams } = request.nextUrl
  const page      = parseInt(searchParams.get('page') ?? '0', 10)
  const search    = searchParams.get('search')?.trim() ?? ''
  const sort      = searchParams.get('sort') ?? 'created'
  const sortOrder = (searchParams.get('order') ?? 'desc') as 'asc' | 'desc'
  const minSpent  = searchParams.get('min_spent') ? parseFloat(searchParams.get('min_spent')!) : null
  const maxSpent  = searchParams.get('max_spent') ? parseFloat(searchParams.get('max_spent')!) : null
  const dateFrom  = searchParams.get('date_from') ?? ''
  const dateTo    = searchParams.get('date_to') ?? ''
  const hasOrders = searchParams.get('has_orders') ?? ''

  // ── Step 1: Fetch all customers (profiles with role = 'customer') ──────────
  let profileQuery = db
    .from('profiles')
    .select('id, full_name, phone, email: id', { count: 'exact' })
    .eq('role', 'customer')

  // We need emails from auth.users — fetch profiles first then enrich
  const { data: profiles, error: profileError } = await db
    .from('profiles')
    .select('id, full_name, phone, created_at')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })

  if (profileError) {
    console.error('[admin/customers GET profiles]', profileError)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  if (!profiles?.length) {
    return NextResponse.json({ customers: [], total: 0 })
  }

  const allUserIds = profiles.map(p => p.id)

  // ── Step 2: Fetch emails from auth.users via admin API ────────────────────
  // Supabase admin client can list users
  // We batch because listUsers has a limit
  const emailMap = new Map<string, string>()
  try {
    let offset = 0
    const batchSize = 1000
    while (offset < allUserIds.length) {
      const batch = allUserIds.slice(offset, offset + batchSize)
      // Use auth admin to get user emails
      for (const uid of batch) {
        const { data: authUser } = await db.auth.admin.getUserById(uid)
        if (authUser?.user?.email) emailMap.set(uid, authUser.user.email)
      }
      offset += batchSize
    }
  } catch {
    // Non-fatal — some emails may be missing
    console.warn('[admin/customers] Could not fetch all emails from auth.users')
  }

  // ── Step 3: Aggregate orders per customer ─────────────────────────────────
  const { data: orderAggs, error: orderError } = await db
    .from('orders')
    .select('user_id, id, total_amount, status, created_at')
    .in('user_id', allUserIds)
    .not('status', 'in', '("rejected","cancelled")')

  if (orderError) {
    console.error('[admin/customers GET orders]', orderError)
    return NextResponse.json({ error: orderError.message }, { status: 500 })
  }

  // Build per-customer aggregation map
  const aggMap = new Map<string, {
    total_orders: number
    total_spent: number
    last_purchase_date: string | null
    completed_orders: number
    pending_orders: number
  }>()

  for (const order of (orderAggs ?? [])) {
    const o = order as { user_id: string; total_amount: number; status: string; created_at: string }
    const existing = aggMap.get(o.user_id)
    const isCompleted = ['completed', 'confirmed', 'processing', 'ready_for_pickup'].includes(o.status)
    const isPending   = ['pending', 'pending_admin_approval'].includes(o.status)

    if (!existing) {
      aggMap.set(o.user_id, {
        total_orders:      1,
        total_spent:       o.total_amount ?? 0,
        last_purchase_date: o.created_at,
        completed_orders:  isCompleted ? 1 : 0,
        pending_orders:    isPending   ? 1 : 0,
      })
    } else {
      existing.total_orders      += 1
      existing.total_spent       += o.total_amount ?? 0
      existing.completed_orders  += isCompleted ? 1 : 0
      existing.pending_orders    += isPending   ? 1 : 0
      if (!existing.last_purchase_date || o.created_at > existing.last_purchase_date) {
        existing.last_purchase_date = o.created_at
      }
    }
  }

  // ── Step 4: Merge and build customer objects ───────────────────────────────
  let customers = profiles.map(p => {
    const agg = aggMap.get(p.id)
    return {
      id:                  p.id,
      full_name:           p.full_name ?? 'Unknown',
      phone:               p.phone ?? null,
      email:               emailMap.get(p.id) ?? null,
      created_at:          p.created_at,
      total_orders:        agg?.total_orders        ?? 0,
      total_spent:         agg?.total_spent         ?? 0,
      last_purchase_date:  agg?.last_purchase_date  ?? null,
      completed_orders:    agg?.completed_orders    ?? 0,
      pending_orders:      agg?.pending_orders      ?? 0,
    }
  })

  // ── Step 5: Apply filters ──────────────────────────────────────────────────
  if (search) {
    const q = search.toLowerCase()
    customers = customers.filter(c =>
      c.full_name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q))  ||
      (c.phone?.includes(q))
    )
  }
  if (minSpent !== null) customers = customers.filter(c => c.total_spent >= minSpent)
  if (maxSpent !== null) customers = customers.filter(c => c.total_spent <= maxSpent)
  if (dateFrom) customers = customers.filter(c => c.created_at >= dateFrom)
  if (dateTo)   customers = customers.filter(c => c.created_at <= dateTo + 'T23:59:59Z')
  if (hasOrders === 'true')  customers = customers.filter(c => c.total_orders > 0)
  if (hasOrders === 'false') customers = customers.filter(c => c.total_orders === 0)

  // ── Step 6: Sort ──────────────────────────────────────────────────────────
  customers.sort((a, b) => {
    let av: string | number = 0, bv: string | number = 0
    switch (sort) {
      case 'name':          av = a.full_name.toLowerCase(); bv = b.full_name.toLowerCase(); break
      case 'orders':        av = a.total_orders; bv = b.total_orders; break
      case 'spent':         av = a.total_spent; bv = b.total_spent; break
      case 'last_purchase': av = a.last_purchase_date ?? ''; bv = b.last_purchase_date ?? ''; break
      default:              av = a.created_at; bv = b.created_at; break
    }
    if (av < bv) return sortOrder === 'asc' ? -1 : 1
    if (av > bv) return sortOrder === 'asc' ?  1 : -1
    return 0
  })

  // ── Step 7: Paginate ──────────────────────────────────────────────────────
  const total     = customers.length
  const paginated = customers.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  return NextResponse.json({ customers: paginated, total, per_page: PER_PAGE })
}