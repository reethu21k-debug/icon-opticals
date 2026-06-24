'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const SLIDES = [
  { id: 'night', src: '/home/Night_Baneer.png', alt: 'Night & Computer Glasses', href: '/products?category=computer-glasses' },
  { id: 'kids', src: '/home/Kids_banner.png', alt: 'Kids Eyewear Collection', href: '/products?gender=kids' },
]

export default function PromoSlider() {
  const [current, setCurrent] = useState(0)

  // Auto slide every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === SLIDES.length - 1 ? 0 : prev + 1))
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const nextSlide = () => setCurrent((prev) => (prev === SLIDES.length - 1 ? 0 : prev + 1))
  const prevSlide = () => setCurrent((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1))

  return (
    <div className="relative overflow-hidden rounded-[clamp(12px,2vw,24px)] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] group my-[var(--gap-md)]">
      
      {/* Track */}
      <div
        className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {SLIDES.map((slide) => (
          <Link key={slide.id} href={slide.href} className="w-full flex-shrink-0 relative block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={slide.src} 
              alt={slide.alt} 
              className="w-full block object-cover max-h-[clamp(200px,40vw,500px)] hover:scale-[1.01] transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/10 to-transparent pointer-events-none" />
          </Link>
        ))}
      </div>

      {/* Left Arrow */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-md border border-white/50 text-slate-900 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/80 hover:scale-110 shadow-lg"
        aria-label="Previous slide"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Right Arrow */}
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-md border border-white/50 text-slate-900 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/80 hover:scale-110 shadow-lg"
        aria-label="Next slide"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-2 rounded-full transition-all duration-300 shadow-sm ${
              current === idx ? 'bg-white w-6' : 'bg-white/50 w-2 hover:bg-white/80'
            }`}
          />
        ))}
      </div>

    </div>
  )
}