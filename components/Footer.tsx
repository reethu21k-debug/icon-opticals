'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useId, useMemo } from 'react'
import type { FormEvent, ReactNode } from 'react'

/* ── Types ────────────────────────────────────────────────────────────────── */

type LinkItem = {
  label: string
  href: string
}

type SocialItem = {
  label: string
  href: string
  icon: ReactNode
}

type TrustStat = {
  value: string
  sup: string
  label: string
  sub: string
}

/* ── Data ─────────────────────────────────────────────────────────────────── */

const SHOP_LINKS: LinkItem[] = [
  { label: 'Eyeglasses',       href: '/products?category=eyeglasses' },
  { label: 'Sunglasses',       href: '/products?category=sunglasses' },
  { label: 'Computer Glasses', href: '/products?category=computer-glasses' },
  { label: 'Contact Lenses',   href: '/products?category=contact-lenses' },
  { label: 'Progressive',      href: '/products?category=progressive' },
  { label: 'Kids Glasses',     href: '/products?gender=kids' },
  { label: 'All Products',     href: '/products' },
]

const SUPPORT_LINKS: LinkItem[] = [
  { label: 'Find Our Store',   href: '/store' },
  { label: 'My Account',       href: '/account' },
  { label: 'Track Order',      href: '/account/orders' },
  { label: 'Wishlist',         href: '/wishlist' },
  { label: 'My Bookings',      href: '/account/bookings' },
  { label: 'Returns & Policy', href: '/returns' },
]

const LEGAL_LINKS: LinkItem[] = [
  { label: 'Privacy Policy',   href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Returns',          href: '/returns' },
]

const TICKER_ITEMS: string[] = [
  'Premium Eyewear',
  'Free Eye Test',
  'Anantapur, AP',
  'Est. 2012',
  '500+ Happy Customers',
  'Same-Day Service',
  '4.8★ Google Rating',
  'Italian Frames',
]

const TRUST_STATS: TrustStat[] = [
  { value: '1',   sup: '',  label: 'Flagship Store',  sub: 'Anantapur, AP' },
  { value: '4.8', sup: '★', label: 'Google Rating',   sub: 'Verified reviews' },
  { value: '500', sup: '+', label: 'Happy Customers', sub: 'And growing' },
  { value: 'Free',sup: '',  label: 'Eye Tests',       sub: 'Every single visit' },
]

const ICONS = {
  Instagram: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  ),
  Facebook: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  ),
  LinkedIn: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  ),
  WhatsApp: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  Location: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Clock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Phone: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.87 12 19.79 19.79 0 0 1 1.75 3.37 2 2 0 0 1 3.74 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6.29 6.29l1.06-1.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

const SOCIAL: SocialItem[] = [
  { label: 'Instagram', href: 'https://instagram.com',       icon: ICONS.Instagram },
  { label: 'Facebook',  href: 'https://facebook.com',        icon: ICONS.Facebook },
  { label: 'LinkedIn',  href: 'https://www.linkedin.com/in/rithik-sai-gowda', icon: ICONS.LinkedIn },
  { label: 'WhatsApp',  href: 'https://wa.me/919876543210',  icon: ICONS.WhatsApp },
]

/* ── CSS ──────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Outfit:wght@300;400;500;600&display=swap');

@keyframes ticker  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
@keyframes ft-grow { from{transform:scaleX(0)} to{transform:scaleX(1)} }
@keyframes ft-rise { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* ── Variables & Theme ── */
.ft {
  --bg:          #ffffff;
  --bg-2:        #f8fafc;
  --bg-3:        #f1f5f9;
  --text-1:      #0f172a;
  --text-2:      #475569;
  --text-3:      #94a3b8;
  
  --accent:      #64748b; 
  --accent-hov:  #475569;
  --accent-soft: rgba(100, 116, 139, 0.08);
  --accent-line: rgba(100, 116, 139, 0.2);
  --quartz-glow: rgba(247, 202, 201, 0.12);
  
  --border:      #e2e8f0;
  --radius-sm:   12px;
  --radius-md:   16px;
  --shadow-sm:   0 4px 20px rgba(100, 116, 139, 0.06);
  --shadow-md:   0 8px 32px rgba(100, 116, 139, 0.08);

  background: var(--bg);
  color: var(--text-2);
  font-family: 'Outfit', sans-serif;
  font-weight: 300;
  position: relative;
}

.ft *:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 4px;
}

/* ═══ TICKER ═════════════════════════════════════════════════════ */
.ft-ticker-wrap {
  overflow: hidden;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  background: var(--bg-2);
  position: relative; 
  z-index: 1;
}
.ft-ticker-track {
  display: flex; 
  width: max-content;
  animation: ticker 35s linear infinite;
  will-change: transform;
}
.ft-ticker-track:hover { animation-play-state: paused; }
.ft-ticker-item {
  display: flex; align-items: center; gap: 0;
  padding: 1rem 0; white-space: nowrap;
  font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase;
  color: var(--text-3); font-weight: 500;
}
.ft-ticker-dot {
  display: inline-block;
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--accent); opacity: 0.4;
  margin: 0 2.5rem; flex-shrink: 0;
}

/* ═══ HERO BRAND ═════════════════════════════════════════════════ */
.ft-hero {
  position: relative; z-index: 1;
  border-bottom: 1px solid var(--border);
  overflow: hidden;
}
.ft-hero::before {
  content: '';
  position: absolute; inset: 0;
  background:
    radial-gradient(circle at 10% 100%, var(--accent-soft) 0%, transparent 45%),
    radial-gradient(circle at 90% 0%, var(--quartz-glow) 0%, transparent 55%);
  pointer-events: none;
}
.ft-hero-inner {
  max-width: 1400px; margin: 0 auto; padding: 6rem 44px 5rem;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 3rem;
  align-items: end;
}
@media(max-width:900px){ .ft-hero-inner{grid-template-columns:1fr;gap:2.5rem; padding:4rem 24px;} }

.ft-logo-side { display: flex; flex-direction: column; align-items: flex-start; }
.ft-eyebrow {
  font-size: 10px; letter-spacing: 0.4em; text-transform: uppercase;
  color: var(--text-2); font-weight: 600;
  display: flex; align-items: center; gap: 16px;
  margin-bottom: 1.5rem;
  animation: ft-rise 0.7s cubic-bezier(.22,1,.36,1) both;
}
.ft-eyebrow-line {
  display: block; width: 40px; height: 1px; background: var(--accent-line);
  transform-origin: left; animation: ft-grow 0.6s cubic-bezier(.22,1,.36,1) 0.1s both;
}
.ft-wordmark {
  font-family: 'Cormorant Garamond', 'Didot', serif;
  font-size: clamp(4rem, 8vw, 7rem);
  font-weight: 400; letter-spacing: 0.02em; line-height: 0.9;
  color: var(--text-1); text-decoration: none; display: block;
  animation: ft-rise 0.85s cubic-bezier(.22,1,.36,1) 0.08s both;
  transition: opacity 0.3s ease;
}
.ft-wordmark:hover { opacity: 0.8; }
.ft-wordmark em {
  font-style: italic; color: var(--accent); font-weight: 300;
}
.ft-wordmark-sub {
  margin-top: 1.8rem;
  display: flex; align-items: center; gap: 16px;
  animation: ft-rise 0.9s cubic-bezier(.22,1,.36,1) 0.18s both;
}
.ft-sub-rule { 
  height: 1px; width: 48px; background: var(--accent-line); flex-shrink: 0;
  transform-origin:left; animation: ft-grow 0.7s cubic-bezier(.22,1,.36,1) 0.25s both; 
}
.ft-sub-copy {
  font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--text-3); font-weight: 500;
}

.ft-social-side {
  display: flex; flex-direction: column;
  align-items: flex-end; justify-content: flex-end; gap: 1.2rem;
  padding-bottom: 0.5rem;
}
@media(max-width:900px){ .ft-social-side{align-items:flex-start;} }
.ft-social-tag {
  font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--text-3); font-weight: 600;
}
.ft-social-btns { display: flex; gap: 12px; }
.ft-social-btn {
  width: 46px; height: 46px; border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-2); text-decoration: none;
  transition: all 0.3s cubic-bezier(.22,1,.36,1);
  box-shadow: var(--shadow-sm);
}
.ft-social-btn:hover {
  border-color: var(--accent); color: var(--accent); 
  background: var(--bg);
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

/* ═══ STATS BAND ═════════════════════════════════════════════════ */
.ft-stats {
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  position: relative; z-index: 1;
}
.ft-stats-grid {
  max-width: 1400px; margin: 0 auto;
  display: grid; grid-template-columns: repeat(4, 1fr);
}
@media(max-width:768px){ .ft-stats-grid{grid-template-columns:repeat(2,1fr);} }
.ft-stat {
  padding: 3rem 2rem; text-align: center;
  border-right: 1px solid var(--border);
  position: relative; overflow: hidden;
  transition: background 0.4s ease;
}
@media(max-width:768px){ .ft-stat:nth-child(2) {border-right: none;}}
.ft-stat:last-child { border-right: none; }
.ft-stat:hover { background: var(--bg-2); }
.ft-stat-bar {
  position: absolute; bottom: 0; left: 50%;
  transform: translateX(-50%);
  height: 3px; width: 0; 
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  transition: width 0.5s cubic-bezier(.22,1,.36,1);
}
.ft-stat:hover .ft-stat-bar { width: 100px; }
.ft-stat-val {
  font-family: 'Cormorant Garamond', serif; font-weight: 500;
  font-size: clamp(2.2rem, 3.5vw, 3rem);
  color: var(--text-1); line-height: 1; letter-spacing: 0.02em;
  display: flex; align-items: baseline; justify-content: center; gap: 4px;
  margin-bottom: 12px;
}
.ft-stat-sup { font-size: 60%; color: var(--accent); }
.ft-stat-lbl {
  font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--text-2); font-weight: 600;
}
.ft-stat-sub { font-size: 13px; color: var(--text-3); margin-top: 8px; font-weight: 400; }

/* ═══ MAIN COLUMNS ═══════════════════════════════════════════════ */
.ft-cols {
  max-width: 1400px; margin: 0 auto; padding: 6rem 44px;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.8fr;
  gap: 5rem;
  position: relative; z-index: 1;
}
@media(max-width:1120px){ .ft-cols{grid-template-columns:1fr 1fr;gap:4rem;} }
@media(max-width:640px){  .ft-cols{grid-template-columns:1fr;gap:3.5rem;padding:4rem 24px;} }

.ft-col-head {
  font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--text-1); font-weight: 600;
  display: flex; align-items: center; gap: 14px; margin-bottom: 2.2rem;
}
.ft-col-head::after {
  content: ''; flex: 1; height: 1px; background: var(--border);
  transform-origin: left; animation: ft-grow 0.5s cubic-bezier(.22,1,.36,1) 0.1s both;
}

/* ── Nav links ── */
.ft-links { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1rem; }
.ft-link {
  font-size: 15px; color: var(--text-2); text-decoration: none;
  font-weight: 400; display: inline-flex; align-items: center;
  transition: all 0.3s cubic-bezier(.22,1,.36,1);
  position: relative; padding-left: 0; outline: none;
}
.ft-link::before {
  content: ''; position: absolute; left: 0; top: 50%;
  width: 14px; height: 1px; background: var(--accent);
  transform: translateY(-50%) scaleX(0); transform-origin: left;
  transition: transform 0.3s cubic-bezier(.22,1,.36,1);
}
.ft-link:hover, .ft-link:focus-visible { color: var(--accent-hov); padding-left: 26px; }
.ft-link:hover::before, .ft-link:focus-visible::before { transform: translateY(-50%) scaleX(1); }

/* ── Glass Store Card ── */
.ft-card {
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(248, 250, 252, 0.6);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  padding: 2.2rem; border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  display: flex; flex-direction: column; gap: 1.6rem;
  transition: box-shadow 0.3s ease;
}
.ft-card:hover { box-shadow: var(--shadow-md); }
.ft-card-row { display: flex; gap: 1.2rem; align-items: flex-start; }
.ft-card-icon {
  width: 36px; height: 36px; flex-shrink: 0; border-radius: var(--radius-sm);
  background: var(--bg); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 10px rgba(100, 116, 139, 0.08);
}
.ft-card-tag {
  font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--text-3); font-weight: 600; margin-bottom: 6px;
}
.ft-card-val {
  font-size: 14px; color: var(--text-2); line-height: 1.6; font-weight: 400; font-style: normal;
  text-decoration: none; transition: color 0.2s;
}
a.ft-card-val:hover { color: var(--accent-hov); }
.ft-card-val strong { color: var(--text-1); font-weight: 500; }
.ft-card-sep { height: 1px; background: linear-gradient(90deg, var(--border), transparent); }

/* ── Newsletter Form ── */
.ft-nl-intro {
  font-size: 15px; color: var(--text-2); line-height: 1.7;
  margin-bottom: 2rem; font-weight: 400;
}
.ft-nl-form {
  position: relative; display: flex; flex-direction: column;
}
.ft-nl-input {
  width: 100%; box-sizing: border-box;
  background: var(--bg); border: 1px solid var(--border); 
  color: var(--text-1); padding: 1.2rem 1.4rem;
  font-size: 15px; font-family: 'Outfit', sans-serif; font-weight: 400;
  outline: none; transition: all 0.3s ease;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
}
.ft-nl-input::placeholder { color: var(--text-3); }
.ft-nl-input:focus { 
  border-color: var(--accent); 
  z-index: 2;
  box-shadow: var(--shadow-sm); 
}
.ft-nl-btn {
  width: 100%; background: var(--bg-2); 
  border: 1px solid var(--border); border-top: none;
  color: var(--text-1); padding: 1.2rem 1.4rem;
  font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 600;
  font-family: 'Outfit', sans-serif; cursor: pointer;
  display: flex; align-items: center; justify-content: space-between;
  transition: all 0.3s ease;
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
}
.ft-nl-btn:hover, .ft-nl-btn:focus-visible { 
  color: var(--accent-hov); background: var(--accent-soft); 
}
.ft-nl-done {
  border: 1px solid var(--accent-line); background: var(--accent-soft); 
  border-radius: var(--radius-sm);
  padding: 1.2rem 1.4rem; font-size: 14px; color: var(--accent-hov); font-weight: 500;
  display: flex; align-items: center; gap: 10px;
}
.ft-nl-note { font-size: 13px; color: var(--text-3); margin-top: 1.2rem; }

.ft-trust { margin-top: 2.8rem; display: flex; flex-direction: column; gap: 1rem; }
.ft-trust-row { display: flex; align-items: center; gap: 14px; }
.ft-trust-gem {
  width: 6px; height: 6px; background: var(--text-3); opacity: 0.6; flex-shrink: 0;
  clip-path: polygon(50% 0%,100% 50%,50% 100%,0% 50%);
}
.ft-trust-txt { font-size: 14px; color: var(--text-2); font-weight: 400; }

/* ═══ BOTTOM AREA ════════════════════════════════════════════════ */
.ft-floor {
  border-top: 1px solid var(--border);
  background: var(--bg-2);
  position: relative; z-index: 1;
}
.ft-floor-inner {
  max-width: 1400px; margin: 0 auto; padding: 2.2rem 44px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 1.5rem; flex-wrap: wrap;
}

/* ── Agency Credit Alignment ── */
.ft-credit-row { display: flex; align-items: center; gap: 14px; }
.ft-credit-label { font-size: 11px; color: var(--text-3); letter-spacing: 0.2em; text-transform: uppercase; }
.ft-credit-pipe  { width: 1px; height: 16px; background: var(--border); }

/* ── THE NUCLEAR LOGO FIX ── */
.ft-agency-link {
  display: block !important;
  width: 140px !important;    /* Fixed box width */
  height: 32px !important;    /* Fixed box height */
  min-width: 140px !important; 
  flex-shrink: 0 !important;  /* Forbids flexbox from crushing this block */
  position: relative;
  transition: all 0.3s ease;
  opacity: 0.9;
}
.ft-agency-link:hover { opacity: 1; transform: translateY(-1px); }

.ft-agency-img {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
  object-position: left center !important;
}

.ft-legal-row { display: flex; align-items: center; gap: 2.5rem; flex-wrap: wrap; }
.ft-copy  { font-size: 13px; color: var(--text-3); font-weight: 400; }
.ft-legal-link {
  font-size: 13px; color: var(--text-3); text-decoration: none;
  font-weight: 400; transition: color 0.3s; outline: none;
}
.ft-legal-link:hover, .ft-legal-link:focus-visible { color: var(--text-1); }
@media(max-width:680px){
  .ft-floor-inner{ flex-direction:column; align-items:flex-start; gap:1.5rem; padding:2rem 24px; }
}
`

/* ── Sub-Components ──────────────────────────────────────────────────────── */

function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent]   = useState(false)
  const inputId = useId()

  const handle = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email.trim()) return
    setSent(true)
    setEmail('')
  }

  return (
    <form onSubmit={handle} className="ft-nl-form">
      {sent ? (
        <div className="ft-nl-done" role="status" aria-live="polite">
          ✦ <span>You&apos;re on the list.</span>
        </div>
      ) : (
        <>
          <label htmlFor={inputId} className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
            Email address
          </label>
          <input 
            id={inputId}
            type="email" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com" 
            className="ft-nl-input" 
          />
          <button type="submit" className="ft-nl-btn">
            <span>Subscribe</span>
            <span aria-hidden="true">→</span>
          </button>
        </>
      )}
    </form>
  )
}

function Ticker() {
  const doubled = useMemo(() => [...TICKER_ITEMS, ...TICKER_ITEMS], [])
  
  return (
    <div className="ft-ticker-wrap" aria-hidden="true">
      <div className="ft-ticker-track">
        {doubled.map((item, i) => (
          <span key={i} className="ft-ticker-item">
            {item}
            <span className="ft-ticker-dot" />
          </span>
        ))}
      </div>
    </div>
  )
}

function StoreCard() {
  return (
    <address className="ft-card">
      <div className="ft-card-row">
        <div className="ft-card-icon" aria-hidden="true">{ICONS.Location}</div>
        <div>
          <p className="ft-card-tag">Address</p>
          <p className="ft-card-val">
            <strong>Icon Opticals</strong><br/>
            Main Road, Anantapur<br/>
            Andhra Pradesh – 515001
          </p>
        </div>
      </div>
      <div className="ft-card-sep" aria-hidden="true" />
      <div className="ft-card-row">
        <div className="ft-card-icon" aria-hidden="true">{ICONS.Clock}</div>
        <div>
          <p className="ft-card-tag">Hours</p>
          <p className="ft-card-val">Mon – Sun &nbsp;·&nbsp; 10 am – 8 pm</p>
        </div>
      </div>
      <div className="ft-card-row">
        <div className="ft-card-icon" aria-hidden="true">{ICONS.Phone}</div>
        <div>
          <p className="ft-card-tag">Contact</p>
          <a href="tel:+919876543210" className="ft-card-val">
            +91 98765 43210
          </a>
        </div>
      </div>
    </address>
  )
}

interface NavColumnProps {
  title: string
  links: LinkItem[]
}

function NavColumn({ title, links }: NavColumnProps) {
  return (
    <nav aria-label={`${title} Links`}>
      <h2 className="ft-col-head">{title}</h2>
      <ul className="ft-links">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="ft-link">{l.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/* ── Main Footer Component ───────────────────────────────────────────────── */

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="ft">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <Ticker />

      {/* ── Brand Hero ── */}
      <section className="ft-hero">
        <div className="ft-hero-inner">
          <div className="ft-logo-side">
            <span className="ft-eyebrow">
              <span className="ft-eyebrow-line" aria-hidden="true" />
              Est. 2012
            </span>
            <Link href="/" className="ft-wordmark" aria-label="Icon Opticals Home">
              Icon <em>Opticals</em>
            </Link>
            <div className="ft-wordmark-sub">
              <span className="ft-sub-rule" aria-hidden="true" />
              <span className="ft-sub-copy">Premium Eyewear · Anantapur, Andhra Pradesh</span>
            </div>
          </div>

          <div className="ft-social-side">
            <span className="ft-social-tag">Follow Us</span>
            <div className="ft-social-btns">
              {SOCIAL.map((s) => (
                <a 
                  key={s.label} 
                  href={s.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ft-social-btn" 
                  aria-label={s.label}
                  title={s.label}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Stats ── */}
      <section className="ft-stats" aria-label="Company Statistics">
        <div className="ft-stats-grid">
          {TRUST_STATS.map((s) => (
            <div key={s.label} className="ft-stat">
              <div className="ft-stat-val">
                {s.value}
                {s.sup && <span className="ft-stat-sup" aria-hidden="true">{s.sup}</span>}
              </div>
              <h3 className="ft-stat-lbl">{s.label}</h3>
              <p className="ft-stat-sub">{s.sub}</p>
              <div className="ft-stat-bar" aria-hidden="true" />
            </div>
          ))}
        </div>
      </section>

      {/* ── Main Columns ── */}
      <div className="ft-cols">
        
        {/* Store Info */}
        <section>
          <h2 className="ft-col-head">Our Store</h2>
          <StoreCard />
        </section>

        {/* Navigation Links */}
        <NavColumn title="Shop" links={SHOP_LINKS} />
        <NavColumn title="Support" links={SUPPORT_LINKS} />

        {/* Newsletter Section */}
        <section>
          <h2 className="ft-col-head">Stay in the Loop</h2>
          <p className="ft-nl-intro">
            New arrivals, exclusive frames, and eye care tips — straight to your inbox.
          </p>
          <NewsletterForm />
          <p className="ft-nl-note">No spam. Unsubscribe anytime.</p>
          <div className="ft-trust">
            {[
              'Free eye test every visit',
              '500+ happy customers',
              '4.8 ★ on Google',
            ].map((t) => (
              <div key={t} className="ft-trust-row">
                <span className="ft-trust-gem" aria-hidden="true" />
                <span className="ft-trust-txt">{t}</span>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* ── Floor Bar ── */}
      <div className="ft-floor">
        <div className="ft-floor-inner">
          
          <div className="ft-credit-row">
            <span className="ft-credit-label">Crafted by</span>
            <div className="ft-credit-pipe" aria-hidden="true" />
            
            {/* THE FIX: Hardcoded block link with intrinsic image dimensions */}
            <a href="https://stryvenix.com" target="_blank" rel="noopener noreferrer" className="ft-agency-link" aria-label="Crafted by Stryvenix">
              <Image 
                src="/Stryvenix-Transparent-Logo.png" 
                alt="Stryvenix Logo" 
                width={280} 
                height={64} 
                className="ft-agency-img"
                priority
              />
            </a>
            
          </div>

          <nav className="ft-legal-row" aria-label="Legal Links">
            <span className="ft-copy">© {year} Icon Opticals</span>
            {LEGAL_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="ft-legal-link">{l.label}</Link>
            ))}
          </nav>
          
        </div>
      </div>
    </footer>
  )
}