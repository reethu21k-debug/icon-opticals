'use client'
// components/product/ProductActions.tsx
// ── Product action buttons including Virtual Try-On ──────────────────────────
//
// Changes from original:
//   • Added "Try On" button (Camera icon) between Wishlist and Eye-test buttons
//   • TryOnModal is loaded via next/dynamic — zero bundle impact on page load
//   • Only eyeglasses and sunglasses categories show the Try On button

import { useState, lazy, Suspense } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Heart, ShoppingBag, Eye, Check, Loader2, Camera } from 'lucide-react'
import { useCart, useWishlist } from '@/hooks/useCart'
import { useAuth } from '@/hooks/useAuth'
import LensFlowModal from '@/components/lens/LensFlowModal'
import type { Product, LensFlowState } from '@/types'
import type { TryOnProduct } from '@/components/try-on/types'

// Lazy-load TryOnModal — it drags in MediaPipe (heavy), so we defer it
// until the user clicks "Try On"
const TryOnModal = lazy(() => import('@/components/try-on/TryOnModal'))

// ── Eligibility helper ────────────────────────────────────────────────────────
// Show Try-On only when:
//  1. Category is eyeglasses or sunglasses, AND
//  2. The admin has uploaded at least one try-on field (overlay image OR any
//     dimension value).  Products with no try-on data show no Try-On button.
function isTryOnEligible(product: Product): boolean {
  const rightCategory =
    product.category === 'eyeglasses' || product.category === 'sunglasses'

  const hasTryOnData =
    !!product.try_on_image_url ||
    product.frame_width_mm   != null ||
    product.lens_width_mm    != null ||
    product.bridge_width_mm  != null ||
    product.temple_length_mm != null ||
    product.frame_height_mm  != null

  return rightCategory && hasTryOnData
}

// ── Prop types ────────────────────────────────────────────────────────────────
interface ProductActionsProps {
  product: Product
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ProductActions({ product }: ProductActionsProps) {
  const [showLensFlow, setShowLensFlow] = useState(false)
  const [showTryOn,    setShowTryOn]    = useState(false)
  const [addedToCart,  setAddedToCart]  = useState(false)
  const [adding,       setAdding]       = useState(false)

  const router   = useRouter()
  const pathname = usePathname()

  const { userId }            = useAuth()
  const { addToCart }         = useCart(userId)
  const { isWishlisted, toggle } = useWishlist(userId)

  const handleAuthRedirect = () => {
    router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`)
  }

  const handleAddToCart = () => {
    if (!userId) return handleAuthRedirect()
    if (product.stock <= 0) return
    setShowLensFlow(true)
  }

  const handleLensComplete = async (config: LensFlowState) => {
    if (!userId) return
    setAdding(true)
    setShowLensFlow(false)
    const result = await addToCart(product.id, config, product.final_price)
    if (result.success) {
      setAddedToCart(true)
      setTimeout(() => setAddedToCart(false), 3000)
    }
    setAdding(false)
  }

  const outOfStock = product.stock <= 0

  // Build a TryOnProduct from the full Product
  const tryOnProduct: TryOnProduct = {
    id:                 product.id,
    name:               product.name,
    brand:              product.brand,
    try_on_image_url:   product.try_on_image_url   ?? null,
    images:             product.images,
    frame_width_mm:     product.frame_width_mm      ?? null,
    lens_width_mm:      product.lens_width_mm       ?? null,
    bridge_width_mm:    product.bridge_width_mm     ?? null,
    temple_length_mm:   product.temple_length_mm    ?? null,
    frame_height_mm:    product.frame_height_mm     ?? null,
  }

  const eligible = isTryOnEligible(product)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">

        {/* ── Wishlist ──────────────────────────────────────────── */}
        <button
          onClick={() => {
            if (!userId) return handleAuthRedirect()
            toggle(product.id)
          }}
          aria-label={isWishlisted(product.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
          className={`group flex-shrink-0 w-14 h-14 border flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 ${
            isWishlisted(product.id)
              ? 'border-slate-900 bg-slate-50'
              : 'border-slate-200 hover:border-slate-900 hover:bg-slate-50'
          }`}
        >
          <Heart
            size={20}
            strokeWidth={1.25}
            className={`transition-all duration-300 group-hover:scale-110 ${
              isWishlisted(product.id)
                ? 'fill-slate-900 stroke-slate-900 scale-110'
                : 'stroke-slate-500 group-hover:stroke-slate-900'
            }`}
          />
        </button>

        {/* ── Virtual Try-On ────────────────────────────────────── */}
        {eligible && (
          <button
            onClick={() => setShowTryOn(true)}
            aria-label="Virtual Try-On"
            title="Try these glasses virtually using your camera"
            className="group relative flex-shrink-0 w-14 h-14 border border-slate-200 hover:border-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            <Camera
              size={20}
              strokeWidth={1.25}
              className="stroke-slate-500 group-hover:stroke-slate-900 group-hover:scale-110 transition-all duration-300"
            />
            {/* "NEW" badge */}
            <span
              className="absolute -top-2 -right-2 bg-slate-900 text-white text-[7px] font-bold px-1.5 py-0.5 uppercase tracking-widest leading-none"
              aria-hidden="true"
            >
              Try
            </span>
          </button>
        )}

        {/* ── Try at Store ──────────────────────────────────────── */}
        <button
          onClick={() => router.push('/booking')}
          aria-label="Try at Boutique"
          className="group flex-shrink-0 w-14 h-14 border border-slate-200 hover:border-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
        >
          <Eye
            size={20}
            strokeWidth={1.25}
            className="stroke-slate-500 group-hover:stroke-slate-900 group-hover:scale-110 transition-all duration-300"
          />
        </button>

        {/* ── Add to Cart ───────────────────────────────────────── */}
        <button
          onClick={handleAddToCart}
          disabled={outOfStock || adding}
          aria-live="polite"
          className={`flex-1 h-14 text-[11px] uppercase tracking-[0.15em] font-medium flex items-center justify-center gap-2.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 ${
            outOfStock
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-100'
              : addedToCart
              ? 'bg-slate-50 border border-slate-900 text-slate-900'
              : 'bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white active:scale-[0.98]'
          }`}
        >
          {adding ? (
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
          ) : addedToCart ? (
            <>
              <Check size={16} strokeWidth={1.5} className="animate-in zoom-in duration-300" />
              <span>Added to Cart</span>
            </>
          ) : outOfStock ? (
            'Out of Stock'
          ) : (
            <>
              <ShoppingBag size={16} strokeWidth={1.5} />
              <span>Add to Cart</span>
            </>
          )}
        </button>
      </div>

      {/* ── Virtual Try-On CTA banner (below main row) ────────── */}
      {eligible && (
        <button
          onClick={() => setShowTryOn(true)}
          className="w-full h-14 border border-slate-900 text-slate-900 text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-slate-900 hover:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 active:scale-[0.99] flex items-center justify-center gap-3 group"
        >
          <Camera
            size={16}
            strokeWidth={1.5}
            className="group-hover:scale-110 transition-transform duration-300"
          />
          Virtual Try-On — See how they look on you
        </button>
      )}

      {/* ── Home Try-On (non-Try-On variant) ─────────────────── */}
      {!eligible && !outOfStock && (
        <button className="w-full h-14 border border-slate-900 text-slate-900 text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-slate-900 hover:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 active:scale-[0.99]">
          Complimentary Home Try-On
        </button>
      )}

      {/* ── Lens configuration modal ──────────────────────────── */}
      {showLensFlow && userId && (
        <LensFlowModal
          product={product}
          userId={userId}
          onClose={() => setShowLensFlow(false)}
          onComplete={handleLensComplete}
        />
      )}

      {/* ── Virtual Try-On modal (lazy) ───────────────────────── */}
      {showTryOn && (
        <Suspense fallback={null}>
          <TryOnModal
            product={tryOnProduct}
            onClose={() => setShowTryOn(false)}
          />
        </Suspense>
      )}
    </div>
  )
}