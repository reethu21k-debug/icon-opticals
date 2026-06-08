'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, MapPin, Sparkles, Quote } from 'lucide-react'

/* ─── Shared Hooks ─────────────────────────────────────────────────── */

function useInView<T extends HTMLElement>(threshold = 0.1) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return [ref, inView] as const
}

/* ═══════════════════════════════════════════════════════════════════
   STORE FINDER CTA  —  Premium Editorial Redesign
═══════════════════════════════════════════════════════════════════ */

const METRICS = [
  { label: 'Satisfaction', value: '96%', circle: 96, delay: '1.2s' },
  { label: 'Same-Day',     value: '88%', circle: 88, delay: '1.4s' },
  { label: 'Return Rate',  value: '74%', circle: 74, delay: '1.6s' },
] as const

const QUOTE = "The most refined eyewear experience in the city. Precise, personal, and genuinely exceptional."

const CTA_CSS = `
  @keyframes float-ambient { 
    0%, 100% { transform: translate(0, 0) scale(1); } 
    33% { transform: translate(2%, -4%) scale(1.03); }
    66% { transform: translate(-2%, 4%) scale(0.97); }
  }
  @keyframes fade-slide-up { 
    0% { opacity: 0; transform: translateY(30px); filter: blur(8px); } 
    100% { opacity: 1; transform: translateY(0); filter: blur(0); } 
  }
  @keyframes reveal-mask {
    0% { transform: translateY(110%) rotate(2deg); opacity: 0; }
    100% { transform: translateY(0) rotate(0); opacity: 1; }
  }
  @keyframes circle-draw {
    0% { stroke-dasharray: 0, 100; opacity: 0; }
    100% { stroke-dasharray: var(--pct), 100; opacity: 1; }
  }
  @keyframes scale-in {
    0% { transform: scale(0.8); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  .premium-cta-wrapper {
    position: relative; 
    overflow: hidden; 
    padding: 8rem 0; 
    font-family: 'DM Sans', system-ui, sans-serif;
    background-color: #fafaf9;
    color: #0f172a;
  }

  .premium-mesh {
    position: absolute; 
    inset: 0; 
    z-index: 0; 
    pointer-events: none;
    background-image: 
      radial-gradient(rgba(15, 23, 42, 0.04) 1px, transparent 1px),
      radial-gradient(rgba(15, 23, 42, 0.04) 1px, transparent 1px);
    background-size: 48px 48px;
    background-position: 0 0, 24px 24px;
    mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
  }

  /* Typography utilities */
  .font-serif-luxe {
    font-family: Didot, "Bodoni MT", "Playfair Display", Times, serif;
  }
  
  .mask-container {
    display: inline-flex;
    overflow: hidden;
    padding-bottom: 0.1em;
    vertical-align: bottom;
  }
  .mask-text {
    display: inline-block;
    transform: translateY(110%);
    transform-origin: left bottom;
    will-change: transform, opacity;
  }
  .vis .mask-text {
    animation: reveal-mask 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  /* Staggered delays */
  .delay-100 { animation-delay: 0.1s; }
  .delay-200 { animation-delay: 0.2s; }
  .delay-300 { animation-delay: 0.3s; }
  .delay-500 { animation-delay: 0.5s; }
  
  .fade-up-element {
    opacity: 0;
    will-change: opacity, transform, filter;
  }
  .vis .fade-up-element {
    animation: fade-slide-up 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  /* Glassmorphism Panel */
  .luxe-glass-panel {
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.4) 100%);
    backdrop-filter: blur(32px);
    -webkit-backdrop-filter: blur(32px);
    border: 1px solid rgba(255, 255, 255, 0.9);
    box-shadow: 
      0 40px 80px -20px rgba(15, 23, 42, 0.06),
      inset 0 1px 1px rgba(255, 255, 255, 1);
    border-radius: 2rem;
    position: relative;
    overflow: hidden;
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .luxe-glass-panel:hover {
    transform: translateY(-4px);
    box-shadow: 
      0 50px 100px -20px rgba(15, 23, 42, 0.08),
      inset 0 1px 1px rgba(255, 255, 255, 1);
  }
  .luxe-glass-panel::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1.5px;
    background: linear-gradient(90deg, transparent, rgba(247, 202, 201, 0.8), transparent);
    z-index: 10;
  }

  /* Circular Progress */
  .circular-chart {
    display: block;
    margin: 0 auto;
    max-width: 80%;
    max-height: 250px;
    filter: drop-shadow(0 4px 6px rgba(15, 23, 42, 0.05));
  }
  .circle-bg {
    fill: none;
    stroke: rgba(119, 140, 163, 0.12);
    stroke-width: 1.5;
  }
  .circle {
    fill: none;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke: #0f172a;
    transition: stroke-dasharray 1s ease-out;
  }
  .vis .circle.animated {
    animation: circle-draw 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .circle-value {
    opacity: 0;
  }
  .vis .circle-value {
    animation: scale-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  /* Buttons */
  .btn-primary-luxe {
    position: relative;
    overflow: hidden;
    background: #0f172a;
    color: #fff;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .btn-primary-luxe::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
    transform: translateX(-100%) skewX(-15deg);
    transition: transform 0.6s ease-in-out;
  }
  .btn-primary-luxe:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 30px -10px rgba(15, 23, 42, 0.5);
  }
  .btn-primary-luxe:hover::after {
    transform: translateX(100%) skewX(-15deg);
  }

  .btn-outline-luxe {
    position: relative;
    background: transparent;
    border: 1px solid rgba(15, 23, 42, 0.15);
    color: #0f172a;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .btn-outline-luxe:hover {
    border-color: #0f172a;
    background: rgba(15, 23, 42, 0.02);
    transform: translateY(-2px);
    box-shadow: 0 10px 20px -10px rgba(15, 23, 42, 0.05);
  }
`

export function StoreFinderCTA() {
  const [ref, inView] = useInView<HTMLDivElement>(0.1)

  return (
    <section className="premium-cta-wrapper" aria-labelledby="store-finder-heading">
      <style dangerouslySetInnerHTML={{ __html: CTA_CSS }} />
      
      {/* Background Ambience */}
      <div className="premium-mesh" aria-hidden="true" />
      <div 
        className="absolute top-[-20%] right-[-10%] w-[50rem] h-[50rem] bg-[#f7cac9]/30 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" 
        style={{ animation: 'float-ambient 20s ease-in-out infinite' }} 
        aria-hidden="true"
      />
      <div 
        className="absolute bottom-[-20%] left-[-10%] w-[60rem] h-[60rem] bg-[#778ca3]/15 rounded-full blur-[140px] pointer-events-none mix-blend-multiply" 
        style={{ animation: 'float-ambient 25s ease-in-out infinite reverse' }} 
        aria-hidden="true"
      />

      <div 
        className={`max-w-[1400px] mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-10 items-center relative z-10 ${inView ? 'vis' : ''}`}
        ref={ref}
      >
        
        {/* ── Left Column: Typography & CTAs (Spans 5 cols) ── */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          
          <div className="fade-up-element delay-100 mb-8 inline-flex items-center gap-3">
            <Sparkles size={14} className="text-[#778ca3]" aria-hidden="true" />
            <span className="text-[10px] uppercase tracking-[0.3em] font-semibold text-slate-500">
              The Icon Experience
            </span>
          </div>

          <h2 id="store-finder-heading" className="sr-only">Come See Us - Store Finder</h2>

          <div className="font-serif-luxe text-[clamp(4rem,9vw,8rem)] leading-[0.85] tracking-tight text-slate-900 mb-8" aria-hidden="true">
            <span className="mask-container pr-2">
              <span className="mask-text delay-100">Come</span>
            </span>
            <br className="hidden sm:block" />
            <span className="mask-container sm:ml-16">
              <span className="mask-text delay-200 italic text-[#778ca3] pr-2">See</span>
            </span>
            <span className="mask-container ml-4">
              <span className="mask-text delay-300">Us.</span>
            </span>
          </div>

          <p className="fade-up-element delay-300 text-[16px] sm:text-[18px] text-slate-500 font-light leading-relaxed max-w-md mb-12">
            Step into a space where vision meets craft. Our expert optometrists 
            offer high-precision eye care in an environment designed for those 
            who expect nothing but the absolute best.
          </p>

          <div className="fade-up-element delay-500 flex flex-col sm:flex-row gap-5">
            <Link 
              href="/store" 
              className="btn-primary-luxe group flex items-center justify-center gap-4 px-8 py-4 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Get Directions 
              <MapPin size={16} className="group-hover:rotate-12 transition-transform duration-300" aria-hidden="true" />
            </Link>

            <Link 
              href="/booking" 
              className="btn-outline-luxe group flex items-center justify-center gap-4 px-8 py-4 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Book Consult 
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* ── Right Column: The Unified Glass Bento (Spans 7 cols) ── */}
        <div className="lg:col-span-7 lg:pl-12">
          <div className="fade-up-element delay-300 luxe-glass-panel flex flex-col">
            
            {/* Top section: The Quote */}
            <div className="relative p-10 sm:p-14 lg:p-16 border-b border-slate-200/40">
              <Quote 
                size={140} 
                className="absolute top-4 left-4 text-[#778ca3] opacity-[0.04] rotate-[-10deg] pointer-events-none" 
                aria-hidden="true" 
              />
              <blockquote className="relative z-10">
                <p className="font-serif-luxe text-3xl sm:text-4xl lg:text-5xl leading-[1.25] tracking-tight text-slate-800 mb-10">
                  "{QUOTE}"
                </p>
                <footer className="flex items-center gap-5">
                  <span className="w-8 h-[1px] bg-[#f7cac9]" aria-hidden="true" />
                  <cite className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-400 not-italic">
                    Verified Client Review
                  </cite>
                </footer>
              </blockquote>
            </div>

            {/* Bottom section: The Metrics */}
            <div className="grid grid-cols-3 divide-x divide-slate-200/40 p-8 sm:p-10 bg-white/30 backdrop-blur-sm">
              {METRICS.map((m) => (
                <div key={m.label} className="flex flex-col items-center justify-center gap-5 px-2">
                  <div className="relative w-16 h-16 sm:w-24 sm:h-24">
                    <svg viewBox="0 0 36 36" className="circular-chart w-full h-full -rotate-90">
                      <path
                        className="circle-bg"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="circle animated"
                        strokeDasharray="0, 100"
                        style={{ '--pct': m.circle, animationDelay: m.delay } as React.CSSProperties}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div 
                      className="circle-value absolute inset-0 flex items-center justify-center"
                      style={{ animationDelay: `calc(${m.delay} + 0.3s)` }}
                    >
                      <span className="font-serif-luxe text-base sm:text-xl font-medium text-slate-900">
                        {m.value}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 text-center">
                    {m.label}
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </section>
  )
}