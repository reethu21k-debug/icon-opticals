import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import AdminProductCard from '@/components/product/AdminProductCard'
import BannerSlider from '@/components/BannerSlider'
import PromoSlider from '@/components/PromoSlider' // <-- IMPORT ADDED HERE
import FlowingMenu from '@/components/FlowingMenu'
import InfiniteMenu from '@/components/InfiniteMenu'
import { StoreFinderCTA } from '@/components/ImprovedSections'
import { AnimationInit } from '@/components/AnimationInit'
import type { Product } from '@/types'

export const revalidate = 600

/* ─── SEO Metadata ───────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: 'Premium Eyewear | Buy Eyeglasses & Sunglasses Online',
  description: 'Discover premium eyeglasses, sunglasses, and contact lenses. Book a free eye test at our Anantapur store. Top brands, stylish frames, and expert eye care.',
  keywords: ['eyeglasses', 'sunglasses', 'contact lenses', 'computer glasses', 'premium eyewear', 'eye test Anantapur', 'buy glasses online', 'branded frames'],
  authors: [{ name: 'Your Store Name' }],
  openGraph: {
    title: 'Premium Eyewear & Sunglasses | Est. 2012',
    description: 'Explore our curated selection of premium eyewear. Visit our store in Anantapur for expert eye care and the latest trends in eyewear.',
    url: 'https://yourwebsite.com', 
    siteName: 'Your Eyewear Store',
    images: [
      {
        url: '/home/spl_banner.png',
        width: 1200,
        height: 630,
        alt: 'Premium Eyewear Collection',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Premium Eyewear & Sunglasses',
    description: 'Discover premium eyeglasses, sunglasses, and contact lenses. Top brands, stylish frames, and expert care.',
    images: ['/home/spl_banner.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://yourwebsite.com', 
  }
}

/* ─── Data fetching ──────────────────────────────────────────────────── */

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('products')
      .select(
        'id, name, slug, brand, category, gender, frame_type, frame_shape, base_price, discount_percent, final_price, images, stock, rating, review_count, tags, is_featured, is_active'
      )
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('rating', { ascending: false })
      .range(0, 7)
    return (data || []) as Product[]
  } catch {
    return []
  }
}

const PRODUCT_SELECT =
  'id, name, slug, brand, category, gender, frame_type, frame_shape, base_price, discount_percent, final_price, images, stock, rating, review_count, tags, is_featured, is_active'

async function getProductsByCategory(category: string, limit = 6): Promise<Product[]> {
  try {
    const supabase = createClient()
    const { data: exact } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('is_active', true)
      .eq('category', category)
      .order('rating', { ascending: false })
      .range(0, limit - 1)

    if (exact && exact.length > 0) return exact as Product[]

    const fuzzy = category.replace(/-/g, ' ')
    const { data: soft } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('is_active', true)
      .ilike('category', `%${fuzzy}%`)
      .order('rating', { ascending: false })
      .range(0, limit - 1)

    return (soft || []) as Product[]
  } catch {
    return []
  }
}

async function getKidsProducts(limit = 6): Promise<Product[]> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('is_active', true)
      .ilike('gender', '%kid%')
      .order('rating', { ascending: false })
      .range(0, limit - 1)
    return (data || []) as Product[]
  } catch {
    return []
  }
}

async function getShowcaseProducts(limit = 14): Promise<Product[]> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('is_active', true)
      .order('rating', { ascending: false })
      .range(0, limit - 1)
    return (data || []) as Product[]
  } catch {
    return []
  }
}

/* ─── Static data ───────────────────────────────────────────────────── */

const CATEGORIES = [
  { label: 'Eyeglasses',       img: 'https://static1.lenskart.com/media/desktop/img/Apr22/a2.png',      href: '/products?category=eyeglasses',              desc: 'Everyday vision correction' },
  { label: 'Sunglasses',       img: 'https://static1.lenskart.com/media/desktop/img/Apr22/b2.png',      href: '/products?category=sunglasses',              desc: 'Style & UV protection' },
  { label: 'Computer Glasses', img: 'https://static1.lenskart.com/media/desktop/img/Apr22/d2.png',      href: '/products?category=computer-glasses',        desc: 'Blue-light protection' },
  { label: 'Contact Lenses',   img: 'https://static1.lenskart.com/media/desktop/img/Apr22/d.png',       href: '/products?category=contact-lenses',          desc: 'Comfortable daily wear' },
  { label: 'Power Sunglasses', img: 'https://static1.lenskart.com/media/desktop/img/Apr22/e2.png',      href: '/products?category=sunglasses&powered=true', desc: 'Corrective + cool' },
  { label: 'Progressive',      img: 'https://static1.lenskart.com/media/desktop/img/June22/prog11.jpg', href: '/products?category=progressive',             desc: 'Multi-focal comfort' },
]

const FLOWING_MENU_ITEMS = [
  { link: '/products?category=eyeglasses',              text: 'Eyeglasses',        image: 'https://static1.lenskart.com/media/desktop/img/Apr22/a2.png' },
  { link: '/products?category=sunglasses',              text: 'Sunglasses',        image: 'https://static1.lenskart.com/media/desktop/img/Apr22/b2.png' },
  { link: '/products?category=computer-glasses',        text: 'Computer Glasses',  image: 'https://static1.lenskart.com/media/desktop/img/Apr22/d2.png' },
  { link: '/products?category=contact-lenses',          text: 'Contact Lenses',    image: 'https://static1.lenskart.com/media/desktop/img/Apr22/d.png'  },
  { link: '/products?category=sunglasses&powered=true', text: 'Power Sunglasses',  image: 'https://static1.lenskart.com/media/desktop/img/Apr22/e2.png' },
  { link: '/products?category=progressive',             text: 'Progressive',       image: 'https://static1.lenskart.com/media/desktop/img/June22/prog11.jpg' },
]

const BRAND_TILES = [
  { src: '/Ray-ban.png',      alt: 'Ray-Ban',        href: '/products?brand=ray-ban',        label: 'Ray-Ban',        wide: true  },
  { src: '/Scott_SG.png',    alt: 'Scott',          href: '/products?brand=scott',          label: 'Scott',          wide: false },
  { src: '/Titan_Brand.webp', alt: 'Titan',          href: '/products?brand=titan',          label: 'Titan',          wide: false },
  { src: '/tommy.jpg',        alt: 'Tommy Hilfiger', href: '/products?brand=tommy-hilfiger', label: 'Tommy Hilfiger', wide: false },
  { src: '/Voyage.jpg',       alt: 'Voyage',         href: '/products?brand=voyage',         label: 'Voyage',         wide: false },
]

const PARTNER_BRANDS = [
  { label: 'Ray-Ban',           href: '/products?brand=ray-ban'           },
  { label: 'Titan',             href: '/products?brand=titan'             },
  { label: 'Tommy Hilfiger',    href: '/products?brand=tommy-hilfiger'    },
  { label: 'Fastrack',          href: '/products?brand=fastrack'          },
  { label: 'French Connection', href: '/products?brand=french-connection' },
  { label: 'Scott',             href: '/products?brand=scott'             },
  { label: 'IDEE',              href: '/products?brand=idee'              },
  { label: 'Voyage',            href: '/products?brand=voyage'            },
  { label: 'Laurel Dale',       href: '/products?brand=laurel-dale'       },
  { label: 'Galore Bay',        href: '/products?brand=galore-bay'        },
  { label: 'Feather',           href: '/products?brand=feather'           },
  { label: 'John Karter',       href: '/products?brand=john-karter'       },
  { label: 'Caron',             href: '/products?brand=caron'             },
  { label: 'Kidstar',           href: '/products?brand=kidstar'           },
  { label: 'Red Grapes',        href: '/products?brand=red-grapes'        },
  { label: 'Grey Jack',         href: '/products?brand=grey-jack'         },
  { label: 'Roberto Gabriel',   href: '/products?brand=roberto-gabriel'   },
  { label: 'Para+',             href: '/products?brand=para-plus'         },
  { label: 'Tom Hardy',         href: '/products?brand=tom-hardy'         },
  { label: 'Daniel Hunter',     href: '/products?brand=daniel-hunter'     },
  { label: 'Xpress',            href: '/products?brand=xpress'            },
  { label: 'Qual',              href: '/products?brand=qual'              },
  { label: 'RK Parkens',        href: '/products?brand=rk-parkens'        },
]

const TRUST_STATS = [
  { value: '1',   numeric: 1,   label: 'Flagship Store',  delay: '0.1s',  suffix: ''  },
  { value: '4.8',  numeric: 4.8, label: 'Average Rating', delay: '0.17s', suffix: '★' },
  { value: '10',  numeric: 10,  label: 'Happy Clients',   delay: '0.24s', suffix: 'K+' },
  { value: 'Free', numeric: -1,  label: 'Consultations',  delay: '0.31s', suffix: ''  },
]

/* ─── PAGE STYLES (ENHANCED PREMIUM UI/UX) ────────────────────────── */

const PAGE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

  :root {
    --ink:        #0f172a;
    --ink-mid:    #334155;
    --ink-soft:   #64748b;
    --ink-faint:  #94a3b8;
    --line:       rgba(15, 23, 42, 0.08);
    --surface:    rgba(255, 255, 255, 0.6);
    --white:      rgba(255, 255, 255, 0.85);
    --glass-border: rgba(255, 255, 255, 0.4);
    --glass-highlight: inset 0 1px 0 0 rgba(255, 255, 255, 0.8);
    --glass-shadow: 0 12px 40px -12px rgba(15, 23, 42, 0.06);
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-fluid: cubic-bezier(0.22, 1, 0.36, 1);

    /* Responsive spacing tokens */
    --section-py: clamp(48px, 8vw, 96px);
    --container-px: clamp(20px, 5vw, 80px);
    --gap-sm: clamp(12px, 2vw, 20px);
    --gap-md: clamp(16px, 2.5vw, 32px);
    --gap-lg: clamp(24px, 4vw, 48px);
  }

  /* ── Base reset ── */
  *, *::before, *::after { box-sizing: border-box; }

  /* ── Animations ── */
  @keyframes lineDraw   { from { transform:scaleX(0) }    to { transform:scaleX(1) } }
  @keyframes fadeUp     { from { opacity:0; transform:translateY(30px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fadeIn     { from { opacity:0 } to { opacity:1 } }
  @keyframes marqScroll { from { transform:translateX(0) } to { transform:translateX(-50%) } }

  .split-word {
    display: inline-block;
    opacity: 0;
    transform: translateY(24px);
    animation: splitWordUp 0.9s var(--ease-fluid) forwards;
  }
  @keyframes splitWordUp {
    to { opacity: 1; transform: translateY(0); }
  }

  .blur-in {
    animation: blurReveal 1.2s var(--ease-fluid) 0.35s both;
  }
  @keyframes blurReveal {
    from { filter: blur(8px); opacity: 0; transform: translateY(10px); }
    to   { filter: blur(0px);  opacity: 1; transform: translateY(0); }
  }

  .shiny-text {
    background: linear-gradient(100deg, var(--ink-soft) 0%, var(--ink-soft) 28%, #cbd5e1 44%, #fff 50%, #cbd5e1 56%, var(--ink-soft) 72%, var(--ink-soft) 100%);
    background-size: 250% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shineSweep 4s linear infinite;
  }
  @keyframes shineSweep {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }

  .gradient-title {
    background: linear-gradient(135deg, #0f172a 0%, #475569 25%, #94a3b8 50%, #475569 75%, #0f172a 100%);
    background-size: 300% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: gradientShift 6s ease-in-out infinite;
  }
  @keyframes gradientShift {
    0%,100% { background-position: 0% center; }
    50%     { background-position: 100% center; }
  }

  .scroll-float-ready {
    will-change: transform, opacity;
    transition: opacity 0.9s var(--ease-fluid), transform 0.9s var(--ease-fluid);
  }
  .scroll-float-ready.float-visible {
    opacity: 1 !important;
    transform: translateY(0) !important;
  }

  .rule-ready {
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 1s var(--ease-fluid) 0.15s;
  }
  .rule-ready.rule-visible { transform: scaleX(1); }

  .text-cursor-after::after {
    content: '|';
    display: inline-block;
    margin-left: 4px;
    font-weight: 300;
    animation: cursorBlink 1s step-end infinite;
    -webkit-text-fill-color: currentColor;
    color: currentColor;
  }
  @keyframes cursorBlink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }

  .shiny-ornament {
    background: linear-gradient(90deg, var(--ink-faint) 0%, #94a3b8 35%, #0f172a 50%, #94a3b8 65%, var(--ink-faint) 100%);
    background-size: 220% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shineSweep 5s linear infinite;
    font-size: 11px;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    font-weight: 500;
  }

  .page-entry { font-family: 'DM Sans', sans-serif; animation: fadeIn .6s ease both; }
  .serif      { font-family: 'DM Serif Display', Georgia, serif !important; font-weight: 400; }

  /* ── Page container — fluid horizontal padding ── */
  .page-container {
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
    padding-left: var(--container-px);
    padding-right: var(--container-px);
  }

  /* ── Section padding ── */
  .section-pad {
    padding-top: var(--section-py);
    padding-bottom: var(--section-py);
  }

  /* ────────────────────────────────────────────────
     TICKER
  ──────────────────────────────────────────────── */
  .ticker-wrapper {
    overflow: hidden;
    border-top: 1px solid var(--glass-border);
    border-bottom: 1px solid var(--glass-border);
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 14px 0;
  }
  .ticker-track {
    display: flex;
    width: max-content;
    animation: marqScroll 35s linear infinite;
    will-change: transform;
  }
  .ticker-track:hover { animation-play-state: paused; }
  .ticker-item {
    white-space: nowrap;
    padding: 0 clamp(1.5rem, 3vw, 3.5rem);
    font-size: clamp(8px, 1.5vw, 10px);
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--ink-mid);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: clamp(10px, 1.5vw, 1.5rem);
  }
  .ticker-sep { color: var(--ink-faint); font-size: 8px; opacity: 0.5; }

  /* ────────────────────────────────────────────────
     CATEGORY SECTION
  ──────────────────────────────────────────────── */
  .cat-section {
    position: relative;
    z-index: 1;
    padding: var(--section-py) 0;
  }

  .cat-section-header {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: clamp(32px, 5vw, 48px);
    align-items: center;
  }

  .cat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--gap-sm);
  }
  @media (min-width: 640px) {
    .cat-grid { grid-template-columns: repeat(3, 1fr); gap: var(--gap-md); }
  }
  @media (min-width: 1024px) {
    .cat-grid { grid-template-columns: repeat(6, 1fr); gap: var(--gap-md); }
  }

  .cat-card {
    background: var(--surface);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: clamp(16px, 2.5vw, 24px);
    text-align: center;
    text-decoration: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
    transition: transform 0.6s var(--ease-fluid), box-shadow 0.6s var(--ease-fluid), border-color 0.4s ease, background 0.4s ease;
    position: relative;
    box-shadow: var(--glass-shadow), var(--glass-highlight);
  }
  .cat-card:hover {
    transform: translateY(-8px) scale(1.01);
    box-shadow: 0 30px 60px -12px rgba(15, 23, 42, 0.08), var(--glass-highlight);
    background: rgba(255, 255, 255, 0.85);
    border-color: rgba(255, 255, 255, 0.9);
  }
  /* Disable hover transform on touch devices */
  @media (hover: none) {
    .cat-card:hover { transform: none; box-shadow: var(--glass-shadow); }
    .cat-card:active { transform: scale(0.98); }
  }

  .cat-img-wrapper {
    width: 100%;
    padding: clamp(16px, 3vw, 32px) clamp(12px, 2vw, 20px) clamp(8px, 1.5vw, 16px);
    display: flex;
    justify-content: center;
    align-items: center;
    background: radial-gradient(circle at top center, rgba(255,255,255,0.8) 0%, transparent 80%);
  }
  .cat-card:hover .cat-img { transform: scale(1.08) translateY(-4px); }
  .cat-img {
    max-width: 100%;
    max-height: clamp(60px, 12vw, 110px);
    object-fit: contain;
    transition: transform 0.7s var(--ease-fluid);
    filter: drop-shadow(0 10px 15px rgba(0,0,0,0.05));
  }
  .cat-label {
    font-size: clamp(11px, 1.8vw, 14px);
    font-weight: 600;
    color: var(--ink);
    margin: 0 0 4px;
    letter-spacing: -0.01em;
    line-height: 1.3;
  }
  .cat-desc  {
    font-size: clamp(9px, 1.3vw, 11px);
    color: var(--ink-soft);
    margin: 0;
    font-weight: 400;
    line-height: 1.5;
  }
  .cat-text-pad {
    padding: clamp(10px, 2vw, 20px) clamp(8px, 1.5vw, 16px) clamp(16px, 2.5vw, 24px);
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  /* ────────────────────────────────────────────────
     HERO BADGE
  ──────────────────────────────────────────────── */
  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    border: 1px solid var(--glass-border);
    background: var(--surface);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    padding: 8px 18px;
    font-size: clamp(8px, 1.5vw, 9px);
    letter-spacing: 0.25em;
    text-transform: uppercase;
    font-weight: 600;
    border-radius: 100px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.02), var(--glass-highlight);
  }
  .hero-badge-dot {
    flex-shrink: 0;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--ink);
    animation: pulse-dot 2.5s ease infinite;
  }
  @keyframes pulse-dot {
    0%,100% { opacity:1; transform:scale(1) }
    50%      { opacity:.3; transform:scale(.6) }
  }

  /* ────────────────────────────────────────────────
     HERO SECTION
  ──────────────────────────────────────────────── */
  .hero-section {
    position: relative;
    z-index: 1;
    padding-top: var(--section-py);
    padding-bottom: var(--section-py);
  }
  .hero-inner {
    display: flex;
    flex-direction: column;
    gap: clamp(24px, 4vw, 36px);
    align-items: flex-start;
    max-width: 720px;
  }

  .hero-title {
    font-size: clamp(2.5rem, 8vw, 5.5rem);
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: var(--ink);
    margin: 0;
    overflow: visible;
  }
  .hero-desc {
    font-size: clamp(0.95rem, 2.2vw, 1.15rem);
    line-height: 1.6;
    color: var(--ink-soft);
    margin: 0;
    max-width: 480px;
    font-weight: 400;
    letter-spacing: 0.01em;
  }

  .hero-cta-group {
    display: flex;
    gap: clamp(12px, 2vw, 20px);
    flex-wrap: wrap;
    margin-top: 8px;
  }

  .hero-rule {
    height: 1px;
    width: clamp(60px, 8vw, 100px);
    background: var(--line);
    border-radius: 2px;
    transform-origin: left;
    animation: lineDraw 1s var(--ease-fluid) 0.3s both;
  }

  /* ────────────────────────────────────────────────
     TRUST GRID
  ──────────────────────────────────────────────── */
  .trust-grid {
    margin-top: clamp(40px, 6vw, 64px);
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--gap-md);
  }
  @media (min-width: 480px) {
    .trust-grid { grid-template-columns: repeat(4, 1fr); }
  }

  .trust-cell {
    text-align: left;
    padding: clamp(1.2rem, 3vw, 2rem) clamp(1.2rem, 2vw, 1.8rem);
    border: 1px solid var(--glass-border);
    background: var(--surface);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: clamp(16px, 2.5vw, 24px);
    transition: box-shadow .5s var(--ease-fluid), background .5s var(--ease-fluid), transform .5s var(--ease-fluid);
    animation: fadeUp .8s var(--ease-fluid) both;
    position: relative;
    overflow: hidden;
    box-shadow: var(--glass-shadow), var(--glass-highlight);
  }
  .trust-cell:hover { 
    box-shadow: 0 24px 48px -12px rgba(15,23,42,.08), var(--glass-highlight); 
    background: rgba(255,255,255,0.9); 
    transform: translateY(-4px); 
  }
  @media (hover: none) { .trust-cell:hover { transform: none; } }

  .trust-value  {
    font-size: clamp(1.8rem, 4vw, 2.8rem);
    color: var(--ink);
    line-height: 1;
    margin: 0;
  }
  .trust-divider{
    height: 1px;
    width: 100%;
    background: linear-gradient(90deg, var(--line), transparent);
    margin: clamp(12px, 2vw, 16px) 0;
  }
  .trust-label  {
    margin: 0;
    font-size: clamp(8px, 1.3vw, 10px);
    letter-spacing: 0.2em;
    color: var(--ink-soft);
    text-transform: uppercase;
    font-weight: 600;
  }

  /* ────────────────────────────────────────────────
     BUTTONS (PREMIUM PILL STYLE)
  ──────────────────────────────────────────────── */
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
  @media (hover: none) { .btn-primary:hover { transform: none; } }

  .btn-ghost {
    display: inline-flex;
    align-items: center;
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
  @media (hover: none) { .btn-ghost:hover { transform: none; } }

  /* ────────────────────────────────────────────────
     SECTION HEADER
  ──────────────────────────────────────────────── */
  .section-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: clamp(24px, 4vw, 48px);
    gap: clamp(12px, 3vw, 20px);
    flex-wrap: wrap;
  }
  .section-header-left {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }
  .section-eyebrow {
    margin: 0;
    font-size: clamp(8px, 1.4vw, 10px);
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--ink-soft);
    font-weight: 600;
  }
  .section-title {
    font-size: clamp(1.4rem, 3vw, 2.5rem);
    line-height: 1.1;
    letter-spacing: -0.02em;
    margin: 0;
    color: var(--ink);
  }
  .section-rule-line {
    height: 1px;
    width: clamp(30px, 4vw, 48px);
    background: var(--line);
    transform-origin: left;
    margin-top: 12px;
  }
  .view-all-link {
    flex-shrink: 0;
    position: relative;
    font-size: clamp(8px, 1.4vw, 10px);
    text-transform: uppercase;
    letter-spacing: 0.25em;
    font-weight: 600;
    color: var(--ink);
    text-decoration: none;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: clamp(8px, 1.5vw, 12px) clamp(12px, 2vw, 20px);
    background: var(--surface);
    border: 1px solid rgba(15, 23, 42, 0.1);
    border-radius: 100px;
    backdrop-filter: blur(12px);
    transition: all 0.4s var(--ease-fluid);
  }
  .view-all-link:hover { 
    background: var(--ink); 
    color: #fff; 
    border-color: var(--ink); 
    transform: translateY(-2px); 
    box-shadow: 0 8px 20px -6px rgba(15, 23, 42, 0.3);
  }
  @media (hover: none) { .view-all-link:hover { transform: none; } }

  /* ────────────────────────────────────────────────
     FULL-WIDTH BANNER
  ──────────────────────────────────────────────── */
  .fw-banner-wrap {
    position: relative;
    overflow: hidden;
    margin: var(--gap-lg) 0;
    border-radius: clamp(16px, 2.5vw, 32px);
    box-shadow: 0 20px 50px -10px rgba(0,0,0,0.06);
    display: block;
    transform: translateZ(0);
  }
  .fw-banner-wrap img {
    width: 100%;
    display: block;
    transition: transform 1.2s var(--ease-out);
    max-height: clamp(240px, 45vw, 560px);
    object-fit: cover;
  }
  .fw-banner-wrap:hover img { transform: scale(1.03); }
  .fw-banner-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(15,23,42,.05) 0%, transparent 60%);
    pointer-events: none;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: inherit;
  }

  /* ────────────────────────────────────────────────
     ORNAMENT DIVIDER
  ──────────────────────────────────────────────── */
  .ornament-divider {
    padding: clamp(32px, 5vw, 64px) 0;
    border-bottom: 1px solid rgba(15,23,42,0.05);
    border-top: 1px solid rgba(15,23,42,0.05);
  }
  .divider-ornament {
    display: flex;
    align-items: center;
    gap: 20px;
    margin: 0 auto;
    width: fit-content;
  }
  .divider-ornament::before, .divider-ornament::after {
    content: '';
    display: block;
    height: 1px;
    width: clamp(40px, 8vw, 140px);
    background: linear-gradient(90deg, transparent, var(--line), transparent);
  }

  /* ────────────────────────────────────────────────
     FLOWING MENU SECTION
  ──────────────────────────────────────────────── */
  .flowing-menu-section {
    position: relative;
    z-index: 1;
    padding: 0 0 var(--section-py);
  }
  .flowing-menu-section-header {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: clamp(24px, 4vw, 40px);
  }
  .flowing-menu-frame {
    position: relative;
    border-radius: clamp(20px, 3vw, 32px);
    overflow: hidden;
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.8),
      0 32px 80px -16px rgba(15,23,42,0.12),
      0 8px 24px -8px rgba(15,23,42,0.05);
  }
  .flowing-menu-frame::before,
  .flowing-menu-frame::after {
    content: '';
    position: absolute;
    z-index: 10;
    pointer-events: none;
    width: 24px;
    height: 24px;
    border-color: rgba(255,255,255,0.6);
    border-style: solid;
  }
  .flowing-menu-frame::before {
    top: 16px; left: 16px;
    border-width: 1px 0 0 1px;
    border-radius: 4px 0 0 0;
  }
  .flowing-menu-frame::after {
    bottom: 16px; right: 16px;
    border-width: 0 1px 1px 0;
    border-radius: 0 0 4px 0;
  }

  .flowing-menu-eyebrow {
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-bottom: 1px solid rgba(255,255,255,0.6);
    padding: clamp(14px, 2vw, 18px) clamp(20px, 3.5vw, 36px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .flowing-menu-eyebrow-text {
    font-size: clamp(8px, 1.4vw, 10px);
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--ink-soft);
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
  }
  .flowing-menu-eyebrow-hint {
    font-size: clamp(7px, 1.3vw, 9px);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--ink-faint);
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .flowing-menu-canvas {
    height: clamp(320px, 55vw, 560px);
    position: relative;
  }

  /* ────────────────────────────────────────────────
     SPHERE / INFINITE MENU SECTION
  ──────────────────────────────────────────────── */
  .sphere-section {
    padding: 0 0 var(--section-py);
    position: relative;
    z-index: 1;
  }
  .sphere-section-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: clamp(24px, 4vw, 40px);
    gap: var(--gap-md);
  }
  .sphere-section-header-left {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .sphere-menu-frame {
    position: relative;
    border-radius: clamp(20px, 3vw, 32px);
    overflow: hidden;
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.8),
      0 32px 80px -16px rgba(15,23,42,0.12),
      0 8px 24px -8px rgba(15,23,42,0.05);
    animation: spherePulse 6s ease-in-out infinite;
  }
  @keyframes spherePulse {
    0%,100% { box-shadow: 0 0 0 1px rgba(255,255,255,0.8), 0 32px 80px -16px rgba(15,23,42,0.12), 0 0 50px -10px rgba(15,23,42,0.04); }
    50%      { box-shadow: 0 0 0 1px #fff,                 0 32px 80px -16px rgba(15,23,42,0.18), 0 0 80px -10px rgba(15,23,42,0.08); }
  }
  .sphere-menu-frame::before,
  .sphere-menu-frame::after {
    content: '';
    position: absolute;
    z-index: 10;
    pointer-events: none;
    width: 24px;
    height: 24px;
    border-color: rgba(255,255,255,0.6);
    border-style: solid;
  }
  .sphere-menu-frame::before {
    top: 16px; left: 16px;
    border-width: 1px 0 0 1px;
    border-radius: 4px 0 0 0;
  }
  .sphere-menu-frame::after {
    bottom: 16px; right: 16px;
    border-width: 0 1px 1px 0;
    border-radius: 0 0 4px 0;
  }

  .sphere-menu-eyebrow {
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-bottom: 1px solid rgba(255,255,255,0.6);
    padding: clamp(14px, 2vw, 18px) clamp(20px, 3.5vw, 36px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    position: relative;
    z-index: 2;
  }

  .sphere-canvas-wrap {
    position: relative;
    color: #f8fafc;
    height: clamp(380px, 60vw, 680px);
  }
  .sphere-canvas-wrap::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 80px;
    background: linear-gradient(to top, rgba(248,250,252,0.25) 0%, transparent 100%);
    pointer-events: none;
    z-index: 5;
  }
  .sphere-canvas-wrap::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 60px;
    background: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 100%);
    pointer-events: none;
    z-index: 5;
  }

  .sphere-count-label {
    margin-top: clamp(16px, 2.5vw, 24px);
    text-align: center;
    font-size: clamp(8px, 1.4vw, 10px);
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--ink-soft);
    font-weight: 500;
  }

  /* ────────────────────────────────────────────────
     BRAND GRID
  ──────────────────────────────────────────────── */
  .brand-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: clamp(8px, 1.5vw, 16px);
    background: transparent;
    margin-bottom: clamp(32px, 5vw, 48px);
  }
  @media (min-width: 640px) {
    .brand-grid { grid-template-columns: repeat(3, 1fr); gap: clamp(12px, 2vw, 24px); }
  }

  .brand-tile {
    position: relative;
    overflow: hidden;
    background: var(--white);
    display: block;
    text-decoration: none;
    border-radius: clamp(16px, 2.5vw, 24px);
    box-shadow: var(--glass-shadow);
  }
  .brand-tile.wide { grid-column: span 2; }
  .brand-tile img  {
    width: 100%;
    display: block;
    object-fit: cover;
    aspect-ratio: 16 / 9;
    transition: transform 0.8s var(--ease-out);
  }
  .brand-tile.wide img { aspect-ratio: 2.5 / 1; }
  .brand-tile:hover img { transform: scale(1.04); }
  .brand-tile-overlay {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: clamp(16px, 2.5vw, 24px) clamp(20px, 3vw, 32px);
    background: linear-gradient(to top, rgba(15,23,42,.85) 0%, transparent 100%);
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  .brand-tile:hover .brand-tile-overlay { opacity: 1; }
  @media (hover: none) {
    .brand-tile-overlay { opacity: 1; background: linear-gradient(to top, rgba(15,23,42,.6) 0%, transparent 100%); }
  }
  .brand-tile-label {
    font-size: clamp(9px, 1.6vw, 11px);
    text-transform: uppercase;
    letter-spacing: 0.3em;
    color: #fff;
    font-weight: 600;
  }
  .brand-tile-arrow { font-size: clamp(14px, 2.5vw, 18px); color: rgba(255,255,255,.9); }

  /* ────────────────────────────────────────────────
     BRAND MARQUEE
  ──────────────────────────────────────────────── */
  .brand-marquee-wrapper {
    display: flex;
    overflow: hidden;
    user-select: none;
    -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
    mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
    padding: clamp(10px, 2vw, 16px) 0;
  }
  .brand-marquee-content {
    flex-shrink: 0;
    display: flex;
    justify-content: space-around;
    gap: clamp(12px, 2vw, 24px);
    min-width: 100%;
    animation: scroll-x 45s linear infinite;
    padding-right: clamp(12px, 2vw, 24px);
  }
  .brand-marquee-content.reverse {
    animation-direction: reverse;
    animation-duration: 50s;
  }
  .brand-marquee-wrapper:hover .brand-marquee-content { animation-play-state: paused; }
  @keyframes scroll-x {
    from { transform: translateX(0); }
    to   { transform: translateX(-100%); }
  }

  .partner-brand-pill {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(16px, 3vw, 24px) clamp(24px, 4.5vw, 48px);
    background: var(--surface);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--glass-border);
    border-radius: 100px;
    text-decoration: none;
    text-align: center;
    transition: all 0.5s var(--ease-fluid);
    box-shadow: var(--glass-shadow);
    white-space: nowrap;
    position: relative;
  }
  .partner-brand-pill::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 100px;
    box-shadow: var(--glass-highlight);
    pointer-events: none;
  }
  .partner-brand-pill:hover {
    background: var(--ink);
    border-color: var(--ink);
    transform: scale(1.04) translateY(-6px);
    box-shadow: 0 24px 48px -12px rgba(15,23,42,0.25);
    z-index: 10;
  }
  .partner-brand-name {
    font-size: clamp(9px, 1.6vw, 11px);
    font-weight: 600;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--ink-mid);
    transition: color 0.4s ease;
  }
  .partner-brand-pill:hover .partner-brand-name { color: #fff; }

  /* ────────────────────────────────────────────────
     BANNER FLUSH
  ──────────────────────────────────────────────── */
  .banner-flush {
    display: block;
    line-height: 0;
    font-size: 0;
    margin-top: 0 !important;
    padding-top: 0 !important;
  }

  /* ────────────────────────────────────────────────
     AUTHORIZED BRANDS LABEL
  ──────────────────────────────────────────────── */
  .brands-label-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: clamp(24px, 4vw, 40px);
    margin-bottom: clamp(16px, 3vw, 24px);
  }
  .brands-label-text {
    font-size: clamp(9px, 1.6vw, 12px);
    text-transform: uppercase;
    letter-spacing: 0.3em;
    font-weight: 600;
    color: var(--ink-soft);
    margin-bottom: clamp(16px, 3vw, 24px);
    text-align: center;
    padding: 0 var(--container-px);
  }
  .brands-label-rule {
    width: 60px;
    height: 1px;
    background: rgba(148,163,184,0.4);
    border-radius: 9999px;
  }

  /* ────────────────────────────────────────────────
     BRAND MARQUEE SPACE
  ──────────────────────────────────────────────── */
  .brand-marquee-space {
    overflow: hidden;
    padding-bottom: clamp(24px, 4vw, 64px);
    display: flex;
    flex-direction: column;
    gap: clamp(16px, 3vw, 32px);
  }

  /* ────────────────────────────────────────────────
     SCROLLBAR HIDE
  ──────────────────────────────────────────────── */
  .no-scroll::-webkit-scrollbar { display: none; }
  .no-scroll { -ms-overflow-style: none; scrollbar-width: none; }

  /* ────────────────────────────────────────────────
     MOBILE-SPECIFIC OVERRIDES
  ──────────────────────────────────────────────── */
  @media (max-width: 480px) {
    /* Reduce sphere/infinite menu height on small phones */
    .sphere-canvas-wrap { height: 320px; }
    .flowing-menu-canvas { height: 300px; }

    /* Hide eyebrow hints on tiny screens */
    .flowing-menu-eyebrow-hint { display: none; }

    /* Force brand-grid to 2 cols, wide still spans both */
    .brand-grid { grid-template-columns: 1fr 1fr; }
    .brand-tile.wide { grid-column: span 2; }

    /* Ensure product grids are 2 cols minimum */
    .product-grid-2 { grid-template-columns: repeat(2, 1fr) !important; }
  }

  @media (max-width: 360px) {
    :root { --container-px: 16px; }
    .hero-title { font-size: 2rem; }
  }

  /* ────────────────────────────────────────────────
     TABLET
  ──────────────────────────────────────────────── */
  @media (min-width: 768px) {
    .cat-grid { grid-template-columns: repeat(3, 1fr); }
    .trust-grid { grid-template-columns: repeat(4, 1fr); }
  }

  /* ────────────────────────────────────────────────
     DESKTOP
  ──────────────────────────────────────────────── */
  @media (min-width: 1024px) {
    .cat-grid { grid-template-columns: repeat(6, 1fr); }
  }
`

/* ─── Shared UI primitives ─────────────────────────────────────── */

function Ticker() {
  const items = [
    'Free Eye Test at Store',
    'Special Offers Inside',
    'Premium Lenses · Trusted Brands',
    '10K+ Happy Customers',
    "Anantapur's Premier Eyewear Store",
    'Book Your Home Try-On',
  ]
  const doubled = [...items, ...items]
  return (
    <div className="ticker-wrapper">
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <span key={i} className="ticker-item">
            {item}
            <span className="ticker-sep">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function SectionHeader({
  eyebrow,
  title,
  href,
  gradient,
}: {
  eyebrow: string
  title: string
  href: string
  gradient?: boolean
}) {
  return (
    <div className="section-header">
      <div className="section-header-left">
        <p className="section-eyebrow">{eyebrow}</p>
        <h2
          className={`serif section-title scroll-float-target${gradient ? ' gradient-title' : ''}`}
          dangerouslySetInnerHTML={{ __html: title }}
        />
        <div className="section-rule-line rule-animated" />
      </div>
      <Link href={href} className="view-all-link">
        View All
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  )
}

function FullWidthBanner({ src, alt, href }: { src: string; alt: string; href?: string }) {
  const img = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" />
      <div className="fw-banner-overlay" />
    </>
  )
  return href
    ? <Link href={href} className="fw-banner-wrap">{img}</Link>
    : <div className="fw-banner-wrap">{img}</div>
}

function OrnamentDivider({ label }: { label?: string }) {
  return (
    <div className="ornament-divider">
      <div className="divider-ornament">
        <span className="shiny-ornament">{label ?? '✦'}</span>
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default async function HomePage() {
  const [
    featured,
    eyeglassesProducts,
    sunglassesProducts,
    contactLensProducts,
    computerGlassesProducts,
    kidsProducts,
    showcaseProducts,
  ] = await Promise.all([
    getFeaturedProducts(),
    getProductsByCategory('eyeglasses', 6),
    getProductsByCategory('sunglasses', 6),
    getProductsByCategory('contact-lenses', 6),
    getProductsByCategory('computer-glasses', 3),
    getKidsProducts(3),
    getShowcaseProducts(14),
  ])

  return (
    <main
      className="page-entry"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, rgba(255,241,242,0.4) 100%)',
        color: '#0f172a',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: PAGE_STYLES }} />

      {/* ── 1. HERO BANNER SLIDER ─────────────────────────────── */}
      <div className="banner-flush">
        <BannerSlider />
      </div>

      {/* ── 2. MARQUEE TICKER ─────────────────────────────────── */}
      <Ticker />

      {/* ── 3. CATEGORY TILES ────────────────────────────────── */}
      <section className="cat-section">
        <div className="page-container">
          <div className="cat-section-header">
            <p className="section-eyebrow">Collections</p>
            <h2 className="serif section-title">Shop by Category</h2>
            <div className="section-rule-line rule-animated" style={{ margin: '12px auto 0' }} />
          </div>

          <div className="cat-grid">
            {CATEGORIES.map((cat, i) => (
              <Link
                key={cat.label}
                href={cat.href}
                className="cat-card"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animation: 'fadeUp .8s cubic-bezier(0.22, 1, 0.36, 1) both',
                }}
              >
                <div className="cat-img-wrapper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cat.img}
                    alt={cat.label}
                    className="cat-img"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="cat-text-pad">
                  <p className="cat-label">{cat.label}</p>
                  <p className="cat-desc">{cat.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. HERO TEXT + TRUST STATS ────────────────────────── */}
      <section className="hero-section">
        <div className="page-container">
          <div className="hero-inner">
            <div
              className="hero-badge"
              style={{ animation: 'fadeUp .6s cubic-bezier(0.22, 1, 0.36, 1) .05s both' }}
            >
              <span className="hero-badge-dot" />
              <span className="shiny-text">Premium Eyewear · Est. 2012</span>
            </div>

            <h1 className="serif hero-title">
              <span className="split-word" style={{ animationDelay: '0.1s' }}>See</span>{' '}
              <span className="split-word" style={{ animationDelay: '0.2s' }}>the</span>{' '}
              <span className="split-word" style={{ animationDelay: '0.3s' }}>World</span>
              <br />
              <em style={{ fontStyle: 'italic', color: '#334155' }}>
                <span className="split-word" style={{ animationDelay: '0.4s' }}>in</span>{' '}
                <span className="split-word" style={{ animationDelay: '0.5s' }}>Style</span>
              </em>
            </h1>

            <div className="hero-rule" />

            <p className="hero-desc blur-in">
              Premium eyeglasses, sunglasses &amp; contacts.
              Visit us at our store in Anantapur, Andhra Pradesh.
            </p>

            <div
              className="hero-cta-group"
              style={{ animation: 'fadeUp .7s cubic-bezier(0.22, 1, 0.36, 1) .3s both' }}
            >
              <Link href="/products" className="btn-primary">
                <span className="text-cursor-after">Shop Now</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <Link href="/booking" className="btn-ghost">Book Eye Test</Link>
            </div>
          </div>

          <div className="trust-grid">
            {TRUST_STATS.map(t => (
              <div key={t.label} className="trust-cell" style={{ animationDelay: t.delay }}>
                <p className="serif trust-value">
                  {t.numeric >= 0 ? (
                    <span data-count-display={t.numeric} data-suffix={t.suffix}>
                      {t.value}{t.suffix}
                    </span>
                  ) : (
                    <span>{t.value}</span>
                  )}
                </p>
                <div className="trust-divider" />
                <p className="trust-label">{t.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. SPECIAL BANNER ────────────────────────────────── */}
      <div className="page-container">
        <FullWidthBanner
          src="/home/spl_banner.png"
          alt="Special Offers Collection"
          href="/products?offer=special"
        />
      </div>

      {/* ── 5b. FLOWING MENU — CATEGORY NAVIGATOR ────────────── */}
      <section className="flowing-menu-section mt-8">
        <div className="page-container">
          <div className="flowing-menu-section-header">
            <p className="section-eyebrow">Navigate</p>
            <h2 className="serif section-title">
              Shop by&nbsp;<em style={{ fontStyle: 'italic', color: '#334155' }}>Category</em>
            </h2>
            <div className="section-rule-line rule-animated" />
          </div>

          <div className="flowing-menu-frame">
            <div className="flowing-menu-eyebrow">
              <span className="flowing-menu-eyebrow-text">All Collections</span>
              <span className="flowing-menu-eyebrow-hint">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
                Hover to explore
              </span>
            </div>

            <div className="flowing-menu-canvas">
              <FlowingMenu
                items={FLOWING_MENU_ITEMS}
                speed={18}
                textColor="#f8fafc"
                bgColor="#0f172a"
                marqueeBgColor="#f8fafc"
                marqueeTextColor="#0f172a"
                borderColor="rgba(248,250,252,0.15)"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. EYEGLASSES BANNER & GRID ───────────────────────── */}
      <div className="page-container mt-4">
        <FullWidthBanner 
          src="/home/Layers_banner.png" 
          alt="Layers of Luxury - Eyeglasses" 
          href="/products?category=eyeglasses" 
        />
      </div>
      {eyeglassesProducts.length > 0 && (
        <section className="section-pad" style={{ position: 'relative', zIndex: 1 }}>
          <div className="page-container">
            <SectionHeader eyebrow="Frames" title="Eyeglasses" href="/products?category=eyeglasses" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
              {eyeglassesProducts.map(p => <AdminProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── 7. SUNGLASSES BANNER & GRID ───────────────────────── */}
      <div className="page-container mt-4">
        <FullWidthBanner 
          src="/home/orange_banner.png" 
          alt="Summer Vibes - Sunglasses" 
          href="/products?category=sunglasses" 
        />
      </div>
      {sunglassesProducts.length > 0 && (
        <section className="section-pad">
          <div className="page-container">
            <SectionHeader eyebrow="Shades" title="Sunglasses" href="/products?category=sunglasses" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
              {sunglassesProducts.map(p => <AdminProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── 8. PROMO — TRENDING SHADES ───────────────────────── */}
      <div className="page-container mt-4">
        <FullWidthBanner
          src="/home/shades_banner.png"
          alt="Trending Sunglasses"
          href="/products?category=sunglasses&sort=trending"
        />
      </div>

      {/* ── 9. FEATURED ─────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="section-pad" style={{ position: 'relative', zIndex: 1 }}>
          <div className="page-container">
            <SectionHeader eyebrow="Curated Selection" title="Featured Styles" href="/products?sort=featured" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {featured.map(p => <AdminProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── 10. INTERACTIVE SPHERE SHOWCASE ───────────────────── */}
      {showcaseProducts.length > 0 && (
        <section className="sphere-section">
          <div className="page-container">

            <div className="sphere-section-header">
              <div className="sphere-section-header-left">
                <p className="section-eyebrow">Discover</p>
                <h2 className="serif section-title">
                  Explore Our&nbsp;<em style={{ fontStyle: 'italic', color: '#334155' }}>Universe</em>
                </h2>
                <div className="section-rule-line rule-animated" />
              </div>
              <Link href="/products" className="view-all-link">
                Shop All
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>

            <div className="sphere-menu-frame">
              <div className="sphere-menu-eyebrow">
                <span className="flowing-menu-eyebrow-text">Interactive 3D Showcase</span>
                <span className="flowing-menu-eyebrow-hint">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
                    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                  </svg>
                  Drag to spin&nbsp;·&nbsp;Click to shop
                </span>
              </div>

              <div className="sphere-canvas-wrap">
                <InfiniteMenu
                  items={showcaseProducts.map(p => ({
                    image: (Array.isArray(p.images) && p.images.length > 0)
                      ? (p.images.find(img => img.is_primary)?.url ?? p.images[0]?.url ?? 'https://picsum.photos/900/900?grayscale')
                      : 'https://picsum.photos/900/900?grayscale',
                    link: `/products/${p.slug}`,
                    title: p.name,
                    description: (p.brand ?? p.category ?? '').slice(0, 10),
                  }))}
                  scale={1}
                />
              </div>
            </div>

            <p className="sphere-count-label">
              ✦&nbsp;&nbsp;{showcaseProducts.length} products in the collection&nbsp;&nbsp;✦
            </p>

          </div>
        </section>
      )}

      {/* ── ORNAMENT DIVIDER ─────────────────────────────────── */}
      <OrnamentDivider label="✦   Contact & More   ✦" />

      {/* ── 11. CONTACT LENSES ───────────────────────────────── */}
      {contactLensProducts.length > 0 && (
        <section className="section-pad">
          <div className="page-container">
            <SectionHeader eyebrow="Lenses" title="Contact Lenses &amp; More" href="/products?category=contact-lenses" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
              {contactLensProducts.map(p => <AdminProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── 12. INTERACTIVE BANNER SLIDER (Night & Kids) ─────── */}
      <div className="page-container mt-8">
        <PromoSlider />
      </div>

      {/* ── COMPUTER GLASSES PRODUCT GRID ────────────────────── */}
      {computerGlassesProducts.length > 0 && (
        <section className="section-pad" style={{ position: 'relative', zIndex: 1 }}>
          <div className="page-container">
            <SectionHeader eyebrow="Screen Care" title="Computer &amp; Blue-Block Glasses" href="/products?category=computer-glasses" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {computerGlassesProducts.map(p => <AdminProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── KIDS GLASSES PRODUCT GRID ────────────────────────── */}
      {kidsProducts.length > 0 && (
        <section className="section-pad pt-0">
          <div className="page-container">
            <SectionHeader eyebrow="Little Ones" title="Kids Glasses" href="/products?gender=kids" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {kidsProducts.map(p => <AdminProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── 14. PROMO — LUXE ─────────────────────────────────── */}
      <div className="page-container mt-8">
        <FullWidthBanner
          src="/home/Luxe_banner.png"
          alt="Luxe Premium Collection"
          href="/products?tag=luxe"
        />
      </div>

      {/* ── 15. BRAND SHOWCASE ───────────────────────────────── */}
      <section className="section-pad" style={{ position: 'relative', zIndex: 1 }}>
        <div className="page-container">
          <SectionHeader eyebrow="Collections" title="Our Brands" href="/products" gradient />

          <div className="brand-grid">
            {BRAND_TILES.map(tile => (
              <Link
                key={tile.label}
                href={tile.href}
                className={`brand-tile${tile.wide ? ' wide' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tile.src} alt={tile.alt} loading="lazy" decoding="async" />
                <div className="brand-tile-overlay">
                  <span className="brand-tile-label">{tile.label}</span>
                  <span className="brand-tile-arrow">→</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="brands-label-wrap">
            <p className="brands-label-text">
              Authorized Premium &amp; Designer Labels
            </p>
            <div className="brands-label-rule" />
          </div>

          <div className="brand-marquee-space">
            <div className="brand-marquee-wrapper">
              {[1, 2, 3].map((set) => (
                <div key={`r1-${set}`} className="brand-marquee-content" aria-hidden={set !== 1}>
                  {PARTNER_BRANDS.slice(0, 12).map((partner) => (
                    <Link
                      key={`${set}-${partner.label}`}
                      href={partner.href}
                      className="partner-brand-pill"
                    >
                      <span className="partner-brand-name">{partner.label}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>

            <div className="brand-marquee-wrapper">
              {[1, 2, 3].map((set) => (
                <div key={`r2-${set}`} className="brand-marquee-content reverse" aria-hidden={set !== 1}>
                  {PARTNER_BRANDS.slice(12).map((partner) => (
                    <Link
                      key={`${set}-${partner.label}`}
                      href={partner.href}
                      className="partner-brand-pill"
                    >
                      <span className="partner-brand-name">{partner.label}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── 15b. TRAVEL READY CTA ────────────────────────────── */}
      <div className="page-container">
        <FullWidthBanner 
          src="/home/Travel_banner.png" 
          alt="Travel Ready Collection" 
          href="/products?tag=travel" 
        />
      </div>

      {/* ── 16. STORE FINDER CTA ─────────────────────────────── */}
      <StoreFinderCTA />

      {/* ── AnimationInit ── */}
      <AnimationInit />
    </main>
  )
}