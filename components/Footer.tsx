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
  '10K+ Happy Customers',
  'Same-Day Service',
  '4.8★ Google Rating',
  'Italian Frames',
]

const TRUST_STATS: TrustStat[] = [
  { value: '1',   sup: '',  label: 'Flagship Store',  sub: 'Anantapur, AP' },
  { value: '4.8', sup: '★', label: 'Google Rating',   sub: 'Verified reviews' },
  { value: '10',  sup: 'K+', label: 'Happy Customers', sub: 'And growing' },
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
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

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
  --ink:        #0f172a;
  --ink-mid:    #334155;
  --ink-soft:   #64748b;
  --ink-faint:  #94a3b8;
  --surface:    rgba(255, 255, 255, 0.4);
  --glass-border: rgba(255, 255, 255, 0.6);
  --glass-shadow: 0 8px 32px 0 rgba(15, 23, 42, 0.04);
  --ease-out:   cubic-bezier(.22,1,.36,1);
  --quartz:     rgba(247, 202, 201, 0.25);
  
  --radius-sm:  clamp(10px, 1.5vw, 14px);
  --radius-md:  clamp(14px, 2vw, 24px);

  /* Continues the gradient from the homepage */
  background: linear-gradient(135deg, rgba(255,241,242,0.4) 0%, #ffffff 50%, #f8fafc 100%);
  color: var(--ink-mid);
  font-family: 'DM Sans', sans-serif;
  position: relative;
  overflow: hidden;
}

.ft *:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 3px;
  border-radius: 4px;
}

.serif { font-family: 'DM Serif Display', Georgia, serif !important; }

/* ═══ TICKER ═════════════════════════════════════════════════════ */
.ft-ticker-wrap {
  overflow: hidden;
  border-top: 1px solid var(--glass-border);
  border-bottom: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
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
  padding: clamp(10px, 1.5vw, 16px) 0; white-space: nowrap;
  font-size: clamp(8px, 1.5vw, 9px); 
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--ink-soft); font-weight: 600;
}
.ft-ticker-dot {
  display: inline-block;
  font-size: 7px;
  color: var(--ink-faint);
  margin: 0 clamp(1rem, 2.5vw, 2.5rem); flex-shrink: 0;
}

/* ═══ HERO BRAND ═════════════════════════════════════════════════ */
.ft-hero {
  position: relative; z-index: 1;
  border-bottom: 1px solid var(--glass-border);
  overflow: hidden;
}
.ft-hero-inner {
  max-width: 1400px; margin: 0 auto; 
  padding: clamp(64px, 8vw, 100px) clamp(16px, 4vw, 80px);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 3rem;
  align-items: end;
}
@media(max-width:900px){ .ft-hero-inner{grid-template-columns:1fr;gap:2.5rem;} }

.ft-logo-side { display: flex; flex-direction: column; align-items: flex-start; }
.ft-eyebrow {
  font-size: clamp(7px, 1.3vw, 9px); 
  letter-spacing: 0.25em; text-transform: uppercase;
  color: var(--ink-soft); font-weight: 700;
  display: flex; align-items: center; gap: 16px;
  margin-bottom: clamp(16px, 2vw, 24px);
  animation: ft-rise 0.7s var(--ease-out) both;
}
.ft-eyebrow-line {
  display: block; width: 40px; height: 2px; background: var(--ink); border-radius: 2px;
  transform-origin: left; animation: ft-grow 0.6s var(--ease-out) 0.1s both;
}
.ft-wordmark {
  font-size: clamp(3.5rem, 8vw, 6.5rem);
  letter-spacing: -0.02em; line-height: 1;
  color: var(--ink); text-decoration: none; display: block;
  animation: ft-rise 0.85s var(--ease-out) 0.08s both;
  transition: opacity 0.3s ease;
}
.ft-wordmark:hover { opacity: 0.8; }
.ft-wordmark em {
  font-style: italic; color: var(--ink-mid);
}
.ft-wordmark-sub {
  margin-top: clamp(16px, 2vw, 24px);
  display: flex; align-items: center; gap: 16px;
  animation: ft-rise 0.9s var(--ease-out) 0.18s both;
}
.ft-sub-rule { 
  height: 2px; width: clamp(30px, 4vw, 48px); background: var(--ink-faint); 
  border-radius: 2px; flex-shrink: 0;
  transform-origin:left; animation: ft-grow 0.7s var(--ease-out) 0.25s both; 
}
.ft-sub-copy {
  font-size: clamp(8px, 1.5vw, 10px); 
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--ink-soft); font-weight: 600;
}

.ft-social-side {
  display: flex; flex-direction: column;
  align-items: flex-end; justify-content: flex-end; gap: 1.2rem;
  padding-bottom: 0.5rem;
}
@media(max-width:900px){ .ft-social-side{align-items:flex-start;} }
.ft-social-tag {
  font-size: clamp(8px, 1.5vw, 9px); 
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--ink-soft); font-weight: 700;
}
.ft-social-btns { display: flex; gap: clamp(8px, 1.5vw, 12px); }
.ft-social-btn {
  width: clamp(40px, 5vw, 48px); height: clamp(40px, 5vw, 48px); 
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  background: var(--surface);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  display: flex; align-items: center; justify-content: center;
  color: var(--ink); text-decoration: none;
  transition: all 0.3s var(--ease-out);
  box-shadow: var(--glass-shadow);
}
.ft-social-btn:hover {
  border-color: #fff; background: rgba(255,255,255,0.9);
  transform: translateY(-4px);
  box-shadow: 0 10px 20px -10px rgba(15, 23, 42, 0.1);
}

/* ═══ STATS BAND ═════════════════════════════════════════════════ */
.ft-stats {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--glass-border);
  position: relative; z-index: 1;
}
.ft-stats-grid {
  max-width: 1400px; margin: 0 auto;
  display: grid; grid-template-columns: repeat(4, 1fr);
}
@media(max-width:768px){ .ft-stats-grid{grid-template-columns:repeat(2,1fr);} }
.ft-stat {
  padding: clamp(32px, 4vw, 48px) clamp(16px, 2vw, 32px); 
  text-align: center;
  border-right: 1px solid var(--glass-border);
  position: relative; overflow: hidden;
  transition: background 0.4s ease;
}
@media(max-width:768px){ 
  .ft-stat:nth-child(2) {border-right: none;}
  .ft-stat:nth-child(1), .ft-stat:nth-child(2) {border-bottom: 1px solid var(--glass-border);}
}
.ft-stat:last-child { border-right: none; }
.ft-stat:hover { background: rgba(255, 255, 255, 0.5); }
.ft-stat-bar {
  position: absolute; bottom: 0; left: 50%;
  transform: translateX(-50%);
  height: 3px; width: 0; 
  background: var(--ink); border-radius: 2px 2px 0 0;
  transition: width 0.5s var(--ease-out);
}
.ft-stat:hover .ft-stat-bar { width: 60px; }
.ft-stat-val {
  font-size: clamp(2rem, 3.5vw, 2.5rem);
  color: var(--ink); line-height: 1; 
  display: flex; align-items: baseline; justify-content: center; gap: 4px;
  margin-bottom: 12px;
}
.ft-stat-sup { font-size: 60%; color: var(--ink-soft); font-family: 'DM Sans', sans-serif;}
.ft-stat-lbl {
  font-size: clamp(7px, 1.2vw, 8px); 
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--ink-soft); font-weight: 700;
}
.ft-stat-sub { 
  font-size: clamp(12px, 1.5vw, 13px); 
  color: var(--ink-faint); margin-top: 8px; font-weight: 500; 
}

/* ═══ MAIN COLUMNS ═══════════════════════════════════════════════ */
.ft-cols {
  max-width: 1400px; margin: 0 auto; 
  padding: clamp(64px, 8vw, 100px) clamp(16px, 4vw, 80px);
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.8fr;
  gap: clamp(40px, 5vw, 80px);
  position: relative; z-index: 1;
}
@media(max-width:1120px){ .ft-cols{grid-template-columns:1fr 1fr; gap: 3rem;} }
@media(max-width:640px){  .ft-cols{grid-template-columns:1fr;} }

.ft-col-head {
  font-size: clamp(9px, 1.5vw, 11px); 
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--ink); font-weight: 700;
  display: flex; align-items: center; gap: 14px; 
  margin-bottom: clamp(24px, 3vw, 32px);
}
.ft-col-head::after {
  content: ''; flex: 1; height: 1px; background: rgba(148,163,184,0.3);
  transform-origin: left; animation: ft-grow 0.5s var(--ease-out) 0.1s both;
}

/* ── Nav links ── */
.ft-links { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1rem; }
.ft-link {
  font-size: clamp(14px, 1.5vw, 15px); 
  color: var(--ink-soft); text-decoration: none;
  font-weight: 500; display: inline-flex; align-items: center;
  transition: all 0.3s var(--ease-out);
  position: relative; padding-left: 0; outline: none;
}
.ft-link::before {
  content: ''; position: absolute; left: 0; top: 50%;
  width: 14px; height: 1px; background: var(--ink);
  transform: translateY(-50%) scaleX(0); transform-origin: left;
  transition: transform 0.3s var(--ease-out);
}
.ft-link:hover, .ft-link:focus-visible { color: var(--ink); padding-left: 24px; }
.ft-link:hover::before, .ft-link:focus-visible::before { transform: translateY(-50%) scaleX(1); }

/* ── Glass Store Card ── */
.ft-card {
  background: var(--surface);
  backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--quartz);
  border-radius: var(--radius-md);
  padding: clamp(24px, 3vw, 36px); 
  box-shadow: var(--glass-shadow);
  display: flex; flex-direction: column; gap: 1.6rem;
  transition: transform 0.4s var(--ease-out), box-shadow 0.4s var(--ease-out), border-color 0.4s ease, background 0.4s ease;
}
.ft-card:hover { 
  transform: translateY(-4px);
  box-shadow: 0 20px 40px -10px rgba(119, 140, 163, 0.22);
  background: rgba(255, 255, 255, 0.65);
  border-color: rgba(247, 202, 201, 0.6);
}
.ft-card-row { display: flex; gap: 1.2rem; align-items: flex-start; }
.ft-card-icon {
  width: 36px; height: 36px; flex-shrink: 0; border-radius: var(--radius-sm);
  background: #fff; color: var(--ink);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
}
.ft-card-tag {
  font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--ink-faint); font-weight: 700; margin-bottom: 6px;
}
.ft-card-val {
  font-size: 14px; color: var(--ink-soft); line-height: 1.6; font-weight: 500; font-style: normal;
  text-decoration: none; transition: color 0.2s;
}
a.ft-card-val:hover { color: var(--ink); }
.ft-card-val strong { color: var(--ink); font-weight: 600; font-size: 15px;}
.ft-card-sep { height: 1px; background: linear-gradient(90deg, rgba(148,163,184,0.2), transparent); }

/* ── Newsletter Form ── */
.ft-nl-intro {
  font-size: clamp(14px, 1.5vw, 15px); 
  color: var(--ink-soft); line-height: 1.7;
  margin-bottom: 2rem; font-weight: 500;
}
.ft-nl-form {
  position: relative; display: flex; flex-direction: column;
}
.ft-nl-input {
  width: 100%; box-sizing: border-box;
  background: rgba(255,255,255,0.6); border: 1px solid var(--glass-border); 
  backdrop-filter: blur(8px);
  color: var(--ink); padding: 1.2rem 1.4rem;
  font-size: 15px; font-family: 'DM Sans', sans-serif; font-weight: 500;
  outline: none; transition: all 0.3s ease;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
}
.ft-nl-input::placeholder { color: var(--ink-faint); font-weight: 400; }
.ft-nl-input:focus { 
  border-color: var(--ink-soft); 
  z-index: 2;
  box-shadow: var(--glass-shadow); 
  background: #fff;
}
.ft-nl-btn {
  width: 100%; background: var(--ink); 
  border: 1px solid var(--ink); border-top: none;
  color: #fff; padding: 1.2rem 1.4rem;
  font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700;
  font-family: 'DM Sans', sans-serif; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 12px;
  transition: all 0.3s ease;
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
}
.ft-nl-btn:hover, .ft-nl-btn:focus-visible { 
  background: #1e293b; 
}
.ft-nl-done {
  border: 1px solid var(--glass-border); background: var(--surface); 
  backdrop-filter: blur(8px);
  border-radius: var(--radius-sm);
  padding: 1.2rem 1.4rem; font-size: 14px; color: var(--ink); font-weight: 600;
  display: flex; align-items: center; gap: 10px;
}
.ft-nl-note { font-size: 12px; color: var(--ink-faint); margin-top: 1.2rem; font-weight: 500; }

.ft-trust { margin-top: 2.8rem; display: flex; flex-direction: column; gap: 12px; }
.ft-trust-row { display: flex; align-items: center; gap: 14px; }
.ft-trust-gem {
  width: 6px; height: 6px; background: #10b981; border-radius: 50%; flex-shrink: 0;
}
.ft-trust-txt { font-size: 13px; color: var(--ink-soft); font-weight: 500; }

/* ═══ BOTTOM AREA ════════════════════════════════════════════════ */
.ft-floor {
  border-top: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  position: relative; z-index: 1;
}
.ft-floor-inner {
  max-width: 1400px; margin: 0 auto; 
  padding: clamp(24px, 3vw, 36px) clamp(16px, 4vw, 80px);
  display: flex; align-items: center; justify-content: space-between;
  gap: 1.5rem; flex-wrap: wrap;
}

/* ── Agency Credit Alignment ── */
.ft-credit-row { display: flex; align-items: center; gap: 14px; }
.ft-credit-label { font-size: 9px; color: var(--ink-faint); letter-spacing: 0.25em; text-transform: uppercase; font-weight: 700; }
.ft-credit-pipe  { width: 1px; height: 16px; background: rgba(148,163,184,0.3); }

/* ── THE NUCLEAR LOGO FIX ── */
.ft-agency-link {
  display: block !important;
  width: 140px !important;    
  height: 32px !important;    
  min-width: 140px !important; 
  flex-shrink: 0 !important;  
  position: relative;
  transition: all 0.3s var(--ease-out);
  opacity: 0.8;
}
.ft-agency-link:hover { opacity: 1; transform: translateY(-2px); }

.ft-agency-img {
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
  object-position: left center !important;
}

.ft-legal-row { display: flex; align-items: center; gap: 2.5rem; flex-wrap: wrap; }
.ft-copy  { font-size: 13px; color: var(--ink-soft); font-weight: 500; }
.ft-legal-link {
  font-size: 13px; color: var(--ink-soft); text-decoration: none;
  font-weight: 500; transition: color 0.3s; outline: none;
}
.ft-legal-link:hover, .ft-legal-link:focus-visible { color: var(--ink); }

@media(max-width:680px){
  .ft-floor-inner{ flex-direction:column; align-items:flex-start; gap:1.5rem; }
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
            <span className="ft-ticker-dot">✦</span>
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
            <Link href="/" className="serif ft-wordmark" aria-label="Icon Opticals Home">
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
              <div className="serif ft-stat-val">
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
              '10K+ happy customers',
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