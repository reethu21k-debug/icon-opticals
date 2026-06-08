'use client'

import { Star } from 'lucide-react'
import type { Review } from '@/types'

interface ReviewListProps {
  reviews: Review[]
  productId: string
  totalCount: number
  avgRating: number
}

export default function ReviewList({ reviews, totalCount, avgRating }: ReviewListProps) {
  const ratingCounts = [5, 4, 3, 2, 1].map(r => ({
    star: r,
    count: reviews.filter(rev => Math.round(rev.rating) === r).length,
    pct: totalCount > 0 ? (reviews.filter(rev => Math.round(rev.rating) === r).length / totalCount) * 100 : 0,
  }))

  return (
    <section className="py-8">
      <h2 
        className="text-3xl text-slate-900 mb-12 tracking-tight" 
        style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
      >
        Client Reviews
      </h2>

      {/* ── Summary Dashboard ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-12 mb-16 pb-12 border-b border-slate-900">
        
        {/* Aggregate Score */}
        <div className="flex flex-col items-start md:items-center justify-center min-w-[160px]">
          <p 
            className="text-6xl text-slate-900 leading-none mb-4"
            style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
          >
            {avgRating.toFixed(1)}
          </p>
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map(s => (
              <Star 
                key={s} 
                size={14} 
                strokeWidth={1}
                className={s <= Math.round(avgRating) ? 'fill-slate-900 stroke-slate-900' : 'fill-transparent stroke-slate-300'} 
              />
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-slate-500">
            {totalCount} Reviews
          </p>
        </div>

        {/* Breakdown Bars */}
        <div className="flex-1 space-y-3 w-full flex flex-col justify-center">
          {ratingCounts.map(({ star, count, pct }) => (
            <div key={star} className="flex items-center gap-4 group">
              <span className="text-[10px] font-medium text-slate-500 w-6 text-right transition-colors group-hover:text-slate-900">
                {star} ★
              </span>
              <div className="flex-1 bg-slate-100 h-[2px] relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-slate-900 transition-all duration-700 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 w-8 text-right font-medium">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Individual Testimonials ───────────────────────────── */}
      <div className="space-y-12">
        {reviews.map(review => (
          <div key={review.id} className="border-b border-slate-200 pb-12 last:border-0 last:pb-0">
            
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div className="flex flex-col gap-3">
                {/* Minimalist Stars */}
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star 
                      key={s} 
                      size={12} 
                      strokeWidth={1}
                      className={s <= review.rating ? 'fill-slate-900 stroke-slate-900' : 'fill-transparent stroke-slate-200'} 
                    />
                  ))}
                </div>

                {/* Client Details */}
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-900">
                    {review.profile?.full_name || 'Anonymous Client'}
                  </span>
                  {review.is_verified && (
                    <span className="text-[9px] uppercase tracking-[0.15em] text-slate-400">
                      · Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Date */}
              <span className="text-[9px] uppercase tracking-[0.2em] text-slate-400 sm:mt-1">
                {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>

            {/* Review Content */}
            <div className="max-w-3xl">
              {review.title && (
                <h4 className="font-medium text-slate-900 text-base mb-2 tracking-tight">
                  {review.title}
                </h4>
              )}
              {review.body && (
                <p className="text-sm text-slate-600 leading-relaxed font-light">
                  {review.body}
                </p>
              )}
            </div>
            
          </div>
        ))}
      </div>
    </section>
  )
}