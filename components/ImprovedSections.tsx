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
    STORE FINDER CTA  —  Premium Glassmorphism Theme
═══════════════════════════════════════════════════════════════════ */

const METRICS = [
  { label: 'Satisfaction', value: '96%', circle: 96, delay: '0.8s' },
  { label: 'Same-Day',     value: '88%', circle: 88, delay: '1.0s' },
  { label: 'Return Rate',  value: '74%', circle: 74, delay: '1.2s' },
] as const

const QUOTE = "The most refined eyewear experience in the city. Precise, personal, and genuinely exceptional."

const CTA_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

  .premium-cta-wrapper {
    --ink:      #0f172a;
    --ink-mid:  #334155;
    --ink-soft: #64748b;
    --ink-faint:#94a3b8;
    --surface:  rgba(255, 255, 255, 0.5);
    --glass-border: rgba(255, 255, 255, 0.6);
    --glass-shadow: 0 8px 32px 0 rgba(15, 23, 42, 0.04);
    --ease-out: cubic-bezier(.22,1,.36,1);

    position: relative; 
    overflow: hidden; 
    padding: clamp(64px, 8vw, 128px) 0; 
    font-family: 'DM Sans', sans-serif;
    color: var(--ink);
    /* Subtly extends the page gradient */
    background: linear-gradient(135deg, transparent 0%, rgba(255,241,242,0.2) 100%);
  }

  /* Typography */
  .serif { font-family: 'DM Serif Display', Georgia, serif !important; }

  /* Background Ambience & Mesh */
  .premium-mesh {
    position: absolute; 
    inset: 0; 
    z-index: 0; 
    pointer-events: none;
    background-image: 
      radial-gradient(rgba(15, 23, 42, 0.03) 1px, transparent 1px),
      radial-gradient(rgba(15, 23, 42, 0.03) 1px, transparent 1px);
    background-size: 48px 48px;
    background-position: 0 0, 24px 24px;
    mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
    -webkit-mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
  }

  @keyframes float-ambient { 
    0%, 100% { transform: translate(0, 0) scale(1); } 
    33% { transform: translate(2%, -4%) scale(1.03); }
    66% { transform: translate(-2%, 4%) scale(0.97); }
  }

  /* Themed Animations */
  @keyframes fadeUp { 
    0% { opacity: 0; transform: translateY(20px); } 
    100% { opacity: 1; transform: translateY(0); } 
  }
  @keyframes blurReveal {
    0% { filter: blur(12px); opacity: 0; transform: translateY(6px); }
    100% { filter: blur(0px); opacity: 1; transform: translateY(0); }
  }
  @keyframes splitWordUp {
    0% { opacity: 0; transform: translateY(28px) rotate(.4deg); }
    100% { opacity: 1; transform: translateY(0) rotate(0deg); }
  }
  @keyframes circle-draw {
    0% { stroke-dasharray: 0, 100; opacity: 0; }
    100% { stroke-dasharray: var(--pct), 100; opacity: 1; }
  }

  .fade-up-element { opacity: 0; will-change: opacity, transform; }
  .vis .fade-up-element { animation: fadeUp 0.7s var(--ease-out) forwards; }
  
  .blur-in-element { opacity: 0; filter: blur(12px); will-change: opacity, filter, transform; }
  .vis .blur-in-element { animation: blurReveal 1.1s var(--ease-out) forwards; }

  .split-word {
    display: inline-block;
    opacity: 0;
    transform: translateY(28px) rotate(.4deg);
    will-change: transform, opacity;
  }
  .vis .split-word { animation: splitWordUp 0.7s var(--ease-out) forwards; }

  /* Delay Utility Classes */
  .delay-100 { animation-delay: 0.1s; }
  .delay-200 { animation-delay: 0.2s; }
  .delay-300 { animation-delay: 0.3s; }
  .delay-400 { animation-delay: 0.4s; }

  /* Glassmorphism Panel (Matched to theme's .cat-card / .trust-cell) */
  .luxe-glass-panel {
    background: var(--surface);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(247, 202, 201, 0.25);
    box-shadow: 0 8px 32px 0 rgba(119, 140, 163, 0.08);
    border-radius: clamp(16px, 2.5vw, 28px);
    position: relative;
    overflow: hidden;
    transition: transform 0.4s var(--ease-out), box-shadow 0.4s var(--ease-out), border-color 0.4s ease, background 0.4s ease;
  }
  .luxe-glass-panel:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px -10px rgba(119, 140, 163, 0.22);
    background: rgba(255, 255, 255, 0.65);
    border-color: rgba(247, 202, 201, 0.6);
  }

  /* Circular Progress */
  .circular-chart {
    display: block;
    margin: 0 auto;
    max-width: 80%;
    max-height: 250px;
    filter: drop-shadow(0 4px 6px rgba(15, 23, 42, 0.03));
  }
  .circle-bg {
    fill: none;
    stroke: rgba(148, 163, 184, 0.15); /* var(--ink-faint) */
    stroke-width: 1.5;
  }
  .circle {
    fill: none;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke: var(--ink);
    transition: stroke-dasharray 1s ease-out;
  }
  .vis .circle.animated {
    animation: circle-draw 1.8s var(--ease-out) forwards;
  }
  
  .circle-value { opacity: 0; transform: scale(0.9); will-change: transform, opacity; }
  .vis .circle-value {
    animation: fadeUp 0.8s var(--ease-out) forwards;
  }

  /* Buttons (Matched to theme's .btn-primary and .btn-ghost) */
  .btn-primary-luxe {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: clamp(.75rem, 2vw, 1rem) clamp(1.2rem, 3vw, 2.2rem);
    background: var(--ink);
    color: #fff;
    font-size: clamp(8px, 1.5vw, 9px);
    text-transform: uppercase;
    letter-spacing: .18em;
    font-weight: 600;
    text-decoration: none;
    border: 1px solid var(--ink);
    border-radius: clamp(10px, 1.5vw, 14px);
    transition: background .2s ease, box-shadow .2s ease, transform .2s ease;
    white-space: nowrap;
  }
  .btn-primary-luxe:hover { 
    background: #1e293b; 
    box-shadow: 0 10px 30px -8px rgba(15,23,42,.4); 
    transform: translateY(-2px); 
  }

  .btn-outline-luxe {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: clamp(.75rem, 2vw, 1rem) clamp(1rem, 2.5vw, 2rem);
    background: var(--surface);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: var(--ink);
    font-size: clamp(8px, 1.5vw, 9px);
    text-transform: uppercase;
    letter-spacing: .18em;
    font-weight: 600;
    text-decoration: none;
    border: 1px solid var(--glass-border);
    border-radius: clamp(10px, 1.5vw, 14px);
    transition: background .2s ease, color .2s ease, transform .2s ease, border-color .2s ease;
    white-space: nowrap;
  }
  .btn-outline-luxe:hover { 
    background: rgba(255,255,255,0.9); 
    border-color: #fff; 
    transform: translateY(-2px); 
    box-shadow: var(--glass-shadow); 
  }
`

export function StoreFinderCTA() {
  const [ref, inView] = useInView<HTMLDivElement>(0.1)

  return (
    <section className="premium-cta-wrapper" aria-labelledby="store-finder-heading">
      <style dangerouslySetInnerHTML={{ __html: CTA_CSS }} />
      
      {/* Background Ambience matching the homepage Ink & Quartz blend */}
      <div className="premium-mesh" aria-hidden="true" />
      <div 
        className="absolute top-[-20%] right-[-10%] w-[50rem] h-[50rem] bg-[#f7cac9]/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" 
        style={{ animation: 'float-ambient 20s ease-in-out infinite' }} 
        aria-hidden="true"
      />
      <div 
        className="absolute bottom-[-20%] left-[-10%] w-[60rem] h-[60rem] bg-[#94a3b8]/15 rounded-full blur-[140px] pointer-events-none mix-blend-multiply" 
        style={{ animation: 'float-ambient 25s ease-in-out infinite reverse' }} 
        aria-hidden="true"
      />

      <div 
        className={`max-w-[1400px] mx-auto px-[clamp(16px,4vw,80px)] grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center relative z-10 ${inView ? 'vis' : ''}`}
        ref={ref}
      >
        
        {/* ── Left Column: Typography & CTAs ── */}
        <div className="lg:col-span-5 flex flex-col justify-center max-w-[640px]">
          
          <div className="fade-up-element delay-100 mb-6 sm:mb-8 inline-flex items-center gap-3">
            <Sparkles size={12} className="text-[#94a3b8]" aria-hidden="true" />
            <span className="text-[clamp(7px,1.3vw,9px)] uppercase tracking-[0.25em] font-bold text-[#64748b]">
              The Icon Experience
            </span>
          </div>

          <h2 id="store-finder-heading" className="sr-only">Come See Us - Store Finder</h2>

          <div className="serif text-[clamp(3.5rem,8vw,7rem)] leading-[1.05] tracking-[-0.03em] text-[#0f172a] mb-6" aria-hidden="true">
            <span className="split-word delay-100">Come</span>{' '}
            <span className="split-word delay-200 italic text-[#334155]">See</span>{' '}
            <span className="split-word delay-300">Us.</span>
          </div>

          <div className="fade-up-element delay-200 h-[3px] w-[clamp(40px,5vw,60px)] bg-[#0f172a] rounded-sm mb-6 opacity-80" />

          <p className="blur-in-element delay-300 text-[clamp(.82rem,2vw,1rem)] text-[#64748b] font-normal leading-[1.7] max-w-[440px] mb-10">
            Step into a space where vision meets craft. Our expert optometrists 
            offer high-precision eye care in an environment designed for those 
            who expect nothing but the absolute best.
          </p>

          <div className="fade-up-element delay-400 flex flex-wrap gap-[clamp(10px,2vw,16px)]">
            <Link href="/store" className="btn-primary-luxe group">
              Get Directions 
              <MapPin size={14} className="group-hover:rotate-12 transition-transform duration-300" aria-hidden="true" />
            </Link>

            <Link href="/booking" className="btn-outline-luxe group">
              Book Consult 
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* ── Right Column: The Unified Glass Bento ── */}
        <div className="lg:col-span-7 lg:pl-8">
          <div className="fade-up-element delay-300 luxe-glass-panel flex flex-col">
            
            {/* Top section: The Quote */}
            <div className="relative p-8 sm:p-12 lg:p-14 border-b border-[rgba(255,255,255,0.4)]">
              <Quote 
                size={120} 
                className="absolute top-4 left-4 text-[#94a3b8] opacity-10 rotate-[-10deg] pointer-events-none" 
                aria-hidden="true" 
              />
              <blockquote className="relative z-10">
                <p className="serif text-[clamp(1.5rem,4vw,2.5rem)] leading-[1.15] text-[#0f172a] mb-8">
                  "{QUOTE}"
                </p>
                <footer className="flex items-center gap-4">
                  <span className="w-8 h-[2px] bg-[rgba(15,23,42,0.8)] rounded-full" aria-hidden="true" />
                  <cite className="text-[clamp(7px,1.2vw,8px)] uppercase tracking-[0.2em] font-semibold text-[#64748b] not-italic">
                    Verified Client Review
                  </cite>
                </footer>
              </blockquote>
            </div>

            {/* Bottom section: The Metrics */}
            <div className="grid grid-cols-3 divide-x divide-[rgba(255,255,255,0.4)] p-6 sm:p-8 bg-[rgba(255,255,255,0.3)]">
              {METRICS.map((m) => (
                <div key={m.label} className="flex flex-col items-center justify-center gap-4 px-2">
                  <div className="relative w-14 h-14 sm:w-20 sm:h-20">
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
                      style={{ animationDelay: `calc(${m.delay} + 0.2s)` }}
                    >
                      <span className="serif text-[clamp(1rem,2vw,1.25rem)] text-[#0f172a] tracking-tight">
                        {m.value}
                      </span>
                    </div>
                  </div>
                  <span className="text-[clamp(6px,1vw,8px)] uppercase tracking-[0.2em] font-semibold text-[#64748b] text-center">
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