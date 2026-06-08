// 'use client'

// import { useState, useEffect } from 'react'
// import { useRouter, useSearchParams, usePathname } from 'next/navigation'
// import { ChevronLeft, ChevronRight, PackageSearch } from 'lucide-react'
// import ProductCard from './ProductCard'
// import LensFlowModal from '@/components/lens/LensFlowModal'
// import { useCart } from '@/hooks/useCart'
// import { useAuth } from '@/hooks/useAuth'
// import { createClient } from '@/lib/supabase'
// import type { Product, ProductFilters, LensFlowState } from '@/types'

// interface ProductGridProps {
//   products: Product[]
//   total: number
//   page: number
//   perPage: number
//   filters: ProductFilters
// }

// export default function ProductGrid({ products, total, page, perPage, filters }: ProductGridProps) {
//   const router       = useRouter()
//   const pathname     = usePathname()
//   const searchParams = useSearchParams()

//   const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
//   const [isAdmin, setIsAdmin]                 = useState(false)
//   const { userId, ready }                     = useAuth()
//   const { addToCart }                         = useCart(userId)
//   const totalPages                            = Math.ceil(total / perPage)

//   // Detect admin role once the auth user is known
//   useEffect(() => {
//     if (!ready || !userId) { setIsAdmin(false); return }
//     const supabase = createClient()
//     supabase
//       .from('profiles')
//       .select('role')
//       .eq('id', userId)
//       .single()
//       .then(({ data }: { data: { role: string } | null }) => {
//         setIsAdmin(data?.role === 'admin')
//       })
//   }, [userId, ready])

//   const goToPage = (p: number) => {
//     const params = new URLSearchParams(searchParams.toString())
//     params.set('page', String(p))
//     router.push(`${pathname}?${params.toString()}`, { scroll: true })
//   }

//   const handleLensComplete = async (config: LensFlowState) => {
//     if (!selectedProduct || !userId) return
//     const result = await addToCart(selectedProduct.id, config, selectedProduct.final_price)
//     if (result.success) setSelectedProduct(null)
//   }

//   // ── Page numbers logic ──────────────────────────────────────
//   const getPageNumbers = (): (number | '…')[] => {
//     if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
//     const pages: (number | '…')[] = [1]
//     if (page > 3) pages.push('…')
//     for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
//       pages.push(i)
//     }
//     if (page < totalPages - 2) pages.push('…')
//     pages.push(totalPages)
//     return pages
//   }

//   // ── Empty State ──────────────────────────────────────────────
//   if (!products.length) {
//     return (
//       <div
//         style={{
//           display: 'flex',
//           flexDirection: 'column',
//           alignItems: 'center',
//           justifyContent: 'center',
//           padding: '80px 24px',
//           border: '1px solid #e2e8f0',
//           borderRadius: 10,
//           background: '#f8fafc',
//           textAlign: 'center',
//           gap: 16,
//         }}
//       >
//         <div
//           style={{
//             width: 56,
//             height: 56,
//             borderRadius: '50%',
//             background: '#fff',
//             border: '1px solid #e2e8f0',
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'center',
//             boxShadow: '0 2px 8px rgba(15,23,42,.06)',
//           }}
//         >
//           <PackageSearch size={22} strokeWidth={1.25} style={{ color: '#94a3b8' }} />
//         </div>
//         <div>
//           <h3
//             style={{
//               fontSize: 'clamp(1.25rem,2.5vw,1.75rem)',
//               fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif',
//               color: '#0f172a',
//               margin: '0 0 8px',
//               letterSpacing: '-.02em',
//             }}
//           >
//             No Selections Found
//           </h3>
//           <p
//             style={{
//               fontSize: 9,
//               letterSpacing: '.2em',
//               textTransform: 'uppercase',
//               color: '#94a3b8',
//               fontWeight: 600,
//               margin: 0,
//             }}
//           >
//             Try adjusting your filters or search
//           </p>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div style={{ display: 'flex', flexDirection: 'column' }}>

//       {/* ── Grid header ─────────────────────────────────────── */}
//       <div
//         style={{
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'space-between',
//           marginBottom: 28,
//           paddingBottom: 16,
//           borderBottom: '1px solid #e2e8f0',
//         }}
//       >
//         <p style={{ fontSize: 10, color: '#64748b', margin: 0, letterSpacing: '.02em' }}>
//           Showing{' '}
//           <span style={{ color: '#0f172a', fontWeight: 700 }}>
//             {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)}
//           </span>
//           {' '}of{' '}
//           <span style={{ color: '#0f172a', fontWeight: 700 }}>
//             {total.toLocaleString('en-IN')}
//           </span>
//           {' '}results
//         </p>

//         {/* Page indicator on right */}
//         {totalPages > 1 && (
//           <p
//             style={{
//               fontSize: 9,
//               color: '#94a3b8',
//               fontWeight: 500,
//               margin: 0,
//               letterSpacing: '.1em',
//               textTransform: 'uppercase',
//             }}
//           >
//             Page {page} of {totalPages}
//           </p>
//         )}
//       </div>

//       {/* ── Product grid ────────────────────────────────────── */}
//       <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6 lg:gap-x-5 lg:gap-y-8">
//         {products.map((product, i) => (
//           <div
//             key={product.id}
//             style={{
//               animation: `gridFadeUp .38s cubic-bezier(.22,1,.36,1) ${(i % 12) * 0.04}s both`,
//             }}
//           >
//             <style>{`
//               @keyframes gridFadeUp {
//                 from { opacity:0; transform:translateY(14px) }
//                 to   { opacity:1; transform:translateY(0) }
//               }
//             `}</style>
//             <ProductCard
//               product={product}
//               userId={userId || undefined}
//               isAdmin={isAdmin}
//               onAddToCart={p => setSelectedProduct(p)}
//             />
//           </div>
//         ))}
//       </div>

//       {/* ── Pagination ──────────────────────────────────────── */}
//       {totalPages > 1 && (
//         <div
//           style={{
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'center',
//             gap: 6,
//             marginTop: 60,
//             paddingTop: 32,
//             borderTop: '1px solid #e2e8f0',
//           }}
//         >
//           {/* Prev */}
//           <button
//             onClick={() => goToPage(page - 1)}
//             disabled={page === 1}
//             aria-label="Previous page"
//             style={{
//               width: 38,
//               height: 38,
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               border: '1px solid #e2e8f0',
//               borderRadius: 6,
//               background: '#fff',
//               color: page === 1 ? '#cbd5e1' : '#0f172a',
//               cursor: page === 1 ? 'not-allowed' : 'pointer',
//               marginRight: 4,
//               transition: 'border-color .18s ease, box-shadow .18s ease',
//             }}
//             onMouseEnter={e => { if (page !== 1) (e.currentTarget.style.borderColor = '#0f172a') }}
//             onMouseLeave={e => { (e.currentTarget.style.borderColor = '#e2e8f0') }}
//           >
//             <ChevronLeft size={15} strokeWidth={1.5} />
//           </button>

//           {/* Page numbers */}
//           {getPageNumbers().map((num, i) =>
//             num === '…' ? (
//               <span
//                 key={`ellipsis-${i}`}
//                 style={{
//                   width: 38,
//                   height: 38,
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   fontSize: 11,
//                   color: '#94a3b8',
//                   letterSpacing: '.05em',
//                 }}
//               >
//                 ···
//               </span>
//             ) : (
//               <button
//                 key={num}
//                 onClick={() => goToPage(num as number)}
//                 style={{
//                   width: 38,
//                   height: 38,
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   border: `1px solid ${num === page ? '#0f172a' : 'transparent'}`,
//                   borderRadius: 6,
//                   background: num === page ? '#0f172a' : 'transparent',
//                   color: num === page ? '#fff' : '#475569',
//                   fontSize: 11,
//                   fontWeight: num === page ? 700 : 500,
//                   cursor: 'pointer',
//                   transition: 'all .18s ease',
//                 }}
//                 onMouseEnter={e => {
//                   if (num !== page) {
//                     e.currentTarget.style.background = '#f1f5f9'
//                     e.currentTarget.style.color = '#0f172a'
//                   }
//                 }}
//                 onMouseLeave={e => {
//                   if (num !== page) {
//                     e.currentTarget.style.background = 'transparent'
//                     e.currentTarget.style.color = '#475569'
//                   }
//                 }}
//                 aria-current={num === page ? 'page' : undefined}
//               >
//                 {num}
//               </button>
//             ),
//           )}

//           {/* Next */}
//           <button
//             onClick={() => goToPage(page + 1)}
//             disabled={page === totalPages}
//             aria-label="Next page"
//             style={{
//               width: 38,
//               height: 38,
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//               border: '1px solid #e2e8f0',
//               borderRadius: 6,
//               background: '#fff',
//               color: page === totalPages ? '#cbd5e1' : '#0f172a',
//               cursor: page === totalPages ? 'not-allowed' : 'pointer',
//               marginLeft: 4,
//               transition: 'border-color .18s ease, box-shadow .18s ease',
//             }}
//             onMouseEnter={e => { if (page !== totalPages) (e.currentTarget.style.borderColor = '#0f172a') }}
//             onMouseLeave={e => { (e.currentTarget.style.borderColor = '#e2e8f0') }}
//           >
//             <ChevronRight size={15} strokeWidth={1.5} />
//           </button>
//         </div>
//       )}

//       {/* ── Modal ────────────────────────────────────────────── */}
//       {selectedProduct && userId && (
//         <LensFlowModal
//           product={selectedProduct}
//           userId={userId}
//           onClose={() => setSelectedProduct(null)}
//           onComplete={handleLensComplete}
//         />
//       )}
//     </div>
//   )
// }
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import ProductCard from './ProductCard'
import LensFlowModal from '@/components/lens/LensFlowModal'
import { useCart } from '@/hooks/useCart'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import type { Product, ProductFilters, LensFlowState } from '@/types'

interface ProductGridProps {
  products: Product[]
  total: number
  page: number
  perPage: number
  filters: ProductFilters
}

export default function ProductGrid({ products, total, page, perPage, filters }: ProductGridProps) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const gridTopRef = useRef<HTMLDivElement>(null)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isAdmin, setIsAdmin]                 = useState(false)
  const { userId, ready }                     = useAuth()
  const { addToCart }                         = useCart(userId)
  const totalPages                            = Math.ceil(total / perPage)

  // Detect admin role
  useEffect(() => {
    if (!ready || !userId) { setIsAdmin(false); return }
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
      .then(({ data }: { data: { role: string } | null }) => {
        setIsAdmin(data?.role === 'admin')
      })
  }, [userId, ready])

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
    
    // Cinematic glide to top
    setTimeout(() => {
      gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
  }

  const clearFilters = () => {
    const params = new URLSearchParams()
    if (filters.category) params.set('category', filters.category)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleLensComplete = async (config: LensFlowState) => {
    if (!selectedProduct || !userId) return
    const result = await addToCart(selectedProduct.id, config, selectedProduct.final_price)
    if (result.success) setSelectedProduct(null)
  }

  // ── Pagination Logic ────────────────────────────────────────
  const getPageNumbers = (): (number | '…')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | '…')[] = [1]
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
    return pages
  }

  // ── Concierge Empty State ────────────────────────────────────
  if (!products.length) {
    return (
      <div className="flex flex-col items-center justify-center py-40 px-6 text-center w-full">
        <h3 
          className="text-3xl md:text-5xl text-slate-900 tracking-tight mb-6"
          style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
        >
          No Curations Found
        </h3>
        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400 mb-12 max-w-md leading-loose">
          Your current specifications yielded no pieces in our archives. We invite you to broaden your search parameters.
        </p>
        <button
          onClick={clearFilters}
          className="group flex items-center gap-3 pb-2 border-b border-slate-900 text-[10px] uppercase tracking-[0.2em] font-medium text-slate-900 hover:text-slate-500 hover:border-slate-500 transition-all duration-300"
        >
          <X size={12} strokeWidth={1.5} className="group-hover:rotate-90 transition-transform duration-500" />
          Clear Refinements
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full" ref={gridTopRef}>
      
      {/* Cinematic Blur-Reveal Keyframes */}
      <style>{`
        @keyframes cinematicReveal {
          0% { opacity: 0; transform: translateY(24px) scale(0.98); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
      `}</style>

      {/* ── Editorial Header ──────────────────────────────────── */}
      <div className="flex items-baseline justify-between mb-16 hidden md:flex">
        <p className="text-[9px] uppercase tracking-[0.3em] font-medium text-slate-400">
          Viewing <span className="text-slate-900">{(page - 1) * perPage + 1}—{Math.min(page * perPage, total)}</span> of <span className="text-slate-900">{total.toLocaleString('en-IN')}</span> Pieces
        </p>
      </div>

      {/* ── Product Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-16 lg:gap-x-6 lg:gap-y-24">
        {products.map((product, i) => (
          <div
            key={`${product.id}-${page}`}
            style={{ 
              animation: `cinematicReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${(i % 12) * 0.08}s both` 
            }}
          >
            <ProductCard
              product={product}
              userId={userId || undefined}
              isAdmin={isAdmin}
              onAddToCart={p => setSelectedProduct(p)}
            />
          </div>
        ))}
      </div>

      {/* ── High-End Pagination ───────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center mt-32 pt-16">
          <div className="flex items-center gap-8">
            
            {/* Prev (Minimal Text Button) */}
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              aria-label="Previous page"
              className={`flex items-center gap-3 text-[9px] uppercase tracking-[0.2em] font-medium transition-all duration-300 ${
                page === 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowLeft size={14} strokeWidth={1} />
              Prev
            </button>

            {/* Numbers (Borderless, weight-based active state) */}
            <div className="flex items-center gap-5">
              {getPageNumbers().map((num, i) =>
                num === '…' ? (
                  <span key={`ellipsis-${i}`} className="text-xs text-slate-300 tracking-widest">
                    ···
                  </span>
                ) : (
                  <button
                    key={num}
                    onClick={() => goToPage(num as number)}
                    aria-current={num === page ? 'page' : undefined}
                    className={`text-[11px] transition-all duration-300 relative ${
                      num === page 
                        ? 'text-slate-900 font-bold' 
                        : 'text-slate-400 font-normal hover:text-slate-900'
                    }`}
                  >
                    {num}
                    {/* Active Indicator Dot */}
                    {num === page && (
                      <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 bg-slate-900 rounded-full" />
                    )}
                  </button>
                )
              )}
            </div>

            {/* Next (Minimal Text Button) */}
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
              aria-label="Next page"
              className={`flex items-center gap-3 text-[9px] uppercase tracking-[0.2em] font-medium transition-all duration-300 ${
                page === totalPages ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-slate-900'
              }`}
            >
              Next
              <ArrowRight size={14} strokeWidth={1} />
            </button>

          </div>
        </div>
      )}

      {/* ── Modal ────────────────────────────────────────────── */}
      {selectedProduct && userId && (
        <LensFlowModal
          product={selectedProduct}
          userId={userId}
          onClose={() => setSelectedProduct(null)}
          onComplete={handleLensComplete}
        />
      )}
    </div>
  )
}