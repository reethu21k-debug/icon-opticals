'use client'

// app/admin/customers/page.tsx
//
// Customer Management — full list view with search, sort, filter,
// pagination, and a slide-in detail drawer with order history.

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Users, TrendingUp, ShoppingBag, IndianRupee,
  ChevronUp, ChevronDown, ChevronsUpDown, RefreshCw,
  X, ChevronLeft, ChevronRight, Phone, Mail, MapPin,
  Calendar, Clock, Package, Filter, ChevronRight as ChevronRightIcon,
  AlertCircle, Star, Award, BarChart2, Eye,
  ArrowUpRight, Check, Circle,
} from 'lucide-react'
import { getInvoiceViewUrl } from '@/lib/cloudinary-url'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CustomerSummary {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  created_at: string
  total_orders: number
  total_spent: number
  last_purchase_date: string | null
  completed_orders: number
  pending_orders: number
}

interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  frame_price: number
  lens_price: number
  total_price: number
  product_snapshot: {
    name?: string
    brand?: string
    images?: Array<{ url?: string; is_primary?: boolean }>
    frame_color?: string
    category?: string
  } | null
  lens_config: {
    power_type?: string
    package_code?: string
  } | null
}

interface Order {
  id: string
  order_number: string
  status: string
  total_amount: number
  discount_amount: number
  coupon_code: string | null
  fulfillment_type: string
  shipping_address: Record<string, string> | null
  invoice_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  items: OrderItem[]
}

interface CustomerDetail {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
  shipping_addresses: Array<Record<string, string>>
}

interface Analytics {
  total_orders: number
  completed_orders: number
  pending_orders: number
  cancelled_orders: number
  total_spent: number
  average_order_value: number
  top_products: Array<{ product_id: string; name: string; count: number; image: string | null }>
  last_active: string | null
}

type SortKey = 'name' | 'orders' | 'spent' | 'last_purchase' | 'created'
type SortDir = 'asc' | 'desc'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  '₹' + Math.round(n).toLocaleString('en-IN')

const fmtDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

const STATUS_COLORS: Record<string, string> = {
  pending_admin_approval: 'text-amber-700 bg-amber-50/50 border-amber-200/60',
  confirmed:              'text-emerald-700 bg-emerald-50/50 border-emerald-200/60',
  processing:             'text-slate-700 bg-slate-100/50 border-slate-200/60', // Soft Slate
  ready_for_pickup:       'text-purple-700 bg-purple-50/50 border-purple-200/60',
  completed:              'text-slate-700 bg-slate-50 border-slate-200/60',
  cancelled:              'text-rose-700 bg-rose-50/50 border-rose-200/60', // Soft Rose Quartz
  rejected:               'text-rose-700 bg-rose-50/50 border-rose-200/60',
  pending:                'text-amber-700 bg-amber-50/50 border-amber-200/60',
}

const STATUS_LABEL: Record<string, string> = {
  pending_admin_approval: 'Pending',
  confirmed:              'Confirmed',
  processing:             'Processing',
  ready_for_pickup:       'Ready',
  completed:              'Completed',
  cancelled:              'Cancelled',
  rejected:               'Rejected',
  pending:                'Pending',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SortButton({ col, current, dir, onClick }: {
  col: SortKey
  current: SortKey
  dir: SortDir
  onClick: (k: SortKey) => void
}) {
  const active = col === current
  return (
    <button
      onClick={() => onClick(col)}
      className="inline-flex items-center gap-1 group p-1 hover:bg-slate-200/50 rounded-md transition-colors"
    >
      {active
        ? dir === 'desc'
          ? <ChevronDown size={12} className="text-slate-900" />
          : <ChevronUp size={12} className="text-slate-900" />
        : <ChevronsUpDown size={12} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
      }
    </button>
  )
}

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 transition-transform hover:-translate-y-1">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-slate-50 rounded-xl border border-slate-100/50">
           <Icon size={16} strokeWidth={1.5} className="text-slate-500" />
        </div>
      </div>
      <p className="text-2xl font-light text-slate-900 tracking-tight mb-1">{value}</p>
      <p className="text-[9px] uppercase tracking-[0.15em] text-slate-400 font-medium">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Order Detail Panel ────────────────────────────────────────────────────────

function OrderDetailPanel({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="bg-white/50 backdrop-blur-md rounded-xl border border-slate-200/60 m-4 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/50 bg-white/40">
        <div>
          <p className="text-[11px] font-semibold text-slate-900 tracking-widest uppercase">
            {order.order_number}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{fmtDateTime(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[9px] uppercase tracking-[0.12em] font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[order.status] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-200/50 text-slate-400 hover:text-slate-900 transition-colors">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-slate-100/50">
        {order.items.map(item => {
          const snap  = item.product_snapshot ?? {}
          const img   = snap.images?.find(i => i.is_primary)?.url ?? snap.images?.[0]?.url ?? null
          return (
            <div key={item.id} className="flex gap-4 px-5 py-4 bg-white/30">
              {img ? (
                <div className="w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 shadow-sm">
                  <img src={img} alt={snap.name ?? ''} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-12 flex-shrink-0 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
                  <Package size={16} strokeWidth={1} className="text-slate-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-slate-900 truncate">{snap.name ?? 'Product'}</p>
                {snap.brand && (
                  <p className="text-[10px] text-slate-400 mt-0.5">{snap.brand}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  {snap.frame_color && (
                    <span className="text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 rounded-md bg-slate-100/50 text-slate-500">
                      {snap.frame_color}
                    </span>
                  )}
                  {item.lens_config?.power_type && item.lens_config.power_type !== 'frame_only' && (
                    <span className="text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 rounded-md bg-slate-100/50 text-slate-500">
                      {item.lens_config.power_type.replace(/_/g, ' ')}
                    </span>
                  )}
                  {item.lens_config?.package_code && (
                    <span className="text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 rounded-md bg-slate-100/50 text-slate-500">
                      {item.lens_config.package_code}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-[11px] font-medium text-slate-900">{fmt(item.total_price)}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">×{item.quantity}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Order meta */}
      <div className="px-5 py-4 border-t border-slate-200/50 bg-white/40 space-y-2">
        <div className="flex justify-between text-[10px] text-slate-500">
          <span className="uppercase tracking-[0.1em]">Subtotal</span>
          <span>{fmt((order.total_amount ?? 0) + (order.discount_amount ?? 0))}</span>
        </div>
        {(order.discount_amount ?? 0) > 0 && (
          <div className="flex justify-between text-[10px] text-emerald-600">
            <span className="uppercase tracking-[0.1em]">
              Discount {order.coupon_code ? `(${order.coupon_code})` : ''}
            </span>
            <span>−{fmt(order.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between text-[11px] font-semibold text-slate-900 pt-1.5 border-t border-slate-200/50">
          <span className="uppercase tracking-[0.1em]">Total</span>
          <span>{fmt(order.total_amount)}</span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-3">
          <span className="text-[10px] text-slate-500 uppercase tracking-[0.1em] flex items-center gap-1">
            {order.fulfillment_type === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}
          </span>
        </div>

        {order.shipping_address && (
          <div className="pt-2 flex gap-2">
            <MapPin size={12} strokeWidth={1.5} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              {[
                order.shipping_address.line1,
                order.shipping_address.line2,
                order.shipping_address.city,
                order.shipping_address.state,
                order.shipping_address.pincode,
              ].filter(Boolean).join(', ')}
            </p>
          </div>
        )}

        {order.invoice_url && (
          <a
            href={getInvoiceViewUrl(order.invoice_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] font-medium text-slate-700 bg-white border border-slate-200 shadow-sm rounded-lg px-4 py-2 hover:bg-slate-50 hover:text-slate-900 transition-all"
          >
            <Eye size={11} strokeWidth={2} />
            View Invoice
          </a>
        )}
      </div>
    </div>
  )
}

// ── Customer Detail Drawer ────────────────────────────────────────────────────

function CustomerDrawer({
  customerId,
  onClose,
}: {
  customerId: string
  onClose: () => void
}) {
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [customer, setCustomer]   = useState<CustomerDetail | null>(null)
  const [orders, setOrders]       = useState<Order[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/customers/${customerId}`, { credentials: 'include' })
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        setCustomer(data.customer)
        setOrders(data.orders ?? [])
        setAnalytics(data.analytics)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load customer')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [customerId])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[560px] lg:w-[620px] bg-white/95 backdrop-blur-2xl z-50 flex flex-col shadow-2xl sm:rounded-l-3xl border-l border-white/50 transform transition-transform duration-300">
        {/* Drawer Header */}
        <div className="flex items-start justify-between px-8 py-6 border-b border-slate-200/50 flex-shrink-0 bg-white/50 rounded-tl-3xl">
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 mb-1.5">
              Customer Profile
            </p>
            {loading ? (
              <div className="h-6 w-40 bg-slate-200/50 rounded-md animate-pulse" />
            ) : (
              <h2 className="text-xl font-light text-slate-900 tracking-wide">
                {customer?.full_name ?? 'Unknown'}
              </h2>
            )}
          </div>
          <button
            onClick={onClose}
            className="mt-1 p-2 rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-8 space-y-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-4 bg-slate-200/50 rounded-md animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 flex items-center gap-3 text-rose-600 bg-rose-50/50 m-6 rounded-2xl border border-rose-100">
              <AlertCircle size={16} />
              <p className="text-sm">{error}</p>
            </div>
          ) : customer ? (
            <div className="p-6 lg:p-8 space-y-10">

              {/* ── Contact Info ─────────────────────────────────────── */}
              <section className="bg-white/60 p-6 rounded-2xl border border-white/50 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 mb-5 font-medium">
                  Contact Information
                </p>
                <div className="space-y-4">
                  {customer.email && (
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                        <Mail size={13} strokeWidth={1.5} className="text-slate-500" />
                      </div>
                      <span className="text-[12px] text-slate-700 font-medium">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                        <Phone size={13} strokeWidth={1.5} className="text-slate-500" />
                      </div>
                      <span className="text-[12px] text-slate-700 font-medium">{customer.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                      <Calendar size={13} strokeWidth={1.5} className="text-slate-500" />
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Member since {fmtDate(customer.created_at)}
                    </span>
                  </div>
                  {analytics?.last_active && (
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                        <Clock size={13} strokeWidth={1.5} className="text-slate-500" />
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Last active {fmtDate(analytics.last_active)}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* ── Analytics ────────────────────────────────────────── */}
              {analytics && (
                <section>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 mb-4 font-medium px-2">
                    Customer Analytics
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/60 rounded-2xl border border-white/50 shadow-sm p-5">
                      <p className="text-2xl font-light text-slate-900">{fmt(analytics.total_spent)}</p>
                      <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400 mt-1.5">Lifetime Value</p>
                    </div>
                    <div className="bg-white/60 rounded-2xl border border-white/50 shadow-sm p-5">
                      <p className="text-2xl font-light text-slate-900">{fmt(analytics.average_order_value)}</p>
                      <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400 mt-1.5">Avg Order Value</p>
                    </div>
                    <div className="bg-white/60 rounded-2xl border border-white/50 shadow-sm p-5">
                      <p className="text-2xl font-light text-slate-900">{analytics.total_orders}</p>
                      <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400 mt-1.5">Total Orders</p>
                    </div>
                    <div className="bg-white/60 rounded-2xl border border-white/50 shadow-sm p-5">
                      <div className="flex gap-2 items-end">
                        <div className="space-y-1">
                          <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1.5"><Circle size={6} className="fill-emerald-600"/> {analytics.completed_orders} done</p>
                          <p className="text-[11px] font-medium text-amber-500 flex items-center gap-1.5"><Circle size={6} className="fill-amber-500"/> {analytics.pending_orders} pending</p>
                          <p className="text-[11px] font-medium text-rose-400 flex items-center gap-1.5"><Circle size={6} className="fill-rose-400"/> {analytics.cancelled_orders} cancelled</p>
                        </div>
                      </div>
                      <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400 mt-2.5 pt-2.5 border-t border-slate-100">Order Breakdown</p>
                    </div>
                  </div>

                  {/* Top products */}
                  {analytics.top_products.length > 0 && (
                    <div className="mt-6 bg-white/60 rounded-2xl border border-white/50 shadow-sm p-5">
                      <p className="text-[9px] uppercase tracking-[0.15em] text-slate-400 mb-4 font-medium">
                        Most Purchased
                      </p>
                      <div className="space-y-3">
                        {analytics.top_products.map(p => (
                          <div key={p.product_id} className="flex items-center gap-4">
                            {p.image ? (
                              <div className="w-10 h-8 flex-shrink-0 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 shadow-sm">
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-10 h-8 flex-shrink-0 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
                                <Package size={12} strokeWidth={1} className="text-slate-300" />
                              </div>
                            )}
                            <span className="flex-1 text-[11px] text-slate-700 truncate font-medium">{p.name}</span>
                            <span className="text-[11px] font-semibold text-slate-900 bg-slate-100 px-2 py-1 rounded-md">×{p.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* ── Shipping Addresses ───────────────────────────────── */}
              {customer.shipping_addresses?.length > 0 && (
                <section>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 mb-4 font-medium px-2">
                    Shipping Addresses
                  </p>
                  <div className="space-y-3">
                    {customer.shipping_addresses.map((addr, i) => (
                      <div key={i} className="flex gap-4 bg-white/60 rounded-2xl border border-white/50 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] p-5">
                        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <MapPin size={13} strokeWidth={1.5} className="text-slate-500" />
                        </div>
                        <div>
                          {addr.name && <p className="text-[12px] font-medium text-slate-800 mb-1">{addr.name}</p>}
                          <p className="text-[11px] text-slate-500 leading-relaxed max-w-[85%]">
                            {[addr.line1, addr.line2, addr.city, addr.state, addr.pincode]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                          {addr.phone && (
                            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5"><Phone size={10}/> {addr.phone}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Order History ─────────────────────────────────────── */}
              <section>
                <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 mb-4 font-medium px-2">
                  Purchase History ({orders.length})
                </p>
                {orders.length === 0 ? (
                  <div className="bg-white/60 rounded-2xl border border-white/50 p-8 text-center shadow-sm">
                    <ShoppingBag size={28} strokeWidth={1} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.1em]">No orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map(order => (
                      <div key={order.id} className="bg-white/70 rounded-2xl border border-white/50 shadow-sm overflow-hidden transition-all duration-300">
                        {/* Order summary row */}
                        <button
                          onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50/50 transition-colors text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-[12px] font-semibold text-slate-900 tracking-widest uppercase">
                                {order.order_number}
                              </span>
                              <span className={`text-[9px] uppercase tracking-[0.1em] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                {STATUS_LABEL[order.status] ?? order.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[10px] text-slate-500 flex items-center gap-1"><Calendar size={10}/> {fmtDate(order.created_at)}</span>
                              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Package size={10}/> {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right pr-2">
                            <p className="text-[13px] font-semibold text-slate-900">{fmt(order.total_amount)}</p>
                          </div>
                          <div className={`p-1.5 rounded-full transition-colors ${expandedOrder === order.id ? 'bg-slate-100 text-slate-900' : 'bg-slate-50 text-slate-400'}`}>
                             <ChevronDown
                               size={14}
                               strokeWidth={2}
                               className={`flex-shrink-0 transition-transform duration-300 ${expandedOrder === order.id ? 'rotate-180' : ''}`}
                             />
                          </div>
                        </button>

                        {/* Expanded order detail */}
                        <div className={`grid transition-all duration-300 ease-in-out ${expandedOrder === order.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                          <div className="overflow-hidden">
                            <OrderDetailPanel
                              order={order}
                              onClose={() => setExpandedOrder(null)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}

// ── Filter Panel ──────────────────────────────────────────────────────────────

function FilterPanel({
  filters,
  onChange,
  onClear,
  onClose,
}: {
  filters: {
    minSpent: string
    maxSpent: string
    dateFrom: string
    dateTo: string
    hasOrders: string
  }
  onChange: (key: string, val: string) => void
  onClear: () => void
  onClose: () => void
}) {
  return (
    <div className="absolute top-full right-0 mt-2 w-72 bg-white/90 backdrop-blur-2xl border border-white/50 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] rounded-2xl z-20 p-6 space-y-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-slate-900">Filters</p>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors">
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Has orders */}
      <div>
        <label className="text-[9px] uppercase tracking-[0.15em] text-slate-500 block mb-2">Customers</label>
        <select
          value={filters.hasOrders}
          onChange={e => onChange('hasOrders', e.target.value)}
          className="w-full bg-white/50 border border-slate-200/60 rounded-xl text-[11px] px-3 py-2.5 text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all"
        >
          <option value="">All customers</option>
          <option value="true">With orders only</option>
          <option value="false">No orders yet</option>
        </select>
      </div>

      {/* Spend range */}
      <div>
        <label className="text-[9px] uppercase tracking-[0.15em] text-slate-500 block mb-2">Total Spend</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min ₹"
            value={filters.minSpent}
            onChange={e => onChange('minSpent', e.target.value)}
            className="flex-1 bg-white/50 border border-slate-200/60 rounded-xl text-[11px] px-3 py-2.5 text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all"
          />
          <span className="text-slate-300 text-xs">—</span>
          <input
            type="number"
            placeholder="Max ₹"
            value={filters.maxSpent}
            onChange={e => onChange('maxSpent', e.target.value)}
            className="flex-1 bg-white/50 border border-slate-200/60 rounded-xl text-[11px] px-3 py-2.5 text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all"
          />
        </div>
      </div>

      {/* Date joined */}
      <div>
        <label className="text-[9px] uppercase tracking-[0.15em] text-slate-500 block mb-2">Registration Date</label>
        <div className="space-y-2">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => onChange('dateFrom', e.target.value)}
            className="w-full bg-white/50 border border-slate-200/60 rounded-xl text-[11px] px-3 py-2.5 text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => onChange('dateTo', e.target.value)}
            className="w-full bg-white/50 border border-slate-200/60 rounded-xl text-[11px] px-3 py-2.5 text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={onClear}
          className="flex-1 text-[9px] uppercase tracking-[0.15em] font-medium py-2.5 rounded-xl border border-slate-200 bg-white/50 text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors shadow-sm"
        >
          Clear All
        </button>
        <button
          onClick={onClose}
          className="flex-1 text-[9px] uppercase tracking-[0.15em] font-medium py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-md"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PER_PAGE = 25

export default function AdminCustomersPage() {
  const [customers, setCustomers]         = useState<CustomerSummary[]>([])
  const [total, setTotal]                 = useState(0)
  const [page, setPage]                   = useState(0)
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [sortKey, setSortKey]             = useState<SortKey>('created')
  const [sortDir, setSortDir]             = useState<SortDir>('desc')
  const [selectedId, setSelectedId]       = useState<string | null>(null)
  const [showFilters, setShowFilters]     = useState(false)
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [filters, setFilters] = useState({
    minSpent:  '',
    maxSpent:  '',
    dateFrom:  '',
    dateTo:    '',
    hasOrders: '',
  })

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const fetchCustomers = useCallback(async (p: number, q: string, sk: SortKey, sd: SortDir, f: typeof filters) => {
    setLoading(true)
    const params = new URLSearchParams({
      page:  String(p),
      sort:  sk,
      order: sd,
    })
    if (q)              params.set('search', q)
    if (f.minSpent)     params.set('min_spent', f.minSpent)
    if (f.maxSpent)     params.set('max_spent', f.maxSpent)
    if (f.dateFrom)     params.set('date_from', f.dateFrom)
    if (f.dateTo)       params.set('date_to', f.dateTo)
    if (f.hasOrders)    params.set('has_orders', f.hasOrders)

    try {
      const res = await fetch(`/api/admin/customers?${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setCustomers(data.customers ?? [])
        setTotal(data.total ?? 0)
      }
    } catch (e) {
      console.error('[admin/customers]', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setPage(0)
      fetchCustomers(0, search, sortKey, sortDir, filters)
    }, 350)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [search, sortKey, sortDir, filters, fetchCustomers])

  useEffect(() => {
    fetchCustomers(page, search, sortKey, sortDir, filters)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
    setPage(0)
  }

  const handleFilterChange = (key: string, val: string) => {
    setFilters(prev => ({ ...prev, [key]: val }))
    setPage(0)
  }

  const clearFilters = () => {
    setFilters({ minSpent: '', maxSpent: '', dateFrom: '', dateTo: '', hasOrders: '' })
    setPage(0)
  }

  const totalPages = Math.ceil(total / PER_PAGE)

  // Summary stats derived from current dataset
  const totalRevenue = customers.reduce((s, c) => s + c.total_spent, 0)
  const avgSpend     = customers.length ? totalRevenue / customers.length : 0
  const withOrders   = customers.filter(c => c.total_orders > 0).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 via-white to-rose-50/20 p-6 md:p-10 font-sans">
      <div className="max-w-[1400px] mx-auto">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="mb-10">
          <p className="text-[9px] uppercase tracking-[0.3em] text-slate-400 mb-2 font-medium">Admin Dashboard</p>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl md:text-4xl font-light text-slate-900 tracking-tight mb-2">
                Customers
              </h1>
              <p className="text-sm text-slate-500">
                {total.toLocaleString()} registered customer{total !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => fetchCustomers(page, search, sortKey, sortDir, filters)}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/70 backdrop-blur-md border border-white/50 shadow-sm rounded-xl text-[9px] uppercase tracking-[0.15em] font-medium text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900 transition-all disabled:opacity-40 h-[42px]"
            >
              <RefreshCw size={13} strokeWidth={2} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
          </div>
        </div>

        {/* ── Stats Row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard icon={Users}       label="Total Customers"    value={total.toLocaleString()} />
          <StatCard icon={ShoppingBag} label="With Orders"        value={withOrders.toLocaleString()} />
          <StatCard icon={IndianRupee} label="Revenue (this page)" value={fmt(totalRevenue)} />
          <StatCard icon={TrendingUp}  label="Avg Spend"          value={fmt(avgSpend)} />
        </div>

        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search size={14} strokeWidth={2} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              className="w-full pl-11 pr-4 py-3 bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm rounded-xl text-[12px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-400/10 transition-all h-[44px]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl border backdrop-blur-xl shadow-sm text-[9px] uppercase tracking-[0.15em] font-medium transition-all h-[44px] ${
                activeFilterCount > 0
                  ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                  : 'border-white/50 bg-white/70 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Filter size={13} strokeWidth={1.5} />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 text-[9px] font-bold flex items-center justify-center shadow-sm">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {showFilters && (
              <FilterPanel
                filters={filters}
                onChange={handleFilterChange}
                onClear={clearFilters}
                onClose={() => setShowFilters(false)}
              />
            )}
          </div>

          {/* Active filter pills */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-[0.1em] text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
            >
              <X size={11} strokeWidth={2.5} />
              Clear filters
            </button>
          )}
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <div className="bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200/60 bg-slate-50/50 backdrop-blur-md">
                  {/* Name */}
                  <th className="px-6 py-4 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase tracking-[0.15em] font-semibold text-slate-500">Customer</span>
                      <SortButton col="name" current={sortKey} dir={sortDir} onClick={handleSort} />
                    </div>
                  </th>
                  {/* Contact */}
                  <th className="px-6 py-4 text-left hidden md:table-cell">
                    <span className="text-[9px] uppercase tracking-[0.15em] font-semibold text-slate-500">Contact</span>
                  </th>
                  {/* Orders */}
                  <th className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[9px] uppercase tracking-[0.15em] font-semibold text-slate-500">Orders</span>
                      <SortButton col="orders" current={sortKey} dir={sortDir} onClick={handleSort} />
                    </div>
                  </th>
                  {/* Spent */}
                  <th className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[9px] uppercase tracking-[0.15em] font-semibold text-slate-500">Spent</span>
                      <SortButton col="spent" current={sortKey} dir={sortDir} onClick={handleSort} />
                    </div>
                  </th>
                  {/* Last purchase */}
                  <th className="px-6 py-4 text-left hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase tracking-[0.15em] font-semibold text-slate-500">Last Purchase</span>
                      <SortButton col="last_purchase" current={sortKey} dir={sortDir} onClick={handleSort} />
                    </div>
                  </th>
                  {/* Joined */}
                  <th className="px-6 py-4 text-left hidden xl:table-cell">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase tracking-[0.15em] font-semibold text-slate-500">Joined</span>
                      <SortButton col="created" current={sortKey} dir={sortDir} onClick={handleSort} />
                    </div>
                  </th>
                  {/* Action */}
                  <th className="px-6 py-4 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 bg-white/30">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-6 py-5">
                          <div className="h-3 bg-slate-200/60 rounded-full" style={{ width: `${50 + (j * 13) % 40}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-24 text-center bg-white/50">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                        <Users size={28} strokeWidth={1} className="text-slate-300" />
                      </div>
                      <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-slate-400">
                        {search || activeFilterCount ? 'No customers match your filters' : 'No customers yet'}
                      </p>
                    </td>
                  </tr>
                ) : customers.map(c => (
                  <tr
                    key={c.id}
                    className="hover:bg-white/80 transition-all cursor-pointer group hover:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] relative z-0 hover:z-10"
                    onClick={() => setSelectedId(c.id)}
                  >
                    {/* Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center flex-shrink-0 border border-slate-200/60 shadow-sm">
                          <span className="text-[12px] font-semibold text-slate-500 uppercase">
                            {c.full_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold text-slate-900 group-hover:text-slate-700 transition-colors">{c.full_name}</p>
                          {c.email && (
                            <p className="text-[11px] text-slate-500 mt-0.5 md:hidden truncate max-w-[140px]">{c.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Contact */}
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="space-y-1">
                        {c.email && (
                          <p className="text-[11px] text-slate-600 truncate max-w-[180px]">{c.email}</p>
                        )}
                        {c.phone && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1"><Phone size={9}/> {c.phone}</p>
                        )}
                      </div>
                    </td>
                    {/* Orders */}
                    <td className="px-6 py-4 text-right">
                      <div>
                        <p className="text-[12px] font-semibold text-slate-900">{c.total_orders}</p>
                        {c.total_orders > 0 && (
                          <p className="text-[10px] text-slate-400 mt-1 inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md">
                            <Check size={8} className="text-emerald-500"/> {c.completed_orders} done
                          </p>
                        )}
                      </div>
                    </td>
                    {/* Spent */}
                    <td className="px-6 py-4 text-right">
                      <p className="text-[12px] font-semibold text-slate-900">{fmt(c.total_spent)}</p>
                    </td>
                    {/* Last purchase */}
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-[11px] text-slate-500 bg-white/50 px-2.5 py-1 rounded-lg border border-slate-100/50">{fmtDate(c.last_purchase_date)}</span>
                    </td>
                    {/* Joined */}
                    <td className="px-6 py-4 hidden xl:table-cell">
                      <p className="text-[11px] text-slate-500">{fmtDate(c.created_at)}</p>
                    </td>
                    {/* Action */}
                    <td className="px-6 py-4">
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 ml-auto">
                        <ChevronRightIcon
                          size={14}
                          strokeWidth={2}
                          className="text-slate-400 group-hover:text-slate-900 transition-colors"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/60 bg-white/50 backdrop-blur-md">
              <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">
                Showing {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, total)} of {total}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-lg bg-white border border-slate-200/60 shadow-sm text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={13} strokeWidth={2} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                  const pg = totalPages <= 5
                    ? i
                    : page < 3 ? i
                    : page > totalPages - 3 ? totalPages - 5 + i
                    : page - 2 + i
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`w-8 h-8 rounded-lg text-[11px] font-semibold transition-all shadow-sm ${
                        pg === page
                          ? 'border border-slate-900 bg-slate-900 text-white'
                          : 'border border-slate-200/60 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {pg + 1}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-lg bg-white border border-slate-200/60 shadow-sm text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={13} strokeWidth={2} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Customer Detail Drawer ───────────────────────────────────────── */}
        {selectedId && (
          <CustomerDrawer
            customerId={selectedId}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
      
      {/* Global CSS required for hiding default scrollbars but keeping functionality in custom containers */}
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
      `}} />
    </div>
  )
}