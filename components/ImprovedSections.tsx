'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, MapPin, Sparkles } from 'lucide-react'

/* ─── Shared Hooks ─────────────────────────────────────────────────── */

function useInView<T extends HTMLElement>(threshold = 0.15) {
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
   STORE FINDER CTA  —  Architectural Luxury & Glass Bento Theme
═══════════════════════════════════════════════════════════════════ */

const METRICS = [
  { label: 'Client Satisfaction', value: '96%', delay: '0.4s' },
  { label: 'Same-Day Dispatch',   value: '88%', delay: '0.5s' },
  { label: 'Repeat Client Rate',  value: '74%', delay: '0.6s' },
] as const

const QUOTE = "The most refined eyewear experience in the city. Precise, personal, and genuinely exceptional."

const CTA_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

  .cta-section-wrapper {
    --ink:        #0f172a;
    --ink-mid:    #334155;
    --ink-soft:   #64748b;
    --ink-faint:  #94a3b8;
    --line:       rgba(15, 23, 42, 0.08);
    --surface:    rgba(255, 255, 255, 0.65);
    --glass-border: rgba(255, 255, 255, 0.8);
    --glass-highlight: inset 0 1px 0 0 rgba(255, 255, 255, 0.9);
    --glass-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.06);
    --ease-fluid: cubic-bezier(0.22, 1, 0.36, 1);

    position: relative; 
    overflow: hidden; 
    padding: clamp(64px, 10vw, 120px) 0; 
    font-family: 'DM Sans', sans-serif;
    color: var(--ink);
  }

  .serif { font-family: 'DM Serif Display', Georgia, serif !important; font-weight: 400; }

  /* Ambient Studio Lighting (Matched to Homepage) */
  .cta-ambient-light {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  /* Animations */
  @keyframes fadeUp { 
    0% { opacity: 0; transform: translateY(24px); } 
    100% { opacity: 1; transform: translateY(0); } 
  }
  @keyframes blurReveal {
    0% { filter: blur(10px); opacity: 0; transform: translateY(8px); }
    100% { filter: blur(0px); opacity: 1; transform: translateY(0); }
  }
  @keyframes splitWordUp {
    0% { opacity: 0; transform: translateY(24px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes lineDraw {
    0% { transform: scaleX(0); }
    100% { transform: scaleX(1); }
  }

  .vis .anim-fade-up { animation: fadeUp 0.8s var(--ease-fluid) forwards; }
  .vis .anim-blur-in { animation: blurReveal 1.1s var(--ease-fluid) forwards; }
  .vis .split-word   { animation: splitWordUp 0.8s var(--ease-fluid) forwards; }
  .vis .anim-line    { animation: lineDraw 1s var(--ease-fluid) forwards; transform-origin: left; }

  .anim-fade-up, .anim-blur-in, .split-word { opacity: 0; will-change: opacity, transform; }
  .anim-line { transform: scaleX(0); will-change: transform; }

  .delay-100 { animation-delay: 0.1s; }
  .delay-200 { animation-delay: 0.2s; }
  .delay-300 { animation-delay: 0.3s; }
  .delay-400 { animation-delay: 0.4s; }

  /* ── 12-Column Architectural Layout ── */
  .cta-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: clamp(36px, 6vw, 64px);
    align-items: center;
    position: relative;
    z-index: 10;
  }
  @media (min-width: 1024px) {
    .cta-grid { grid-template-columns: 1.1fr 0.9fr; gap: 80px; }
  }

  /* Eyebrow Badge matching Homepage */
  .cta-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    border: 1px solid rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    padding: 8px 18px;
    font-size: clamp(8px, 1.4vw, 9px);
    letter-spacing: 0.28em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--ink-soft);
    border-radius: 100px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.02), var(--glass-highlight);
    width: fit-content;
    margin-bottom: clamp(20px, 3vw, 28px);
  }

  /* Pill Buttons matching Homepage exactly */
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: clamp(0.9rem, 2.5vw, 1.1rem) clamp(1.5rem, 3.5vw, 2.5rem);
    background: var(--ink);
    color: #fff;
    font-size: clamp(9px, 1.6vw, 11px);
    text-transform: uppercase;
    letter-spacing: 0.25em;
    font-weight: 500;
    text-decoration: none;
    border: 1px solid var(--ink);
    border-radius: 100px;
    transition: background 0.4s ease, box-shadow 0.4s ease, transform 0.4s var(--ease-fluid);
    white-space: nowrap;
  }
  .btn-primary:hover { 
    background: #1e293b; 
    box-shadow: 0 12px 30px -8px rgba(15,23,42,.5); 
    transform: translateY(-2px); 
  }

  .btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: clamp(0.9rem, 2.5vw, 1.1rem) clamp(1.5rem, 3.5vw, 2.5rem);
    background: var(--surface);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    color: var(--ink);
    font-size: clamp(9px, 1.6vw, 11px);
    text-transform: uppercase;
    letter-spacing: 0.25em;
    font-weight: 500;
    text-decoration: none;
    border: 1px solid rgba(15, 23, 42, 0.15);
    border-radius: 100px;
    transition: background 0.4s ease, color 0.4s ease, transform 0.4s var(--ease-fluid), border-color 0.4s ease, box-shadow 0.4s ease;
    white-space: nowrap;
    box-shadow: var(--glass-shadow);
  }
  .btn-ghost:hover { 
    background: #fff; 
    border-color: rgba(15, 23, 42, 0.3); 
    transform: translateY(-2px); 
    box-shadow: 0 12px 30px -8px rgba(15,23,42,.1); 
  }

  /* Glass Bento Cards */
  .bento-card-quote {
    background: var(--surface);
    backdrop-filter: blur(32px);
    -webkit-backdrop-filter: blur(32px);
    border: 1px solid var(--glass-border);
    border-radius: clamp(24px, 3.5vw, 32px);
    padding: clamp(28px, 4.5vw, 48px);
    box-shadow: var(--glass-shadow), var(--glass-highlight);
    margin-bottom: clamp(16px, 2.5vw, 24px);
    transition: transform 0.5s var(--ease-fluid), box-shadow 0.5s var(--ease-fluid);
  }
  .bento-card-quote:hover {
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.85);
    box-shadow: 0 24px 60px -12px rgba(15, 23, 42, 0.08), var(--glass-highlight);
  }

  .bento-metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: clamp(12px, 2vw, 16px);
  }
  @media (max-width: 640px) {
    .bento-metrics-grid { grid-template-columns: 1fr; }
  }

  .bento-metric-cell {
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: clamp(16px, 2.5vw, 24px);
    padding: clamp(20px, 3vw, 28px) clamp(16px, 2vw, 24px);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: var(--glass-shadow);
    transition: all 0.5s var(--ease-fluid);
  }
  .bento-metric-cell:hover {
    background: rgba(255, 255, 255, 0.9);
    transform: translateY(-3px);
    border-color: #fff;
  }

  .metric-divider {
    height: 1px;
    width: 24px;
    background: rgba(15, 23, 42, 0.12);
    margin: 12px 0;
    transition: width 0.4s var(--ease-fluid);
  }
  .bento-metric-cell:hover .metric-divider { width: 100%; }
`

export function StoreFinderCTA() {
  const [ref, inView] = useInView<HTMLDivElement>(0.15)

  return (
    <section className="cta-section-wrapper" aria-labelledby="store-finder-heading">
      <style dangerouslySetInnerHTML={{ __html: CTA_CSS }} />
      
      {/* Subtle Studio Lighting directly matching homepage atmosphere */}
      <div className="cta-ambient-light" aria-hidden="true">
        <div className="absolute top-[10%] right-[15%] w-[40rem] h-[40rem] bg-slate-200/40 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[5%] left-[10%] w-[35rem] h-[35rem] bg-slate-100/60 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <div 
        className={`max-w-[1440px] mx-auto px-[clamp(20px,5vw,80px)] ${inView ? 'vis' : ''}`}
        ref={ref}
      >
        <div className="cta-grid">
          
          {/* ── Left Column: Editorial Narrative & Actions ── */}
          <div className="flex flex-col justify-center max-w-[620px]">
            
            <div className="cta-badge anim-fade-up delay-100">
              <Sparkles size={11} className="text-slate-400" aria-hidden="true" />
              <span>The Icon Experience</span>
            </div>

            <h2 id="store-finder-heading" className="sr-only">Come See Us - Store Finder</h2>

            <div className="serif text-[clamp(3.2rem,7.5vw,6rem)] leading-[0.98] tracking-[-0.03em] text-[#0f172a] mb-6" aria-hidden="true">
              <span className="split-word delay-100">Come</span>{' '}
              <span className="split-word delay-200 italic text-[#334155]">See</span>{' '}
              <span className="split-word delay-300">Us.</span>
            </div>

            <div className="h-[1px] w-[clamp(60px,8vw,100px)] bg-slate-900/15 mb-8 anim-line delay-200" />

            <p className="anim-blur-in delay-300 text-[clamp(0.95rem,2vw,1.1rem)] text-[#64748b] font-normal leading-[1.65] max-w-[460px] mb-10">
              Step into a studio where vision meets engineering. Our optical specialists 
              provide high-precision eye assessments in an environment curated for those 
              who appreciate uncompromising clarity and design.
            </p>

            <div className="anim-fade-up delay-400 flex flex-wrap gap-[clamp(12px,2vw,16px)]">
              <Link href="/store" className="btn-primary group">
                <span>Get Directions</span>
                <MapPin size={14} className="group-hover:rotate-12 transition-transform duration-300" aria-hidden="true" />
              </Link>

              <Link href="/booking" className="btn-ghost group">
                <span>Book Consult</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* ── Right Column: Architectural Glass Bento ── */}
          <div className="flex flex-col">
            
            {/* Top Bento Card: The Review */}
            <div className="bento-card-quote anim-fade-up delay-300">
              <p className="serif text-[clamp(1.35rem,3vw,2rem)] leading-[1.3] text-[#0f172a] mb-6 italic">
                "{QUOTE}"
              </p>
              <footer className="flex items-center gap-4">
                <span className="w-6 h-[1px] bg-slate-400" aria-hidden="true" />
                <cite className="text-[9px] uppercase tracking-[0.25em] font-semibold text-[#64748b] not-italic">
                  Verified Client Review
                </cite>
              </footer>
            </div>

            {/* Bottom Bento Grid: Elevated Typographic Counters */}
            <div className="bento-metrics-grid">
              {METRICS.map((m) => (
                <div key={m.label} className="bento-metric-cell anim-fade-up" style={{ animationDelay: m.delay }}>
                  <div>
                    <p className="serif text-[clamp(2rem,3.5vw,2.8rem)] leading-none text-[#0f172a] m-0 tracking-tight">
                      {m.value}
                    </p>
                    <div className="metric-divider" />
                  </div>
                  <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-[#64748b]">
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