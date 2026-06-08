export const dynamic = 'force-dynamic'

// app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance, createAdminClient } from '@/lib/supabase'

const PER_PAGE = 20

export async function GET(request: NextRequest) {
  // ── Auth: verify the caller is an authenticated admin ──────────────────────
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

  // ── Query params ───────────────────────────────────────────────────────────
  const { searchParams } = request.nextUrl
  const page   = parseInt(searchParams.get('page')  ?? '0', 10)
  const status = searchParams.get('status') ?? ''
  const year   = parseInt(searchParams.get('year')  ?? '0', 10)
  const month  = parseInt(searchParams.get('month') ?? '0', 10)  // 1-based

  // ── Step 1: Fetch orders WITHOUT the profile join ─────────────────────────
  // orders.user_id → auth.users.id, NOT profiles.id — there is no FK to
  // profiles, so Supabase's auto-join throws a "relationship not found" error.
  // We follow the same two-step pattern used in /api/admin/bookings/route.ts.
  let query = db
    .from('orders')
    .select(
      `id, order_number, user_id, status, total_amount, created_at, coupon_code,
       discount_amount, fulfillment_type, whatsapp_confirmed_sent, whatsapp_ready_sent,
       invoice_url`,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(page * PER_PAGE, page * PER_PAGE + PER_PAGE - 1)

  if (status) query = query.eq('status', status)

  // ── Month filter: restrict to [start of month, start of next month) ────────
  if (year && month && month >= 1 && month <= 12) {
    const start = new Date(Date.UTC(year, month - 1, 1))
    const end   = new Date(Date.UTC(year, month, 1))
    query = query
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
  }

  const { data: orders, count, error } = await query

  if (error) {
    console.error('[admin/orders GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!orders?.length) {
    return NextResponse.json({ orders: [], total: count ?? 0 })
  }

  // ── Step 2: Fetch profiles for all user_ids on this page ──────────────────
  const userIds = [...new Set(orders.map((o: { user_id: string }) => o.user_id))]
  const { data: profiles } = await db
    .from('profiles')
    .select('id, full_name, phone')
    .in('id', userIds)

  // ── Step 3: Merge profile onto each order ─────────────────────────────────
  const profileMap = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]))
  const data = orders.map((o: { user_id: string }) => ({
    ...o,
    profile: profileMap.get(o.user_id) ?? null,
  }))

  return NextResponse.json({ orders: data, total: count ?? 0 })
}