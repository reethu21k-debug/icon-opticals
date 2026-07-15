'use client'

import { useEffect, useRef, useCallback } from 'react'
import { X, MapPin, Navigation, ExternalLink, Phone } from 'lucide-react'

interface StoreMapModalProps {
  isOpen: boolean
  onClose: () => void
  store: {
    name: string
    address: string
    city: string
    state: string
    pincode: string
    phone?: string | null
    latitude: number
    longitude: number
    google_maps_url?: string | null
  } | null
}

export default function StoreMapModal({ isOpen, onClose, store }: StoreMapModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const googleMapsUrl = store
    ? store.google_maps_url && store.google_maps_url.trim() !== ''
      ? store.google_maps_url
      : `https://maps.google.com/?q=${store.latitude},${store.longitude}`
    : '#'

  const embedUrl = store
    ? `https://www.google.com/maps?q=${store.latitude},${store.longitude}&z=18&output=embed`
    : ''

  const fullAddress = store
    ? `${store.address}, ${store.city}, ${store.state} – ${store.pincode}`
    : ''

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      firstFocusable?.focus()
    }
  }, [isOpen])

  if (!isOpen || !store) return null

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Map for ${store.name}`}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md transition-opacity"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full sm:max-w-2xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500"
      >
        <div className="p-8 sm:p-12">
          
          {/* ── Header ─────────────────────────────────────── */}
          <div className="flex items-start justify-between mb-10">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-900 mt-1">
                <MapPin size={20} strokeWidth={1} />
              </div>
              <div className="pt-0.5">
                <p className="text-[9px] uppercase tracking-[0.25em] text-slate-400 mb-2">
                  Boutique Location
                </p>
                <h2 
                  className="text-3xl text-slate-900 tracking-tight leading-none mb-3"
                  style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
                >
                  {store.name}
                </h2>
                <p className="text-[11px] text-slate-500 font-light leading-relaxed max-w-sm">
                  {fullAddress}
                </p>
                
                {store.phone && (
                  <a
                    href={`tel:${store.phone}`}
                    className="mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-medium text-slate-900 hover:text-slate-500 transition-colors"
                  >
                    <Phone size={12} strokeWidth={1.5} />
                    {store.phone}
                  </a>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close Map"
              className="text-slate-400 hover:text-slate-900 transition-colors p-2 -mt-2 -mr-2"
            >
              <X size={24} strokeWidth={1} />
            </button>
          </div>

          {/* ── Map Embed ──────────────────────────────────── */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${store.name} in Google Maps`}
            className="block w-full h-[280px] sm:h-[320px] border border-slate-200 relative group overflow-hidden bg-slate-50"
          >
            <iframe
              src={embedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full pointer-events-none select-none grayscale-[0.85] opacity-90 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
              title={`Map showing ${store.name}`}
              aria-hidden="true"
            />

            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors duration-500 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-slate-900 text-white text-[9px] uppercase tracking-[0.2em] font-medium px-6 py-3 flex items-center gap-3 shadow-xl">
                <ExternalLink size={14} strokeWidth={1.5} />
                View Full Map
              </div>
            </div>
          </a>

          {/* ── Footer Actions ─────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-3 py-4 border border-slate-200 text-slate-900 text-[10px] uppercase tracking-[0.2em] font-medium hover:border-slate-900 transition-colors group"
            >
              <Navigation size={14} strokeWidth={1.5} className="group-hover:-translate-y-0.5 transition-transform" />
              Get Directions
            </a>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-[1.5] flex items-center justify-center gap-3 py-4 bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-slate-800 transition-colors"
            >
              <ExternalLink size={14} strokeWidth={1.5} />
              Open in Google Maps
            </a>
          </div>

        </div>
      </div>
    </div>
  )
}