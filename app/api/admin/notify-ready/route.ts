// app/api/admin/notify-ready/route.ts
//
// Thin server-side proxy that sends the "ready_for_pickup" WhatsApp message.
// Called by the admin orders page instead of calling send-whatsapp directly
// with a client-exposed secret.
//
// Auth: session cookie (role=admin required). No client-side secrets needed.

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerClientInstance } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  // ── Auth: session cookie, role=admin ───────────────────────────────────
  try {
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createAdminClient()
    const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
    const p = profile as { role?: string } | null
    if (p?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { order_id?: string; phone?: string; customer_name?: string; order_number?: string }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const { order_id, phone, customer_name, order_number } = body
  if (!order_id || !phone || !order_number) {
    return NextResponse.json({ error: 'order_id, phone, and order_number are required' }, { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })

  // ── Forward to send-whatsapp using the server-side secret ─────────────
  try {
    const res = await fetch(`${baseUrl}/api/send-whatsapp`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${process.env.ADMIN_API_SECRET}`,  // server env only — never sent to browser
      },
      body: JSON.stringify({
        phone,
        type:     'ready_for_pickup',
        order_id,
        data:     { customer_name: customer_name || 'Customer', order_number },
      }),
    })

    const data = await res.json() as Record<string, unknown>
    if (!res.ok) {
      return NextResponse.json({ error: data.error ?? 'WhatsApp send failed' }, { status: res.status })
    }
    return NextResponse.json({ success: true, message_id: data.message_id })

  } catch (err) {
    console.error('[notify-ready] fetch failed:', err)
    return NextResponse.json({ error: 'Failed to send WhatsApp notification' }, { status: 500 })
  }
}