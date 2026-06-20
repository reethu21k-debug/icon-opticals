// app/api/whatsapp/webhook/route.ts
//
// Handles the Meta WhatsApp Cloud API webhook.
//
//  GET  — Hub challenge verification (Meta pings this when you save the
//         Callback URL in the developer console).
//  POST — Incoming webhook events: inbound messages, delivery receipts,
//         read receipts, and status updates.
//
// Required env vars:
//   WHATSAPP_WEBHOOK_VERIFY_TOKEN  — any secret string you choose; must
//                                    match what you enter in the Meta
//                                    developer console as "Verify Token".
//   WHATSAPP_ACCESS_TOKEN          — already in your .env.local
//   WHATSAPP_PHONE_NUMBER_ID       — already in your .env.local

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Types (minimal — extend as you need more fields)
// ─────────────────────────────────────────────────────────────────────────────

interface WaTextMessage {
  from: string           // sender's phone number (E.164 without '+')
  id:   string           // WhatsApp message ID
  timestamp: string
  type: 'text'
  text: { body: string }
}

interface WaStatusUpdate {
  id:          string    // original outgoing message ID
  status:      'sent' | 'delivered' | 'read' | 'failed'
  timestamp:   string
  recipient_id: string
  errors?: Array<{ code: number; title: string; message?: string }>
}

interface WaEntry {
  id:      string        // WhatsApp Business Account ID
  changes: Array<{
    value: {
      messaging_product: 'whatsapp'
      metadata: { display_phone_number: string; phone_number_id: string }
      contacts?: Array<{ profile: { name: string }; wa_id: string }>
      messages?: WaTextMessage[]
      statuses?: WaStatusUpdate[]
    }
    field: string
  }>
}

interface WaWebhookBody {
  object: 'whatsapp_business_account'
  entry:  WaEntry[]
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — Hub verification handshake
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN

  if (!verifyToken) {
    console.error('[wa-webhook] WHATSAPP_WEBHOOK_VERIFY_TOKEN is not set')
    return new NextResponse('Server misconfiguration', { status: 500 })
  }

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[wa-webhook] Webhook verified successfully')
    // Meta expects the challenge echoed back as plain text with 200
    return new NextResponse(challenge, { status: 200 })
  }

  console.warn('[wa-webhook] Verification failed — token mismatch or wrong mode', { mode, token })
  return new NextResponse('Forbidden', { status: 403 })
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — Incoming events
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: WaWebhookBody

  try {
    body = (await request.json()) as WaWebhookBody
  } catch {
    console.error('[wa-webhook] Failed to parse request body')
    return new NextResponse('Bad Request', { status: 400 })
  }

  // Meta always expects 200 quickly — do the heavy work, then respond.
  // If we take too long Meta will retry, so we acknowledge first.
  if (body.object !== 'whatsapp_business_account') {
    return new NextResponse('Not a WhatsApp event', { status: 404 })
  }

  // Process each entry / change asynchronously so we return 200 fast.
  // Errors inside are caught individually so one bad event doesn't
  // cause Meta to retry the whole batch.
  try {
    await processWebhookBody(body)
  } catch (err) {
    // Log but still return 200 — otherwise Meta keeps retrying.
    console.error('[wa-webhook] Unhandled error during processing:', err)
  }

  return new NextResponse('OK', { status: 200 })
}

// ─────────────────────────────────────────────────────────────────────────────
// Processing logic
// ─────────────────────────────────────────────────────────────────────────────

async function processWebhookBody(body: WaWebhookBody) {
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue

      const value = change.value

      // ── Inbound messages ─────────────────────────────────────────────────
      for (const message of value.messages ?? []) {
        const senderName =
          value.contacts?.find(c => c.wa_id === message.from)?.profile.name ??
          'Unknown'

        await handleInboundMessage(message, senderName)
      }

      // ── Status updates (sent / delivered / read / failed) ────────────────
      for (const status of value.statuses ?? []) {
        await handleStatusUpdate(status)
      }
    }
  }
}

// ── Inbound message handler ───────────────────────────────────────────────────

async function handleInboundMessage(message: WaTextMessage, senderName: string) {
  console.log(
    `[wa-webhook] Inbound message from ${senderName} (+${message.from}):`,
    message.type === 'text' ? message.text.body : `[${message.type}]`,
  )

  // Optionally: persist inbound messages to Supabase for the admin to view.
  // Uncomment and extend as needed.
  //
  // const db = createAdminClient()
  // await db.from('whatsapp_inbound_messages').insert({
  //   wa_message_id: message.id,
  //   from_phone:    message.from,
  //   sender_name:   senderName,
  //   type:          message.type,
  //   body:          message.type === 'text' ? message.text.body : null,
  //   received_at:   new Date(Number(message.timestamp) * 1000).toISOString(),
  // })

  // Example: auto-reply to common keywords
  const body = message.type === 'text' ? message.text.body.trim().toLowerCase() : ''

  if (body === 'hi' || body === 'hello' || body === 'hey') {
    await sendTextReply(
      message.from,
      `Hello ${senderName}! 👋 Welcome to *Icon Opticals*. ` +
      `Visit us at https://iconopticals.in or reply with *ORDER* to check your latest order status.`,
    )
  }
}

// ── Status update handler ─────────────────────────────────────────────────────

async function handleStatusUpdate(status: WaStatusUpdate) {
  console.log(
    `[wa-webhook] Status update — message ${status.id}: ${status.status}`,
    status.status === 'failed' ? status.errors : '',
  )

  if (status.status === 'failed') {
    // Optionally: mark the related order notification as failed in DB.
    const db = createAdminClient()

    // Find the order whose last_whatsapp_message_id matches this outgoing ID.
    // (Requires you to store message IDs when you call the send-whatsapp API.)
    const { data: order } = await db
      .from('orders')
      .select('id, order_number')
      .eq('last_whatsapp_message_id', status.id)
      .maybeSingle()

    if (order) {
      const o = order as { id: string; order_number: string }
      console.warn(
        `[wa-webhook] WhatsApp delivery FAILED for order ${o.order_number}`,
        status.errors,
      )

      // Optionally update the order with a failed-notification flag:
      // await db
      //   .from('orders')
      //   .update({ whatsapp_delivery_failed: true })
      //   .eq('id', o.id)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — send a plain-text reply via the Cloud API
// ─────────────────────────────────────────────────────────────────────────────

async function sendTextReply(to: string, text: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.error('[wa-webhook] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN')
    return
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[wa-webhook] Failed to send reply:', err)
    }
  } catch (err) {
    console.error('[wa-webhook] sendTextReply fetch error:', err)
  }
}