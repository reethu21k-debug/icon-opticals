export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance, createAdminClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  // Verify the caller is an authenticated admin
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role?: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const page         = parseInt(searchParams.get('page')    || '0')
  const perPage      = parseInt(searchParams.get('perPage') || '20')
  const dateFilter   = searchParams.get('date')   || ''
  const statusFilter = searchParams.get('status') || ''

  // Step 1: fetch bookings + stores
  // bookings.store_id → stores.id  ✓ valid FK, join works
  // bookings.user_id  → auth.users.id (NOT profiles.id) — no direct FK, must join manually
  let query = db
    .from('bookings')
    .select('*, store:stores(name, city)', { count: 'exact' })
    .order('booking_date', { ascending: false })
    .order('time_slot')
    .range(page * perPage, page * perPage + perPage - 1)

  if (dateFilter)   query = query.eq('booking_date', dateFilter)
  if (statusFilter) query = query.eq('status', statusFilter)

  const { data: bookings, count, error } = await query
  if (error) {
    console.error('[admin/bookings]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!bookings?.length) return NextResponse.json({ data: [], count: 0 })

  // Step 2: fetch profiles for all user_ids in this page
  const userIds = [...new Set(bookings.map((b: { user_id: string }) => b.user_id))]
  const { data: profiles } = await db
    .from('profiles')
    .select('id, full_name, phone')
    .in('id', userIds)

  // Step 3: merge profile onto each booking
  const profileMap = new Map((profiles || []).map((p: { id: string }) => [p.id, p]))
  const data = bookings.map((b: { user_id: string }) => ({
    ...b,
    profile: profileMap.get(b.user_id) ?? null,
  }))

  return NextResponse.json({ data, count: count || 0 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role?: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, status } = await request.json()
  if (!id || !status) return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })

  const { error } = await db.from('bookings').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}