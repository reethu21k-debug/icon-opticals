// app/api/admin/orders/[id]/reject/route.ts
//
// POST /api/admin/orders/:id/reject
//
// When admin rejects an order:
//   1. Validate it is still pending_admin_approval
//   2. Update status → rejected, payment_status → failed
//   3. Send rejection email + WhatsApp

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance, createAdminClient } from '@/lib/supabase'

async function getAdminUser() {
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const db = createAdminClient()
  const { data } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((data as { role?: string } | null)?.role !== 'admin') return null
  return user
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const adminUser = await getAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orderId = params.id
  if (!orderId) return NextResponse.json({ error: 'Order ID required' }, { status: 400 })

  let body: { reason?: string } = {}
  try { body = await request.json() } catch { /* reason is optional */ }

  const rejectionReason = body.reason?.trim() || 'Payment could not be verified.'

  const db = createAdminClient()

  // ── Fetch the order ───────────────────────────────────────────────────────
  const { data: orderData, error: fetchError } = await db
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (fetchError || !orderData) {
    console.error('[reject-order] Order not found:', orderId, fetchError?.message)
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const order = orderData as Record<string, unknown>

  // ── Guard: only pending orders can be rejected ────────────────────────────
  if (order.status !== 'pending_admin_approval') {
    return NextResponse.json(
      { error: `Order is already ${order.status} — cannot reject.` },
      { status: 409 },
    )
  }

  // ── Update order: rejected + failed ──────────────────────────────────────
  const now = new Date().toISOString()
  const { error: updateError } = await db
    .from('orders')
    .update({
      status:           'rejected',
      payment_status:   'failed',
      rejected_at:      now,
      rejected_by:      adminUser.id,
      rejection_reason: rejectionReason,
    })
    .eq('id', orderId)

  if (updateError) {
    console.error('[reject-order] DB update failed:', updateError.message)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }

  console.log(
    `[reject-order] Order ${order.order_number} rejected by admin ${adminUser.id}.`,
    `Reason: ${rejectionReason}`,
  )

  // ── Fetch customer details for notifications ──────────────────────────────
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  let customerEmail = ''
  let customerName  = 'Customer'
  let customerPhone: string | null = null

  try {
    const { data: profileData } = await db
      .from('profiles')
      .select('full_name, phone')
      .eq('id', order.user_id as string)
      .single()

    const prof = profileData as Record<string, unknown> | null
    if (prof) {
      customerName  = (prof.full_name as string) || 'Customer'
      customerPhone = (prof.phone as string) || null
    }
  } catch (e) {
    console.warn('[reject-order] Could not fetch customer profile:', e)
  }

  try {
    const { data: authUser } = await db.auth.admin.getUserById(order.user_id as string)
    customerEmail = authUser?.user?.email ?? ''
  } catch (e) {
    console.warn('[reject-order] Could not fetch customer email:', e)
  }

  // ── Send rejection email (fire-and-forget) ────────────────────────────────
  if (customerEmail) {
    fetch(`${baseUrl}/api/send-email`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${process.env.ADMIN_API_SECRET}`,
      },
      body: JSON.stringify({
        to:   customerEmail,
        type: 'order_rejection',
        data: {
          order,
          user_name:        customerName,
          rejection_reason: rejectionReason,
          order_number:     order.order_number,
          total_amount:     order.total_amount,
        },
      }),
    }).catch(err => console.error('[reject-order] Rejection email failed:', err))
  }

  // ── Send rejection WhatsApp (fire-and-forget) ─────────────────────────────
  if (customerPhone) {
    fetch(`${baseUrl}/api/send-whatsapp`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${process.env.ADMIN_API_SECRET}`,
      },
      body: JSON.stringify({
        phone:    customerPhone,
        type:     'order_rejected',
        order_id: orderId,
        data: {
          customer_name:    customerName,
          order_number:     order.order_number,
          rejection_reason: rejectionReason,
          total_amount:     order.total_amount,
        },
      }),
    }).catch(err => console.error('[reject-order] Rejection WhatsApp failed:', err))
  }

  return NextResponse.json({
    success:      true,
    message:      'Order rejected. Customer notified.',
    order_number: order.order_number,
  })
}