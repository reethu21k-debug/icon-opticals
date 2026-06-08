// // app/api/generate-invoice/route.ts
// //
// // Generates a PDF invoice for a given order, uploads it to Cloudinary, stores
// // the URL in the database, and triggers order-confirmation email + WhatsApp.
// //
// // ─── RUNTIME ─────────────────────────────────────────────────────────────────
// // Must be 'nodejs'. pdfkit and the Cloudinary SDK both use Node.js-only APIs
// // (Buffer, fs, crypto). The Edge runtime does not provide these.
// //
// // ─── FLOW ─────────────────────────────────────────────────────────────────────
// //  POST /api/generate-invoice
// //    ├─ Auth check (ADMIN_API_SECRET bearer token)
// //    ├─ Rate-limit check
// //    ├─ Fetch order + items from Supabase
// //    ├─ If invoice_url already exists AND force !== true → return early
// //    ├─ Fetch customer profile (name, phone, whatsapp_opt_in) + auth user (email)
// //    │   NOTE: also accepts `phone` from the request body (passed by place-order)
// //    │   to avoid a race condition where the profile update hasn't committed yet.
// //    ├─ generatePDFBuffer()  → Buffer (pdfkit)
// //    ├─ uploadInvoicePDF()   → { url, public_id } (Cloudinary raw upload)
// //    ├─ Update orders row: invoice_url, invoice_cloudinary_id, status='confirmed'
// //    ├─ Fire-and-forget (with retry): send order-confirmation email
// //    └─ Fire-and-forget (with retry): send WhatsApp invoice
// //
// // ─── WHATSAPP BUTTON URL NOTE ─────────────────────────────────────────────────
// // The Meta template URL button has a STATIC base URL set in Business Manager,
// // e.g.  https://your-production-domain.com/api/view-invoice?url=
// // The API sends only the DYNAMIC SUFFIX (the encoded Cloudinary URL).
// // Full button URL = base + suffix = correct proxy URL.
// //
// // We pass `encodedUrl` (just the encoded Cloudinary URL) as the suffix.
// // Passing `invoiceViewUrl` (full proxy URL) would produce a double-proxied URL.

// export const runtime = 'nodejs'

// import { NextRequest, NextResponse } from 'next/server'
// import { createAdminClient } from '@/lib/supabase'
// import { buildInvoiceHTML, generatePDFBuffer } from '@/lib/invoice'
// import type { InvoiceOrder } from '@/lib/invoice'
// import { uploadInvoicePDF } from '@/lib/cloudinary'
// import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

// // ── Retry helper ──────────────────────────────────────────────────────────────
// // Retries on network errors and HTTP 5xx / 429. Does NOT retry on 4xx.
// async function fetchWithRetry(
//   fn: () => Promise<Response>,
//   maxAttempts = 3,
//   baseDelayMs = 500,
// ): Promise<Response> {
//   let lastError: unknown
//   for (let attempt = 1; attempt <= maxAttempts; attempt++) {
//     try {
//       const res = await fn()
//       if (res.status >= 400 && res.status < 500) return res // permanent — stop
//       if (res.ok) return res
//       lastError = new Error(`HTTP ${res.status}`)
//     } catch (err) {
//       lastError = err
//     }
//     if (attempt < maxAttempts) {
//       await new Promise(resolve => setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)))
//     }
//   }
//   throw lastError
// }

// export async function POST(request: NextRequest) {
//   // ── Rate limit ──────────────────────────────────────────────────────────
//   const { allowed, resetIn } = rateLimit(request, 'generate-invoice')
//   if (!allowed) return rateLimitResponse(resetIn)

//   // ── Auth ────────────────────────────────────────────────────────────────
//   const authHeader = request.headers.get('authorization')
//   if (authHeader !== `Bearer ${process.env.ADMIN_API_SECRET}`) {
//     console.warn('[generate-invoice] Unauthorized — bad or missing ADMIN_API_SECRET header')
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//   }

//   // ── Parse body ──────────────────────────────────────────────────────────
//   let body: {
//     order_id?: string
//     order_number?: string
//     user_id?: string
//     force?: boolean
//     phone?: string   // passed directly from place-order to avoid profile race-condition
//   }
//   try {
//     body = await request.json()
//   } catch {
//     return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
//   }

//   const { order_id, order_number, user_id, force = false, phone: payloadPhone } = body

//   if (!order_id || !order_number) {
//     return NextResponse.json({ error: 'order_id and order_number are required' }, { status: 400 })
//   }

//   // ── Ensure NEXT_PUBLIC_APP_URL is set ───────────────────────────────────
//   const baseUrl = process.env.NEXT_PUBLIC_APP_URL
//   if (!baseUrl) {
//     console.error('[generate-invoice] NEXT_PUBLIC_APP_URL is not set')
//     return NextResponse.json({ error: 'Server misconfiguration: NEXT_PUBLIC_APP_URL is not set' }, { status: 500 })
//   }

//   const db = createAdminClient()

//   try {
//     // ── Fetch order ───────────────────────────────────────────────────────
//     const { data: orderData, error: orderError } = await db
//       .from('orders')
//       .select(`*, order_items(*)`)
//       .eq('id', order_id)
//       .single()

//     if (orderError || !orderData) {
//       console.error('[generate-invoice] Order not found:', order_id, orderError?.message)
//       return NextResponse.json({ error: 'Order not found' }, { status: 404 })
//     }

//     const order = orderData as Record<string, unknown>

//     if (order.invoice_url && !force) {
//       console.log('[generate-invoice] Invoice already exists, returning cached URL')
//       return NextResponse.json({ success: true, invoice_url: order.invoice_url })
//     }

//     // ── Fetch customer details ────────────────────────────────────────────
//     const targetUserId = (user_id || order.user_id) as string

//     const { data: profileData } = await db
//       .from('profiles')
//       .select('full_name, phone, whatsapp_opt_in')
//       .eq('id', targetUserId)
//       .single()

//     const profile = profileData as {
//       full_name?: string
//       phone?: string
//       whatsapp_opt_in?: boolean
//     } | null

//     let customerEmail = ''
//     try {
//       const { data: authUser } = await db.auth.admin.getUserById(targetUserId)
//       customerEmail = authUser?.user?.email ?? ''
//     } catch (err) {
//       console.warn('[generate-invoice] Could not fetch auth user email:', err)
//     }

//     const customerName = profile?.full_name ?? 'Customer'

//     // Resolve phone: payload (race-condition-safe) → profile row → give up
//     const effectivePhone: string | null =
//       (payloadPhone?.trim())   ||
//       (profile?.phone?.trim()) ||
//       null

//     // whatsapp_opt_in: treat null/undefined as true (DB default is true)
//     const whatsappOptIn = profile?.whatsapp_opt_in !== false

//     console.log(
//       `[generate-invoice] Order ${order_number}`,
//       `\n  customer:        "${customerName}" <${customerEmail || 'no email'}>`,
//       `\n  phone:           ${effectivePhone ?? 'MISSING — WhatsApp skipped'}`,
//       `\n  whatsapp_opt_in: ${whatsappOptIn}`,
//     )

//     // ── Generate PDF ──────────────────────────────────────────────────────
//     let pdfBuffer: Buffer
//     try {
//       pdfBuffer = await generatePDFBuffer(order as unknown as InvoiceOrder, customerName, customerEmail)
//       console.log(`[generate-invoice] PDF generated: ${pdfBuffer.length} bytes`)
//     } catch (err) {
//       console.error('[generate-invoice] PDF generation failed:', err)
//       return NextResponse.json({ error: 'PDF generation failed. Check server logs.' }, { status: 500 })
//     }

//     // ── Upload to Cloudinary ──────────────────────────────────────────────
//     let invoiceUrl: string
//     let cloudinaryId: string
//     try {
//       const uploadResult = await uploadInvoicePDF(pdfBuffer, order_number)
//       invoiceUrl   = uploadResult.url
//       cloudinaryId = uploadResult.public_id
//     } catch (err) {
//       console.error('[generate-invoice] Cloudinary upload failed:', err)
//       return NextResponse.json({ error: 'Invoice upload failed. Check server logs.' }, { status: 500 })
//     }

//     // ── Persist to database ───────────────────────────────────────────────
//     const { error: updateError } = await db
//       .from('orders')
//       .update({ invoice_url: invoiceUrl, invoice_cloudinary_id: cloudinaryId, status: 'confirmed' })
//       .eq('id', order_id)

//     if (updateError) {
//       console.error('[generate-invoice] DB update failed (invoice WAS uploaded):', updateError.message)
//     }

//     console.log(`[generate-invoice] Invoice stored: ${invoiceUrl}`)

//     // ── Build proxy URLs ──────────────────────────────────────────────────
//     //
//     // encodedUrl         → the raw Cloudinary URL, percent-encoded
//     // invoiceViewUrl     → full proxy URL for email/download links in the app
//     // invoiceDownloadUrl → same but forces browser download
//     //
//     // For the WhatsApp button: the Meta template base URL in Business Manager
//     // must end with:  /api/view-invoice?url=
//     // The dynamic suffix ({{1}}) we send must be encodedUrl ONLY.
//     // Sending invoiceViewUrl as the suffix would double-proxy the link.
//     const encodedUrl         = encodeURIComponent(invoiceUrl)
//     const invoiceViewUrl     = `${baseUrl}/api/view-invoice?url=${encodedUrl}`
//     const invoiceDownloadUrl = `${baseUrl}/api/view-invoice?url=${encodedUrl}&dl=1`

//     // ── Fire-and-forget: email (with retry) ───────────────────────────────
//     if (customerEmail) {
//       const emailHtml = buildInvoiceHTML(order as never, customerName, customerEmail)
//       fetchWithRetry(
//         () => fetch(`${baseUrl}/api/send-email`, {
//           method:  'POST',
//           headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ADMIN_API_SECRET}` },
//           body: JSON.stringify({
//             to:   customerEmail,
//             type: 'order_confirmation',
//             data: {
//               order: { ...order, invoice_url: invoiceUrl, invoice_view_url: invoiceViewUrl, invoice_download_url: invoiceDownloadUrl },
//               user_name: customerName,
//               html:      emailHtml,
//             },
//           }),
//         }),
//         3, 500,
//       ).catch(err => console.error('[generate-invoice] Email failed after retries:', err))
//     } else {
//       console.warn('[generate-invoice] No email address — skipping email notification.')
//     }

//     // ── Fire-and-forget: WhatsApp (with retry) ────────────────────────────
//     if (!effectivePhone) {
//       console.error(
//         `[generate-invoice] ❌ WhatsApp SKIPPED for order ${order_number}: no phone number. ` +
//         'Ensure checkout sends phone in place-order payload and profile was updated.',
//       )
//     } else if (!whatsappOptIn) {
//       console.log(`[generate-invoice] WhatsApp skipped for order ${order_number}: customer opted out.`)
//     } else {
//       fetchWithRetry(
//         () => fetch(`${baseUrl}/api/send-whatsapp`, {
//           method:  'POST',
//           headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ADMIN_API_SECRET}` },
//           body: JSON.stringify({
//             phone:    effectivePhone,
//             type:     'order_confirmed',
//             order_id,
//             data: {
//               customer_name:   customerName,
//               order_number,
//               // Pass encodedUrl (just the encoded Cloudinary URL) as the
//               // dynamic suffix for the Meta template button.
//               // Full button URL = Meta base URL + encodedUrl = correct proxy link.
//               invoice_url:     encodedUrl,
//               invoice_number:  order_number,
//               total_amount:    (order.total_amount as number) ?? 0,
//               store_id:        order.store_id,
//             },
//           }),
//         }),
//         3, 500,
//       ).catch(err =>
//         console.error(`[generate-invoice] ❌ WhatsApp failed after retries for ${order_number}:`, err),
//       )

//       console.log(`[generate-invoice] ✅ WhatsApp invoice triggered → ${effectivePhone}`)
//     }

//     return NextResponse.json({ success: true, invoice_url: invoiceUrl, order_number })

//   } catch (error) {
//     console.error('[generate-invoice] Unhandled error:', error)
//     return NextResponse.json({ error: 'Invoice generation failed — see server logs' }, { status: 500 })
//   }
// }
// app/api/generate-invoice/route.ts
//
// Generates a PDF invoice for a given order, uploads it to Cloudinary, stores
// the URL in the database, and triggers order-confirmation email + WhatsApp.
//
// ─── RUNTIME ─────────────────────────────────────────────────────────────────
// Must be 'nodejs'. pdfkit and the Cloudinary SDK both use Node.js-only APIs
// (Buffer, fs, crypto). The Edge runtime does not provide these.
//
// ─── FLOW ─────────────────────────────────────────────────────────────────────
//  POST /api/generate-invoice
//    ├─ Auth check (ADMIN_API_SECRET bearer token)
//    ├─ Rate-limit check
//    ├─ Fetch order + items from Supabase
//    ├─ If invoice_url already exists AND force !== true → return early
//    ├─ Fetch customer profile (name, phone, whatsapp_opt_in) + auth user (email)
//    │   NOTE: also accepts `phone` from the request body (passed by place-order)
//    │   to avoid a race condition where the profile update hasn't committed yet.
//    ├─ generatePDFBuffer()  → Buffer (pdfkit)
//    ├─ uploadInvoicePDF()   → { url, public_id } (Cloudinary raw upload)
//    ├─ Update orders row: invoice_url, invoice_cloudinary_id, status='confirmed'
//    ├─ Fire-and-forget (with retry): send order-confirmation email
//    └─ Fire-and-forget (with retry): send WhatsApp invoice
//
// ─── WHATSAPP BUTTON URL NOTE ─────────────────────────────────────────────────
// The Meta template URL button has a STATIC base URL set in Business Manager,
// e.g.  https://your-production-domain.com/api/view-invoice?url=
// The API sends only the DYNAMIC SUFFIX (the encoded Cloudinary URL).
// Full button URL = base + suffix = correct proxy URL.
//
// We pass `encodedUrl` (just the encoded Cloudinary URL) as the suffix.
// Passing `invoiceViewUrl` (full proxy URL) would produce a double-proxied URL.

export const runtime = 'nodejs'
export const maxDuration = 60 // prevent Vercel's default 10s cutoff killing the function mid-upload

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { buildInvoiceHTML, generatePDFBuffer } from '@/lib/invoice'
import type { InvoiceOrder } from '@/lib/invoice'
import { uploadInvoicePDF } from '@/lib/cloudinary'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

// ── Retry helper ──────────────────────────────────────────────────────────────
// Retries on network errors and HTTP 5xx / 429. Does NOT retry on 4xx.
async function fetchWithRetry(
  fn: () => Promise<Response>,
  maxAttempts = 3,
  baseDelayMs = 500,
): Promise<Response> {
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fn()
      if (res.status >= 400 && res.status < 500) return res // permanent — stop
      if (res.ok) return res
      lastError = new Error(`HTTP ${res.status}`)
    } catch (err) {
      lastError = err
    }
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)))
    }
  }
  throw lastError
}

export async function POST(request: NextRequest) {
  // ── Rate limit ──────────────────────────────────────────────────────────
  const { allowed, resetIn } = rateLimit(request, 'generate-invoice')
  if (!allowed) return rateLimitResponse(resetIn)

  // ── Auth ────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.ADMIN_API_SECRET}`) {
    console.warn('[generate-invoice] Unauthorized — bad or missing ADMIN_API_SECRET header')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse body ──────────────────────────────────────────────────────────
  let body: {
    order_id?: string
    order_number?: string
    user_id?: string
    force?: boolean
    phone?: string   // passed directly from place-order to avoid profile race-condition
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { order_id, order_number, user_id, force = false, phone: payloadPhone } = body

  if (!order_id || !order_number) {
    return NextResponse.json({ error: 'order_id and order_number are required' }, { status: 400 })
  }

  // ── Ensure NEXT_PUBLIC_APP_URL is set ───────────────────────────────────
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) {
    console.error('[generate-invoice] NEXT_PUBLIC_APP_URL is not set')
    return NextResponse.json({ error: 'Server misconfiguration: NEXT_PUBLIC_APP_URL is not set' }, { status: 500 })
  }

  const db = createAdminClient()

  try {
    // ── Fetch order ───────────────────────────────────────────────────────
    const { data: orderData, error: orderError } = await db
      .from('orders')
      .select(`*, order_items(*)`)
      .eq('id', order_id)
      .single()

    if (orderError || !orderData) {
      console.error('[generate-invoice] Order not found:', order_id, orderError?.message)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const order = orderData as Record<string, unknown>

    if (order.invoice_url && !force) {
      console.log('[generate-invoice] Invoice already exists, returning cached URL')
      return NextResponse.json({ success: true, invoice_url: order.invoice_url })
    }

    // ── Fetch customer details (parallel — saves ~400ms vs sequential) ────
    const targetUserId = (user_id || order.user_id) as string

    const [{ data: profileData }, authUserResult] = await Promise.all([
      db.from('profiles')
        .select('full_name, phone, whatsapp_opt_in')
        .eq('id', targetUserId)
        .single(),
      db.auth.admin.getUserById(targetUserId).catch((err: unknown) => {
        console.warn('[generate-invoice] Could not fetch auth user email:', err)
        return { data: null }
      }),
    ])

    const profile = profileData as {
      full_name?: string
      phone?: string
      whatsapp_opt_in?: boolean
    } | null

    const customerEmail = (authUserResult?.data as { user?: { email?: string } } | null)?.user?.email ?? ''

    const customerName = profile?.full_name ?? 'Customer'

    // Resolve phone: payload (race-condition-safe) → profile row → give up
    const effectivePhone: string | null =
      (payloadPhone?.trim())   ||
      (profile?.phone?.trim()) ||
      null

    // whatsapp_opt_in: treat null/undefined as true (DB default is true)
    const whatsappOptIn = profile?.whatsapp_opt_in !== false

    console.log(
      `[generate-invoice] Order ${order_number}`,
      `\n  customer:        "${customerName}" <${customerEmail || 'no email'}>`,
      `\n  phone:           ${effectivePhone ?? 'MISSING — WhatsApp skipped'}`,
      `\n  whatsapp_opt_in: ${whatsappOptIn}`,
    )

    // ── Generate PDF ──────────────────────────────────────────────────────
    let pdfBuffer: Buffer
    try {
      pdfBuffer = await generatePDFBuffer(order as unknown as InvoiceOrder, customerName, customerEmail)
      console.log(`[generate-invoice] PDF generated: ${pdfBuffer.length} bytes`)
    } catch (err) {
      console.error('[generate-invoice] PDF generation failed:', err)
      return NextResponse.json({ error: 'PDF generation failed. Check server logs.' }, { status: 500 })
    }

    // ── Upload to Cloudinary ──────────────────────────────────────────────
    let invoiceUrl: string
    let cloudinaryId: string
    try {
      const uploadResult = await uploadInvoicePDF(pdfBuffer, order_number)
      invoiceUrl   = uploadResult.url
      cloudinaryId = uploadResult.public_id
    } catch (err) {
      console.error('[generate-invoice] Cloudinary upload failed:', err)
      return NextResponse.json({ error: 'Invoice upload failed. Check server logs.' }, { status: 500 })
    }

    // ── Persist to database ───────────────────────────────────────────────
    const { error: updateError } = await db
      .from('orders')
      .update({ invoice_url: invoiceUrl, invoice_cloudinary_id: cloudinaryId, status: 'confirmed' })
      .eq('id', order_id)

    if (updateError) {
      console.error('[generate-invoice] DB update failed (invoice WAS uploaded):', updateError.message)
    }

    console.log(`[generate-invoice] Invoice stored: ${invoiceUrl}`)

    // ── Build proxy URLs ──────────────────────────────────────────────────
    //
    // encodedUrl         → the raw Cloudinary URL, percent-encoded
    // invoiceViewUrl     → full proxy URL for email/download links in the app
    // invoiceDownloadUrl → same but forces browser download
    //
    // For the WhatsApp button: the Meta template base URL in Business Manager
    // must end with:  /api/view-invoice?url=
    // The dynamic suffix ({{1}}) we send must be encodedUrl ONLY.
    // Sending invoiceViewUrl as the suffix would double-proxy the link.
    const encodedUrl         = encodeURIComponent(invoiceUrl)
    const invoiceViewUrl     = `${baseUrl}/api/view-invoice?url=${encodedUrl}`
    const invoiceDownloadUrl = `${baseUrl}/api/view-invoice?url=${encodedUrl}&dl=1`

    // ── Fire-and-forget: email (with retry) ───────────────────────────────
    if (customerEmail) {
      const emailHtml = buildInvoiceHTML(order as never, customerName, customerEmail)
      fetchWithRetry(
        () => fetch(`${baseUrl}/api/send-email`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ADMIN_API_SECRET}` },
          body: JSON.stringify({
            to:   customerEmail,
            type: 'order_confirmation',
            data: {
              order: { ...order, invoice_url: invoiceUrl, invoice_view_url: invoiceViewUrl, invoice_download_url: invoiceDownloadUrl },
              user_name: customerName,
              html:      emailHtml,
            },
          }),
        }),
        3, 500,
      ).catch(err => console.error('[generate-invoice] Email failed after retries:', err))
    } else {
      console.warn('[generate-invoice] No email address — skipping email notification.')
    }

    // ── Fire-and-forget: WhatsApp (with retry) ────────────────────────────
    if (!effectivePhone) {
      console.error(
        `[generate-invoice] ❌ WhatsApp SKIPPED for order ${order_number}: no phone number. ` +
        'Ensure checkout sends phone in place-order payload and profile was updated.',
      )
    } else if (!whatsappOptIn) {
      console.log(`[generate-invoice] WhatsApp skipped for order ${order_number}: customer opted out.`)
    } else {
      fetchWithRetry(
        () => fetch(`${baseUrl}/api/send-whatsapp`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ADMIN_API_SECRET}` },
          body: JSON.stringify({
            phone:    effectivePhone,
            type:     'order_confirmed',
            order_id,
            data: {
              customer_name:   customerName,
              order_number,
              // Pass encodedUrl (just the encoded Cloudinary URL) as the
              // dynamic suffix for the Meta template button.
              // Full button URL = Meta base URL + encodedUrl = correct proxy link.
              invoice_url:     encodedUrl,
              invoice_number:  order_number,
              total_amount:    (order.total_amount as number) ?? 0,
              store_id:        order.store_id,
            },
          }),
        }),
        3, 500,
      ).catch(err =>
        console.error(`[generate-invoice] ❌ WhatsApp failed after retries for ${order_number}:`, err),
      )

      console.log(`[generate-invoice] ✅ WhatsApp invoice triggered → ${effectivePhone}`)
    }

    return NextResponse.json({ success: true, invoice_url: invoiceUrl, order_number })

  } catch (error) {
    console.error('[generate-invoice] Unhandled error:', error)
    return NextResponse.json({ error: 'Invoice generation failed — see server logs' }, { status: 500 })
  }
}