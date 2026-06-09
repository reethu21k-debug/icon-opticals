export const runtime = 'nodejs' // pdfkit + Supabase admin client require Node.js
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// app/api/admin/orders/[id]/accept/route.ts
//
// POST /api/admin/orders/:id/accept
//
// FIX: Previously this route called fetch('/api/generate-invoice', ...)
// which made an internal HTTP request to another serverless function.
// On Vercel this is unreliable — it adds a cold-start, goes through the
// public routing layer, and can fail silently if NEXT_PUBLIC_APP_URL is
// wrong or not set. The fix is to import the logic directly and run it
// in the same function execution, which is faster and always works.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance, createAdminClient } from '@/lib/supabase'
import { generatePDFBuffer, buildInvoiceHTML } from '@/lib/invoice'
import type { InvoiceOrder } from '@/lib/invoice'
import { uploadInvoicePDF } from '@/lib/cloudinary'
import { sendEmail, buildOrderConfirmationEmail } from '@/lib/email'
import { sendOrderConfirmedWhatsApp } from '@/lib/whatsapp'
import type { Order } from '@/types'

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

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const db = createAdminClient()

  // ── Fetch the order ────────────────────────────────────────────────────────
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

  // ── Guard: only pending orders can be accepted ─────────────────────────────
  if (order.status !== 'pending_admin_approval') {
    return NextResponse.json(
      { error: `Order is already ${order.status} — cannot accept again.` },
      { status: 409 },
    )
  }

  // ── Update order: confirmed + paid ─────────────────────────────────────────
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

  // ── Reduce stock ───────────────────────────────────────────────────────────
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

  const orderNumber = order.order_number as string
  console.log(`[accept-order] Order ${orderNumber} accepted. Stock reduced for ${orderItems.length} items.`)

  // ── Fetch customer details ─────────────────────────────────────────────────
  const targetUserId = order.user_id as string

  const [{ data: profileData }, authUserResult] = await Promise.all([
    db.from('profiles')
      .select('full_name, phone, whatsapp_opt_in')
      .eq('id', targetUserId)
      .single(),
    db.auth.admin.getUserById(targetUserId).catch((err: unknown) => {
      console.warn('[accept-order] Could not fetch auth user email:', err)
      return { data: null }
    }),
  ])

  const profile = profileData as {
    full_name?: string
    phone?: string
    whatsapp_opt_in?: boolean
  } | null

  const customerEmail = (authUserResult?.data as { user?: { email?: string } } | null)?.user?.email ?? ''
  const customerName  = profile?.full_name ?? 'Customer'
  const customerPhone = profile?.phone?.trim() || null
  const whatsappOptIn = profile?.whatsapp_opt_in !== false

  console.log(
    `[accept-order] Customer: "${customerName}" <${customerEmail || 'no email'}>`,
    `| phone: ${customerPhone ?? 'MISSING'}`,
  )

  // ── Generate PDF ───────────────────────────────────────────────────────────
  let invoiceUrl  = ''
  let encodedUrl  = ''

  try {
    const pdfBuffer = await generatePDFBuffer(
      order as unknown as InvoiceOrder,
      customerName,
      customerEmail,
    )
    console.log(`[accept-order] PDF generated: ${pdfBuffer.length} bytes`)

    // ── Upload to Cloudinary ─────────────────────────────────────────────────
    const uploadResult = await uploadInvoicePDF(pdfBuffer, orderNumber)
    invoiceUrl  = uploadResult.url
    encodedUrl  = encodeURIComponent(invoiceUrl)

    // ── Persist invoice_url to DB ────────────────────────────────────────────
    const { error: invoiceUpdateError } = await db
      .from('orders')
      .update({
        invoice_url:              invoiceUrl,
        invoice_cloudinary_id:    uploadResult.public_id,
      })
      .eq('id', orderId)

    if (invoiceUpdateError) {
      console.error('[accept-order] Failed to save invoice_url (PDF was uploaded):', invoiceUpdateError.message)
    } else {
      console.log(`[accept-order] ✅ Invoice stored: ${invoiceUrl}`)
    }
  } catch (err) {
    // Non-fatal: order is already confirmed. Log for Vercel dashboard visibility.
    console.error('[accept-order] ❌ Invoice generation/upload failed:', err)
  }

  // ── Send email + WhatsApp ──────────────────────────────────────────────────
  // Run in parallel; failures are logged but don't block the response.
  const invoiceViewUrl     = invoiceUrl ? `${baseUrl}/api/view-invoice?url=${encodedUrl}` : ''
  const invoiceDownloadUrl = invoiceUrl ? `${baseUrl}/api/view-invoice?url=${encodedUrl}&dl=1` : ''

  const emailPromise = customerEmail
    ? (async () => {
        try {
          const orderWithUrls = {
            ...order,
            invoice_url:          invoiceUrl,
            invoice_view_url:     invoiceViewUrl,
            invoice_download_url: invoiceDownloadUrl,
          } as unknown as Order

          const html    = buildOrderConfirmationEmail(orderWithUrls, customerName)
          const subject = `Order Confirmed — ${orderNumber} | Icon Opticals`
          const result  = await sendEmail({ to: customerEmail, subject, html })

          if (result.success) {
            console.log(`[accept-order] ✅ Email sent → ${customerEmail}`)
          } else {
            console.error('[accept-order] ❌ Email failed:', result.error)
          }
        } catch (err) {
          console.error('[accept-order] ❌ Email error:', err)
        }
      })()
    : Promise.resolve(
        console.warn('[accept-order] No email address — skipping email.'),
      )

  const whatsappPromise = !invoiceUrl
    ? Promise.resolve(
        console.warn('[accept-order] No invoice URL — skipping WhatsApp.'),
      )
    : !customerPhone
      ? Promise.resolve(
          console.error(`[accept-order] ❌ WhatsApp SKIPPED — no phone number for order ${orderNumber}.`),
        )
      : !whatsappOptIn
        ? Promise.resolve(
            console.log(`[accept-order] WhatsApp skipped — customer opted out.`),
          )
        : (async () => {
            try {
              const result = await sendOrderConfirmedWhatsApp({
                phone:         customerPhone,
                customerName,
                orderNumber,
                // encodedUrl is just the Cloudinary URL encoded — the Meta template
                // button has the base URL (/api/view-invoice?url=) configured in
                // Business Manager, and Vercel appends this as the dynamic suffix.
                invoiceUrl:    encodedUrl,
                storeName:     'Icon Opticals',
                invoiceNumber: orderNumber,
                amountPaid:    (order.total_amount as number) ?? 0,
              })
              if (result.success) {
                console.log(`[accept-order] ✅ WhatsApp sent → ${customerPhone}`)
              } else {
                console.error('[accept-order] ❌ WhatsApp failed:', result.error)
              }
            } catch (err) {
              console.error('[accept-order] ❌ WhatsApp error:', err)
            }
          })()

  await Promise.allSettled([emailPromise, whatsappPromise])

  return NextResponse.json({
    success:      true,
    message:      'Order accepted. Invoice and notifications sent.',
    order_number: orderNumber,
    invoice_url:  invoiceUrl || null,
  })
}