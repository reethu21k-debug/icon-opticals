import { createServerClientInstance } from '@/lib/supabase'
import { ShoppingBag, Package, Users, TrendingUp, ChevronRight, Activity } from 'lucide-react'
import Link from 'next/link'

async function getDashboardStats() {
  const supabase = await createServerClientInstance()
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const [orders, products, users, monthRevenue] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('total_amount').gte('created_at', monthStart).neq('status', 'cancelled'),
  ])
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const revenue = ((monthRevenue.data || []) as any[]).reduce((s: number, o: { total_amount: number }) => s + (o.total_amount || 0), 0)
  return { totalOrders: orders.count || 0, activeProducts: products.count || 0, totalUsers: users.count || 0, monthRevenue: revenue }
}

async function getRecentOrders() {
  const supabase = await createServerClientInstance()
  const { data } = await supabase
    .from('orders')
    .select('id, order_number, status, total_amount, created_at, profile:profiles(full_name)')
    .order('created_at', { ascending: false })
    .range(0, 4)
  return (data || []) as Record<string, unknown>[]
}

// Elevated Glassmorphic Status Framework
const STATUS_STYLES: Record<string, string> = {
  pending:          'bg-amber-50/80 border-amber-200/60 text-amber-700',
  confirmed:        'bg-emerald-50/80 border-emerald-200/60 text-emerald-700 font-bold',
  processing:       'bg-blue-50/80 border-blue-200/60 text-blue-700',
  ready_for_pickup: 'bg-slate-900 border-slate-900 text-white shadow-md',
  completed:        'bg-slate-50/80 border-slate-200/60 text-slate-500',
  cancelled:        'bg-rose-50/80 border-rose-200/60 text-rose-600 line-through',
}

export default async function AdminDashboard() {
  const [stats, recentOrders] = await Promise.all([getDashboardStats(), getRecentOrders()])
  
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 font-sans relative z-10">
      
      {/* ── Dashboard Header ─────────────────────────────────── */}
      <div className="mb-8 md:mb-12 border-b border-slate-200/50 pb-6 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-white/60 backdrop-blur-md rounded-xl shadow-sm border border-white">
            <Activity size={18} strokeWidth={2} className="text-slate-500" />
          </div>
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400 font-bold">
            Real-time Operations
          </p>
        </div>
        <h1 
          className="text-3xl sm:text-4xl md:text-5xl text-slate-900 tracking-tight"
          style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
        >
          Performance Metrics
        </h1>
      </div>

      {/* ── Metrics Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10 lg:mb-14">
        {[
          { label: 'Total Volume', value: stats.totalOrders.toLocaleString('en-IN'), icon: ShoppingBag, delay: 'delay-75' },
          { label: 'Boutique Catalog', value: stats.activeProducts.toLocaleString('en-IN'), icon: Package, delay: 'delay-100' },
          { label: 'Client Manifest', value: stats.totalUsers.toLocaleString('en-IN'), icon: Users, delay: 'delay-150' },
          { label: 'Settled Revenue (MTD)', value: `₹${stats.monthRevenue.toLocaleString('en-IN')}`, icon: TrendingUp, delay: 'delay-200' },
        ].map((stat, i) => (
          <div 
            key={stat.label} 
            className={`bg-white/60 backdrop-blur-2xl border border-white/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)] rounded-[2rem] p-6 sm:p-8 flex flex-col justify-between group hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-10px_rgba(15,23,42,0.08)] hover:bg-white/80 transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 ${stat.delay} relative overflow-hidden`}
          >
            {/* Subtle top glare effect */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
            
            <div className="flex justify-between items-start mb-6 md:mb-8 relative z-10">
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.15em] font-bold text-slate-400 max-w-[70%] leading-relaxed">
                {stat.label}
              </span>
              <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100/60 group-hover:scale-110 transition-transform duration-500 shrink-0">
                <stat.icon size={18} strokeWidth={2} className="text-slate-400 group-hover:text-slate-900 transition-colors duration-300" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-light text-slate-900 tracking-tight font-mono relative z-10 truncate">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Recent Activity Ledger ───────────────────────────── */}
      <div className="bg-white/60 backdrop-blur-2xl border border-white/80 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.05)] rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
        
        <div className="px-4 sm:px-6 md:px-10 py-6 sm:py-8 border-b border-slate-200/50 bg-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.2em] font-bold text-slate-900 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            Recent Client Manifest
          </h2>
          <Link 
            href="/admin/orders" 
            className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-600 bg-white border border-slate-200/60 shadow-sm px-4 py-2.5 sm:py-2 rounded-xl hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all flex items-center justify-center sm:justify-start gap-2 group w-full sm:w-fit"
          >
            View All Ledgers <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        
        <div className="divide-y divide-slate-100/60">
          {recentOrders.length === 0 ? (
            <div className="px-4 sm:px-10 py-12 sm:py-16 text-center">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-bold text-slate-400">No recent activity</p>
            </div>
          ) : (
            recentOrders.map((order, i) => (
              <div 
                key={order.id as string} 
                className="px-4 sm:px-6 md:px-10 py-5 sm:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/80 transition-colors duration-300 group"
              >
                <div className="space-y-2 sm:space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <p className="font-mono text-sm tracking-widest text-slate-900 font-bold">
                      {order.order_number as string}
                    </p>
                    {i === 0 && <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[9px] uppercase tracking-widest text-slate-500 font-semibold font-sans">Latest</span>}
                  </div>
                  <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 flex flex-wrap items-center gap-2">
                    <span className="text-slate-700 truncate max-w-[150px] sm:max-w-none">
                      {(order.profile as Record<string, string> | null)?.full_name || 'Anonymous Client'}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 hidden sm:block" />
                    <span className="uppercase text-[9px] sm:text-[10px] tracking-wider font-semibold text-slate-400">
                      {new Date(order.created_at as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </p>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 sm:gap-6 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 md:border-transparent mt-2 md:mt-0">
                  <span className={`text-[9px] uppercase tracking-[0.1em] sm:tracking-[0.15em] px-3 py-1.5 rounded-lg border font-bold text-center whitespace-nowrap ${STATUS_STYLES[order.status as string] || 'bg-white border-slate-200 text-slate-500'}`}>
                    {(order.status as string).replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-slate-900 text-sm sm:text-base tracking-wide bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm whitespace-nowrap">
                      ₹{(order.total_amount as number).toLocaleString('en-IN')}
                    </span>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-900 transition-colors hidden md:block shrink-0" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  )
}