'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'
import { getOptimizedUrl } from '@/lib/cloudinary-url'
import type { ProductImage } from '@/types'

interface ProductGalleryProps {
  images: ProductImage[]
  productName: string
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const activeImage = images[activeIndex]
  const hasMultiple = images.length > 1

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning || index === activeIndex) return
      setIsTransitioning(true)
      setTimeout(() => {
        setActiveIndex(index)
        setIsTransitioning(false)
      }, 180)
    },
    [activeIndex, isTransitioning],
  )

  const prev = () => goTo(activeIndex === 0 ? images.length - 1 : activeIndex - 1)
  const next = () => goTo(activeIndex === images.length - 1 ? 0 : activeIndex + 1)

  // Empty state
  if (!images.length) {
    return (
      <div
        style={{
          aspectRatio: '1/1',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #e2e8f0',
        }}
      >
        <span style={{ fontSize: 9, letterSpacing: '.22em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>
          Image Unavailable
        </span>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col-reverse md:flex-row gap-3 lg:gap-4">

        {/* ── Thumbnail Strip ─────────────────────────────────── */}
        {hasMultiple && (
          <div
            className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto pb-1 md:pb-0 flex-shrink-0"
            style={{ scrollbarWidth: 'none' }}
          >
            {images.slice(0, 6).map((img, i) => (
              <button
                key={img.public_id}
                onClick={() => goTo(i)}
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  width: 68,
                  height: 68,
                  background: '#f8fafc',
                  border: `1.5px solid ${i === activeIndex ? '#0f172a' : '#e2e8f0'}`,
                  borderRadius: 6,
                  overflow: 'hidden',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'border-color .2s ease, opacity .2s ease, transform .2s ease',
                  opacity: i === activeIndex ? 1 : 0.55,
                  transform: i === activeIndex ? 'scale(1)' : 'scale(.97)',
                }}
                aria-label={`View ${productName} image ${i + 1}`}
              >
                <Image
                  src={getOptimizedUrl(img.public_id, { width: 120, height: 120, quality: 'auto:eco' })}
                  alt={`${productName} view ${i + 1}`}
                  fill
                  className="object-contain"
                  style={{ padding: 8 }}
                  sizes="68px"
                />
                {/* Active indicator line */}
                {i === activeIndex && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: '#0f172a',
                      borderRadius: '6px 0 0 6px',
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Main Canvas ─────────────────────────────────────── */}
        <div className="flex-1 relative group">

          {/* Image frame */}
          <div
            style={{
              position: 'relative',
              aspectRatio: '1/1',
              background: '#f8fafc',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              cursor: 'zoom-in',
            }}
            onClick={() => setLightboxOpen(true)}
          >
            <Image
              src={getOptimizedUrl(activeImage.public_id, { width: 1000, height: 1000 })}
              alt={`${productName} — view ${activeIndex + 1}`}
              fill
              priority={activeIndex === 0}
              className="object-contain"
              style={{
                padding: 40,
                transition: 'opacity .18s ease, transform .18s ease',
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning ? 'scale(.98)' : 'scale(1)',
              }}
              sizes="(max-width: 768px) 100vw, 50vw"
            />

            {/* Expand hint */}
            <div
              className="absolute bottom-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100"
              style={{ transition: 'opacity .2s ease' }}
            >
              <span style={{ fontSize: 8, letterSpacing: '.18em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>
                Expand
              </span>
              <Maximize2 size={13} strokeWidth={1.5} style={{ color: '#94a3b8' }} />
            </div>

            {/* Image counter pill */}
            {hasMultiple && (
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  background: 'rgba(15,23,42,.6)',
                  backdropFilter: 'blur(4px)',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '.1em',
                  padding: '3px 9px',
                  borderRadius: 20,
                }}
              >
                {activeIndex + 1} / {images.length}
              </div>
            )}
          </div>

          {/* Arrow nav */}
          {hasMultiple && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev() }}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                style={{
                  padding: '8px',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'opacity .2s ease, box-shadow .2s ease, transform .15s ease',
                  boxShadow: '0 2px 8px rgba(15,23,42,.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <ChevronLeft size={18} strokeWidth={1.25} style={{ color: '#0f172a' }} />
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); next() }}
                aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                style={{
                  padding: '8px',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'opacity .2s ease, box-shadow .2s ease, transform .15s ease',
                  boxShadow: '0 2px 8px rgba(15,23,42,.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <ChevronRight size={18} strokeWidth={1.25} style={{ color: '#0f172a' }} />
              </button>
            </>
          )}

          {/* Mobile dot pagination */}
          {hasMultiple && (
            <div className="flex md:hidden justify-center gap-1.5 mt-3">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Image ${i + 1}`}
                  style={{
                    height: 2,
                    width: i === activeIndex ? 24 : 10,
                    background: i === activeIndex ? '#0f172a' : '#cbd5e1',
                    border: 'none',
                    borderRadius: 2,
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'width .25s ease, background .2s ease',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Lightbox ──────────────────────────────────────────── */}
      {lightboxOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeInLightbox .2s ease both',
          }}
          onClick={() => setLightboxOpen(false)}
        >
          <style>{`@keyframes fadeInLightbox { from { opacity:0 } to { opacity:1 } }`}</style>

          {/* Close */}
          <button
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,.1)',
              border: '1px solid rgba(255,255,255,.15)',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <X size={18} strokeWidth={1.5} />
          </button>

          {/* Image */}
          <div
            style={{ position: 'relative', width: '90vw', maxWidth: 860, aspectRatio: '1/1' }}
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={getOptimizedUrl(activeImage.public_id, { width: 1400, height: 1400 })}
              alt={productName}
              fill
              className="object-contain"
              style={{ padding: 24 }}
              sizes="90vw"
            />
          </div>

          {/* Lightbox arrows */}
          {hasMultiple && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev() }}
                style={{
                  position: 'absolute',
                  left: 20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,.1)',
                  border: '1px solid rgba(255,255,255,.15)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: '#fff',
                  transition: 'background .2s ease',
                }}
              >
                <ChevronLeft size={22} strokeWidth={1.25} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next() }}
                style={{
                  position: 'absolute',
                  right: 20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,.1)',
                  border: '1px solid rgba(255,255,255,.15)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: '#fff',
                  transition: 'background .2s ease',
                }}
              >
                <ChevronRight size={22} strokeWidth={1.25} />
              </button>
            </>
          )}

          {/* Lightbox thumbnail strip */}
          {hasMultiple && (
            <div
              style={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 8,
              }}
            >
              {images.slice(0, 6).map((img, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); goTo(i) }}
                  style={{
                    width: 48,
                    height: 48,
                    position: 'relative',
                    border: `1.5px solid ${i === activeIndex ? '#fff' : 'rgba(255,255,255,.25)'}`,
                    borderRadius: 4,
                    background: 'rgba(255,255,255,.08)',
                    cursor: 'pointer',
                    opacity: i === activeIndex ? 1 : 0.5,
                    transition: 'opacity .2s ease, border-color .2s ease',
                    overflow: 'hidden',
                    padding: 0,
                  }}
                >
                  <Image
                    src={getOptimizedUrl(img.public_id, { width: 96, height: 96 })}
                    alt={`${productName} ${i + 1}`}
                    fill
                    className="object-contain"
                    style={{ padding: 4 }}
                    sizes="48px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}