'use client'

// components/product/ProductVariantSelector.tsx
//
// "Frame Color" switcher for the product detail page. Renders nothing when
// the product has no linked variants — the page looks and behaves exactly
// as it does today for every product the admin hasn't linked.
//
// Switching color is a normal Next.js <Link>, which the App Router
// prefetches on hover/viewport-entry, so clicking feels instant without any
// client-side global state or full page reload — the destination route is
// itself a fully server-rendered product page, so images, name, price,
// stock, description and the URL all update together automatically.

import Link from 'next/link'
import { Check } from 'lucide-react'
import type { ProductVariantSummary } from '@/types'

interface ProductVariantSelectorProps {
  variants: ProductVariantSummary[]
  currentId: string
}

// Quick perceived-brightness check so the checkmark stays legible on any
// swatch color (dark check on light swatches, white check on dark ones).
function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '')
  if (c.length !== 6) return false
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.7
}

export default function ProductVariantSelector({ variants, currentId }: ProductVariantSelectorProps) {
  if (!variants.length) return null

  const current = variants.find(v => v.id === currentId)

  return (
    <div className="mb-10">
      <h2 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
        Frame Color
        {current?.color && (
          <span className="text-slate-400 font-normal normal-case tracking-normal">— {current.color}</span>
        )}
      </h2>

      <div className="flex items-center gap-3 flex-wrap">
        {variants.map(v => {
          const isCurrent = v.id === currentId
          const outOfStock = v.stock <= 0 && !isCurrent
          const light = isLightColor(v.colorCode)

          const swatch = (
            <span
              className="relative flex items-center justify-center rounded-full transition-all duration-300"
              style={{
                width: isCurrent ? 38 : 32,
                height: isCurrent ? 38 : 32,
                background: v.colorCode,
                border: isCurrent ? '2px solid #0f172a' : `1.5px solid ${light ? '#cbd5e1' : 'transparent'}`,
                boxShadow: isCurrent ? '0 0 0 3px rgba(15,23,42,0.08)' : '0 1px 3px rgba(15,23,42,.08)',
                opacity: outOfStock ? 0.5 : 1,
              }}
            >
              {isCurrent && (
                <Check size={14} strokeWidth={3} style={{ color: light ? '#0f172a' : '#fff' }} />
              )}
            </span>
          )

          if (outOfStock) {
            return (
              <div
                key={v.id}
                className="flex flex-col items-center gap-1.5 cursor-not-allowed"
                aria-disabled="true"
                title={`${v.color ?? v.name} — Out of stock`}
              >
                {swatch}
              </div>
            )
          }

          return (
            <Link
              key={v.id}
              href={`/products/${v.slug}`}
              prefetch
              scroll={false}
              aria-current={isCurrent ? 'true' : undefined}
              aria-label={`Switch to ${v.color ?? v.name}`}
              title={v.color ?? v.name}
              className="flex flex-col items-center gap-1.5 group"
            >
              {swatch}
            </Link>
          )
        })}
      </div>
    </div>
  )
}