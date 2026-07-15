'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ShoppingBag, ChevronRight, FileText, Loader2, Search } from 'lucide-react'
import { getInvoiceViewUrl } from '@/lib/cloudinary-url'

// Status Styles
const STATUS_STYLES: Record<string, string> = {
  pending_admin_approval: 'bg-amber-50 border-amber-400 text-amber-700',
  pending:          'border-slate-300 text-slate-500',
  confirmed:        'border-slate-900 text-slate-900 font-semibold',
  rejected:         'bg-red-50 border-red-400 text-red-700',
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

export default function OrdersPage() {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login?redirect=/account/orders'); return }
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, status, total_amount, created_at, invoice_url, order_items(product_snapshot, quantity)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(0, 19)
      setOrders(data || [])
      setLoading(false)
    }
    init()
  }, [router])

  if (loading) return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Loader2 size={24} strokeWidth={1} className="animate-spin text-slate-900 mb-4" />
      <p className="text-[9px] uppercase tracking-[0.2em] font-medium text-slate-500">Retrieving Ledger</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-slate-50 py-16 md:py-24">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6">
        
        {/* ── Breadcrumb & Header ──────────────────────────────── */}
        <div className="mb-12 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/account" className="text-[9px] uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Client Portal</Link>
            <ChevronRight size={12} strokeWidth={1.5} className="text-slate-300" />
            <span className="text-[9px] uppercase tracking-widest font-semibold text-slate-900">Transaction Ledger</span>
          </div>
          
          <h1 
            className="text-4xl text-slate-900 tracking-tight mb-2"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            Transaction Ledger
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-medium">
            Your Purchase History
          </p>
        </div>

        {orders.length === 0 ? (
          /* ── Empty State ─────────────────────────────────────── */
          <div className="bg-white border border-slate-200 shadow-2xl p-16 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <ShoppingBag size={48} strokeWidth={1} className="mx-auto text-slate-300 mb-6" />
            <h2 
              className="text-2xl text-slate-900 tracking-tight mb-4"
              style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
            >
              Ledger is Empty
            </h2>
            <p className="text-xs text-slate-500 font-light mb-10 leading-relaxed max-w-sm mx-auto">
              Your transaction history contains no active records. Explore our collections to initiate your first acquisition.
            </p>
            <Link 
              href="/products" 
              className="inline-flex items-center justify-center gap-3 py-4 px-10 bg-slate-900 hover:bg-slate-800 text-white text-[10px] uppercase tracking-[0.2em] font-medium transition-colors"
            >
              <Search size={14} strokeWidth={1.5} /> View Catalog
            </Link>
          </div>
        ) : (
          /* ── Ledger Records ──────────────────────────────────── */
          <div className="space-y-6">
            {orders.map(order => (
              <div 
                key={order.id} 
                className="bg-white border border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-500 p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-8">
                  
                  {/* Record Details */}
                  <div>
                    <div className="flex flex-wrap items-center gap-4 mb-3">
                      <p className="font-mono text-sm tracking-widest text-slate-900 font-medium">
                        {order.order_number}
                      </p>
                      <span className={`text-[9px] uppercase tracking-[0.15em] px-3 py-1 border ${STATUS_STYLES[order.status] || 'border-slate-200 text-slate-500'}`}>
                        {STATUS_LABELS[order.status] ?? order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-4">
                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    
                    <div className="text-[11px] text-slate-600 font-light leading-relaxed">
                      <span className="font-medium text-slate-900">
                        {order.order_items?.length || 0} {order.order_items?.length !== 1 ? 'Items' : 'Item'}
                      </span>
                      {order.order_items?.[0]?.product_snapshot?.name && (
                        <>
                          <span className="mx-2 text-slate-300">|</span>
                          <span className="italic">{order.order_items[0].product_snapshot.name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Financial & Actions */}
                  <div className="sm:text-right flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-end gap-6 sm:gap-4 flex-shrink-0 pt-6 sm:pt-0 border-t border-slate-100 sm:border-0">
                    <p className="text-xl text-slate-900 tracking-wide font-medium">
                      ₹{order.total_amount.toLocaleString('en-IN')}
                    </p>
                    
                    <div className="flex items-center gap-4">
                      {order.invoice_url && (
                        <a
                          href={getInvoiceViewUrl(order.invoice_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] uppercase tracking-[0.2em] font-medium text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2"
                        >
                          <FileText size={12} strokeWidth={1.5} /> Document
                        </a>
                      )}
                      <div className="w-[1px] h-3 bg-slate-200 hidden sm:block" />
                      <Link 
                        href={`/orders/${order.id}`} 
                        className="text-[9px] uppercase tracking-[0.2em] font-medium text-slate-900 hover:text-slate-500 transition-colors flex items-center gap-2 group"
                      >
                        Inspect <ChevronRight size={12} strokeWidth={1.5} className="group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}