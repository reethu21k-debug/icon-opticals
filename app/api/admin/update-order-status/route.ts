export const dynamic = 'force-dynamic'

// app/api/admin/update-order-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance, createAdminClient } from '@/lib/supabase'

async function isAdmin() {
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return data?.role === 'admin'
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { order_id, status } = await request.json()
  if (!order_id || !status) {
    return NextResponse.json({ error: 'order_id and status are required' }, { status: 400 })
  }

  const db = createAdminClient()

  // FIX: Add .select('id') so Supabase returns the updated rows.
  // Without it, .update() returns { data: null, error: null } even when
  // 0 rows matched — making every call look like a success.
  const { data, error } = await db
    .from('orders')
    .update({ status })
    .eq('id', order_id)
    .select('id')   // ← critical fix

  if (error) {
    console.error('[update-order-status]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // FIX: Verify at least one row was actually updated
  if (!data || data.length === 0) {
    console.error('[update-order-status] No rows updated — order_id not found:', order_id)
    return NextResponse.json({ error: 'Order not found or could not be updated' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}