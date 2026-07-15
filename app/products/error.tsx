'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ProductsError]', error)
  }, [error])

  return (
    <main className="min-h-[60vh] bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-[9px] uppercase tracking-[0.3em] text-slate-400 font-semibold mb-4">
          Could not load products
        </p>
        <h2 className="text-2xl text-slate-900 tracking-tight mb-4"
          style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Something went wrong
        </h2>
        <p className="text-slate-500 text-sm mb-8">
          We had trouble loading the products. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 bg-slate-900 text-white text-[9px] uppercase tracking-[0.18em] font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-2.5 border border-slate-200 text-slate-900 text-[9px] uppercase tracking-[0.18em] font-semibold rounded-xl hover:border-slate-400 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  )
}