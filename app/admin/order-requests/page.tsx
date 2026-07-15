'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Eye, Loader2, AlertCircle, RefreshCw, X, Check,
  ChevronLeft, ChevronRight, Phone, Mail, ExternalLink,
  Clock, ShieldCheck, ShieldX, CheckCircle2, FileText
} from 'lucide-react'

type OrderRequest = {
  id: string
  order_number: string
  user_id: string
  status: string
  payment_status: string
  total_amount: number
  fulfillment_type: 'pickup' | 'delivery'
  created_at: string
  coupon_code: string | null
  discount_amount: number
  payment_reference: string | null
  payment_screenshot_url: string | null
  notes: string | null
  profile: { full_name: string | null; phone: string | null } | null
  email: string | null
}

const PER_PAGE = 50

// Premium Status Styling Framework
const STATUS_STYLES: Record<string, string> = {
  pending_verification: 'bg-amber-50/80 border-amber-200/60 text-amber-700',
  verified: 'bg-emerald-50/80 border-emerald-200/60 text-emerald-700 font-bold',
  failed: 'bg-rose-50/80 border-rose-200/60 text-rose-700',
}

export default function OrderRequestsPage() {
  const [orders, setOrders]           = useState<OrderRequest[]>([])
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(0)
  const [loading, setLoading]         = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [toast, setToast]             = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<OrderRequest | null>(null)
  const [rejectReason, setRejectReason]   = useState('')
  const [rejectTarget, setRejectTarget]   = useState<OrderRequest | null>(null)
  const [errorMsg, setErrorMsg]           = useState<string | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      const res = await fetch(`/api/admin/order-requests?${params}`, { credentials: 'include' })
      if (res.ok) {
        const { orders: data, total: count } = await res.json()
        setOrders(data ?? [])
        setTotal(count ?? 0)
      } else {
        console.error('[order-requests] fetch failed:', await res.text())
      }
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  // ── Accept ──────────────────────────────────────────────────────────────
  const handleAccept = async (order: OrderRequest) => {
    if (processingId) return
    setProcessingId(order.id)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/accept`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({}),
      })

      if (res.ok) {
        showToast(`Order ${order.order_number} confirmed! Invoice generation in progress.`, 'success')
        setSelectedOrder(null)
        await fetchOrders()
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
        showToast(`Failed to accept order: ${error}`, 'error')
        setErrorMsg(error)
      }
    } catch (err) {
      console.error('[order-requests] accept error:', err)
      showToast('Network error — please try again.', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  // ── Reject ──────────────────────────────────────────────────────────────
  const openRejectModal = (order: OrderRequest) => {
    setRejectTarget(order)
    setRejectReason('')
    setSelectedOrder(null)
  }

  const handleReject = async () => {
    if (!rejectTarget || processingId) return
    setProcessingId(rejectTarget.id)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/admin/orders/${rejectTarget.id}/reject`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ reason: rejectReason || undefined }),
      })

      if (res.ok) {
        showToast(`Order ${rejectTarget.order_number} rejected. Customer notified.`, 'success')
        setRejectTarget(null)
        setRejectReason('')
        await fetchOrders()
      } else {
        const { error } = await res.json().catch(() => ({ error: 'Unknown error' }))
        showToast(`Failed to reject order: ${error}`, 'error')
        setErrorMsg(error)
      }
    } catch (err) {
      console.error('[order-requests] reject error:', err)
      showToast('Network error — please try again.', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto w-full relative z-10 font-sans">

      {/* ── Toast ───────────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-5 py-4 bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-[0_20px_40px_-10px_rgba(15,23,42,0.4)] rounded-2xl animate-in slide-in-from-bottom-8 duration-300"
        >
          <div className={`p-1.5 rounded-lg ${toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            {toast.type === 'success'
              ? <CheckCircle2 size={16} strokeWidth={2.5} />
              : <AlertCircle size={16} strokeWidth={2.5} />
            }
          </div>
          <p className="text-[11px] uppercase tracking-[0.1em] font-bold text-white">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-4 text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors">
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-6 border-b border-slate-200/50 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/60 backdrop-blur-md rounded-xl shadow-sm border border-white">
              <Clock size={18} strokeWidth={2} className="text-slate-500" />
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold">Verification Dashboard</p>
          </div>
          <h1
            className="text-4xl md:text-5xl font-light text-slate-900 tracking-tight mb-3"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            Order Requests
          </h1>
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-500">
            {total} Pending Verification
          </p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-white/70 backdrop-blur-md border border-white shadow-sm hover:shadow-md hover:bg-white text-slate-700 text-[10px] uppercase tracking-[0.2em] font-bold transition-all disabled:opacity-40"
        >
          <RefreshCw size={14} strokeWidth={2.5} className={loading ? 'animate-spin text-slate-400' : 'text-slate-500'} />
          <span className="hidden sm:inline">Refresh Data</span>
        </button>
      </div>

      {/* ── Error ───────────────────────────────────────────── */}
      {errorMsg && (
        <div className="mb-8 p-5 bg-rose-50/80 backdrop-blur-md border border-rose-200/60 rounded-2xl flex items-start justify-between shadow-sm animate-in fade-in">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-rose-100 rounded-xl mt-0.5">
               <AlertCircle size={16} strokeWidth={2.5} className="text-rose-600 flex-shrink-0" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-rose-900 mb-1">Action Failed</p>
              <p className="text-[11px] font-medium text-rose-700/90 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-900 p-1.5 hover:bg-rose-100 rounded-full transition-colors mt-0.5">
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="bg-white/60 backdrop-blur-3xl border border-white/80 shadow-[0_8px_40px_rgba(15,23,42,0.04)] rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left min-w-[1050px]">
            <thead className="border-b border-slate-200/50 bg-white/40 backdrop-blur-md">
              <tr>
                {[
                  'Order ID', 'Customer', 'Contact', 'Amount',
                  'Payment Status', 'UPI Txn ID', 'Date', 'Actions',
                ].map((h, i) => (
                  <th key={h} className={`py-5 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap ${i === 0 ? 'px-8' : 'px-6'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 bg-transparent">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className={`py-6 ${j === 0 ? 'px-8' : 'px-6'}`}>
                        <div className="h-3 bg-slate-200/60 rounded-full w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-32 text-center">
                    <div className="w-20 h-20 bg-white/60 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5 border border-white shadow-sm">
                      <ShieldCheck size={32} strokeWidth={1.5} className="text-slate-300" />
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-2">
                      No Pending Order Requests
                    </p>
                    <p className="text-xs text-slate-400 font-medium">
                      All orders have been successfully reviewed and processed.
                    </p>
                  </td>
                </tr>
              ) : orders.map(order => (
                <tr key={order.id} className="hover:bg-white/80 transition-all duration-300 cursor-pointer group hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative z-0 hover:z-10 hover:-translate-y-[1px]">

                  {/* Order Number */}
                  <td className="px-8 py-5 font-mono text-xs tracking-widest text-slate-900 font-bold whitespace-nowrap">
                    {order.order_number}
                  </td>

                  {/* Customer */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <p className="font-bold text-[11px] text-slate-900 uppercase tracking-wide mb-1.5">
                      {order.profile?.full_name || 'Anonymous'}
                    </p>
                    <span className="inline-flex items-center px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.15em] rounded-md bg-white border border-slate-200/60 text-slate-500 shadow-sm">
                      {order.fulfillment_type}
                    </span>
                  </td>

                  {/* Contact */}
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-2">
                      {order.profile?.phone && (
                        <span className="flex items-center gap-2 text-[11px] text-slate-700 font-bold">
                          <Phone size={12} strokeWidth={2} className="text-slate-400" /> {order.profile.phone}
                        </span>
                      )}
                      {order.email && (
                        <span className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                          <Mail size={12} strokeWidth={2} className="text-slate-400" />
                          <span className="truncate max-w-[160px]">{order.email}</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <p className="font-bold text-slate-900 text-[13px] mb-1">
                      ₹{order.total_amount?.toLocaleString('en-IN')}
                    </p>
                    {order.discount_amount > 0 && (
                      <span className="inline-block text-[10px] text-emerald-600 font-bold bg-emerald-50/50 px-2 py-0.5 rounded border border-emerald-100/50">
                        -{order.coupon_code} (₹{order.discount_amount})
                      </span>
                    )}
                  </td>

                  {/* Payment Status */}
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-[0.15em] shadow-sm ${
                      STATUS_STYLES[order.payment_status] || 'bg-white border-slate-200/60 text-slate-500'
                    }`}>
                      {order.payment_status === 'pending_verification' ? 'Pending' : order.payment_status.replace('_', ' ')}
                    </span>
                  </td>

                  {/* UPI Transaction ID */}
                  <td className="px-6 py-5">
                    {order.payment_reference ? (
                      <span className="text-[11px] text-slate-700 font-mono font-bold bg-white/50 border border-slate-200/60 px-3 py-1.5 rounded-lg shadow-sm tracking-wider">
                        {order.payment_reference}
                      </span>
                    ) : order.payment_screenshot_url ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-white/50 border border-slate-200/60 px-3 py-1.5 rounded-lg shadow-sm">
                        <ExternalLink size={10} strokeWidth={2.5} /> Screenshot only
                      </span>
                    ) : (
                      <span className="text-[10px] text-rose-400 font-bold tracking-widest">Not provided</span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <p className="text-[10px] uppercase tracking-widest text-slate-900 font-bold mb-1.5">{fmtDate(order.created_at)}</p>
                    <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5"><Clock size={10} strokeWidth={2.5}/> {fmtTime(order.created_at)}</p>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-sm text-slate-400 hover:text-slate-900 hover:border-slate-300 hover:shadow-md transition-all"
                        title="View Details"
                      >
                        <Eye size={16} strokeWidth={2.5} />
                      </button>

                      <button
                        onClick={() => handleAccept(order)}
                        disabled={processingId === order.id}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 shadow-md text-white text-[9px] uppercase tracking-[0.15em] font-bold hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed btn-shine relative overflow-hidden"
                      >
                        {processingId === order.id ? (
                          <Loader2 size={14} strokeWidth={2.5} className="animate-spin" />
                        ) : (
                          <ShieldCheck size={14} strokeWidth={2.5} />
                        )}
                        Accept
                      </button>

                      <button
                        onClick={() => openRejectModal(order)}
                        disabled={processingId === order.id}
                        className="p-2.5 rounded-xl border border-rose-200/60 bg-rose-50/50 text-rose-500 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Reject Order"
                      >
                        <ShieldX size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────────── */}
        {total > PER_PAGE && (
          <div className="px-8 py-5 border-t border-slate-200/50 flex items-center justify-between bg-white/40 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Showing {page * PER_PAGE + 1} – {Math.min((page + 1) * PER_PAGE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-sm text-slate-600 disabled:opacity-30 hover:border-slate-300 hover:text-slate-900 transition-all">
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <button disabled={(page + 1) * PER_PAGE >= total} onClick={() => setPage(p => p + 1)} className="p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-sm text-slate-600 disabled:opacity-30 hover:border-slate-300 hover:text-slate-900 transition-all">
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Order Detail Modal ──────────────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300">
          <div className="bg-white/95 backdrop-blur-3xl w-full max-w-2xl max-h-[95vh] overflow-hidden shadow-[0_24px_80px_rgba(15,23,42,0.2)] border border-white sm:rounded-[2.5rem] animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-500 flex flex-col">

            <div className="bg-white/60 border-b border-slate-200/50 px-8 py-7 flex items-start justify-between z-10 flex-shrink-0">
              <div>
                <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-2 font-bold">Request Dossier</p>
                <h2 className="text-3xl text-slate-900 tracking-tight font-mono">{selectedOrder.order_number}</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-900 p-2.5 bg-white rounded-full shadow-sm border border-slate-100 hover:bg-slate-50 hover:shadow-md transition-all -mr-2 -mt-1">
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar space-y-8">
              
              {/* ── UPI Transaction ID Verification Callout ──────── */}
              {(selectedOrder.payment_reference || selectedOrder.payment_screenshot_url) ? (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-emerald-100 rounded-xl flex-shrink-0">
                      <ShieldCheck size={18} strokeWidth={2.5} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] uppercase tracking-[0.25em] font-bold text-emerald-700 mb-1.5">
                        UPI Payment Submitted
                      </p>
                      {selectedOrder.payment_reference && (
                        <>
                          <p className="text-[10px] text-emerald-700/80 font-medium mb-2">
                            Cross-check this Transaction ID in your UPI app / bank portal before accepting:
                          </p>
                          <div className="bg-white border border-emerald-200 rounded-xl px-5 py-3 flex items-center justify-between gap-3">
                            <span className="font-mono font-bold text-slate-900 text-sm tracking-wider break-all">
                              {selectedOrder.payment_reference}
                            </span>
                            <button
                              onClick={() => navigator.clipboard?.writeText(selectedOrder.payment_reference!)}
                              title="Copy Transaction ID"
                              className="text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0 p-1.5 hover:bg-slate-100 rounded-lg"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                              </svg>
                            </button>
                          </div>
                          <p className="text-[9px] text-emerald-600/70 mt-2 font-medium">
                            Verify amount: ₹{selectedOrder.total_amount?.toLocaleString('en-IN')} · Customer: {selectedOrder.profile?.full_name}
                          </p>
                        </>
                      )}
                      {selectedOrder.payment_screenshot_url && (
                        <a
                          href={selectedOrder.payment_screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 rounded-xl text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-700 hover:bg-emerald-50 transition-all"
                        >
                          <ExternalLink size={12} strokeWidth={2.5} /> View Screenshot
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
                  <div className="p-2 bg-amber-100 rounded-xl flex-shrink-0">
                    <Clock size={16} strokeWidth={2.5} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-amber-700 mb-1">
                      No Transaction ID Provided
                    </p>
                    <p className="text-[10px] text-amber-600/80 font-medium leading-relaxed">
                      Customer did not submit a UPI Transaction ID. Contact them before accepting.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-white/50 border border-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] rounded-3xl p-2">
                {[
                  ['Client Profile',    selectedOrder.profile?.full_name],
                  ['Contact Number',    selectedOrder.profile?.phone],
                  ['Email Address',     selectedOrder.email],
                  ['Total Amount',      `₹${selectedOrder.total_amount?.toLocaleString('en-IN')}`],
                  ['Fulfillment',       selectedOrder.fulfillment_type],
                  ['Coupon Applied',    selectedOrder.coupon_code || 'None'],
                  ['Discount Value',    selectedOrder.discount_amount > 0 ? `₹${selectedOrder.discount_amount}` : 'None'],
                  ['UPI Txn ID',        selectedOrder.payment_reference || 'Not provided'],
                  ['Timestamp',         `${fmtDate(selectedOrder.created_at)} at ${fmtTime(selectedOrder.created_at)}`],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v], i, arr) => (
                    <div key={k as string} className={`flex justify-between items-center py-4 px-6 ${i !== arr.length - 1 ? 'border-b border-slate-200/50' : ''}`}>
                      <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400">{k}</span>
                      <span className={`text-xs font-bold text-right ml-4 max-w-[60%] leading-snug ${k === 'UPI Txn ID' && selectedOrder.payment_reference ? 'font-mono text-slate-900 tracking-wider' : 'text-slate-900'}`}>{v}</span>
                    </div>
                  ))}
              </div>

              {selectedOrder.notes && (
                <div className="bg-white/60 border border-slate-200/60 rounded-3xl p-8 shadow-sm flex items-start gap-5">
                  <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100">
                    <FileText size={18} strokeWidth={2} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-900 mb-2">Client Notes</p>
                    <p className="text-[12px] text-slate-600 font-medium italic leading-relaxed">&quot;{selectedOrder.notes}&quot;</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={() => openRejectModal(selectedOrder)}
                  disabled={processingId === selectedOrder.id}
                  className="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-xl border border-rose-200/60 bg-rose-50/50 text-rose-600 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300 transition-all disabled:opacity-50"
                >
                  <ShieldX size={16} strokeWidth={2.5} /> Reject Request
                </button>
                <button
                  onClick={() => handleAccept(selectedOrder)}
                  disabled={processingId === selectedOrder.id}
                  className="flex-[2] flex items-center justify-center gap-2.5 py-4 rounded-xl bg-slate-900 shadow-lg hover:shadow-xl text-white text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-slate-800 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 btn-shine relative overflow-hidden"
                >
                  {processingId === selectedOrder.id ? (
                    <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={16} strokeWidth={2.5} />
                  )}
                  Authorize & Accept Order
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Reject Reason Modal ─────────────────────────────── */}
      {rejectTarget && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-white/95 backdrop-blur-3xl w-full max-w-lg shadow-[0_24px_80px_rgba(15,23,42,0.2)] border border-white rounded-[2.5rem] animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col">
            
            <div className="border-b border-slate-200/50 bg-white/60 px-8 py-7 flex justify-between items-start">
              <div>
                <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-2 font-bold">Confirm Rejection</p>
                <h3 className="text-3xl text-slate-900 font-mono tracking-tight">{rejectTarget.order_number}</h3>
              </div>
            </div>
            
            <div className="p-8">
              <div className="flex items-start gap-4 mb-8 p-5 rounded-2xl bg-rose-50/50 border border-rose-100">
                 <div className="p-1.5 bg-rose-100 rounded-xl">
                   <AlertCircle size={16} strokeWidth={2.5} className="text-rose-600 flex-shrink-0" />
                 </div>
                 <p className="text-xs text-rose-800/80 leading-relaxed font-bold mt-1">
                   The customer will be notified by email and WhatsApp. You may optionally provide a reason for the rejection.
                 </p>
              </div>
              
              <label className="block text-[9px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-3 px-1">
                Rejection Reason <span className="normal-case tracking-widest font-semibold">(Optional)</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Payment screenshot could not be verified..."
                rows={3}
                className="w-full bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-xl px-5 py-4 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 resize-none transition-all shadow-sm"
              />
              
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <button
                  onClick={() => { setRejectTarget(null); setRejectReason('') }}
                  className="flex-1 py-4 rounded-xl border border-slate-200/60 bg-white shadow-sm text-[10px] uppercase tracking-[0.2em] font-bold text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!!processingId}
                  className="flex-[2] flex items-center justify-center gap-2.5 py-4 rounded-xl bg-rose-600 shadow-md hover:shadow-lg text-white text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-rose-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 btn-shine relative overflow-hidden"
                >
                  {processingId ? (
                    <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
                  ) : (
                    <ShieldX size={16} strokeWidth={2.5} />
                  )}
                  Confirm Rejection
                </button>
              </div>
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