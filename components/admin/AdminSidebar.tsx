'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingBag, Store,
  CalendarCheck, Mail, LogOut, Menu, X, Tag, Clock, ReceiptText, Users,
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/order-requests', label: 'Order Requests', icon: Clock },
  { href: '/admin/orders', label: 'Confirmed Orders', icon: ShoppingBag },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/store-billing', label: 'Store Billing', icon: ReceiptText },
  { href: '/admin/stores', label: 'Boutiques', icon: Store },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/admin/coupons', label: 'Coupons', icon: Tag },
  { href: '/admin/marketing', label: 'Marketing', icon: Mail },
]

export default function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.push('/')
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-transparent relative z-10 font-sans">
      
      {/* ── Ambient Background Glow ──────────────────────────── */}
      <div className="absolute top-[-5%] left-[-10%] w-48 h-48 bg-rose-200/40 rounded-full blur-[80px] pointer-events-none" />
      
      {/* ── Brand Header ─────────────────────────────────────── */}
      <div className="px-8 py-10 border-b border-slate-200/50 relative">
        <Link href="/" className="flex flex-col items-start justify-center group mb-5 relative z-10">
          <span 
            className="text-3xl tracking-tight text-slate-900 transition-colors group-hover:text-slate-600 drop-shadow-sm" 
            style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
          >
            ICON
          </span>
          <span className="text-[8px] font-bold uppercase tracking-[0.4em] text-slate-400 mt-1 ml-0.5 group-hover:text-slate-500 transition-colors">
            Opticals
          </span>
        </Link>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/60 backdrop-blur-md border border-white rounded-lg shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-500">
            Command Center
          </p>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="flex-1 py-6 space-y-1.5 overflow-y-auto custom-scrollbar relative z-10 px-4">
        {NAV.map(item => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                active 
                  ? 'bg-white shadow-[0_8px_20px_rgba(15,23,42,0.04)] border border-white transform -translate-y-0.5' 
                  : 'bg-transparent border border-transparent hover:bg-white/40 hover:border-white/50 hover:shadow-sm'
              }`}
            >
              {/* Active Indicator Highlight */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-slate-900 rounded-r-md" />
              )}
              
              <div className={`p-2 rounded-xl transition-all duration-300 flex-shrink-0 ${
                active 
                  ? 'bg-slate-900 text-white shadow-md scale-105' 
                  : 'bg-white text-slate-400 border border-slate-100 shadow-sm group-hover:text-slate-700 group-hover:bg-slate-50 group-hover:scale-105'
              }`}>
                <item.icon 
                  size={16} 
                  strokeWidth={active ? 2 : 1.5} 
                />
              </div>
              
              <span className={`text-[10px] uppercase tracking-[0.15em] transition-all duration-300 ${
                active ? 'font-bold text-slate-900' : 'font-semibold text-slate-500 group-hover:text-slate-800'
              }`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* ── Footer: User Profile & Actions ───────────────────── */}
      <div className="border-t border-slate-200/50 bg-white/30 backdrop-blur-sm relative z-10">
        <div className="px-6 py-6">
          <div className="flex items-center gap-3 mb-6 bg-white/60 p-3 rounded-2xl border border-white shadow-sm">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-0.5">
                Active Session
              </p>
              <p className="text-xs font-bold text-slate-900 truncate">
                {userName}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-300 group btn-shine relative overflow-hidden"
          >
            <LogOut size={14} strokeWidth={2} className="transition-colors duration-300 group-hover:-translate-x-0.5" /> 
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold">Terminate Session</span>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(148, 163, 184, 0.4); }
        
        .btn-shine::after {
          content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent);
          transform: skewX(-20deg); transition: all 0.6s ease;
        }
        .btn-shine:hover::after { left: 150%; }
      `}} />

      {/* ── Desktop Sidebar ──────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 fixed inset-y-0 left-0 bg-white/70 backdrop-blur-3xl border-r border-white/60 shadow-[4px_0_24px_rgba(15,23,42,0.02)] z-30">
        <SidebarContent />
      </aside>

      {/* ── Mobile Toggle ────────────────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2.5 rounded-xl bg-white/80 backdrop-blur-md border border-white shadow-[0_4px_12px_rgba(15,23,42,0.05)] text-slate-700 hover:text-slate-900 hover:shadow-md transition-all duration-300"
        aria-label="Open Admin Menu"
      >
        <Menu size={20} strokeWidth={2} />
      </button>

      {/* ── Mobile Drawer ────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" 
            onClick={() => setMobileOpen(false)} 
          />
          
          {/* Drawer */}
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-white/90 backdrop-blur-3xl shadow-[20px_0_40px_rgba(15,23,42,0.1)] border-r border-white flex flex-col transition-transform duration-500 rounded-r-3xl overflow-hidden">
            <button 
              onClick={() => setMobileOpen(false)} 
              className="absolute top-7 right-6 text-slate-400 hover:text-slate-900 bg-white p-2 rounded-full shadow-sm border border-slate-100 transition-all z-50"
              aria-label="Close Menu"
            >
              <X size={16} strokeWidth={2} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}