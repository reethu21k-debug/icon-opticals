'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-[9px] font-semibold tracking-[0.3em] uppercase text-slate-400 mb-6">
          Something went wrong
        </p>
        <h1
          className="text-4xl text-slate-900 tracking-tight mb-6"
          style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
        >
          Unexpected Error
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-10">
          We encountered an unexpected issue. Please try again or return to the homepage.
          {error.digest && (
            <span className="block mt-2 text-[10px] text-slate-400 font-mono">
              Ref: {error.digest}
            </span>
          )}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-8 py-3 bg-slate-900 text-white text-[9px] uppercase tracking-[0.18em] font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-8 py-3 border border-slate-200 text-slate-900 text-[9px] uppercase tracking-[0.18em] font-semibold rounded-xl hover:border-slate-400 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  )
}
