// app/api/admin/orders/[id]/accept/route.ts
//
// POST /api/admin/orders/:id/accept
//
// When admin accepts an order:
//   1. Validate it is still pending_admin_approval
//   2. Update status → confirmed, payment_status → paid
//   3. Reduce stock (ONLY happens here, not at checkout)
//   4. Generate invoice + send WhatsApp (AWAITED — not fire-and-forget)
//   5. Return success, or success-with-warning if WhatsApp failed
//
// FIX: The invoice fetch is now awaited instead of fire-and-forget.
// Previously, if the server process restarted or the fetch threw, the customer
// never received their WhatsApp confirmation and no error was shown to the admin.
// Now the admin sees a clear warning if the send fails, and can retry.

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
    `[ORDER_CONFIRMED] Order ${order.order_number} accepted by admin ${adminUser.id}.`,
    `Stock reduced for ${orderItems.length} items.`,
  )

  // ── Fetch customer phone for WhatsApp ─────────────────────────────────────
  // Pass it directly to generate-invoice to avoid a race condition where the
  // profile update from place-order hasn't committed yet.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
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

  // ── Trigger invoice generation (AWAITED) ──────────────────────────────────
  // generate-invoice handles: PDF creation → Cloudinary upload → email → WhatsApp.
  //
  // FIX: This was previously fire-and-forget (.catch only). If the server
  // restarted mid-request the customer never got their WhatsApp message, and
  // the admin had no idea. Now we await the result and show a warning if it
  // fails, so the admin can act immediately.
  console.log(`[WHATSAPP_SEND_START] Triggering invoice+WhatsApp for order ${order.order_number}`)

  let invoiceWarning: string | null = null

  try {
    const invoiceRes = await fetch(`${baseUrl}/api/generate-invoice`, {
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

    if (!invoiceRes.ok) {
      const errBody = await invoiceRes.json().catch(() => ({ error: 'Unknown error' })) as { error?: string }
      invoiceWarning = `Invoice/WhatsApp send failed: ${errBody.error ?? invoiceRes.statusText}. Order is confirmed — please retry WhatsApp from the order details page.`
      console.error(`[WHATSAPP_SEND_FAILED] Order ${order.order_number}:`, invoiceWarning)
    } else {
      console.log(`[WHATSAPP_SEND_SUCCESS] Invoice+WhatsApp triggered for order ${order.order_number}`)
    }
  } catch (err) {
    invoiceWarning = 'Invoice/WhatsApp trigger threw a network error. Order is confirmed — please retry WhatsApp from the order details page.'
    console.error(`[WHATSAPP_SEND_FAILED] Order ${order.order_number} — fetch threw:`, err)
  }

  // ── Respond ───────────────────────────────────────────────────────────────
  // Always return 200 — the order IS confirmed in the database.
  // If WhatsApp failed, include a warning so the admin knows to follow up.
  return NextResponse.json({
    success:      true,
    message:      invoiceWarning
      ? 'Order confirmed. ⚠️ WhatsApp/Invoice failed — see warning.'
      : 'Order confirmed. Invoice and WhatsApp sent.',
    warning:      invoiceWarning ?? undefined,
    order_number: order.order_number,
  })
}