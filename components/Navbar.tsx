'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Search, ShoppingBag, Heart, User, Menu, X, ShieldCheck, ChevronDown, ArrowRight, Eye, ReceiptText } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { BILLING_QUEUE_KEY } from '@/hooks/useAdminBilling'

// ── Nav Data ────────────────────────────────────────────────────
const MEGA_MENUS = [
  {
    href: '/products?category=eyeglasses',
    label: 'Eyeglasses',
    featured: [
      { href: '/products?category=eyeglasses&shape=rectangle', label: 'Rectangle' },
      { href: '/products?category=eyeglasses&shape=round',     label: 'Round'     },
      { href: '/products?category=eyeglasses&shape=square',    label: 'Square'    },
      { href: '/products?category=eyeglasses&shape=oval',      label: 'Oval'      },
      { href: '/products?category=eyeglasses&shape=cat-eye',   label: 'Cat-Eye'   },
      { href: '/products?category=eyeglasses&shape=geometric', label: 'Geometric' },
    ],
    collections: [
      { href: '/products?category=eyeglasses&frame=full-rim',  label: 'Full Rim'  },
      { href: '/products?category=eyeglasses&frame=half-rim',  label: 'Half Rim'  },
      { href: '/products?category=eyeglasses&frame=rimless',   label: 'Rimless'   },
    ],
  },
  {
    href: '/products?category=sunglasses',
    label: 'Sunglasses',
    featured: [
      { href: '/products?category=sunglasses&shape=aviator',   label: 'Aviator'   },
      { href: '/products?category=sunglasses&shape=wayfarer',  label: 'Wayfarer'  },
      { href: '/products?category=sunglasses&shape=rectangle', label: 'Rectangle' },
      { href: '/products?category=sunglasses&shape=round',     label: 'Round'     },
      { href: '/products?category=sunglasses&shape=cat-eye',   label: 'Cat-Eye'   },
      { href: '/products?category=sunglasses&shape=square',    label: 'Square'    },
    ],
    collections: [
      { href: '/products?category=sunglasses&gender=men',      label: "Men's"     },
      { href: '/products?category=sunglasses&gender=women',    label: "Women's"   },
      { href: '/products?category=sunglasses&gender=unisex',   label: 'Unisex'    },
    ],
  },
  {
    href: '/products?category=contact-lenses',
    label: 'Contacts',
    featured: [],
    collections: [],
  },
]

const SERVICE_LINKS = [
  { href: '/store',   label: 'Boutiques'     },
  { href: '/booking', label: 'Book Eye Test' },
]

const ANNOUNCEMENTS = [
  'Free BLU lenses on all eyeglasses',
  'Book your complimentary eye test today',
  'New collection — Handcrafted Italian frames now in',
]

export default function Navbar() {
  const pathname = usePathname()

  // ── Hide entirely on admin routes ──────────────────────────────
  const isAdminRoute = pathname?.startsWith('/admin')
  if (isAdminRoute) return null

  return <NavbarInner />
}

function NavbarInner() {
  const [userId, setUserId]               = useState<string | null>(null)
  const [isAdmin, setIsAdmin]             = useState(false)
  const [cartCount, setCartCount]         = useState(0)
  const [billingCount, setBillingCount]   = useState(0)
  const [searchOpen, setSearchOpen]       = useState(false)
  const [searchQuery, setSearchQuery]     = useState('')
  const [mobileOpen, setMobileOpen]       = useState(false)
  const [scrolled, setScrolled]           = useState(false)
  const [activeMenu, setActiveMenu]       = useState<string | null>(null)
  const [announcementIdx, setAnnouncementIdx] = useState(0)
  const [mobileExpanded, setMobileExpanded]   = useState<string | null>(null)

  const searchTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef    = useRef<HTMLInputElement>(null)
  const router       = useRouter()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = (mobileOpen || searchOpen) ? 'hidden' : 'unset'
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMobileOpen(false); setSearchOpen(false) }
    }
    window.addEventListener('keydown', handleEsc)
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleEsc)
    }
  }, [mobileOpen, searchOpen])

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50)
  }, [searchOpen])

  useEffect(() => {
    const t = setInterval(
      () => setAnnouncementIdx(i => (i + 1) % ANNOUNCEMENTS.length),
      4000
    )
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('search')
    if (q) setSearchQuery(q)
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    const readCount = () => {
      try {
        const raw = localStorage.getItem(BILLING_QUEUE_KEY)
        const q = raw ? JSON.parse(raw) : []
        setBillingCount(Array.isArray(q) ? q.length : 0)
      } catch { setBillingCount(0) }
    }
    readCount()
    const handleBillingEvent = () => readCount()
    window.addEventListener('adminBillingAdd', handleBillingEvent)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === BILLING_QUEUE_KEY) readCount()
    }
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('adminBillingAdd', handleBillingEvent)
      window.removeEventListener('storage', handleStorage)
    }
  }, [isAdmin])

  useEffect(() => {
    const supabase = createClient()
    const fetchUserData = async (uid: string) => {
      const [profileRes, cartRes] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', uid).single(),
        supabase.from('cart_items').select('quantity').eq('user_id', uid),
      ])
      setIsAdmin(profileRes.data?.role === 'admin')
      setCartCount(
        (cartRes.data || []).reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0)
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      setUserId(user?.id ?? null)
      if (user) fetchUserData(user.id)
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listener } = supabase.auth.onAuthStateChange((_: any, session: any) => {
      const u = session?.user
      setUserId(u?.id ?? null)
      if (u) fetchUserData(u.id)
      else { setCartCount(0); setIsAdmin(false) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      setSearchQuery(val)
      if (searchTimer.current) clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(() => {
        if (val.trim().length >= 2) router.replace(`/products?search=${encodeURIComponent(val.trim())}`)
      }, 400)
    },
    [router]
  )
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
    }
  }

  const openMenu  = (label: string) => {
    if (menuTimer.current) clearTimeout(menuTimer.current)
    setActiveMenu(label)
  }
  const closeMenu = () => {
    menuTimer.current = setTimeout(() => setActiveMenu(null), 120)
  }
  const keepMenu  = () => {
    if (menuTimer.current) clearTimeout(menuTimer.current)
  }

  return (
    <>
      {/* ══════════════ ANNOUNCEMENT BAR ══════════════ */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden h-9 flex items-center shadow-md">
        <div className="w-full text-center text-[9px] uppercase tracking-[0.25em] font-bold relative">
          {ANNOUNCEMENTS.map((msg, i) => (
            <span
              key={i}
              className="absolute inset-0 flex items-center justify-center transition-all duration-700"
              style={{
                opacity: i === announcementIdx ? 1 : 0,
                transform: i === announcementIdx ? 'translateY(0)' : 'translateY(8px)',
                filter: i === announcementIdx ? 'blur(0)' : 'blur(2px)',
              }}
            >
              {msg}
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════ MAIN HEADER ══════════════ */}
      <header
        className={`fixed top-9 left-0 right-0 z-40 transition-all duration-500 font-sans ${
          scrolled
            ? 'bg-white/70 backdrop-blur-2xl border-b border-white/60 shadow-[0_8px_30px_rgba(15,23,42,0.06)] py-1'
            : 'bg-white border-b border-slate-100 py-0'
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-[68px] relative">

            {/* ── LEFT: hamburger + shop nav ── */}
            <div className="flex items-center flex-1">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 -ml-2 text-slate-800 hover:text-slate-500 transition-colors"
                aria-label="Open menu"
              >
                <Menu size={22} strokeWidth={2} />
              </button>

              <nav className="hidden lg:flex items-center gap-2">
                {MEGA_MENUS.map((item) => {
                  const hasMega = item.featured.length > 0
                  return (
                    <div
                      key={item.label}
                      className="relative"
                      onMouseEnter={() => hasMega && openMenu(item.label)}
                      onMouseLeave={closeMenu}
                    >
                      <Link
                        href={item.href}
                        className={`group flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[10px] uppercase tracking-[0.18em] font-bold transition-all duration-300 ${
                          activeMenu === item.label ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/80'
                        }`}
                      >
                        {item.label}
                        {hasMega && (
                          <ChevronDown
                            size={12}
                            strokeWidth={3}
                            className={`transition-transform duration-300 mt-px ${
                              activeMenu === item.label ? 'rotate-180 text-slate-900' : 'text-slate-400 group-hover:text-slate-900'
                            }`}
                          />
                        )}
                      </Link>

                      {hasMega && activeMenu === item.label && (
                        <div
                          className="absolute top-[calc(100%+8px)] left-0 w-[480px] bg-white/90 backdrop-blur-3xl border border-white/60 shadow-[0_24px_80px_-10px_rgba(15,23,42,0.15)] rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300 overflow-hidden"
                          onMouseEnter={keepMenu}
                          onMouseLeave={closeMenu}
                        >
                          <div className="p-8 grid grid-cols-2 gap-10 relative z-10">
                            <div>
                              <p className="text-[9px] uppercase tracking-[0.25em] font-bold text-slate-400 mb-5 flex items-center gap-2">
                                <span className="w-4 h-[1px] bg-slate-300"></span> By Shape
                              </p>
                              <ul className="space-y-3">
                                {item.featured.map((sub, idx) => (
                                  <li key={sub.href} className="animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'both' }}>
                                    <Link
                                      href={sub.href}
                                      onClick={() => setActiveMenu(null)}
                                      className="group/sub flex items-center gap-3 text-[12px] font-bold text-slate-600 hover:text-slate-900 transition-colors"
                                    >
                                      <span className="w-0 group-hover/sub:w-4 h-[2px] bg-slate-900 transition-all duration-300 rounded-full" />
                                      {sub.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase tracking-[0.25em] font-bold text-slate-400 mb-5 flex items-center gap-2">
                                <span className="w-4 h-[1px] bg-slate-300"></span> {item.label === 'Sunglasses' ? 'By Gender' : 'By Frame'}
                              </p>
                              <ul className="space-y-3">
                                {item.collections.map((sub, idx) => (
                                  <li key={sub.href} className="animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${(item.featured.length + idx) * 40}ms`, animationFillMode: 'both' }}>
                                    <Link
                                      href={sub.href}
                                      onClick={() => setActiveMenu(null)}
                                      className="group/sub flex items-center gap-3 text-[12px] font-bold text-slate-600 hover:text-slate-900 transition-colors"
                                    >
                                      <span className="w-0 group-hover/sub:w-4 h-[2px] bg-slate-900 transition-all duration-300 rounded-full" />
                                      {sub.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                              <div className="mt-8 pt-6 border-t border-slate-200/60 animate-in fade-in" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                                <Link
                                  href={item.href}
                                  onClick={() => setActiveMenu(null)}
                                  className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-900 group/shop transition-all duration-300 bg-slate-50 px-4 py-2 rounded-lg hover:bg-slate-100"
                                >
                                  Shop All {item.label} <ArrowRight size={12} strokeWidth={2.5} className="group-hover/shop:translate-x-1 transition-transform" />
                                </Link>
                              </div>
                            </div>
                          </div>
                          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-slate-100 rounded-full blur-3xl pointer-events-none" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </nav>
            </div>

            {/* ── CENTER: Logo ── */}
            <Link
              href="/"
              className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center group select-none"
              aria-label="Icon Opticals Home"
            >
              <span
                className="text-[24px] sm:text-[28px] tracking-[0.14em] text-slate-900 group-hover:text-slate-600 transition-colors leading-none"
                style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
              >
                ICON
              </span>
              <span className="text-[7px] font-sans font-bold uppercase tracking-[0.55em] text-slate-400 mt-[4px] pl-[3px] group-hover:text-slate-500 transition-colors">
                Opticals
              </span>
            </Link>

            {/* ── RIGHT: service links + icons ── */}
            <div className="flex items-center justify-end flex-1 gap-2">
              <nav className="hidden xl:flex items-center gap-1 mr-4 pr-5 border-r border-slate-200/60">
                {SERVICE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-2 rounded-full text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all duration-300"
                  >
                    {link.label}
                  </Link>
                ))}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="ml-1 flex items-center gap-1.5 px-3 py-2 rounded-full text-[9px] uppercase tracking-[0.2em] font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-all"
                  >
                    <ShieldCheck size={14} strokeWidth={2.5} />
                    Admin
                  </Link>
                )}
              </nav>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center justify-center w-10 h-10 text-slate-500 hover:text-slate-900 transition-all rounded-full hover:bg-slate-100/80"
                  aria-label="Search"
                >
                  <Search size={18} strokeWidth={2} />
                </button>

                <Link
                  href="/account"
                  className="hidden sm:flex items-center justify-center w-10 h-10 text-slate-500 hover:text-slate-900 transition-all rounded-full hover:bg-slate-100/80"
                  aria-label="Account"
                >
                  <User size={18} strokeWidth={2} />
                </Link>

                {userId && (
                  <Link
                    href="/wishlist"
                    className="hidden sm:flex items-center justify-center w-10 h-10 text-slate-500 hover:text-rose-500 transition-all rounded-full hover:bg-rose-50"
                    aria-label="Wishlist"
                  >
                    <Heart size={18} strokeWidth={2} />
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="hidden sm:flex xl:hidden items-center justify-center w-10 h-10 text-amber-500 hover:text-amber-600 transition-all rounded-full hover:bg-amber-50"
                    aria-label="Admin Panel"
                  >
                    <ShieldCheck size={18} strokeWidth={2} />
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    href="/admin/store-billing"
                    className="relative flex items-center justify-center w-10 h-10 text-violet-600 hover:text-violet-700 transition-all rounded-full hover:bg-violet-50"
                    aria-label={`Billing cart: ${billingCount} items`}
                  >
                    <ReceiptText size={18} strokeWidth={2} />
                    {billingCount > 0 && (
                      <span className="absolute top-1.5 right-1 min-w-[16px] h-4 bg-violet-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1.5 leading-none tabular-nums shadow-sm animate-in zoom-in">
                        {billingCount > 99 ? '99+' : billingCount}
                      </span>
                    )}
                  </Link>
                )}

                <Link
                  href="/cart"
                  className="relative flex items-center justify-center w-10 h-10 text-slate-500 hover:text-slate-900 transition-all rounded-full hover:bg-slate-100/80"
                  aria-label={`Cart: ${cartCount} items`}
                >
                  <ShoppingBag size={18} strokeWidth={2} />
                  {cartCount > 0 && (
                    <span className="absolute top-1.5 right-1 min-w-[16px] h-4 bg-slate-900 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1.5 leading-none tabular-nums shadow-sm animate-in zoom-in">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ══════════════ FULL-SCREEN SEARCH OVERLAY ══════════════ */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white/90 backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-300 font-sans">
          <div className="flex items-center justify-between px-6 sm:px-12 h-[80px] mt-9">
            <div className="flex items-center gap-3 bg-white/50 px-4 py-2 rounded-full border border-white shadow-sm">
              <Eye size={16} strokeWidth={2} className="text-slate-500" />
              <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-slate-500">
                Search Collection
              </span>
            </div>
            <button
              onClick={() => setSearchOpen(false)}
              className="flex items-center justify-center w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-400 rounded-full transition-all shadow-sm"
            >
               <X size={18} strokeWidth={2} />
            </button>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 flex flex-col items-center justify-center px-6 pb-32"
          >
            <div className="w-full max-w-3xl">
              <div className="relative border-b-2 border-slate-300 focus-within:border-slate-900 transition-colors duration-500 pb-4 group">
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search frames, brands, styles…"
                  className="w-full bg-transparent text-4xl sm:text-6xl font-light text-slate-900 placeholder-slate-300 outline-none pr-16 tracking-tight"
                  style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
                />
                <button
                  type="submit"
                  className="absolute right-0 bottom-4 w-12 h-12 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 group-focus-within:bg-slate-900 group-focus-within:text-white transition-all duration-500"
                  aria-label="Submit search"
                >
                  <ArrowRight size={20} strokeWidth={2} className={searchQuery.length > 0 ? "animate-pulse" : ""} />
                </button>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4 animate-in slide-in-from-bottom-4 duration-700 delay-100">
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">Trending Now:</span>
                <div className="flex flex-wrap gap-2.5">
                  {['Rectangle', 'Aviator', 'Round', 'Cat-Eye', 'Rimless'].map((term, i) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        setSearchQuery(term)
                        router.push(`/products?search=${encodeURIComponent(term)}`)
                        setSearchOpen(false)
                      }}
                      className="px-4 py-2 bg-white border border-slate-200/80 rounded-xl text-[10px] uppercase tracking-[0.15em] font-bold text-slate-500 hover:border-slate-400 hover:text-slate-900 hover:shadow-sm transition-all"
                      style={{ animationDelay: `${(i + 1) * 100}ms` }}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ══════════════ MOBILE DRAWER ══════════════ */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-500 ${
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-500 ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMobileOpen(false)}
        />

        <div
          className={`absolute inset-y-0 left-0 w-[85vw] max-w-[340px] bg-white/95 backdrop-blur-3xl shadow-[20px_0_60px_rgba(15,23,42,0.15)] flex flex-col transition-transform duration-500 ease-out border-r border-white rounded-r-[2.5rem] overflow-hidden ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-8 py-7 border-b border-slate-200/50 bg-white/60">
            <div className="flex flex-col">
              <span
                className="text-2xl tracking-[0.12em] text-slate-900 leading-none"
                style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
              >
                ICON
              </span>
              <span className="text-[8px] font-bold uppercase tracking-[0.45em] text-slate-400 mt-1 pl-0.5">
                Opticals
              </span>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors rounded-full border border-slate-100 shadow-sm bg-white"
              aria-label="Close menu"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto custom-scrollbar bg-transparent">
            <div className="px-8 pt-8 pb-4">
              <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-slate-400 mb-6 flex items-center gap-2">
                <span className="w-3 h-[1px] bg-slate-300"></span> Shop Catalog
              </p>
              {MEGA_MENUS.map(item => (
                <div key={item.label} className="mb-2">
                  <button
                    onClick={() =>
                      item.featured.length
                        ? setMobileExpanded(mobileExpanded === item.label ? null : item.label)
                        : (() => { router.push(item.href); setMobileOpen(false) })()
                    }
                    className={`w-full flex items-center justify-between py-3.5 px-4 rounded-xl transition-colors ${
                      mobileExpanded === item.label ? 'bg-slate-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50/80'
                    }`}
                  >
                    <span className="text-[13px] font-bold uppercase tracking-[0.1em]">{item.label}</span>
                    {item.featured.length > 0 && (
                      <ChevronDown
                        size={16}
                        strokeWidth={2.5}
                        className={`text-slate-400 transition-transform duration-300 ${
                          mobileExpanded === item.label ? 'rotate-180 text-slate-900' : ''
                        }`}
                      />
                    )}
                  </button>

                  {item.featured.length > 0 && mobileExpanded === item.label && (
                    <div className="mb-4 mt-2 px-5 py-3 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3 animate-in slide-in-from-top-2 duration-300">
                      {item.featured.map(sub => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors py-1.5 group/mobsub"
                        >
                          <span className="w-1 h-1 rounded-full bg-slate-300 group-hover/mobsub:bg-slate-900 transition-colors" />
                          {sub.label}
                        </Link>
                      ))}
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-900 pt-3 mt-2 border-t border-slate-200/60 w-fit group/viewall"
                      >
                        Explore All <ArrowRight size={12} strokeWidth={2.5} className="group-hover/viewall:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mx-8 border-t border-slate-200/50" />

            <div className="px-8 pt-6 pb-6">
              <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-slate-400 mb-6 flex items-center gap-2">
                <span className="w-3 h-[1px] bg-slate-300"></span> Client Services
              </p>
              <div className="space-y-1">
                {SERVICE_LINKS.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3.5 rounded-xl text-[12px] font-bold uppercase tracking-[0.1em] text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {isAdmin && (
              <>
                <div className="mx-8 border-t border-slate-200/50" />
                <div className="px-8 pt-6 pb-8">
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[11px] font-bold text-amber-600 uppercase tracking-[0.15em] bg-amber-50 border border-amber-100/50 hover:bg-amber-100 transition-colors"
                  >
                    <ShieldCheck size={16} strokeWidth={2.5} />
                    Administration
                  </Link>
                </div>
              </>
            )}
          </nav>

          <div className="p-6 border-t border-slate-200/50 bg-white/80 grid grid-cols-2 gap-3 relative z-10">
            <Link
              href={userId ? '/wishlist' : '/auth/login'}
              onClick={() => setMobileOpen(false)}
              className="flex flex-col items-center justify-center gap-2 py-4 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 hover:shadow-sm transition-all"
            >
              <Heart size={18} strokeWidth={2} />
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold">Wishlist</span>
            </Link>
            <Link
              href={userId ? '/account' : '/auth/login'}
              onClick={() => setMobileOpen(false)}
              className="flex flex-col items-center justify-center gap-2 py-4 bg-slate-900 rounded-xl text-white hover:bg-slate-800 shadow-md transition-all"
            >
              <User size={18} strokeWidth={2} />
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold">{userId ? 'Account' : 'Sign In'}</span>
            </Link>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(148, 163, 184, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(148, 163, 184, 0.4); }
      `}} />
    </>
  )
}