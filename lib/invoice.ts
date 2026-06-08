import PDFDocument from 'pdfkit'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductSnapshot {
  name?: string
  brand?: string
}

interface LensConfig {
  power_type?: string
  package_code?: string
  left_eye?:  { sph?: number; cyl?: number; axis?: number } | null
  right_eye?: { sph?: number; cyl?: number; axis?: number } | null
  pd?: number | null
  upload_later?: boolean
}

interface PriceOverrideAudit {
  original_price:   number
  overridden_price: number
  reason:           string
  admin_user_id?:   string
  modified_at?:     string
}

interface OrderItem {
  product_snapshot?:   ProductSnapshot
  lens_config?:        LensConfig | null
  price_override_audit?: PriceOverrideAudit | null
  quantity:            number
  frame_price?:        number
  lens_price?:         number
  total_price?:        number
}

export interface InvoiceOrder {
  order_number:    string
  created_at:      string
  order_items?:    OrderItem[]
  subtotal?:       number
  discount_amount?: number
  total_amount?:   number
  coupon_code?:    string
  created_by_admin?: boolean
  sales_channel?:  string
}

// ---------------------------------------------------------------------------
// Currency helpers
// ---------------------------------------------------------------------------
const INR_SYMBOL = 'Rs.'

function formatINR(amount: number): string {
  return `${INR_SYMBOL}${amount.toLocaleString('en-IN')}`
}

// Friendly label for power_type
const POWER_LABEL: Record<string, string> = {
  with_power:  'With Power',
  zero_power:  'Zero Power',
  progressive: 'Progressive',
  frame_only:  'Frame Only',
}

function lensLabel(cfg: LensConfig): string {
  return POWER_LABEL[cfg.power_type ?? ''] ?? (cfg.power_type ?? '').replace(/_/g, ' ')
}

// Format a signed diopter value like +1.25 / -0.50
function fmtDiopter(v: number | undefined | null): string {
  if (v == null) return '—'
  return (v >= 0 ? '+' : '') + v.toFixed(2)
}

// ---------------------------------------------------------------------------
// buildInvoiceHTML — Email Template (Receipt Optimized)
// ---------------------------------------------------------------------------
export function buildInvoiceHTML(
  order: any,
  customerName: string,
  customerEmail: string,
  customerPhone: string = '',
  customerAddress: string = '',
): string {
  const items = (order.order_items || []) as any[]
  const isAdminBilled = order.created_by_admin || order.sales_channel === 'store_billing'

  const itemsHtml = items.map((item: any, i: number) => {
    const hasLens     = Boolean(item.lens_config)
    const hasOverride = Boolean(item.price_override_audit)
    const cfg         = item.lens_config as LensConfig | null | undefined
    const ov          = item.price_override_audit as PriceOverrideAudit | null | undefined

    // ── Lens detail row ───────────────────────────────────────────────────
    let lensHtml = ''
    if (hasLens && cfg && cfg.power_type !== 'frame_only') {
      const parts = [
        `<strong>${lensLabel(cfg)}</strong>`,
        cfg.package_code ? `Pkg: ${cfg.package_code}` : null,
      ].filter(Boolean).join(' &nbsp;|&nbsp; ')

      // Prescription eye values
      let rxHtml = ''
      if (cfg.left_eye || cfg.right_eye) {
        const eyeRow = (label: string, eye: typeof cfg.left_eye) => eye ? `
          <tr>
            <td style="font-size:10px;color:#6b7280;padding:1px 6px;">${label}</td>
            <td style="font-size:10px;color:#374151;padding:1px 6px;">Sph: ${fmtDiopter(eye.sph)}</td>
            <td style="font-size:10px;color:#374151;padding:1px 6px;">Cyl: ${fmtDiopter(eye.cyl)}</td>
            <td style="font-size:10px;color:#374151;padding:1px 6px;">Axis: ${eye.axis ?? '—'}°</td>
          </tr>` : ''

        rxHtml = `
          <table style="margin-top:4px;border-collapse:collapse;">
            ${eyeRow('OD (R)', cfg.right_eye)}
            ${eyeRow('OS (L)', cfg.left_eye)}
            ${cfg.pd ? `<tr><td style="font-size:10px;color:#6b7280;padding:1px 6px;">PD</td><td colspan="3" style="font-size:10px;color:#374151;padding:1px 6px;">${cfg.pd} mm</td></tr>` : ''}
          </table>`
      } else if (cfg.upload_later) {
        rxHtml = `<div style="font-size:10px;color:#f59e0b;margin-top:3px;">⚠ Prescription to be provided</div>`
      }

      lensHtml = `
        <div style="margin-top:6px;padding:6px 8px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:4px;display:inline-block;max-width:100%;">
          <span style="font-size:11px;color:#0369a1;">${parts}</span>
          ${rxHtml}
        </div>`
    }

    // ── Price override row ────────────────────────────────────────────────
    let overrideHtml = ''
    if (hasOverride && ov && isAdminBilled) {
      overrideHtml = `
        <div style="margin-top:5px;padding:4px 8px;background:#fffbeb;border:1px solid #fde68a;border-radius:4px;display:inline-block;">
          <span style="font-size:10px;color:#92400e;">
            ✏ Price adjusted from ₹${ov.original_price.toLocaleString('en-IN')} → ₹${ov.overridden_price.toLocaleString('en-IN')}
            ${ov.reason ? `&nbsp;&middot;&nbsp;${ov.reason}` : ''}
          </span>
        </div>`
    }

    return `
      <tr>
        <td style="padding:16px 8px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;vertical-align:top;">${i + 1}</td>
        <td style="padding:16px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
          <strong style="font-size:14px;color:#111827;display:block;margin-bottom:2px;">${item.product_snapshot?.name || ''}</strong>
          <span style="font-size:12px;color:#4b5563;">${item.product_snapshot?.brand || ''}</span>
          ${lensHtml}
          ${overrideHtml}
        </td>
        <td style="padding:16px 8px;text-align:center;color:#374151;border-bottom:1px solid #e5e7eb;vertical-align:top;">${item.quantity}</td>
        <td style="padding:16px 8px;text-align:right;border-bottom:1px solid #e5e7eb;vertical-align:top;">
          ${hasOverride && ov
            ? `<span style="font-size:12px;color:#9ca3af;text-decoration:line-through;display:block;">₹${ov.original_price.toLocaleString('en-IN')}</span>
               <span style="font-size:13px;font-weight:600;color:#111827;">₹${(item.frame_price || 0).toLocaleString('en-IN')}</span>`
            : `<span style="font-size:13px;color:#4b5563;">₹${(item.frame_price || 0).toLocaleString('en-IN')}</span>`
          }
        </td>
        <td style="padding:16px 8px;text-align:right;color:#4b5563;border-bottom:1px solid #e5e7eb;vertical-align:top;">₹${(item.lens_price || 0).toLocaleString('en-IN')}</td>
        <td style="padding:16px 8px;text-align:right;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;vertical-align:top;">₹${(item.total_price || 0).toLocaleString('en-IN')}</td>
      </tr>`
  }).join('')

  const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const subtotal  = order.subtotal || 0
  const discount  = order.discount_amount || 0
  const total     = order.total_amount || 0

  // Check if any item has a price override
  const hasAnyOverride = items.some((i: any) => i.price_override_audit)

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; margin: 0; padding: 0; background-color: #f4f4f5; }
      table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    </style>
  </head>
  <body style="background-color:#f4f4f5; padding: 40px 20px;">
    <table width="100%" align="center" style="max-width: 750px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
      <tr>
        <td style="padding: 48px;">
          
          <!-- Header section -->
          <table width="100%">
            <tr>
              <td valign="top">
                <div style="font-size:26px;font-weight:800;color:#2563eb;letter-spacing:-0.5px;">Icon Opticals - ATP</div>
                <div style="font-size:13px;color:#6b7280;margin-top:4px;font-weight:500;">Precision Vision Care</div>
                <div style="font-size:12px;color:#6b7280;margin-top:12px;line-height:1.5;">
                  Raju Road, Vaibhav Jewellers Opposite Road,<br/>
                  Near Punjab National Bank, Kamala Nagar,<br/>
                  Ananthapuram - 515001<br/>
                  Phone: +91 96762 27094 / +91 91546 93939<br/>
                  Email: support@iconopticals-atp.com
                </div>
              </td>
              <td valign="top" align="right">
                <div style="font-size:28px;font-weight:800;letter-spacing:1px;color:#111827;">INVOICE</div>
                <div style="margin-top:8px;margin-bottom:16px;">
                  <span style="display:inline-block;padding:6px 16px;border-radius:999px;font-size:12px;font-weight:800;color:#059669;background-color:#d1fae5;letter-spacing:1px;">
                    PAID
                  </span>
                </div>
                <table width="100%" align="right" style="width:200px;text-align:right;">
                  <tr><td style="font-size:12px;color:#6b7280;padding:2px 0;">Invoice #:</td><td style="font-size:13px;color:#111827;font-weight:600;padding:2px 0;">${order.order_number}</td></tr>
                  <tr><td style="font-size:12px;color:#6b7280;padding:2px 0;">Date:</td><td style="font-size:13px;color:#111827;font-weight:600;padding:2px 0;">${invoiceDate}</td></tr>
                </table>
              </td>
            </tr>
          </table>

          <div style="height:2px;background-color:#2563eb;margin:32px 0;"></div>

          <!-- Billing Info -->
          <table width="100%" style="background-color:#f8fafc; border-radius:8px; border: 1px solid #e2e8f0;">
            <tr>
              <td width="50%" valign="top" style="padding: 24px;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#2563eb;margin-bottom:8px;">Billed To</div>
                <div style="font-size:15px;color:#111827;font-weight:600;margin-bottom:4px;">${customerName}</div>
                ${customerAddress ? `<div style="font-size:13px;color:#4b5563;margin-bottom:4px;line-height:1.4;">${customerAddress}</div>` : ''}
                ${customerPhone ? `<div style="font-size:13px;color:#4b5563;margin-bottom:4px;">Phone: ${customerPhone}</div>` : ''}
                <div style="font-size:13px;color:#4b5563;">${customerEmail}</div>
              </td>
              <td width="50%" valign="top" style="padding: 24px; border-left: 1px solid #e2e8f0;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#2563eb;margin-bottom:8px;">Company Details</div>
                <div style="font-size:14px;color:#111827;font-weight:600;margin-bottom:4px;">Icon Opticals - ATP</div>
                <div style="font-size:13px;color:#4b5563;line-height:1.6;">
                  GSTIN: 37BOFPM8364B1ZU<br/>
                  State Code: 37 (Andhra Pradesh)
                </div>
              </td>
            </tr>
          </table>

          <!-- Items Table -->
          <table width="100%" style="margin-top: 32px;">
            <thead>
              <tr>
                <th style="padding:12px 8px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;width:40px;">#</th>
                <th style="padding:12px 8px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Product</th>
                <th style="padding:12px 8px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Qty</th>
                <th style="padding:12px 8px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Frame</th>
                <th style="padding:12px 8px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Lens</th>
                <th style="padding:12px 8px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Totals & Payment Status Section -->
          <table width="100%" style="margin-top: 24px;">
            <tr>
              <td width="50%" valign="top" style="padding-right: 24px;">
                <div style="background-color:#d1fae5; border: 1px solid #10b981; padding:20px; border-radius:8px; text-align:center; margin-top: 12px;">
                  <div style="font-size:16px;font-weight:800;color:#059669;margin-bottom:6px;">PAID IN FULL</div>
                  <div style="font-size:13px;color:#059669;">Thank you for your business!</div>
                </div>

                ${hasAnyOverride && isAdminBilled ? `
                <div style="margin-top:12px;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
                  <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
                    ✏ Custom Pricing Applied
                  </div>
                  <div style="font-size:11px;color:#78350f;line-height:1.5;">
                    One or more items were billed at a custom price by store staff.
                    Final amount reflects all adjustments.
                  </div>
                </div>` : ''}
              </td>
              <td width="50%" valign="top">
                <table width="100%">
                  <tr>
                    <td style="padding:8px 0;color:#4b5563;font-size:14px;">Subtotal</td>
                    <td style="padding:8px 0;text-align:right;font-weight:600;color:#111827;font-size:14px;">₹${subtotal.toLocaleString('en-IN')}</td>
                  </tr>
                  ${discount > 0 ? `
                  <tr>
                    <td style="padding:8px 0;color:#059669;font-size:14px;">Discount (${order.coupon_code || ''})</td>
                    <td style="padding:8px 0;text-align:right;font-weight:600;color:#059669;font-size:14px;">−₹${discount.toLocaleString('en-IN')}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding:8px 0;color:#6b7280;font-size:13px;">CGST (9%)</td>
                    <td style="padding:8px 0;text-align:right;color:#6b7280;font-size:13px;">Included</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">SGST (9%)</td>
                    <td style="padding:8px 0;text-align:right;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Included</td>
                  </tr>
                  <tr>
                    <td style="padding:16px 0 8px 0;font-size:18px;font-weight:800;color:#2563eb;">Total</td>
                    <td style="padding:16px 0 8px 0;text-align:right;font-size:18px;font-weight:800;color:#2563eb;">₹${total.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0 0 0;font-size:14px;font-weight:700;color:#059669;">Amount Paid</td>
                    <td style="padding:8px 0 0 0;text-align:right;font-size:14px;font-weight:700;color:#059669;">₹${total.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0 0 0;font-size:14px;font-weight:700;color:#6b7280;">Balance Due</td>
                    <td style="padding:4px 0 0 0;text-align:right;font-size:14px;font-weight:700;color:#6b7280;">₹0</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Footer & Signature -->
          <table width="100%" style="margin-top:48px;padding-top:24px;border-top:1px solid #e5e7eb;">
            <tr>
              <td width="60%" valign="bottom" style="font-size:12px;color:#9ca3af;line-height:1.6;">
                This is a computer generated receipt.<br/>
                Visit us at <a href="https://www.iconopticals-atp.com" style="color:#2563eb;text-decoration:none;">www.iconopticals-atp.com</a>
              </td>
              <td width="40%" align="center" valign="bottom">
                <div style="border-bottom: 1px solid #111827; width: 150px; margin: 0 auto 8px auto; height: 40px;"></div>
                <div style="font-size: 12px; color: #111827; font-weight: 600;">Authorized Signatory</div>
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
  </html>`
}

// ---------------------------------------------------------------------------
// Layout constants (Premium Real-World Theme)
// ---------------------------------------------------------------------------
const PAGE_MARGIN  = 40
const PRIMARY      = '#2563eb'
const DARK         = '#0f172a'
const GRAY         = '#475569'
const LIGHT        = '#94a3b8'
const GREEN        = '#059669'
const AMBER        = '#b45309'
const AMBER_BG     = '#fffbeb'
const BLUE_LIGHT   = '#e0f2fe'
const BLUE_MID     = '#0369a1'
const ROW_BG_ALT   = '#f8fafc'
const HEADER_BG    = '#f1f5f9'
const DIVIDER      = '#e2e8f0'

const COL = {
  num:     28,
  product: 185,
  qty:     42,
  frame:   82,
  lens:    82,
  total:   96,
} as const

type Doc = InstanceType<typeof PDFDocument>

function cell(
  doc: Doc,
  text: string,
  x: number,
  y: number,
  width: number,
  opts: {
    align?: 'left' | 'center' | 'right'
    font?: string
    size?: number
    color?: string
    characterSpacing?: number
  } = {},
): void {
  doc.font(opts.font ?? 'Helvetica').fontSize(opts.size ?? 11).fillColor(opts.color ?? DARK).text(text, x, y, {
    width, align: opts.align ?? 'left', lineBreak: false, characterSpacing: opts.characterSpacing ?? 0,
  })
}

function hRule(doc: Doc, y: number, color: string, lineWidth = 0.75): void {
  const L = PAGE_MARGIN
  const R = doc.page.width - PAGE_MARGIN
  doc.moveTo(L, y).lineTo(R, y).strokeColor(color).lineWidth(lineWidth).stroke()
}

// ---------------------------------------------------------------------------
// Section renderers for PDF
// ---------------------------------------------------------------------------

function drawHeader(doc: Doc, order: InvoiceOrder): void {
  const L = PAGE_MARGIN
  const pageWidth = doc.page.width

  doc.font('Helvetica-Bold').fontSize(24).fillColor(PRIMARY).text('Icon Opticals', L, 42, { lineBreak: false })
  doc.font('Helvetica').fontSize(14).fillColor(DARK).text('- ATP', L + 154, 44, { lineBreak: false })
  doc.font('Helvetica').fontSize(10).fillColor(GRAY).text('Precision Vision Care', L, 68, { lineBreak: false })

  doc.font('Helvetica').fontSize(9).fillColor(LIGHT)
    .text('Raju Road, Vaibhav Jewellers Opp., Near PNB, Kamala Nagar, Ananthapuram - 515001', L, 84, { lineBreak: false })
    .text('Ph: +91 96762 27094  |  +91 91546 93939', L, 96, { lineBreak: false })

  const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const rightW = 200
  const rightX = pageWidth - PAGE_MARGIN - rightW

  doc.font('Helvetica-Bold').fontSize(26).fillColor(DARK)
    .text('INVOICE', rightX, 38, { width: rightW, align: 'right', lineBreak: false })

  const badgeW = 60
  const badgeH = 18
  const badgeX = pageWidth - PAGE_MARGIN - badgeW

  doc.roundedRect(badgeX, 68, badgeW, badgeH, 9).fillColor('#d1fae5').fill()
  doc.font('Helvetica-Bold').fontSize(9).fillColor(GREEN)
    .text('PAID', badgeX, 73, { width: badgeW, align: 'center', lineBreak: false, characterSpacing: 1 })

  doc.font('Helvetica').fontSize(10).fillColor(GRAY)
    .text('Invoice #:', rightX, 94, { width: 100, align: 'right', lineBreak: false })
    .text('Date:', rightX, 108, { width: 100, align: 'right', lineBreak: false })

  doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK)
    .text(order.order_number, rightX + 110, 94, { width: 90, align: 'right', lineBreak: false })
    .text(invoiceDate, rightX + 110, 108, { width: 90, align: 'right', lineBreak: false })

  hRule(doc, 134, PRIMARY, 1.5)
}

function drawBillTo(doc: Doc, customerName: string, customerEmail: string, customerPhone?: string, customerAddress?: string): void {
  const L = PAGE_MARGIN
  const contentW = doc.page.width - PAGE_MARGIN * 2
  const colW = contentW / 2
  const y = 146

  doc.roundedRect(L, y, contentW, 85, 6).strokeColor(DIVIDER).lineWidth(1).stroke()
  doc.roundedRect(L, y, contentW, 85, 6).fillColor('#f8fafc').fill()

  const startY = y + 12
  cell(doc, 'BILLED TO', L + 16, startY, colW, { font: 'Helvetica-Bold', size: 9, color: PRIMARY, characterSpacing: 1 })
  cell(doc, customerName, L + 16, startY + 18, colW, { font: 'Helvetica-Bold', size: 12, color: DARK })

  let currentY = startY + 34
  if (customerAddress) {
    cell(doc, customerAddress, L + 16, currentY, colW - 32, { size: 10, color: GRAY })
    currentY += 14
  }
  if (customerPhone) {
    cell(doc, `Ph: ${customerPhone}`, L + 16, currentY, colW, { size: 10, color: GRAY })
    currentY += 14
  }
  cell(doc, customerEmail, L + 16, currentY, colW, { size: 10, color: GRAY })

  const cx = L + colW + 16
  doc.moveTo(L + colW, y + 12).lineTo(L + colW, y + 73).strokeColor(DIVIDER).lineWidth(1).stroke()

  cell(doc, 'COMPANY DETAILS', cx, startY, colW, { font: 'Helvetica-Bold', size: 9, color: PRIMARY, characterSpacing: 1 })
  cell(doc, 'Icon Opticals - ATP', cx, startY + 18, colW, { font: 'Helvetica-Bold', size: 12, color: DARK })
  cell(doc, 'GSTIN: 37BOFPM8364B1ZU', cx, startY + 34, colW, { size: 10, color: GRAY })
  cell(doc, 'State Code: 37 (Andhra Pradesh)', cx, startY + 48, colW, { size: 10, color: GRAY })
}

function drawTableHeader(doc: Doc, y: number): void {
  const L = PAGE_MARGIN
  const contentW = doc.page.width - PAGE_MARGIN * 2

  doc.roundedRect(L, y, contentW, 28, 4).fillColor(HEADER_BG).fill()

  const labelY = y + 9
  let cx = L + 8

  const headers: Array<[string, number, 'left' | 'center' | 'right']> = [
    ['#',       COL.num,     'left'],
    ['PRODUCT', COL.product, 'left'],
    ['QTY',     COL.qty,     'center'],
    ['FRAME',   COL.frame,   'right'],
    ['LENS',    COL.lens,    'right'],
    ['TOTAL',   COL.total,   'right'],
  ]

  for (const [label, width, align] of headers) {
    cell(doc, label, cx, labelY, width, { font: 'Helvetica-Bold', size: 9, color: GRAY, align, characterSpacing: 0.5 })
    cx += width
  }
}

// ---------------------------------------------------------------------------
// drawItems — renders each cart item row, including lens config + price override
// ---------------------------------------------------------------------------
function drawItems(doc: Doc, items: OrderItem[], startY: number, isAdminBilled: boolean): number {
  let y = startY
  const L = PAGE_MARGIN
  const contentW = doc.page.width - PAGE_MARGIN * 2
  const pageH = doc.page.height

  items.forEach((item, i) => {
    const cfg = item.lens_config
    const ov  = item.price_override_audit

    const hasLens     = Boolean(cfg && cfg.power_type && cfg.power_type !== 'frame_only')
    const hasRx       = hasLens && (cfg?.left_eye || cfg?.right_eye)
    const hasOverride = Boolean(ov) && isAdminBilled

    // Calculate row height based on content
    let rowH = 42
    if (hasLens)     rowH += 20  // lens type+pkg line
    if (hasRx)       rowH += 26  // two eye rows
    if (hasOverride) rowH += 16  // override note

    // Page break guard (space for summary block below)
    if (y + rowH > pageH - 200) {
      doc.addPage()
      y = PAGE_MARGIN
      drawTableHeader(doc, y)
      y += 32
    }

    // Alternating row background
    if (i % 2 !== 0) {
      doc.rect(L, y, contentW, rowH).fillColor(ROW_BG_ALT).fill()
    }

    const ry = y + 10
    let cx = L + 8

    // Row number
    cell(doc, String(i + 1), cx, ry, COL.num, { color: LIGHT, size: 10 })
    cx += COL.num

    // Product name + brand
    cell(doc, item.product_snapshot?.name ?? '', cx, ry, COL.product, { font: 'Helvetica-Bold', size: 11, color: DARK })
    cell(doc, item.product_snapshot?.brand ?? '', cx, ry + 14, COL.product, { size: 10, color: GRAY })

    let detailY = ry + 28

    // ── Lens info block ───────────────────────────────────────────────────
    if (hasLens && cfg) {
      const lensText = [
        lensLabel(cfg),
        cfg.package_code ? `Pkg: ${cfg.package_code}` : null,
      ].filter(Boolean).join('  |  ')

      // Blue pill background
      doc.roundedRect(cx, detailY, 160, 15, 2).fillColor(BLUE_LIGHT).fill()
      cell(doc, lensText, cx + 4, detailY + 3, 154, { size: 8, color: BLUE_MID })
      detailY += 19

      // Prescription values
      if (hasRx) {
        const eyeLine = (label: string, eye: typeof cfg.left_eye) => {
          if (!eye) return
          const rxText = `${label}  Sph: ${fmtDiopter(eye.sph)}  Cyl: ${fmtDiopter(eye.cyl)}  Ax: ${eye.axis ?? '—'}°`
          cell(doc, rxText, cx + 4, detailY, COL.product - 8, { size: 8, color: GRAY })
          detailY += 12
        }
        eyeLine('OD (R)', cfg.right_eye)
        eyeLine('OS (L)', cfg.left_eye)
        if (cfg.pd) {
          cell(doc, `PD: ${cfg.pd} mm`, cx + 4, detailY, COL.product - 8, { size: 8, color: GRAY })
          detailY += 12
        }
      } else if (cfg.upload_later) {
        cell(doc, '⚠ Prescription pending', cx + 4, detailY, COL.product - 8, { size: 8, color: AMBER })
        detailY += 12
      }
    }

    // ── Price override note ────────────────────────────────────────────────
    if (hasOverride && ov) {
      doc.roundedRect(cx, detailY, 160, 14, 2).fillColor(AMBER_BG).fill()
      const overrideText = `✏ Rs.${ov.original_price.toLocaleString('en-IN')} → Rs.${ov.overridden_price.toLocaleString('en-IN')}  ${ov.reason ? `| ${ov.reason}` : ''}`
      cell(doc, overrideText, cx + 4, detailY + 3, 154, { size: 7.5, color: AMBER })
    }

    cx += COL.product

    // Quantity
    cell(doc, String(item.quantity), cx, ry, COL.qty, { align: 'center', size: 11, color: DARK })
    cx += COL.qty

    // Frame price — show strikethrough original if overridden
    if (hasOverride && ov) {
      // Original price struck through
      cell(doc, formatINR(ov.original_price), cx, ry, COL.frame, { align: 'right', size: 9, color: LIGHT })
      // Draw strikethrough line over it
      const strikeX    = cx
      const strikeEndX = cx + COL.frame
      const strikeY    = ry + 6
      doc.moveTo(strikeX, strikeY).lineTo(strikeEndX, strikeY).strokeColor(LIGHT).lineWidth(0.6).stroke()
      // Overridden price below
      cell(doc, formatINR(item.frame_price ?? 0), cx, ry + 12, COL.frame, { align: 'right', size: 11, color: DARK, font: 'Helvetica-Bold' })
    } else {
      cell(doc, formatINR(item.frame_price ?? 0), cx, ry, COL.frame, { align: 'right', size: 11, color: GRAY })
    }
    cx += COL.frame

    // Lens price
    cell(doc, formatINR(item.lens_price ?? 0), cx, ry, COL.lens, { align: 'right', size: 11, color: GRAY })
    cx += COL.lens

    // Total
    cell(doc, formatINR(item.total_price ?? 0), cx, ry, COL.total, { font: 'Helvetica-Bold', align: 'right', size: 11, color: DARK })

    y += rowH
    hRule(doc, y, DIVIDER, 0.5)
  })

  return y
}

function drawBottomSection(doc: Doc, order: InvoiceOrder, afterItemsY: number): void {
  const L = PAGE_MARGIN
  const summaryW = 240
  const labelW   = 120
  const valueW   = summaryW - labelW
  const summaryX = doc.page.width - PAGE_MARGIN - summaryW
  let y = afterItemsY + 20

  // Right Side: Financial Summary
  cell(doc, 'Subtotal', summaryX, y, labelW, { size: 11, color: GRAY })
  cell(doc, formatINR(order.subtotal ?? 0), summaryX + labelW, y, valueW, { font: 'Helvetica-Bold', size: 11, align: 'right', color: DARK })
  y += 20

  if (order.discount_amount && order.discount_amount > 0) {
    cell(doc, `Discount (${order.coupon_code ?? ''})`, summaryX, y, labelW, { size: 11, color: GREEN })
    cell(doc, `-${formatINR(order.discount_amount)}`, summaryX + labelW, y, valueW, { font: 'Helvetica-Bold', size: 11, align: 'right', color: GREEN })
    y += 20
  }

  cell(doc, 'CGST (9%)', summaryX, y, labelW, { size: 10, color: LIGHT })
  cell(doc, 'Included', summaryX + labelW, y, valueW, { size: 10, align: 'right', color: LIGHT })
  y += 16
  cell(doc, 'SGST (9%)', summaryX, y, labelW, { size: 10, color: LIGHT })
  cell(doc, 'Included', summaryX + labelW, y, valueW, { size: 10, align: 'right', color: LIGHT })
  y += 18

  doc.moveTo(summaryX, y).lineTo(summaryX + summaryW, y).strokeColor(PRIMARY).lineWidth(2).stroke()
  y += 12

  cell(doc, 'Total', summaryX, y, labelW, { font: 'Helvetica-Bold', size: 16, color: PRIMARY })
  cell(doc, formatINR(order.total_amount ?? 0), summaryX + labelW, y, valueW, { font: 'Helvetica-Bold', size: 18, align: 'right', color: PRIMARY })
  y += 24

  cell(doc, 'Amount Paid', summaryX, y, labelW, { font: 'Helvetica-Bold', size: 11, color: GREEN })
  cell(doc, formatINR(order.total_amount ?? 0), summaryX + labelW, y, valueW, { font: 'Helvetica-Bold', size: 11, align: 'right', color: GREEN })
  y += 18
  cell(doc, 'Balance Due', summaryX, y, labelW, { font: 'Helvetica-Bold', size: 11, color: GRAY })
  cell(doc, '₹0', summaryX + labelW, y, valueW, { font: 'Helvetica-Bold', size: 11, align: 'right', color: GRAY })

  // Left Side: Payment Confirmation Block
  const leftY = afterItemsY + 20

  doc.roundedRect(L, leftY, 230, 60, 6).fillColor('#d1fae5').fill()
  doc.roundedRect(L, leftY, 230, 60, 6).strokeColor('#10b981').lineWidth(1).stroke()
  doc.font('Helvetica-Bold').fontSize(14).fillColor(GREEN).text('PAID IN FULL', L, leftY + 18, { width: 230, align: 'center' })
  doc.font('Helvetica').fontSize(10).fillColor(GREEN).text('Thank you for your business!', L, leftY + 36, { width: 230, align: 'center' })

  // Custom pricing note (admin billed orders only)
  const isAdminBilled = order.created_by_admin || order.sales_channel === 'store_billing'
  const hasAnyOverride = (order.order_items || []).some((i: OrderItem) => i.price_override_audit)

  if (isAdminBilled && hasAnyOverride) {
    const noteY = leftY + 70
    doc.roundedRect(L, noteY, 230, 34, 4).fillColor(AMBER_BG).fill()
    cell(doc, '✏ Custom Pricing Applied', L + 8, noteY + 6, 214, { font: 'Helvetica-Bold', size: 8, color: AMBER, characterSpacing: 0.3 })
    cell(doc, 'One or more items billed at store-adjusted price.', L + 8, noteY + 18, 214, { size: 8, color: AMBER })
  }

  // Terms & Conditions
  const termsY = leftY + (isAdminBilled && hasAnyOverride ? 115 : 80)
  cell(doc, 'TERMS & CONDITIONS', L, termsY, 250, { font: 'Helvetica-Bold', size: 8, color: LIGHT, characterSpacing: 0.5 })
  cell(doc, '1. Goods once sold will not be taken back or exchanged.', L, termsY + 12, 250, { size: 8, color: GRAY })
  cell(doc, '2. All disputes are subject to ATP jurisdiction only.', L, termsY + 22, 250, { size: 8, color: GRAY })

  // Authorized Signatory
  const signY    = termsY - 5
  const signX    = doc.page.width - PAGE_MARGIN - 150
  doc.moveTo(signX, signY + 30).lineTo(signX + 150, signY + 30).strokeColor(DARK).lineWidth(1).stroke()
  cell(doc, 'Authorized Signatory', signX, signY + 36, 150, { font: 'Helvetica-Bold', size: 10, align: 'center', color: DARK })
}

function drawFooter(doc: Doc): void {
  const L = PAGE_MARGIN
  const contentW = doc.page.width - PAGE_MARGIN * 2
  const footerY  = doc.page.height - 40

  hRule(doc, footerY, DIVIDER, 0.75)
  doc.font('Helvetica').fontSize(9).fillColor(LIGHT)
    .text('This is a computer generated receipt and requires no physical signature.', L, footerY + 12, { width: contentW, align: 'center', lineBreak: false })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generatePDFBuffer(
  order: InvoiceOrder,
  customerName: string,
  customerEmail: string,
  customerPhone?: string,
  customerAddress?: string,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size:    'A4',
      margins: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN },
      autoFirstPage: true,
      compress: true,
    })

    const chunks: Uint8Array[] = []
    doc.on('data',  (chunk: Uint8Array) => chunks.push(chunk))
    doc.on('end',   () => resolve(Buffer.concat(chunks)))
    doc.on('error', (err: Error) => reject(err))

    const items         = (order.order_items ?? []) as OrderItem[]
    const isAdminBilled = !!(order.created_by_admin || order.sales_channel === 'store_billing')

    drawHeader(doc, order)
    drawBillTo(doc, customerName, customerEmail, customerPhone, customerAddress)

    const tableStartY = 250
    drawTableHeader(doc, tableStartY)

    // Pass isAdminBilled so price overrides render only on admin-created invoices
    const afterItemsY = drawItems(doc, items, tableStartY + 28, isAdminBilled)

    drawBottomSection(doc, order, afterItemsY)
    drawFooter(doc)

    doc.end()
  })
}