import type { Metadata } from 'next'
import Link from 'next/link'
import { pageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = pageMetadata({
  title:       'Page Not Found',
  description: 'The page you are looking for does not exist. Browse our eyewear collection at Icon Opticals, Anantapur.',
  path:        '/404',
  noIndex:     true,
})

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-[9px] font-semibold tracking-[0.3em] uppercase text-slate-400 mb-6">
          404 — Page Not Found
        </p>
        <h1
          className="text-4xl md:text-5xl text-slate-900 tracking-tight mb-6"
          style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
        >
          Lost your vision?
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-10">
          The page you&apos;re looking for has moved or doesn&apos;t exist.
          Let us help you find the perfect eyewear instead.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-900 text-white text-[9px] uppercase tracking-[0.18em] font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Back to Home
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 border border-slate-200 text-slate-900 text-[9px] uppercase tracking-[0.18em] font-semibold rounded-xl hover:border-slate-400 transition-colors"
          >
            Browse Eyewear
          </Link>
        </div>
      </div>
    </main>
  )
}