export const dynamic = 'force-dynamic'

// app/api/admin/monthly-report/route.ts
//
// Generates a monthly confirmed-orders PDF report and streams it directly to
// the browser as an attachment download. Nothing is written to disk, Cloudinary,
// or the database — the buffer is assembled in memory and flushed once.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance, createAdminClient } from '@/lib/supabase'
import PDFDocument from 'pdfkit'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderRow {
  id: string
  order_number: string
  user_id: string
  status: string
  total_amount: number
  created_at: string
  coupon_code: string | null
  discount_amount: number
  fulfillment_type: string | null
}

interface ProfileRow {
  id: string
  full_name: string | null
  phone: string | null
}

interface MergedOrder extends OrderRow {
  profile: Pick<ProfileRow, 'full_name' | 'phone'> | null
}

// ─── PDF colour palette (mirrors invoice.ts) ──────────────────────────────────

const PRIMARY    = '#1a1a2e'
const DARK       = '#1e293b'
const GRAY       = '#64748b'
const LIGHT      = '#94a3b8'
const DIVIDER    = '#e2e8f0'
const ACCENT     = '#0f172a'
const GREEN      = '#059669'
const PAGE_W     = 595.28   // A4 points
const PAGE_H     = 841.89
const MARGIN     = 48

// ─── Tiny PDFKit helpers ──────────────────────────────────────────────────────

type Doc = InstanceType<typeof PDFDocument>

function hRule(doc: Doc, y: number, color = DIVIDER, lw = 0.5): void {
  doc
    .moveTo(MARGIN, y)
    .lineTo(PAGE_W - MARGIN, y)
    .strokeColor(color)
    .lineWidth(lw)
    .stroke()
}

function cell(
  doc: Doc,
  text: string,
  x: number,
  y: number,
  w: number,
  opts: {
    font?: string
    size?: number
    color?: string
    align?: 'left' | 'center' | 'right'
    lineBreak?: boolean
  } = {},
): void {
  doc
    .font(opts.font ?? 'Helvetica')
    .fontSize(opts.size ?? 10)
    .fillColor(opts.color ?? DARK)
    .text(text, x, y, {
      width: w,
      align: opts.align ?? 'left',
      lineBreak: opts.lineBreak ?? false,
    })
}

function fmtINR(n: number): string {
  return `Rs.${n.toLocaleString('en-IN')}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── PDF builder ──────────────────────────────────────────────────────────────

function buildReportPDF(
  orders: MergedOrder[],
  monthLabel: string,
  year: number,
  month: number,   // 1-based
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      autoFirstPage: true,
      compress: true,
    })

    const chunks: Uint8Array[] = []
    doc.on('data', (c: Uint8Array) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', (e: Error) => reject(e))

    const contentW = PAGE_W - MARGIN * 2
    let y = MARGIN

    // ── Header bar ────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 90).fillColor(PRIMARY).fill()

    doc
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor('#ffffff')
      .text('ICON OPTICALS', MARGIN, 24, { lineBreak: false })

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#94a3b8')
      .text('Monthly Confirmed Orders Report', MARGIN, 50, { lineBreak: false })

    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor('#ffffff')
      .text(monthLabel.toUpperCase(), PAGE_W - MARGIN - 140, 30, {
        width: 140,
        align: 'right',
        lineBreak: false,
      })

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#94a3b8')
      .text(`Generated: ${fmtDate(new Date().toISOString())}`, PAGE_W - MARGIN - 140, 50, {
        width: 140,
        align: 'right',
        lineBreak: false,
      })

    y = 110

    // ── Summary KPI row ───────────────────────────────────────────────────
    const totalOrders  = orders.length
    const totalRevenue = orders.reduce((s, o) => s + (o.total_amount ?? 0), 0)
    const totalDiscount = orders.reduce((s, o) => s + (o.discount_amount ?? 0), 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    const kpis: Array<{ label: string; value: string }> = [
      { label: 'Total Orders',     value: String(totalOrders) },
      { label: 'Total Revenue',    value: fmtINR(totalRevenue) },
      { label: 'Total Discounts',  value: fmtINR(totalDiscount) },
      { label: 'Avg Order Value',  value: fmtINR(Math.round(avgOrderValue)) },
    ]

    const kpiW = contentW / kpis.length
    kpis.forEach((k, i) => {
      const kx = MARGIN + i * kpiW
      doc.rect(kx, y, kpiW - 8, 64).fillColor(i % 2 === 0 ? '#f8fafc' : '#f1f5f9').fill()
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(GRAY)
        .text(k.label.toUpperCase(), kx + 10, y + 12, { width: kpiW - 20, lineBreak: false })
      doc
        .font('Helvetica-Bold')
        .fontSize(15)
        .fillColor(ACCENT)
        .text(k.value, kx + 10, y + 28, { width: kpiW - 20, lineBreak: false })
    })

    y += 80

    // ── Status breakdown ──────────────────────────────────────────────────
    const statusCount: Record<string, number> = {}
    orders.forEach(o => {
      const s = o.status ?? 'unknown'
      statusCount[s] = (statusCount[s] ?? 0) + 1
    })

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(GRAY)
      .text('STATUS BREAKDOWN', MARGIN, y, { lineBreak: false })

    y += 14
    hRule(doc, y, DIVIDER, 0.5)
    y += 8

    const statusEntries = Object.entries(statusCount)
    const sColW = contentW / Math.max(statusEntries.length, 1)
    statusEntries.forEach(([status, count], i) => {
      const sx = MARGIN + i * sColW
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(LIGHT)
        .text(status.replace(/_/g, ' ').toUpperCase(), sx, y, { width: sColW - 4, lineBreak: false })
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(DARK)
        .text(String(count), sx, y + 12, { width: sColW - 4, lineBreak: false })
    })

    y += 36
    hRule(doc, y, DIVIDER, 0.5)
    y += 16

    // ── Order table header ────────────────────────────────────────────────
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(GRAY)
      .text('ORDER SUMMARY', MARGIN, y, { lineBreak: false })

    y += 14

    // Column positions & widths
    const COL = {
      ref:    { x: MARGIN,       w: 95  },
      client: { x: MARGIN + 95,  w: 115 },
      date:   { x: MARGIN + 210, w: 75  },
      status: { x: MARGIN + 285, w: 90  },
      amount: { x: MARGIN + 375, w: 72  },
    }

    // Table header row
    doc.rect(MARGIN, y, contentW, 20).fillColor(PRIMARY).fill()

    const headerCols: Array<{ key: keyof typeof COL; label: string; align?: 'left' | 'right' }> = [
      { key: 'ref',    label: 'ORDER REF' },
      { key: 'client', label: 'CUSTOMER' },
      { key: 'date',   label: 'DATE' },
      { key: 'status', label: 'STATUS' },
      { key: 'amount', label: 'AMOUNT', align: 'right' },
    ]

    headerCols.forEach(({ key, label, align }) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#ffffff')
        .text(label, COL[key].x + 4, y + 6, {
          width: COL[key].w - 8,
          align: align ?? 'left',
          lineBreak: false,
        })
    })

    y += 20

    // ── Table rows ────────────────────────────────────────────────────────
    const ROW_H = 22
    let rowIndex = 0

    for (const order of orders) {
      // Page break guard
      if (y + ROW_H > PAGE_H - MARGIN - 40) {
        doc.addPage()
        y = MARGIN

        // Repeat header on new page
        doc.rect(MARGIN, y, contentW, 20).fillColor(PRIMARY).fill()
        headerCols.forEach(({ key, label, align }) => {
          doc
            .font('Helvetica-Bold')
            .fontSize(7.5)
            .fillColor('#ffffff')
            .text(label, COL[key].x + 4, y + 6, {
              width: COL[key].w - 8,
              align: align ?? 'left',
              lineBreak: false,
            })
        })
        y += 20
        rowIndex = 0
      }

      // Alternating row background
      if (rowIndex % 2 === 0) {
        doc.rect(MARGIN, y, contentW, ROW_H).fillColor('#f8fafc').fill()
      }

      const clientName = order.profile?.full_name ?? 'Anonymous'
      const phone      = order.profile?.phone ? ` · ${order.profile.phone}` : ''

      cell(doc, order.order_number ?? '—',
        COL.ref.x + 4, y + 6, COL.ref.w - 8,
        { size: 8, color: DARK, font: 'Helvetica-Bold' })

      cell(doc, clientName + phone,
        COL.client.x + 4, y + 6, COL.client.w - 8,
        { size: 8, color: DARK })

      cell(doc, fmtDate(order.created_at),
        COL.date.x + 4, y + 6, COL.date.w - 8,
        { size: 8, color: GRAY })

      cell(doc, (order.status ?? '').replace(/_/g, ' '),
        COL.status.x + 4, y + 6, COL.status.w - 8,
        { size: 7.5, color: GRAY })

      cell(doc, fmtINR(order.total_amount ?? 0),
        COL.amount.x + 4, y + 6, COL.amount.w - 8,
        { size: 9, color: DARK, font: 'Helvetica-Bold', align: 'right' })

      y += ROW_H
      rowIndex++

      // Bottom divider for each row
      doc
        .moveTo(MARGIN, y)
        .lineTo(PAGE_W - MARGIN, y)
        .strokeColor(DIVIDER)
        .lineWidth(0.3)
        .stroke()
    }

    // ── Totals footer row ─────────────────────────────────────────────────
    y += 6
    doc.rect(MARGIN, y, contentW, 24).fillColor('#e2e8f0').fill()

    cell(doc, `TOTAL — ${totalOrders} orders`,
      MARGIN + 4, y + 7, contentW - 80,
      { size: 9, color: ACCENT, font: 'Helvetica-Bold' })

    cell(doc, fmtINR(totalRevenue),
      COL.amount.x + 4, y + 7, COL.amount.w - 8,
      { size: 10, color: GREEN, font: 'Helvetica-Bold', align: 'right' })

    y += 36

    // ── Footer note ───────────────────────────────────────────────────────
    hRule(doc, y, DIVIDER, 0.5)
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(LIGHT)
      .text(
        'This report is generated on demand from live order data. No copy has been stored.',
        MARGIN,
        y + 10,
        { width: contentW, align: 'center', lineBreak: false },
      )

    doc.end()
  })
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if ((profile as { role?: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Params ────────────────────────────────────────────────────────────────
  const { searchParams } = request.nextUrl
  const year  = parseInt(searchParams.get('year')  ?? '0', 10)
  const month = parseInt(searchParams.get('month') ?? '0', 10)  // 1-based

  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: 'year and month (1–12) are required' }, { status: 400 })
  }

  // Build inclusive UTC date range for the month
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end   = new Date(Date.UTC(year, month, 1))   // first of next month (exclusive)

  // ── Fetch ALL confirmed orders for the month (no pagination) ──────────────
  const { data: orders, error } = await db
    .from('orders')
    .select(
      `id, order_number, user_id, status, total_amount, created_at,
       coupon_code, discount_amount, fulfillment_type`,
    )
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[monthly-report GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (orders ?? []) as OrderRow[]

  // ── Hydrate profiles ──────────────────────────────────────────────────────
  let merged: MergedOrder[] = rows.map(o => ({ ...o, profile: null }))

  if (rows.length > 0) {
    const userIds = [...new Set(rows.map(o => o.user_id))]
    const { data: profiles } = await db
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', userIds)

    const profileMap = new Map(
      ((profiles ?? []) as ProfileRow[]).map(p => [p.id, p]),
    )
    merged = rows.map(o => ({
      ...o,
      profile: profileMap.get(o.user_id) ?? null,
    }))
  }

  // ── Build month label ─────────────────────────────────────────────────────
  const monthLabel = start.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  // ── Generate PDF in memory ────────────────────────────────────────────────
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await buildReportPDF(merged, monthLabel, year, month)
  } catch (err) {
    console.error('[monthly-report] PDF generation failed', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }


  // Stream directly to client -- no storage. Nothing is written to disk or DB.
  // ReadableStream is the body type Next.js App Router accepts without type errors.
  const filename = `icon-opticals-report-${year}-${String(month).padStart(2, '0')}.pdf`
  const stream   = new ReadableStream({
    start(controller) {
      controller.enqueue(pdfBuffer)
      controller.close()
    },
  })

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdfBuffer.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  })
}