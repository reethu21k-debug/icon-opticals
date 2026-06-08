'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { MapPin, Phone, Clock, Search, ArrowRight, X } from 'lucide-react'
import StoreMapModal from './StoreMapModal'

interface DayTiming { open: string; close: string }
interface StoreTimings { mon: DayTiming; tue: DayTiming; wed: DayTiming; thu: DayTiming; fri: DayTiming; sat: DayTiming; sun: DayTiming }
interface StoreItem {
  id: string
  name: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string | null
  latitude: number | null
  longitude: number | null
  google_maps_url?: string | null
  timings: StoreTimings
  is_active: boolean
}

type StoreWithCoords = StoreItem & { latitude: number; longitude: number }

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
type DayKey = typeof DAY_KEYS[number]

function isStoreOpen(store: StoreItem): { open: boolean; label: string } {
  const now = new Date()
  const day = DAY_KEYS[now.getDay()] as DayKey
  const timing = store.timings?.[day]
  if (!timing) return { open: false, label: 'Closed today' }
  const [openH, openM] = timing.open.split(':').map(Number)
  const [closeH, closeM] = timing.close.split(':').map(Number)
  const cur = now.getHours() * 60 + now.getMinutes()
  const openMins = openH * 60 + openM
  const closeMins = closeH * 60 + closeM
  const open = cur >= openMins && cur < closeMins
  if (open) {
    const left = closeMins - cur
    return { open: true, label: left <= 30 ? `Closes in ${left}min` : `Open till ${timing.close}` }
  }
  if (cur < openMins) return { open: false, label: `Opens at ${timing.open}` }
  for (let i = 1; i <= 6; i++) {
    const next = DAY_KEYS[(now.getDay() + i) % 7] as DayKey
    const nt = store.timings?.[next]
    if (nt) {
      const dayName = i === 1 ? 'Tomorrow' : next.charAt(0).toUpperCase() + next.slice(1)
      return { open: false, label: `Opens ${dayName} at ${nt.open}` }
    }
  }
  return { open: false, label: 'Closed' }
}

// ── Animated counter ─────────────────────────────────────────
function AnimatedCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    prevRef.current = value
    if (from === to) return
    const duration = 420
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (to - from) * ease))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value])

  return <>{display}</>
}

// ── Detail row ───────────────────────────────────────────────
function DetailRow({
  icon,
  children,
  hovered,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  hovered: boolean
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
      <span
        className="flex-shrink-0 mt-0.5 transition-colors duration-300"
        style={{ color: hovered ? '#94a3b8' : '#cbd5e1' }}
      >
        {icon}
      </span>
      <span>{children}</span>
    </div>
  )
}

// ── Individual store card ────────────────────────────────────
function StoreCard({
  store,
  index,
  onOpenMap,
}: {
  store: StoreItem & { status: { open: boolean; label: string } }
  index: number
  onOpenMap: (s: StoreItem) => void
}) {
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setTimeout(() => setVisible(true), index * 55) },
      { threshold: 0.06 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [index])

  const today = DAY_KEYS[new Date().getDay()] as DayKey
  const todayTiming = store.timings?.[today]

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-white flex flex-col relative overflow-hidden"
      style={{
        border: `1px solid ${hovered ? '#94a3b8' : '#e2e8f0'}`,
        boxShadow: hovered ? '0 16px 48px -12px rgba(15,23,42,0.14)' : '0 1px 4px rgba(0,0,0,0.03)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.988)',
        transition: [
          `opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${index * 55}ms`,
          `transform 0.6s cubic-bezier(0.22,1,0.36,1) ${index * 55}ms`,
          'border-color 0.3s ease',
          'box-shadow 0.35s ease',
        ].join(', '),
      }}
    >
      {/* Top border sweep on hover */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: '1.5px',
          background: '#0f172a',
          transformOrigin: 'left',
          transform: hovered ? 'scaleX(1)' : 'scaleX(0)',
          transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1)',
        }}
      />

      <div className="p-8 flex-1 flex flex-col">
        {/* Status */}
        <div className="flex items-center gap-2 mb-6">
          <span
            className="inline-block rounded-full"
            style={{
              width: '6px',
              height: '6px',
              background: store.status.open ? '#0f172a' : '#cbd5e1',
              transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              transform: hovered && store.status.open ? 'scale(1.5)' : 'scale(1)',
              boxShadow: hovered && store.status.open ? '0 0 0 3px rgba(15,23,42,0.1)' : 'none',
            }}
          />
          <span
            className="font-medium"
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: store.status.open ? '#475569' : '#94a3b8',
            }}
          >
            {store.status.label}
          </span>
        </div>

        {/* Store name */}
        <h3
          style={{
            fontSize: '1.5rem',
            color: '#0f172a',
            marginBottom: '1.5rem',
            lineHeight: 1.2,
            fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif',
            letterSpacing: hovered ? '0.008em' : '0em',
            transition: 'letter-spacing 0.4s ease',
          }}
        >
          {store.name}
        </h3>

        {/* Details */}
        <div className="flex flex-col gap-4 mb-10 flex-1">
          <DetailRow icon={<MapPin size={16} strokeWidth={1.25} />} hovered={hovered}>
            {store.address}<br />{store.city}, {store.state} {store.pincode}
          </DetailRow>

          {store.phone && (
            <DetailRow icon={<Phone size={16} strokeWidth={1.25} />} hovered={hovered}>
              <a
                href={`tel:${store.phone}`}
                className="transition-colors duration-200 hover:text-slate-900"
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                {store.phone}
              </a>
            </DetailRow>
          )}

          <DetailRow icon={<Clock size={16} strokeWidth={1.25} />} hovered={hovered}>
            {todayTiming ? `Today: ${todayTiming.open} – ${todayTiming.close}` : 'Closed today'}
          </DetailRow>
        </div>

        {/* CTA buttons */}
        <div className="flex gap-3 mt-auto">
          {store.latitude && store.longitude && (
            <button
              onClick={() => onOpenMap(store)}
              className="flex-1 flex items-center justify-center gap-1.5 transition-all duration-250 active:scale-95"
              style={{
                padding: '0.875rem 1rem',
                border: '1px solid #0f172a',
                background: 'transparent',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontWeight: 500,
                color: hovered ? undefined : '#0f172a',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#0f172a'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#0f172a'
              }}
            >
              <MapPin size={11} strokeWidth={1.75} />
              View Map
            </button>
          )}

          <a
            href={`/booking?store=${store.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 active:scale-95"
            style={{
              padding: '0.875rem 1rem',
              background: '#0f172a',
              border: '1px solid #0f172a',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              fontWeight: 500,
              color: 'white',
              textDecoration: 'none',
              transition: 'background 0.25s ease, border-color 0.25s ease, transform 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#1e293b'
              e.currentTarget.style.borderColor = '#1e293b'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#0f172a'
              e.currentTarget.style.borderColor = '#0f172a'
            }}
          >
            Book Visit
            <ArrowRight
              size={11}
              strokeWidth={2}
              style={{
                transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
                transform: hovered ? 'translateX(4px)' : 'translateX(0)',
              }}
            />
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Main export ──────────────────────────────────────────────
export default function StoreList({ stores }: { stores: StoreItem[] }) {
  const [search, setSearch] = useState('')
  const [focused, setFocused] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [mapStore, setMapStore] = useState<StoreWithCoords | null>(null)
  const [isMapOpen, setIsMapOpen] = useState(false)

  useEffect(() => { setTimeout(() => setMounted(true), 60) }, [])

  const openMap = (store: StoreItem) => {
    if (store.latitude == null || store.longitude == null) return
    setMapStore(store as StoreWithCoords)
    setIsMapOpen(true)
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return stores
    const q = search.toLowerCase()
    return stores.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.state.toLowerCase().includes(q) ||
      s.pincode.includes(q)
    )
  }, [stores, search])

  const withStatus = useMemo(() => filtered.map(s => ({ ...s, status: isStoreOpen(s) })), [filtered])
  const openCount = withStatus.filter(s => s.status.open).length

  return (
    <>
      <style>{`
        @keyframes lineDraw {
          from { transform: scaleX(0) }
          to   { transform: scaleX(1) }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1 }
          50%       { opacity: 0.3 }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        .store-search-input::placeholder { color: #94a3b8; }
      `}</style>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* ── Header ─────────────────────────────────── */}
        <div
          className="mb-12"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'none' : 'translateY(-14px)',
            transition: 'opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">

            {/* Left: eyebrow + title + search */}
            <div className="max-w-xl w-full">
              <p
                style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  fontWeight: 500,
                  color: '#94a3b8',
                  marginBottom: '8px',
                  opacity: mounted ? 1 : 0,
                  transition: 'opacity 0.5s ease 0.12s',
                }}
              >
                Worldwide Locations
              </p>

              <h1
                className="text-slate-900 mb-3"
                style={{
                  fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                  fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.1,
                }}
              >
                Our Boutiques
              </h1>

              {/* Animated underline accent */}
              <div
                style={{
                  height: '1px',
                  width: '48px',
                  background: '#0f172a',
                  transformOrigin: 'left',
                  marginBottom: '1.75rem',
                  animation: mounted ? 'lineDraw 0.75s cubic-bezier(0.22,1,0.36,1) 0.35s both' : 'none',
                }}
              />

              {/* Search */}
              <div
                style={{
                  position: 'relative',
                  borderBottom: `1px solid ${focused ? '#0f172a' : '#cbd5e1'}`,
                  paddingBottom: '8px',
                  transition: 'border-color 0.3s ease',
                }}
              >
                <Search
                  size={18}
                  strokeWidth={1.25}
                  style={{
                    position: 'absolute',
                    left: '2px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: focused ? '#475569' : '#94a3b8',
                    pointerEvents: 'none',
                    transition: 'color 0.3s ease',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search by city, area or pincode…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  className="store-search-input"
                  style={{
                    width: '100%',
                    paddingLeft: '32px',
                    paddingRight: search ? '32px' : '0',
                    paddingTop: '8px',
                    paddingBottom: '4px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                  }}
                />

                {/* Clear × */}
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#0f172a')}
                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = '#94a3b8')}
                  >
                    <X size={14} strokeWidth={1.5} />
                  </button>
                )}

                {/* Focus sweep line */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-1px',
                    left: 0,
                    height: '1px',
                    width: '100%',
                    background: '#0f172a',
                    transformOrigin: 'left',
                    transform: focused ? 'scaleX(1)' : 'scaleX(0)',
                    transition: 'transform 0.38s cubic-bezier(0.22,1,0.36,1)',
                  }}
                />
              </div>
            </div>

            {/* Right: live counts */}
            <div
              className="flex items-end gap-6 pb-1"
              style={{ animation: mounted ? 'fadeUp 0.55s ease 0.25s both' : 'none' }}
            >
              <div className="text-right">
                <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 500, color: '#94a3b8', marginBottom: '4px' }}>
                  Boutiques
                </p>
                <p
                  style={{
                    fontSize: '2rem',
                    lineHeight: 1,
                    color: '#0f172a',
                    fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif',
                  }}
                >
                  <AnimatedCount value={filtered.length} />
                </p>
              </div>

              <div style={{ width: '1px', height: '36px', background: '#e2e8f0' }} />

              <div className="text-right">
                <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 500, color: '#94a3b8', marginBottom: '4px' }}>
                  Open Now
                </p>
                <p
                  className="flex items-center gap-2 justify-end"
                  style={{
                    fontSize: '2rem',
                    lineHeight: 1,
                    color: '#0f172a',
                    fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: openCount > 0 ? '#0f172a' : '#cbd5e1',
                      animation: openCount > 0 ? 'pulseDot 2.2s ease-in-out infinite' : 'none',
                    }}
                  />
                  <AnimatedCount value={openCount} />
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Grid / Empty state ────────────────────── */}
        {filtered.length === 0 ? (
          <div
            className="text-center border border-slate-200"
            style={{ padding: '6rem 2rem', animation: 'fadeUp 0.4s ease both' }}
          >
            <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 500, color: '#94a3b8' }}>
              No boutiques found
            </p>
            <button
              onClick={() => setSearch('')}
              style={{
                marginTop: '1rem',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontWeight: 500,
                color: '#0f172a',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '4px',
                transition: 'opacity 0.2s ease',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.6')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {withStatus.map((store, i) => (
              <StoreCard key={store.id} store={store} index={i} onOpenMap={openMap} />
            ))}
          </div>
        )}
      </div>

      <StoreMapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        store={mapStore}
      />
    </>
  )
}