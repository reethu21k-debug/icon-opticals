'use client'

export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check, AlertCircle, Loader2 } from 'lucide-react'

function UnsubscribePageInner() {
  const searchParams = useSearchParams()
  const uid = searchParams.get('uid')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!uid) { setStatus('error'); return }

    fetch(`/api/send-marketing-email?uid=${uid}`, { method: 'DELETE' })
      .then(res => setStatus(res.ok ? 'success' : 'error'))
      .catch(() => setStatus('error'))
  }, [uid])

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 p-12 max-w-md w-full text-center shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* ── Loading State ─────────────────────────────────────── */}
        {status === 'loading' && (
          <div className="py-8">
            <Loader2 size={24} strokeWidth={1} className="animate-spin mx-auto mb-6 text-slate-900" />
            <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-slate-500">
              Processing Request
            </p>
          </div>
        )}

        {/* ── Success State ─────────────────────────────────────── */}
        {status === 'success' && (
          <div className="py-4">
            <Check size={32} strokeWidth={1} className="mx-auto mb-8 text-slate-900" />
            <h1 
              className="text-3xl text-slate-900 mb-4 tracking-tight"
              style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
            >
              Preferences Updated
            </h1>
            <p className="text-xs text-slate-500 font-light leading-relaxed mb-10">
              You have been successfully removed from our editorial and marketing communications. You will only receive essential updates regarding your active orders and boutique reservations.
            </p>
            <Link 
              href="/" 
              className="block w-full py-4 bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-slate-800 transition-colors"
            >
              Return to Boutique
            </Link>
          </div>
        )}

        {/* ── Error State ───────────────────────────────────────── */}
        {status === 'error' && (
          <div className="py-4">
            <AlertCircle size={32} strokeWidth={1} className="mx-auto mb-8 text-slate-900" />
            <h1 
              className="text-3xl text-slate-900 mb-4 tracking-tight"
              style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
            >
              Request Unsuccessful
            </h1>
            <p className="text-xs text-slate-500 font-light leading-relaxed mb-10">
              We encountered an anomaly while updating your preferences. Please attempt this action again or contact our concierge for personal assistance.
            </p>
            <Link 
              href="/" 
              className="block w-full py-4 border border-slate-900 text-slate-900 text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-slate-900 hover:text-white transition-colors"
            >
              Return to Boutique
            </Link>
          </div>
        )}

      </div>
    </main>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={24} strokeWidth={1} className="animate-spin text-slate-400" />
      </div>
    }>
      <UnsubscribePageInner />
    </Suspense>
  )
}