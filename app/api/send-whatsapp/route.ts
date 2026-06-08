// app/api/send-whatsapp/route.ts
//
// Sends WhatsApp template messages for order events.
// Supported types: 'order_confirmed', 'order_rejected', 'ready_for_pickup'
//
// ── AUTH ──────────────────────────────────────────────────────────────────────
// Protected by ADMIN_API_SECRET (server-side env var only).
// Callers must pass: Authorization: Bearer <ADMIN_API_SECRET>
//
// ── DUPLICATE PREVENTION ──────────────────────────────────────────────────────
// For 'order_confirmed': checks whatsapp_confirmed_sent DB flag before sending.
// For 'order_rejected': sends unconditionally (rejections are one-time events).

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { sendOrderConfirmedWhatsApp, formatPhone } from '@/lib/whatsapp'

export async function POST(request: NextRequest) {
  // ── Rate limit ──────────────────────────────────────────────────────────
  const { allowed, resetIn } = rateLimit(request, 'send-whatsapp')
  if (!allowed) return rateLimitResponse(resetIn)

  // ── Auth ────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.ADMIN_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse body ──────────────────────────────────────────────────────────
  let body: { phone?: string; type?: string; order_id?: string; data?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { phone, type, order_id, data } = body

  if (!phone || !type || !order_id || !data) {
    return NextResponse.json({ error: 'phone, type, order_id, and data are required' }, { status: 400 })
  }

  const SUPPORTED_TYPES = ['order_confirmed', 'order_rejected', 'ready_for_pickup']
  if (!SUPPORTED_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type "${type}". Supported: ${SUPPORTED_TYPES.join(', ')}` },
      { status: 400 },
    )
  }

  const db = createAdminClient()

  // ── Fetch order ─────────────────────────────────────────────────────────
  const { data: orderData, error: fetchError } = await db
    .from('orders')
    .select('id, whatsapp_confirmed_sent, store_id')
    .eq('id', order_id)
    .single()

  if (fetchError || !orderData) {
    console.error('[send-whatsapp] Order not found:', order_id, fetchError?.message)
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const order = orderData as { id: string; whatsapp_confirmed_sent: boolean; store_id: string | null }

  // ── Handle order_confirmed ───────────────────────────────────────────────
  if (type === 'order_confirmed') {
    // Duplicate-send guard
    if (order.whatsapp_confirmed_sent) {
      console.log(`[send-whatsapp] Already sent for order ${order_id} — skipping`)
      return NextResponse.json({ success: false, skipped: true, reason: 'Already sent' })
    }

    // Resolve store name
    let storeName = 'Icon-Opticals Ananthapur'
    if (order.store_id) {
      const { data: storeData } = await db
        .from('stores')
        .select('name')
        .eq('id', order.store_id)
        .single()
      const store = storeData as { name: string } | null
      if (store?.name) storeName = store.name
    }

    try {
      const result = await sendOrderConfirmedWhatsApp({
        phone,
        customerName:  String(data.customer_name  ?? 'Customer'),
        orderNumber:   String(data.order_number   ?? ''),
        invoiceUrl:    String(data.invoice_url    ?? ''),
        storeName,
        invoiceNumber: String(data.invoice_number ?? data.order_number ?? ''),
        amountPaid:    Number(data.total_amount   ?? 0),
      })

      if (result.success) {
        await db.from('orders').update({ whatsapp_confirmed_sent: true }).eq('id', order_id)
        console.log(`[send-whatsapp] ✅ order_confirmed sent to ${phone} — ${result.message_id}`)
      } else {
        console.error(`[send-whatsapp] ❌ order_confirmed failed for ${order_id}:`, result.error)
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      return NextResponse.json({ success: true, message_id: result.message_id, type })
    } catch (error) {
      console.error('[send-whatsapp] order_confirmed unhandled error:', error)
      return NextResponse.json({ error: 'WhatsApp send failed' }, { status: 500 })
    }
  }

  // ── Handle order_rejected ────────────────────────────────────────────────
  if (type === 'order_rejected') {
    const formattedPhone = formatPhone(phone)
    if (!formattedPhone) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    const WA_API_URL = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`

    try {
      const res = await fetch(WA_API_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: {
            body:
              `Hello ${data.customer_name ?? 'Customer'},\n\n` +
              `We regret to inform you that your order *${data.order_number}* (₹${data.total_amount}) ` +
              `could not be confirmed.\n\n` +
              `Reason: ${data.rejection_reason ?? 'Payment could not be verified.'}\n\n` +
              `Please contact us or place a new order if you need assistance.\n\n` +
              `— Icon Opticals`,
          },
        }),
      })

      const result = await res.json() as { messages?: Array<{ id: string }>; error?: { message: string } }

      if (!res.ok || result.error) {
        console.error(`[send-whatsapp] ❌ order_rejected failed for ${order_id}:`, result.error?.message)
        return NextResponse.json({ error: result.error?.message ?? 'WhatsApp API error' }, { status: 500 })
      }

      console.log(`[send-whatsapp] ✅ order_rejected sent to ${formattedPhone}`)
      return NextResponse.json({ success: true, message_id: result.messages?.[0]?.id, type })

    } catch (error) {
      console.error('[send-whatsapp] order_rejected unhandled error:', error)
      return NextResponse.json({ error: 'WhatsApp send failed' }, { status: 500 })
    }
  }

  // ── Handle ready_for_pickup ──────────────────────────────────────────────
  if (type === 'ready_for_pickup') {
    const formattedPhone = formatPhone(phone)
    if (!formattedPhone) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    const WA_API_URL = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`

    try {
      const res = await fetch(WA_API_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: {
            body:
              `Hello ${data.customer_name ?? 'Customer'},\n\n` +
              `Great news! Your order *${data.order_number}* is ready for pickup. ` +
              `Please visit the store at your convenience.\n\n` +
              `— Icon Opticals`,
          },
        }),
      })

      const result = await res.json() as { messages?: Array<{ id: string }>; error?: { message: string } }

      if (!res.ok || result.error) {
        console.error('[send-whatsapp] ready_for_pickup failed:', result.error?.message)
        return NextResponse.json({ error: result.error?.message ?? 'WhatsApp API error' }, { status: 500 })
      }
      await db.from('orders').update({ whatsapp_ready_sent: true }).eq('id', order_id)

      console.log(`[send-whatsapp] ✅ ready_for_pickup sent to ${formattedPhone}`)
      return NextResponse.json({ success: true, message_id: result.messages?.[0]?.id, type })

    } catch (error) {
      console.error('[send-whatsapp] ready_for_pickup unhandled error:', error)
      return NextResponse.json({ error: 'WhatsApp send failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Unhandled type' }, { status: 400 })
}