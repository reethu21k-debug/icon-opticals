'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Eye,
  ChevronDown,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Circle,
  Download,
  Calendar,
  ShoppingBag,
  Info,
} from 'lucide-react'
import { getInvoiceViewUrl } from '@/lib/cloudinary-url'

type OrderStatus =
  | 'confirmed'
  | 'processing'
  | 'ready_for_pickup'
  | 'completed'
  | 'cancelled'
  | 'rejected'

const STATUS_OPTIONS: OrderStatus[] = [
  'confirmed',
  'processing',
  'ready_for_pickup',
  'completed',
  'cancelled',
  'rejected',
]

const PER_PAGE = 20

// ── Month / year helpers ──────────────────────────────────────────────────────

/**
 * Returns the list of {year, month (1-based), label} for the past 24 months,
 * newest first.  The current (in-progress) month is also included so admin
 * can see live data at any time; the "Download Report" button is only shown
 * for completed months.
 */
function buildMonthOptions() {
  const options: { year: number; month: number; label: string }[] = []
  const now = new Date()

  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    options.push({
      year:  d.getFullYear(),
      month: d.getMonth() + 1,   // 1-based
      label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    })
  }

  return options
}

/** Returns true when the given month/year is fully in the past (completed). */
function isMonthCompleted(year: number, month: number): boolean {
  const now = new Date()
  if (year < now.getFullYear()) return true
  if (year === now.getFullYear() && month < now.getMonth() + 1) return true
  return false
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orders, setOrders]             = useState<any[]>([])
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(0)
  const [loading, setLoading]           = useState(true)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')
  const [updatingId, setUpdatingId]     = useState<string | null>(null)
  const [updateError, setUpdateError]   = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)

  // Month / year filter — default to current month
  const monthOptions = useMemo(() => buildMonthOptions(), [])
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(-1)  // -1 = All time
  const [downloadingReport, setDownloadingReport] = useState(false)

  const selectedMonth = selectedMonthIdx >= 0 ? monthOptions[selectedMonthIdx] : null

  // ── Fetch orders ───────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (statusFilter) params.set('status', statusFilter)
    if (selectedMonth) {
      params.set('year',  String(selectedMonth.year))
      params.set('month', String(selectedMonth.month))
    }

    const res = await fetch(`/api/admin/orders?${params}`, {
      credentials: 'include',
    })
    if (res.ok) {
      const { orders: data, total: count } = await res.json()
      setOrders(data ?? [])
      setTotal(count ?? 0)
    } else {
      console.error('[admin/orders] fetch failed:', await res.text())
    }
    setLoading(false)
  }, [page, statusFilter, selectedMonth])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // ── Helpers ────────────────────────────────────────────────────────────────

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  // ── Status update ──────────────────────────────────────────────────────────

  const updateStatus = async (
    orderId: string,
    newStatus: OrderStatus,
    order: Record<string, unknown>,
  ) => {
    setUpdatingId(orderId)
    setUpdateError(null)

    // Optimistic update
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)),
    )

    const res = await fetch('/api/admin/update-order-status', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, status: newStatus }),
    })

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Unknown anomaly' }))
      setUpdateError(
        `Failed to modify manifest ${order.order_number as string}: ${error}`,
      )
      // Roll back optimistic update
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, status: order.status } : o)),
      )
      setUpdatingId(null)
      return
    }

    await fetchOrders()

    // Notify via WhatsApp when ready for pickup
    if (newStatus === 'ready_for_pickup' && !order.whatsapp_ready_sent) {
      const profileData = order.profile as { phone?: string; full_name?: string } | null
      if (profileData?.phone) {
        fetch('/api/admin/notify-ready', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: orderId,
            phone: profileData.phone,
            customer_name: profileData.full_name || 'Customer',
            order_number: order.order_number,
          }),
        }).catch(console.error)
      }
    }

    setUpdatingId(null)
  }

  // ── Download Report ────────────────────────────────────────────────────────

  const downloadReport = async () => {
    if (!selectedMonth) return
    setDownloadingReport(true)

    try {
      const params = new URLSearchParams({
        year:  String(selectedMonth.year),
        month: String(selectedMonth.month),
      })

      const res = await fetch(`/api/admin/monthly-report?${params}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
        setUpdateError(`Report generation failed: ${error}`)
        return
      }

      // Stream the PDF blob and trigger a local download
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `icon-opticals-report-${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[downloadReport]', err)
      setUpdateError('Could not download the report. Please try again.')
    } finally {
      setDownloadingReport(false)
    }
  }

  // ── Derived flags ──────────────────────────────────────────────────────────

  const showDownloadButton =
    selectedMonth !== null && isMonthCompleted(selectedMonth.year, selectedMonth.month)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[1400px] mx-auto w-full relative z-10 font-sans">

      {/* ── Dashboard Header ─────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between mb-10 gap-6 border-b border-slate-200/50 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/60 backdrop-blur-md rounded-xl shadow-sm border border-white">
              <ShoppingBag size={18} strokeWidth={2} className="text-slate-500" />
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold">Order Management</p>
          </div>
          <h1
            className="text-4xl md:text-5xl font-light text-slate-900 tracking-tight mb-3"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            Confirmed Orders
          </h1>
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-500">
            {selectedMonth
              ? `${total} Manifests · ${selectedMonth.label}`
              : `${total} Registered Manifests`}
          </p>
        </div>

        {/* ── Control Panel ────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 xl:gap-4">

          {/* Refresh */}
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-white/70 backdrop-blur-md border border-white shadow-sm rounded-xl text-[10px] uppercase tracking-[0.15em] font-bold text-slate-600 hover:bg-white hover:text-slate-900 transition-all disabled:opacity-40"
          >
            <RefreshCw size={14} strokeWidth={2} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Synchronize</span>
          </button>

          {/* Month filter */}
          <div className="relative group">
            <Calendar
              size={14}
              strokeWidth={2}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-700 transition-colors pointer-events-none"
            />
            <select
              value={selectedMonthIdx}
              onChange={e => {
                setSelectedMonthIdx(Number(e.target.value))
                setPage(0)
              }}
              className="w-full sm:w-auto bg-white/70 backdrop-blur-md border border-white shadow-sm rounded-xl pl-10 pr-10 py-3.5 text-[10px] uppercase tracking-[0.15em] font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-400/10 appearance-none cursor-pointer hover:bg-white transition-all"
            >
              <option value={-1}>ALL TIME</option>
              {monthOptions.map((opt, idx) => (
                <option key={`${opt.year}-${opt.month}`} value={idx}>
                  {opt.label.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              strokeWidth={2}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-700 transition-colors pointer-events-none"
            />
          </div>

          {/* Status filter */}
          <div className="relative group">
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value as OrderStatus | '')
                setPage(0)
              }}
              className="w-full sm:w-auto bg-white/70 backdrop-blur-md border border-white shadow-sm rounded-xl px-5 py-3.5 pr-10 text-[10px] uppercase tracking-[0.15em] font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-400/10 appearance-none cursor-pointer hover:bg-white transition-all"
            >
              <option value="">ALL STATUSES</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              strokeWidth={2}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-700 transition-colors pointer-events-none"
            />
          </div>

          {/* Download Report — only for completed months */}
          {showDownloadButton && (
            <button
              onClick={downloadReport}
              disabled={downloadingReport}
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-slate-900 shadow-md text-white text-[10px] uppercase tracking-[0.15em] font-bold rounded-xl hover:bg-slate-800 hover:-translate-y-0.5 hover:shadow-lg transition-all disabled:opacity-50 disabled:hover:translate-y-0 whitespace-nowrap btn-shine relative overflow-hidden"
            >
              {downloadingReport ? (
                <Loader2 size={14} strokeWidth={2} className="animate-spin" />
              ) : (
                <Download size={14} strokeWidth={2} />
              )}
              {downloadingReport ? 'Generating…' : 'Download Report'}
            </button>
          )}
        </div>
      </div>

      {/* ── Month info banner (current / in-progress month) ──── */}
      {selectedMonth && !isMonthCompleted(selectedMonth.year, selectedMonth.month) && (
        <div className="mb-8 px-6 py-4 border border-slate-200/60 bg-white/50 backdrop-blur-md rounded-2xl flex items-center gap-4 shadow-sm animate-in fade-in">
          <div className="p-1.5 bg-white rounded-lg shadow-sm">
            <Info size={16} strokeWidth={2} className="text-slate-500 flex-shrink-0" />
          </div>
          <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-slate-600">
            {selectedMonth.label} is currently in progress. The official ledger report will be available for download once the month concludes.
          </p>
        </div>
      )}

      {/* ── Error Output ─────────────────────────────────────── */}
      {updateError && (
        <div className="mb-8 p-5 bg-rose-50/80 backdrop-blur-md border border-rose-200/60 rounded-2xl flex items-start justify-between shadow-sm animate-in fade-in">
          <div className="flex items-start gap-4">
            <div className="p-1.5 bg-rose-100 rounded-lg mt-0.5">
              <AlertCircle size={16} strokeWidth={2} className="text-rose-600 flex-shrink-0" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-rose-900 mb-1">Update Failed</p>
              <p className="text-[11px] font-medium text-rose-700/90 leading-relaxed">{updateError}</p>
            </div>
          </div>
          <button onClick={() => setUpdateError(null)} className="text-rose-400 hover:text-rose-900 p-1.5 hover:bg-rose-100 rounded-full transition-colors mt-0.5">
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* ── Ledger Table ─────────────────────────────────────── */}
      <div className="bg-white/60 backdrop-blur-3xl border border-white/80 shadow-[0_8px_40px_rgba(15,23,42,0.04)] rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left min-w-[1100px]">
            <thead className="border-b border-slate-200/50 bg-white/40 backdrop-blur-md">
              <tr>
                {['Reference', 'Client', 'Settlement', 'Status', 'Dispatch', 'Date', 'Manage'].map((h, i) => (
                  <th
                    key={h}
                    className={`py-5 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap ${i === 0 ? 'px-8' : 'px-6'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 bg-transparent">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className={`py-6 ${j === 0 ? 'px-8' : 'px-6'}`}>
                        <div className="h-3 bg-slate-200/60 rounded-full w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-32 text-center">
                    <div className="w-20 h-20 bg-white/60 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5 border border-white shadow-sm">
                      <ShoppingBag size={32} strokeWidth={1.5} className="text-slate-300" />
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-500">
                      No Manifests Found
                      {selectedMonth ? ` for ${selectedMonth.label}` : ''}
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr
                    key={order.id}
                    className="hover:bg-white/80 transition-all duration-300 group hover:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] relative z-0 hover:z-10 hover:-translate-y-[1px]"
                  >
                    <td className="px-8 py-5 font-mono text-xs tracking-widest text-slate-900 font-bold whitespace-nowrap">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <p className="font-bold text-[11px] text-slate-900 uppercase tracking-wide mb-1">
                        {order.profile?.full_name || 'Anonymous'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold tracking-widest">
                        {order.profile?.phone || 'No Contact'}
                      </p>
                    </td>
                    <td className="px-6 py-5 font-bold text-slate-900 whitespace-nowrap text-sm">
                      ₹{order.total_amount?.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="relative inline-block w-full min-w-[150px]">
                        <select
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={e =>
                            updateStatus(order.id, e.target.value as OrderStatus, order)
                          }
                          className={`w-full bg-white/50 border rounded-xl px-4 py-3 text-[9px] font-bold uppercase tracking-[0.15em] appearance-none shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-slate-400/10 disabled:opacity-50 ${
                            updatingId === order.id
                              ? 'border-transparent text-slate-400'
                              : 'border-slate-200/60 text-slate-700 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>
                              {s.replace(/_/g, ' ').toUpperCase()}
                            </option>
                          ))}
                        </select>
                        {updatingId === order.id ? (
                          <Loader2
                            size={14}
                            strokeWidth={2}
                            className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-slate-500"
                          />
                        ) : (
                          <ChevronDown
                            size={14}
                            strokeWidth={2}
                            className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-slate-600 transition-colors"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col gap-2 text-[9px] uppercase tracking-widest font-bold">
                        <span
                          className={`flex items-center gap-2 ${
                            order.whatsapp_confirmed_sent ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {order.whatsapp_confirmed_sent ? (
                            <Check size={12} strokeWidth={3} className="text-emerald-500" />
                          ) : (
                            <Circle size={10} strokeWidth={2} />
                          )}{' '}
                          Confirmed
                        </span>
                        <span
                          className={`flex items-center gap-2 ${
                            order.whatsapp_ready_sent ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {order.whatsapp_ready_sent ? (
                            <Check size={12} strokeWidth={3} className="text-emerald-500" />
                          ) : (
                            <Circle size={10} strokeWidth={2} />
                          )}{' '}
                          Ready
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-[10px] uppercase tracking-widest font-bold text-slate-500 whitespace-nowrap">
                      {fmtDate(order.created_at)}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-sm text-slate-400 hover:text-slate-900 hover:border-slate-300 hover:shadow-md transition-all"
                          aria-label="Inspect Manifest"
                        >
                          <Eye size={16} strokeWidth={2.5} />
                        </button>
                        {order.invoice_url && (
                          <a
                            href={getInvoiceViewUrl(order.invoice_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-sm text-slate-400 hover:text-slate-900 hover:border-slate-300 hover:shadow-md transition-all"
                            aria-label="View Invoice Document"
                          >
                            <FileText size={16} strokeWidth={2.5} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────────── */}
        {total > PER_PAGE && (
          <div className="px-8 py-5 border-t border-slate-200/50 flex items-center justify-between bg-white/40 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Showing {page * PER_PAGE + 1} – {Math.min((page + 1) * PER_PAGE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-sm text-slate-600 disabled:opacity-30 hover:border-slate-300 hover:text-slate-900 transition-all"
                aria-label="Previous Page"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <button
                disabled={(page + 1) * PER_PAGE >= total}
                onClick={() => setPage(p => p + 1)}
                className="p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-sm text-slate-600 disabled:opacity-30 hover:border-slate-300 hover:text-slate-900 transition-all"
                aria-label="Next Page"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Overlay ────────────────────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300">
          <div className="bg-white/95 backdrop-blur-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-[0_24px_80px_rgba(15,23,42,0.2)] border border-white sm:rounded-[2.5rem] animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-500 flex flex-col">

            <div className="bg-white/60 border-b border-slate-200/50 px-8 py-7 flex items-start justify-between z-10 flex-shrink-0 sticky top-0 backdrop-blur-md">
              <div>
                <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-2 font-bold">
                  Manifest Details
                </p>
                <h2 className="text-3xl text-slate-900 tracking-tight font-mono">
                  {selectedOrder.order_number}
                </h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-900 p-2.5 bg-white rounded-full shadow-sm border border-slate-100 hover:bg-slate-50 hover:shadow-md transition-all -mr-2 -mt-1"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="p-6 md:p-10 space-y-8">
              <div className="bg-white/50 border border-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] rounded-3xl p-2">
                {[
                  ['Client Profile',  selectedOrder.profile?.full_name],
                  ['Contact Number',  selectedOrder.profile?.phone],
                  ['System Status',   selectedOrder.status?.replace(/_/g, ' ')],
                  ['Total Settled',   `₹${selectedOrder.total_amount?.toLocaleString('en-IN')}`],
                  ['Fulfillment',     selectedOrder.fulfillment_type],
                  ['Privilege Code',  selectedOrder.coupon_code || 'N/A'],
                  ['Total Discount',  selectedOrder.discount_amount > 0 ? `₹${selectedOrder.discount_amount}` : 'N/A'],
                  ['Date Authorized', fmtDate(selectedOrder.created_at)],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v], i, arr) => (
                    <div
                      key={k as string}
                      className={`flex justify-between items-center py-4 px-6 ${i !== arr.length - 1 ? 'border-b border-slate-200/50' : ''}`}
                    >
                      <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">
                        {k}
                      </span>
                      <span className="text-xs uppercase tracking-wide font-bold text-slate-900 text-right ml-4">
                        {v}
                      </span>
                    </div>
                  ))}
              </div>

              {selectedOrder.invoice_url && (
                <div className="bg-white/50 border border-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] rounded-3xl p-8 text-center">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-4 font-bold">Formal Documentation</p>
                  <a
                    href={getInvoiceViewUrl(selectedOrder.invoice_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white border border-slate-200/60 shadow-sm hover:shadow-md rounded-xl text-[10px] uppercase tracking-[0.15em] font-bold text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-all w-full"
                  >
                    <FileText size={14} strokeWidth={2.5} /> View Official Invoice
                  </a>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(148, 163, 184, 0.3);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(148, 163, 184, 0.5);
        }
        .btn-shine::after {
          content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent);
          transform: skewX(-20deg); transition: all 0.6s ease;
        }
        .btn-shine:hover::after { left: 150%; }
      `}} />
    </div>
  )
}