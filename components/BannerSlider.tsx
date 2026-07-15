'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

const SLIDES = [
  { src: '/Icon_Baneer18.png', alt: 'Icon Banner 18', label: 'Icon Banner 18', href: '/products' },
  { src: '/Icon_Baneer17.png', alt: 'Icon Banner 17', label: 'Icon Banner 17', href: '/products' },
  { src: '/Icon_Baneer19.png', alt: 'Icon Banner 19', label: 'Icon Banner 19', href: '/products' },
  { src: '/Icon_Baneer11.png', alt: 'Icon Banner 11', label: 'Icon Banner 11', href: '/products' },
  { src: '/Icon_Baneer16.png', alt: 'Icon Banner 16', label: 'Icon Banner 16', href: '/products' },
  { src: '/Icon_Baneer22.png', alt: 'Icon Banner 22', label: 'Icon Banner 22', href: '/products' },
  { src: '/Icon_Baneer12.png', alt: 'Icon Banner 12', label: 'Icon Banner 12', href: '/products' },
  { src: '/Icon_Baneer21.png', alt: 'Icon Banner 21', label: 'Icon Banner 21', href: '/products' },
  { src: '/Icon_Baneer15.png', alt: 'Icon Banner 15', label: 'Icon Banner 15', href: '/products' },
  { src: '/Icon_Banner7.png',  alt: 'Icon Banner 7',  label: 'Icon Banner 7',  href: '/products' },
  { src: '/Icon_Banner8.png',  alt: 'Icon Banner 8',  label: 'Icon Banner 8',  href: '/products' },
  { src: '/Icon_Banner5.png',  alt: 'Icon Banner 5',  label: 'Icon Banner 5',  href: '/products' },
  { src: '/Icon_Banner3.png',  alt: 'Icon Banner 3',  label: 'Icon Banner 3',  href: '/products' },
  { src: '/Icon_Banner4.png',  alt: 'Icon Banner 4',  label: 'Icon Banner 4',  href: '/products' },
  { src: '/Icon_Baneer10.png', alt: 'Icon Banner 10', label: 'Icon Banner 10', href: '/products' },
  { src: '/Icon_Baneer14.png', alt: 'Icon Banner 14', label: 'Icon Banner 14', href: '/products' },
  { src: '/Icon_Baneer9.png',  alt: 'Icon Banner 9',  label: 'Icon Banner 9',  href: '/products' },
  { src: '/Icon_Baneer20.png', alt: 'Icon Banner 20', label: 'Icon Banner 20', href: '/products' },
  { src: '/Icon_Baneer6.png',  alt: 'Icon Banner 6',  label: 'Icon Banner 6',  href: '/products' },
  { src: '/Icon_Baneer2.png',  alt: 'Icon Banner 2',  label: 'Icon Banner 2',  href: '/products' },
  { src: '/Icon_Baneer1.png',  alt: 'Icon Banner 1',  label: 'Icon Banner 1',  href: '/products' },
  { src: '/Icon_Baneer.png',   alt: 'Icon Banner',    label: 'Icon Banner',    href: '/products' },
];

export default function BannerSlider() {
  const [current, setCurrent]           = useState(0)
  const [failedSlides, setFailedSlides] = useState<Set<number>>(new Set())
  const [isPaused, setIsPaused]         = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleSlides = SLIDES.filter((_, i) => !failedSlides.has(i))
  const total         = visibleSlides.length

  const goNext = useCallback(() => setCurrent(c => (c + 1) % total), [total])
  const goPrev = useCallback(() => setCurrent(c => (c - 1 + total) % total), [total])
  const goTo   = useCallback((idx: number) => setCurrent(idx), [])

  useEffect(() => {
    if (isPaused || total === 0) return
    timerRef.current = setTimeout(goNext, 4500)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [current, isPaused, goNext, total])

  const handleImageError = (originalIndex: number) =>
    setFailedSlides(prev => new Set(prev).add(originalIndex))

  /* ── Fallback when all CDN images fail ─────────────────────── */
  if (total === 0) {
    return (
      <section className="relative overflow-hidden bg-gradient-to-br from-cyan-600 via-cyan-500 to-teal-400">
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-20 md:py-28 flex flex-col md:flex-row items-center gap-8 md:gap-10">
          <div className="flex-1 text-center md:text-left">
            <p className="text-cyan-100 font-semibold text-sm uppercase tracking-widest mb-3">Premium Eyewear</p>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white leading-tight mb-4">
              See the World<br />in Style
            </h1>
            <p className="text-cyan-100 text-base sm:text-lg mb-8 max-w-md mx-auto md:mx-0">
              Premium eyeglasses, sunglasses &amp; contacts. Free eye tests at 100+ stores across India.
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Link href="/products" className="bg-white text-cyan-600 font-bold px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl hover:bg-cyan-50 transition-colors text-sm sm:text-base">Shop Now</Link>
              <Link href="/booking"  className="border-2 border-white/40 text-white font-semibold px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl hover:bg-white/10 transition-colors text-sm sm:text-base">Book Eye Test</Link>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80">
              <div className="absolute inset-0 bg-white/10 rounded-full backdrop-blur-sm" />
              <div className="absolute inset-0 flex items-center justify-center text-[80px] sm:text-[120px]">🕶️</div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  /* ── Main slider ───────────────────────────────────────────── */
  return (
    <section
      className="relative w-full overflow-hidden select-none bg-slate-50"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {visibleSlides.map((slide, idx) => {
        const originalIndex = SLIDES.indexOf(slide)
        const isActive      = idx === current

        return (
          <div
            key={originalIndex}
            aria-hidden={!isActive}
            style={{
              position  : isActive ? 'relative' : 'absolute',
              inset     : isActive ? undefined   : 0,
              width     : '100%',
              opacity   : isActive ? 1 : 0,
              visibility: isActive ? 'visible' : 'hidden',
              transition: 'opacity 0.65s ease, visibility 0.65s ease',
              zIndex    : isActive ? 1 : 0,
            }}
          >
            <Link href={slide.href} className="block w-full" tabIndex={isActive ? 0 : -1}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.src}
                alt={slide.alt}
                style={{
                  display   : 'block',
                  width     : '100%',
                  height    : 'auto',     // Fix: allows image to dictate container height organically
                  objectFit : 'contain', 
                  objectPosition: 'center center',
                }}
                onError={() => handleImageError(originalIndex)}
                draggable={false}
              />
            </Link>
          </div>
        )
      })}

      {/* ── Prev arrow ─────────────────────────────────────────── */}
      {total > 1 && (
        <button
          onClick={goPrev}
          aria-label="Previous slide"
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20
                     flex items-center justify-center
                     w-8 h-8 sm:w-10 sm:h-10 rounded-full
                     bg-white/80 hover:bg-white
                     shadow-md transition-all backdrop-blur-sm"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      )}

      {/* ── Next arrow ─────────────────────────────────────────── */}
      {total > 1 && (
        <button
          onClick={goNext}
          aria-label="Next slide"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20
                     flex items-center justify-center
                     w-8 h-8 sm:w-10 sm:h-10 rounded-full
                     bg-white/80 hover:bg-white
                     shadow-md transition-all backdrop-blur-sm"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}

      {/* ── Dot indicators ─────────────────────────────────────── */}
      {total > 1 && (
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 sm:gap-2">
          {visibleSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              style={{
                borderRadius   : 999,
                border         : 'none',
                padding        : 0,
                cursor         : 'pointer',
                height         : 8,
                transition     : 'width 0.3s ease, background-color 0.3s ease',
                width          : idx === current ? 20 : 8,
                backgroundColor: idx === current
                  ? 'rgba(255,255,255,1)'
                  : 'rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </div>
      )}

      {/* ── Slide counter ──────────────────────────────────────── */}
      {total > 1 && (
        <div
          className="absolute top-2 sm:top-3 right-3 sm:right-4 z-20 text-white text-xs font-medium px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full"
          style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
        >
          {current + 1} / {total}
        </div>
      )}
    </section>
  )
}