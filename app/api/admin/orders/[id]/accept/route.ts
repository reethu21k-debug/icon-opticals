export const dynamic = 'force-dynamic'
export const maxDuration = 60 // awaits generate-invoice which can take up to ~30s

// app/api/admin/orders/[id]/accept/route.ts
//
// POST /api/admin/orders/:id/accept
//
// When admin accepts an order:
//   1. Validate it is still pending_admin_approval
//   2. Update status → confirmed, payment_status → paid
//   3. Reduce stock (ONLY happens here, not at checkout)
//   4. Await invoice generation (handles email + WhatsApp internally)
//   5. Return success

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

  const db = createAdminClient()

  // ── Fetch the order ───────────────────────────────────────────────────────
  const { data: orderData, error: fetchError } = await db
    .from('orders')
    .select(`*, order_items(*)`)
    .eq('id', orderId)
    .single()

  if (fetchError || !orderData) {
    console.error('[accept-order] Order not found:', orderId, fetchError?.message)
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const order = orderData as Record<string, unknown>

  // ── Guard: only pending orders can be accepted ────────────────────────────
  if (order.status !== 'pending_admin_approval') {
    return NextResponse.json(
      { error: `Order is already ${order.status} — cannot accept again.` },
      { status: 409 },
    )
  }

  // ── Update order: confirmed + paid ────────────────────────────────────────
  const now = new Date().toISOString()
  const { error: updateError } = await db
    .from('orders')
    .update({
      status:         'confirmed',
      payment_status: 'paid',
      approved_at:    now,
      approved_by:    adminUser.id,
    })
    .eq('id', orderId)

  if (updateError) {
    console.error('[accept-order] DB update failed:', updateError.message)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }

  // ── Reduce stock (this is the ONE place stock is reduced) ─────────────────
  const orderItems = (order.order_items as Array<Record<string, unknown>>) || []
  for (const item of orderItems) {
    const { data: product } = await db
      .from('products')
      .select('stock')
      .eq('id', item.product_id as string)
      .single()

    if (product) {
      const currentStock = (product as Record<string, unknown>).stock as number
      const newStock = Math.max(0, currentStock - (item.quantity as number))
      await db
        .from('products')
        .update({ stock: newStock })
        .eq('id', item.product_id as string)
    }
  }

  console.log(
    `[accept-order] Order ${order.order_number} accepted by admin ${adminUser.id}.`,
    `Stock reduced for ${orderItems.length} items. Triggering invoice generation.`,
  )

  // ── Trigger invoice generation (handles email + WhatsApp internally) ───────
  //
  // IMPORTANT: do NOT fire-and-forget here. Vercel freezes this function the
  // instant `return NextResponse.json(...)` executes, killing any in-flight
  // fetch that hasn't completed — which is why WhatsApp/email was silently
  // dropped. Awaiting keeps this function alive until generate-invoice responds.
  // generate-invoice has maxDuration=60 and only returns once PDF + WhatsApp
  // + email are all done (via Promise.allSettled inside it).
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Fetch customer phone for WhatsApp (pass it directly to avoid race conditions)
  let customerPhone: string | null = null
  try {
    const { data: profileData } = await db
      .from('profiles')
      .select('phone')
      .eq('id', order.user_id as string)
      .single()
    customerPhone = (profileData as Record<string, unknown> | null)?.phone as string | null
  } catch (e) {
    console.warn('[accept-order] Could not fetch customer phone:', e)
  }

  try {
    await fetch(`${baseUrl}/api/generate-invoice`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${process.env.ADMIN_API_SECRET}`,
      },
      body: JSON.stringify({
        order_id:     orderId,
        order_number: order.order_number,
        user_id:      order.user_id,
        phone:        customerPhone,
        force:        false,
      }),
    })
  } catch (err) {
    // Non-fatal: order is already confirmed. Log for visibility.
    console.error('[accept-order] Invoice/WhatsApp trigger failed (order still confirmed):', err)
  }

  return NextResponse.json({
    success:      true,
    message:      'Order accepted. Invoice and WhatsApp notification sent.',
    order_number: order.order_number,
  })
}