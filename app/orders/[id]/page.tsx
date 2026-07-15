'use client'

export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Check, Package, FileText, Loader2, Mail, Glasses, ExternalLink, Download } from 'lucide-react'
import { getInvoiceViewUrl } from '@/lib/cloudinary-url'

// Luxury Status Indicators (Monochrome & Structural)
const STATUS_STYLES: Record<string, string> = {
  pending_admin_approval: 'bg-amber-50 border-amber-400 text-amber-700 font-semibold',
  pending:          'border-slate-300 text-slate-500',
  confirmed:        'border-slate-900 text-slate-900 font-semibold',
  rejected:         'bg-red-50 border-red-400 text-red-700 font-semibold',
  processing:       'bg-slate-50 border-slate-200 text-slate-600',
  ready_for_pickup: 'bg-slate-900 border-slate-900 text-white',
  completed:        'border-transparent text-slate-400',
  cancelled:        'border-slate-200 text-slate-400 line-through',
}

const STATUS_LABELS: Record<string, string> = {
  pending_admin_approval: 'Pending Approval',
  pending:          'Pending',
  confirmed:        'Confirmed',
  rejected:         'Rejected',
  processing:       'Processing',
  ready_for_pickup: 'Ready for Pickup',
  completed:        'Completed',
  cancelled:        'Cancelled',
}

const MAX_POLL_ATTEMPTS = 10
const POLL_INTERVAL_MS  = 3000

function OrderPageInner() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const justPlaced = searchParams.get('placed') === 'true' || searchParams.get('pending') === 'true'
  const isPending  = searchParams.get('pending') === 'true'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [invoiceState, setInvoiceState] = useState<'pending' | 'ready' | 'emailed'>('pending')
  // Becomes true when a pending order gets approved while the customer is on this page
  const [confirmedJustNow, setConfirmedJustNow] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const fetchFullOrder = async () => {
      const { data } = await supabase
        .from('orders')
        .select(`*, order_items(*)`)
        .eq('id', id)
        .single()
      setOrder(data)
      if (data?.invoice_url) setInvoiceState('ready')
      setLoading(false)
      return data
    }
    fetchFullOrder()

    if (!justPlaced) return

    // ── Poll for invoice (already-confirmed orders) ─────────────────
    const startInvoicePoll = () => {
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        const { data } = await supabase
          .from('orders')
          .select('invoice_url, status')
          .eq('id', id)
          .single()
        const d = data as { invoice_url?: string; status?: string } | null
        if (d?.invoice_url) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setOrder((prev: any) =>
            prev ? { ...prev, invoice_url: d.invoice_url, status: d.status } : prev,
          )
          setInvoiceState('ready')
          clearInterval(poll)
          return
        }
        if (attempts >= MAX_POLL_ATTEMPTS) {
          clearInterval(poll)
          setInvoiceState('emailed')
        }
      }, POLL_INTERVAL_MS)
      return poll
    }

    if (!isPending) {
      // Normal confirmed order — poll for invoice only
      const poll = startInvoicePoll()
      return () => clearInterval(poll)
    }

    // ── Poll for admin approval (pending_admin_approval orders) ──────
    // Keeps checking until admin confirms or rejects the order
    let invoicePoll: ReturnType<typeof setInterval> | null = null
    const statusPoll = setInterval(async () => {
      const { data } = await supabase
        .from('orders')
        .select('status, invoice_url')
        .eq('id', id)
        .single()
      const d = data as { status?: string; invoice_url?: string } | null

      // Still waiting for admin action — keep polling
      if (!d || d.status === 'pending_admin_approval') return

      // Status changed — stop this poll and re-fetch full order
      clearInterval(statusPoll)
      const { data: fullOrder } = await supabase
        .from('orders')
        .select(`*, order_items(*)`)
        .eq('id', id)
        .single()

      if (fullOrder) {
        setOrder(fullOrder)
        if (fullOrder.invoice_url) {
          setInvoiceState('ready')
        } else if (d.status === 'confirmed') {
          // Confirmed but invoice not generated yet — start invoice poll
          invoicePoll = startInvoicePoll()
        }
        if (d.status === 'confirmed') {
          setConfirmedJustNow(true)
        }
      }
    }, POLL_INTERVAL_MS)

    return () => {
      clearInterval(statusPoll)
      if (invoicePoll) clearInterval(invoicePoll)
    }
  }, [id, justPlaced, isPending])

  // ── Loading & Error States ──────────────────────────────────────
  if (loading) return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <Loader2 size={24} strokeWidth={1} className="animate-spin text-slate-900 mb-4" />
      <p className="text-[9px] uppercase tracking-[0.2em] font-medium text-slate-500">Retrieving Details</p>
    </main>
  )

  if (!order) return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center border border-slate-200 bg-white p-12 max-w-md w-full">
        <h1 className="text-2xl text-slate-900 tracking-tight mb-4" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>Record Not Found</h1>
        <p className="text-xs text-slate-500 font-light mb-8">The requested order manifest could not be located.</p>
        <Link href="/" className="inline-block border border-slate-900 text-slate-900 text-[10px] uppercase tracking-[0.2em] font-medium px-8 py-3 hover:bg-slate-900 hover:text-white transition-colors">
          Return to Boutique
        </Link>
      </div>
    </main>
  )

  const invoiceViewUrl = order.invoice_url ? getInvoiceViewUrl(order.invoice_url) : ''

  // Show confirmed header if:
  // (a) order was just placed as confirmed (?placed=true), or
  // (b) it was pending and just got approved while the user was watching
  const showConfirmedHeader = (justPlaced && !isPending) || confirmedJustNow
  // Show pending header only if still actually pending (not yet approved)
  const showPendingHeader = isPending && !confirmedJustNow && order.status === 'pending_admin_approval'

  return (
    <main className="min-h-screen bg-slate-50 py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        {/* ── Success Header ─────────────────────────────────────── */}
        {(justPlaced || confirmedJustNow) && (
          <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {showPendingHeader ? (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 border-2 border-amber-400 rounded-full mx-auto mb-6">
                  <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <h1 className="text-4xl text-slate-900 tracking-tight mb-4" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                  Order Request Submitted
                </h1>
                <p className="text-xs text-slate-500 font-light max-w-md mx-auto leading-relaxed">
                  Your order request has been received. Our team will verify your payment and confirm your order shortly.
                  You will be notified by email and WhatsApp once approved.
                </p>
              </>
            ) : showConfirmedHeader ? (
              <>
                <Check size={40} strokeWidth={1} className="mx-auto mb-6 text-slate-900" />
                <h1 className="text-4xl text-slate-900 tracking-tight mb-4" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                  Order Confirmed
                </h1>
                <p className="text-xs text-slate-500 font-light max-w-md mx-auto leading-relaxed">
                  Your selection has been secured. A formal invoice and receipt will be dispatched to your email and WhatsApp shortly.
                </p>
              </>
            ) : null}
          </div>
        )}

        {/* ── Order Manifest Card ────────────────────────────────── */}
        <div className="bg-white border border-slate-200 shadow-2xl">

          {/* Header */}
          <div className="bg-slate-900 px-8 py-8 text-white flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-[9px] uppercase tracking-[0.25em] text-slate-400 mb-2">Order Reference</p>
              <p className="text-2xl font-light tracking-widest">{order.order_number}</p>
            </div>
            <span className={`text-[9px] uppercase tracking-[0.2em] px-4 py-2 border ${STATUS_STYLES[order.status] || 'border-white/20 text-white'}`}>
              {STATUS_LABELS[order.status] ?? order.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="p-8 md:p-12 space-y-12">

            {/* ── Rejection Notice ───────────────────────────────── */}
            {order.status === 'rejected' && (
              <div className="bg-red-50 border border-red-200 p-6 animate-in fade-in duration-500">
                <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-red-700 mb-2">Order Request Rejected</p>
                <p className="text-xs text-red-700 leading-relaxed">
                  {order.rejection_reason || 'Payment verification failed. Please contact us for assistance.'}
                </p>
              </div>
            )}

            {/* ── Pending Approval Notice ────────────────────────── */}
            {order.status === 'pending_admin_approval' && (
              <div className="bg-amber-50 border border-amber-200 p-6 animate-in fade-in duration-500">
                <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-amber-700 mb-2">Awaiting Admin Confirmation</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Your order request has been received. Our team is verifying your payment.
                  You will be notified by email and WhatsApp once confirmed.
                </p>
              </div>
            )}

            {/* Items */}
            <div>
              <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                <Package size={14} strokeWidth={1.5} className="text-slate-400" /> Manifest
              </h3>
              <div className="space-y-6">
                {(order.order_items || []).map((item: Record<string, unknown>) => (
                  <div key={item.id as string} className="flex items-start sm:items-center gap-4 sm:gap-6 group">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0 transition-colors group-hover:border-slate-300">
                      <Glasses size={24} strokeWidth={1} />
                    </div>
                    <div className="flex-1 min-w-0 pt-1 sm:pt-0">
                      <p className="font-medium text-slate-900 truncate mb-1 text-sm">
                        {(item.product_snapshot as Record<string, string>)?.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-widest text-slate-500">
                        <span>{(item.product_snapshot as Record<string, string>)?.brand}</span>
                        <span>·</span>
                        <span>QTY: {String(item.quantity)}</span>
                        {!!item.lens_config && (
                          <>
                            <span>·</span>
                            <span className="text-slate-900 font-medium">
                              {String((item.lens_config as Record<string, string>)?.power_type?.replace('_', ' ') ?? '')} Lenses
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="font-medium text-slate-900 flex-shrink-0 text-sm pt-1 sm:pt-0">
                      ₹{(item.total_price as number).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Totals */}
            <div className="border-t border-slate-200 pt-6 space-y-3 text-xs tracking-wide">
              <div className="flex justify-between text-slate-500">
                <span className="uppercase tracking-[0.1em]">Subtotal</span>
                <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-slate-900">
                  <span className="uppercase tracking-[0.1em]">Complimentary Discount</span>
                  <span>−₹{order.discount_amount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base text-slate-900 pt-4 border-t border-slate-100 mt-2">
                <span className="uppercase tracking-[0.1em] text-xs pt-1">Total Settled</span>
                <span>₹{order.total_amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Invoice Documents — only shown once order is confirmed */}
            {order.status !== 'pending_admin_approval' && order.status !== 'rejected' && (
              <div className="border-t border-slate-900 pt-8">
                <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                  <FileText size={14} strokeWidth={1.5} className="text-slate-400" /> Documents
                </h3>

                {(invoiceState === 'ready' || order.invoice_url) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <a
                      href={invoiceViewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-3 w-full py-4 bg-slate-900 hover:bg-slate-800 text-white text-[10px] uppercase tracking-[0.2em] font-medium transition-colors"
                    >
                      <ExternalLink size={14} strokeWidth={1.5} /> View Invoice
                    </a>
                    <a
                      href={invoiceViewUrl + '&dl=1'}
                      download
                      className="flex items-center justify-center gap-3 w-full py-4 border border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white text-[10px] uppercase tracking-[0.2em] font-medium transition-colors"
                    >
                      <Download size={14} strokeWidth={1.5} /> Download PDF
                    </a>
                  </div>
                ) : invoiceState === 'emailed' ? (
                  <div className="flex items-start gap-4 p-6 bg-slate-50 border border-slate-200">
                    <Mail size={18} strokeWidth={1.5} className="text-slate-900 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed text-slate-600 font-light">
                      Your invoice is currently being prepared and will be sent directly to your email. You may refresh this page shortly to download the digital copy here.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] font-medium text-slate-500 justify-center py-6 border border-slate-100">
                    <Loader2 size={14} strokeWidth={1.5} className="animate-spin text-slate-900" /> Generating Documents...
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* ── Footer Actions ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link
            href="/products"
            className="flex-1 py-4 text-center border border-slate-200 text-slate-900 text-[10px] uppercase tracking-[0.2em] font-medium hover:border-slate-900 transition-colors"
          >
            Continue Shopping
          </Link>
          <Link
            href="/account/orders"
            className="flex-1 py-4 text-center bg-slate-50 text-slate-900 text-[10px] uppercase tracking-[0.2em] font-medium border border-transparent hover:border-slate-300 transition-colors"
          >
            View Order History
          </Link>
        </div>

      </div>
    </main>
  )
}

export default function OrderPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={24} strokeWidth={1} className="animate-spin text-slate-400" />
      </main>
    }>
      <OrderPageInner />
    </Suspense>
  )
}