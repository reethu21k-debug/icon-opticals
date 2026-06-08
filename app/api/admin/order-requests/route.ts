export const dynamic = 'force-dynamic'

// app/api/admin/order-requests/route.ts
//
// Returns orders with status = 'pending_admin_approval'.
// Used by the Admin → Order Requests page.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance, createAdminClient } from '@/lib/supabase'

const PER_PAGE = 50

export async function GET(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────
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

  // ── Query params ─────────────────────────────────────────────────────────
  const { searchParams } = request.nextUrl
  const page = parseInt(searchParams.get('page') ?? '0', 10)

  // ── Fetch pending orders ──────────────────────────────────────────────────
  const { data: orders, count, error } = await db
    .from('orders')
    .select(
      `id, order_number, user_id, status, payment_status, total_amount,
       fulfillment_type, created_at, coupon_code, discount_amount,
       payment_reference, payment_screenshot_url, notes`,
      { count: 'exact' },
    )
    .eq('status', 'pending_admin_approval')
    .order('created_at', { ascending: true })  // oldest first = first-come-first-served
    .range(page * PER_PAGE, page * PER_PAGE + PER_PAGE - 1)

  if (error) {
    console.error('[admin/order-requests GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!orders?.length) {
    return NextResponse.json({ orders: [], total: count ?? 0 })
  }

  // ── Enrich with customer profiles ────────────────────────────────────────
  const userIds = [...new Set(orders.map((o: { user_id: string }) => o.user_id))]
  const { data: profiles } = await db
    .from('profiles')
    .select('id, full_name, phone')
    .in('id', userIds)

  // Get emails from auth.users
  const emailMap = new Map<string, string>()
  for (const uid of userIds) {
    try {
      const { data: authUser } = await db.auth.admin.getUserById(uid)
      if (authUser?.user?.email) emailMap.set(uid, authUser.user.email)
    } catch (e) {
      console.warn('[admin/order-requests] Could not fetch email for', uid, e)
    }
  }

  const profileMap = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]))

  const data = orders.map((o: { user_id: string }) => ({
    ...o,
    profile: profileMap.get(o.user_id) ?? null,
    email:   emailMap.get(o.user_id) ?? null,
  }))

  return NextResponse.json({ orders: data, total: count ?? 0 })
}