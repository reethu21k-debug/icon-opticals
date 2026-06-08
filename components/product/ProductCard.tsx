'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, Star, ArrowRight, ReceiptText } from 'lucide-react'
import { getOptimizedUrl } from '@/lib/cloudinary-url'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { emitAddToBilling } from '@/hooks/useAdminBilling'
import LensFlowModal from '@/components/lens/LensFlowModal'
import type { Product, LensFlowState } from '@/types'

interface ProductCardProps {
  product: Product
  initialWishlisted?: boolean
  userId?: string
  isAdmin?: boolean
  onAddToCart?: (product: Product) => void
}

export default function ProductCard({
  product,
  initialWishlisted = false,
  userId: userIdProp,
  isAdmin = false,
  onAddToCart,
}: ProductCardProps) {
  const [wishlisted, setWishlisted]           = useState(initialWishlisted)
  const [hoverIndex, setHoverIndex]           = useState(0)
  const [isHovered, setIsHovered]             = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [addedToCart, setAddedToCart]         = useState(false)
  const [addedToBilling, setAddedToBilling]   = useState(false)
  const [showLensFlow, setShowLensFlow]       = useState(false)
  const [adding, setAdding]                   = useState(false)

  // Single shared auth subscription — no per-card getUser() calls
  const { userId: authUserId } = useAuth()
  // Prop takes precedence (ProductGrid passes it), else fall back to shared auth
  const userId = userIdProp ?? authUserId ?? undefined

  const { addToCart } = useCart(userId ?? null)

  const primaryImage = product.images?.[0]
  const hoverImage   = product.images?.[hoverIndex] || primaryImage
  const discount     = Math.round(product.discount_percent)

  const frameBadge = [product.frame_type, product.frame_shape]
    .filter(Boolean)
    .map(s => s!.replace(/-/g, ' '))
    .join(' · ')

  const toggleWishlist = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!userId) {
        window.location.href =
          '/auth/login?redirect=' + encodeURIComponent(window.location.pathname)
        return
      }
      setWishlistLoading(true)
      const supabase = createClient()
      try {
        if (wishlisted) {
          await supabase.from('wishlist').delete().eq('user_id', userId).eq('product_id', product.id)
          setWishlisted(false)
        } else {
          await supabase.from('wishlist').insert({ user_id: userId, product_id: product.id })
          setWishlisted(true)
        }
      } catch (err) {
        console.error('Wishlist error:', err)
      } finally {
        setWishlistLoading(false)
      }
    },
    [userId, wishlisted, product.id],
  )

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!userId) {
      window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname)
      return
    }
    // If parent provides its own handler (e.g. ProductGrid), delegate to it
    if (onAddToCart) {
      onAddToCart(product)
      return
    }
    // Otherwise handle the full lens flow internally (homepage, product detail, etc.)
    setShowLensFlow(true)
  }

  const handleLensComplete = async (config: LensFlowState) => {
    if (!userId) return
    setAdding(true)
    setShowLensFlow(false)
    const result = await addToCart(product.id, config, product.final_price)
    if (result.success) {
      setAddedToCart(true)
      setTimeout(() => setAddedToCart(false), 1800)
    }
    setAdding(false)
  }

  const handleAddToBilling = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    emitAddToBilling(product)
    setAddedToBilling(true)
    setTimeout(() => setAddedToBilling(false), 1800)
  }

  return (
    <>
    <Link href={`/products/${product.slug}`} className="group block">
      <div
        className="flex flex-col bg-white overflow-hidden transition-all duration-300"
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          boxShadow: isHovered
            ? '0 20px 48px -12px rgba(15,23,42,.16)'
            : '0 1px 4px rgba(15,23,42,.06)',
          transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
          transition: 'box-shadow .28s cubic-bezier(.22,1,.36,1), transform .28s cubic-bezier(.22,1,.36,1), border-color .2s ease',
          borderColor: isHovered ? '#cbd5e1' : '#e2e8f0',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setHoverIndex(0) }}
      >

        {/* ════════════════ IMAGE ZONE ════════════════ */}
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: '3 / 2', background: '#f8fafc' }}
        >
          {/* Discount badge — top left */}
          {discount > 0 && (
            <div
              className="absolute top-2.5 left-2.5 z-10 flex items-center"
              style={{
                background: '#0f172a',
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: 2,
              }}
            >
              −{discount}%
            </div>
          )}

          {/* Star rating — only shown when no discount badge (avoid top-left crowding) */}
          {product.review_count > 0 && discount === 0 && (
            <div
              className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1"
              style={{
                background: 'rgba(255,255,255,.96)',
                padding: '3px 7px',
                borderRadius: 2,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 4px rgba(15,23,42,.08)',
              }}
            >
              <Star size={9} className="fill-amber-400 stroke-amber-400" />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>
                {product.rating.toFixed(1)}
              </span>
            </div>
          )}

          {/* Rating when discount also shown — move to a different spot */}
          {product.review_count > 0 && discount > 0 && (
            <div
              className="absolute top-2.5 z-10 flex items-center gap-1"
              style={{
                right: 36,
                background: 'rgba(255,255,255,.96)',
                padding: '3px 7px',
                borderRadius: 2,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 4px rgba(15,23,42,.08)',
              }}
            >
              <Star size={9} className="fill-amber-400 stroke-amber-400" />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>
                {product.rating.toFixed(1)}
              </span>
            </div>
          )}

          {/* Wishlist — top right */}
          <button
            onClick={toggleWishlist}
            disabled={wishlistLoading}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-2 right-2 z-10"
            style={{
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: wishlisted ? '#fff1f2' : 'rgba(255,255,255,.95)',
              border: `1px solid ${wishlisted ? '#fecdd3' : '#e2e8f0'}`,
              borderRadius: '50%',
              boxShadow: '0 1px 4px rgba(15,23,42,.08)',
              transition: 'transform .2s ease, border-color .2s ease',
              transform: wishlistLoading ? 'scale(.9)' : 'scale(1)',
              cursor: 'pointer',
            }}
          >
            <Heart
              size={13}
              strokeWidth={1.75}
              style={{
                fill: wishlisted ? '#ef4444' : 'transparent',
                stroke: wishlisted ? '#ef4444' : '#94a3b8',
                transition: 'fill .2s ease, stroke .2s ease',
              }}
            />
          </button>

          {/* Primary image */}
          {primaryImage && (
            <Image
              src={getOptimizedUrl(primaryImage.public_id, { width: 750, height: 500, crop: 'fill' })}
              alt={product.name}
              fill
              className="object-cover"
              style={{
                transition: 'opacity .35s ease',
                opacity: isHovered && hoverImage !== primaryImage ? 0 : 1,
              }}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          )}

          {/* Hover image */}
          {isHovered && hoverImage && (
            <Image
              src={getOptimizedUrl(hoverImage.public_id, { width: 750, height: 500, crop: 'fill' })}
              alt={`${product.name} alternate`}
              fill
              loading="lazy"
              className="object-cover"
              style={{
                transition: 'opacity .35s ease',
                opacity: isHovered ? 1 : 0,
              }}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          )}

          {/* Bottom gradient + color dots */}
          <div
            className="absolute inset-x-0 bottom-0 z-10"
            style={{
              background: 'linear-gradient(to top, rgba(15,23,42,.22) 0%, transparent 100%)',
              padding: '24px 10px 8px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
            }}
          >
            {product.images.length > 1 && (
              <div className="flex items-center gap-1.5">
                {product.images.slice(0, 4).map((_, i) => (
                  <button
                    key={i}
                    onMouseEnter={() => setHoverIndex(i)}
                    onClick={e => { e.preventDefault(); setHoverIndex(i) }}
                    aria-label={`View ${i + 1}`}
                    style={{
                      borderRadius: '50%',
                      width: i === hoverIndex ? 10 : 7,
                      height: i === hoverIndex ? 10 : 7,
                      background: i === hoverIndex ? '#fff' : 'rgba(255,255,255,.55)',
                      border: i === hoverIndex ? '1.5px solid rgba(255,255,255,.8)' : 'none',
                      transition: 'all .2s ease',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* "View" CTA — slides up on hover */}
          <div
            className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center"
            style={{
              height: 36,
              background: 'rgba(15,23,42,.82)',
              backdropFilter: 'blur(4px)',
              transform: isHovered ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform .28s cubic-bezier(.22,1,.36,1)',
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '.2em',
                textTransform: 'uppercase',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              View Details
              <ArrowRight size={10} strokeWidth={2.5} />
            </span>
          </div>
        </div>

        {/* ════════════════ INFO ZONE ════════════════ */}
        <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column' }}>

          {/* Brand + frame badge row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#0f172a',
                margin: 0,
                lineHeight: 1.2,
                letterSpacing: '-.01em',
              }}
            >
              {product.brand}
            </p>
            {frameBadge && (
              <span
                style={{
                  fontSize: 8.5,
                  fontWeight: 600,
                  color: '#64748b',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  padding: '2px 7px',
                  borderRadius: 2,
                  textTransform: 'capitalize',
                  whiteSpace: 'nowrap',
                  letterSpacing: '.03em',
                  flexShrink: 0,
                }}
              >
                {frameBadge}
              </span>
            )}
          </div>

          {/* Product name */}
          <p
            style={{
              marginTop: 4,
              fontSize: 11,
              color: '#94a3b8',
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {product.name}
          </p>

          {/* Price row */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: '-.02em' }}>
              ₹{product.final_price.toLocaleString('en-IN')}
            </span>
            {discount > 0 && (
              <>
                <span style={{ fontSize: 11, color: '#cbd5e1', textDecoration: 'line-through', fontWeight: 400 }}>
                  ₹{product.base_price.toLocaleString('en-IN')}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', letterSpacing: '.02em' }}>
                  {discount}% off
                </span>
              </>
            )}
          </div>

          {/* Separator */}
          <div style={{ height: 1, background: '#f1f5f9', margin: '10px 0' }} />

          {/* Add to Cart button */}
          <button
            onClick={handleAddToCart}
            disabled={adding}
            style={{
              width: '100%',
              padding: '9px 0',
              background: addedToCart ? '#166534' : adding ? '#334155' : '#0f172a',
              color: '#fff',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              border: 'none',
              borderRadius: 4,
              cursor: adding ? 'wait' : 'pointer',
              transition: 'background .2s ease, transform .15s ease',
              transform: addedToCart ? 'scale(.99)' : 'scale(1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {adding ? (
              '...'
            ) : addedToCart ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Added
              </>
            ) : (
              'Add to Cart'
            )}
          </button>

          {/* Admin-only: Add to Billing button */}
          {isAdmin && (
            <button
              onClick={handleAddToBilling}
              style={{
                width: '100%',
                marginTop: 7,
                padding: '9px 0',
                background: addedToBilling ? '#7c3aed' : 'transparent',
                color: addedToBilling ? '#fff' : '#7c3aed',
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                border: `1.5px solid ${addedToBilling ? '#7c3aed' : '#ddd6fe'}`,
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'background .2s ease, color .2s ease, border-color .2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              onMouseEnter={e => {
                if (!addedToBilling) {
                  e.currentTarget.style.background = '#f5f3ff'
                }
              }}
              onMouseLeave={e => {
                if (!addedToBilling) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {addedToBilling ? (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Added to Billing
                </>
              ) : (
                <>
                  <ReceiptText size={11} strokeWidth={2.5} />
                  Add to Billing
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Link>

    {/* Self-contained lens flow modal — used when no onAddToCart prop is provided */}
    {showLensFlow && userId && (
      <LensFlowModal
        product={product}
        userId={userId}
        onClose={() => setShowLensFlow(false)}
        onComplete={handleLensComplete}
      />
    )}
    </>
  )
}