// app/api/send-email/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import {
  sendEmail,
  buildOrderConfirmationEmail,
  buildBookingConfirmationEmail,
  buildOrderRejectionEmail,
} from '@/lib/email'
import type { Order, Booking } from '@/types'

export async function POST(request: NextRequest) {
  const { allowed, resetIn } = rateLimit(request, 'send-email')
  if (!allowed) return rateLimitResponse(resetIn)

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.ADMIN_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { to, type, data } = body as { to: string; type: string; data: Record<string, unknown> }

  if (!to || !type) return NextResponse.json({ error: 'to and type are required' }, { status: 400 })

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(to)) return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })

  try {
    let subject: string
    let html: string

    switch (type) {
      case 'order_confirmation':
      case 'invoice': {
        const order    = data.order as Order
        const userName = data.user_name as string
        subject = `Order Confirmed — ${order.order_number} | Icon Opticals`
        html    = buildOrderConfirmationEmail(order, userName)
        break
      }

      case 'order_rejection': {
        const order           = data.order as Order
        const userName        = data.user_name as string
        const rejectionReason = (data.rejection_reason as string) || 'Payment could not be verified.'
        subject = `Order Request Rejected — ${order.order_number} | Icon Opticals`
        html    = buildOrderRejectionEmail(order, userName, rejectionReason)
        break
      }

      case 'booking_confirmation': {
        const booking  = data.booking as Booking
        const userName = data.user_name as string
        subject = `Booking Confirmed — ${booking.booking_number} | Icon Opticals`
        html    = buildBookingConfirmationEmail(booking, userName)
        break
      }

      // ── Generic HTML email (used by store-billing for new customer setup links) ──
      // Caller must provide: data.subject (string) and data.html (string)
      case 'generic_html': {
        if (!data.subject || !data.html) {
          return NextResponse.json(
            { error: 'generic_html type requires data.subject and data.html' },
            { status: 400 },
          )
        }
        subject = data.subject as string
        html    = data.html as string
        break
      }

      default:
        return NextResponse.json({ error: `Unknown email type: ${type}` }, { status: 400 })
    }

    const result = await sendEmail({ to, subject, html })
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })
    return NextResponse.json({ success: true, message_id: result.messageId })
  } catch (error) {
    console.error('[send-email]', error)
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
  }
}