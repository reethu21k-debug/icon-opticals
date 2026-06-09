// lib/whatsapp.ts
//
// WhatsApp Cloud API (Meta) — order-confirmation flow.
//
// ── TEMPLATE SETUP IN META BUSINESS MANAGER ─────────────────────────────────
// Template name:  order_confirmed_v2
//
// Template body ({{1}} = customerName, {{2}} = invoiceNumber, {{3}} = amountPaid):
//   Hello {{1}} 👓
//   Thank you for choosing our store. Your purchase has been successfully completed.
//   Invoice No: {{2}}  Amount Paid: ₹{{3}}
//   ...
//
// Button (type = URL, dynamic suffix):
//   Button text: View Invoice
//   Base URL in Meta template: https://[your-production-domain]/api/view-invoice?url=
//   Dynamic variable: {{1}} ← receives the encoded Cloudinary URL
//
// ── CREDENTIALS ─────────────────────────────────────────────────────────────
// Set in .env.local:
//   WHATSAPP_PHONE_NUMBER_ID=...
//   WHATSAPP_ACCESS_TOKEN=...
//
// ── TEMPLATE HEALTH ─────────────────────────────────────────────────────────
// If Meta pauses or rejects a template (error 132001), this module
// automatically falls back to a plain-text message — so the customer
// always receives their order confirmation even if the template is broken.

const WA_API_URL = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
const WA_TOKEN   = process.env.WHATSAPP_ACCESS_TOKEN!

const TEMPLATES = {
  order_confirmed: 'order_confirmed_v2',
} as const

// ── Retry helper ──────────────────────────────────────────────────────────────
async function fetchWithRetry(
  fn: () => Promise<Response>,
  maxAttempts = 3,
  baseDelayMs = 500,
): Promise<Response> {
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fn()
      if (res.status >= 400 && res.status < 500) return res
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

// ── Format phone number to E.164 ─────────────────────────────────────────────
// Normalises Indian numbers to the 12-digit form 91XXXXXXXXXX.
//
// The DB can end up with repeated "91" prefixes when the country code is
// applied more than once (e.g. 9191XXXXXXXXXX or 919191XXXXXXXXXX).  A
// single slice(2) only handles one level of duplication; any deeper nesting
// falls through to the bare `return digits` path and is sent as-is to Meta,
// which rejects non-E.164 numbers.  The while-loop below strips every extra
// prefix in one pass, so the fix works for double, triple, or any depth.
export function formatPhone(phone: string): string | null {
  let digits = phone.replace(/\D/g, '')

  // Strip repeated leading '91' country-code prefixes until the number is
  // no longer over-encoded (i.e. already canonical 12-digit or bare 10-digit).
  while (digits.length > 12 && digits.startsWith('91')) {
    digits = digits.slice(2)
  }

  if (digits.length === 10) return `91${digits}`                           // bare 10-digit → prepend country code
  if (digits.startsWith('91') && digits.length === 12) return digits       // already E.164
  return null                                                               // reject anything that didn't normalise
}

// ── Send plain-text fallback message ─────────────────────────────────────────
// Used when the template is paused/unavailable. Works within 24-hour window.
async function sendTextFallback(
  formattedPhone: string,
  text: string,
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  try {
    const res = await fetchWithRetry(
      () => fetch(WA_API_URL, {
        method:  'POST',
        headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type:    'individual',
          to:                formattedPhone,
          type:              'text',
          text:              { body: text },
        }),
      }),
      3, 500,
    )

    const data = await res.json() as {
      messages?: Array<{ id: string }>
      error?: { message: string; code: number }
    }

    if (!res.ok || data.error) {
      console.error('[WhatsApp] Plain-text fallback also failed:', JSON.stringify(data.error))
      return { success: false, error: data.error?.message ?? 'Text message failed' }
    }

    console.log('[WhatsApp] ✅ Plain-text fallback sent successfully')
    return { success: true, message_id: data.messages?.[0]?.id }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ── Send WhatsApp Template Message ───────────────────────────────────────────
async function sendTemplateMessage(
  phone: string,
  templateName: string,
  components: WhatsAppComponent[],
  fallbackText?: string,
): Promise<{ success: boolean; message_id?: string; error?: string; usedFallback?: boolean }> {
  const formattedPhone = formatPhone(phone)

  if (!formattedPhone) {
    const msg = `Invalid phone "${phone}" — could not normalise to E.164 (expected bare 10-digit or 91-prefixed 12-digit Indian number)`
    console.error('[WhatsApp]', msg)
    return { success: false, error: msg }
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to:                formattedPhone,
    type:              'template',
    template: {
      name:       templateName,
      language:   { code: 'en' },
      components,
    },
  }

  try {
    const response = await fetchWithRetry(
      () => fetch(WA_API_URL, {
        method:  'POST',
        headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      }),
      3, 500,
    )

    const data = await response.json() as {
      messages?: Array<{ id: string }>
      error?: { message: string; code: number; error_data?: { details: string } }
    }

    // ── Template failed — try plain-text fallback ──────────────────────────
    if (!response.ok || data.error) {
      const errCode = data.error?.code
      const errMsg  = data.error?.message ?? 'Unknown error'
      const errDetail = data.error?.error_data?.details ?? ''

      console.error(
        `[WhatsApp] Template "${templateName}" failed (code ${errCode}): ${errMsg}`,
        errDetail ? `— ${errDetail}` : '',
      )

      // Error 132001 = template paused/not found. 131047 = not in 24h window.
      // For both, attempt plain-text if a fallback is provided.
      if (fallbackText) {
        console.warn(`[WhatsApp] Attempting plain-text fallback for ${formattedPhone}`)
        const fallback = await sendTextFallback(formattedPhone, fallbackText)
        return { ...fallback, usedFallback: true }
      }

      return { success: false, error: errMsg }
    }

    return { success: true, message_id: data.messages?.[0]?.id }

  } catch (error) {
    console.error('[WhatsApp] Send failed after retries:', error)
    return { success: false, error: String(error) }
  }
}

// ── Order Confirmed Message ───────────────────────────────────────────────────
export async function sendOrderConfirmedWhatsApp({
  phone,
  customerName,
  orderNumber,
  invoiceUrl,
  storeName,
  invoiceNumber,
  amountPaid,
}: {
  phone:          string
  customerName:   string
  orderNumber:    string
  invoiceUrl:     string
  storeName:      string
  invoiceNumber?: string
  amountPaid?:    number
}): Promise<{ success: boolean; message_id?: string; error?: string; usedFallback?: boolean }> {
  const displayInvoiceNo = invoiceNumber ?? orderNumber
  const displayAmount    = amountPaid != null ? String(amountPaid) : '0'

  const components: WhatsAppComponent[] = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: customerName },
        { type: 'text', text: displayInvoiceNo },
        { type: 'text', text: displayAmount },
      ],
    },
    {
      type:       'button',
      sub_type:   'url',
      index:      0,
      parameters: [{ type: 'text', text: invoiceUrl }],
    },
  ]

  // Plain-text fallback — sent if the template is paused or unavailable
  const fallbackText =
    `Hello ${customerName} 👓\n\n` +
    `Thank you for shopping at ${storeName}! Your order has been confirmed.\n\n` +
    `🧾 Invoice No: ${displayInvoiceNo}\n` +
    `💰 Amount Paid: ₹${displayAmount}\n\n` +
    `We truly appreciate your trust in us. If you need any support, feel free to visit us anytime.\n\n` +
    `✨ Clear vision. Better style. Better confidence.\n\n` +
    `— Icon Opticals`

  return sendTemplateMessage(phone, TEMPLATES.order_confirmed, components, fallbackText)
}

// ── Type Definitions ──────────────────────────────────────────────────────────

interface WhatsAppComponent {
  type:        'header' | 'body' | 'button'
  sub_type?:   'url' | 'quick_reply'
  index?:      number
  parameters:  WhatsAppParameter[]
}

interface WhatsAppParameter {
  type:      'text' | 'image' | 'document'
  text?:     string
  image?:    { link: string }
  document?: { link: string; filename: string }
}