'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft, Mail, AlertCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/send-reset-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.status === 429) {
        setError('Rate limit exceeded. Please wait a moment and try again.')
        return
      }

      // Always show success (avoid user enumeration)
      setSent(true)
    } catch {
      setError('An anomaly occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-[440px]">
        
        {/* ── Brand Header ─────────────────────────────────────── */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Link href="/" className="flex flex-col items-center justify-center group mb-8">
            <span 
              className="text-3xl tracking-[0.1em] text-slate-900 transition-colors group-hover:text-slate-700" 
              style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
            >
              ICON
            </span>
            <span className="text-[8px] font-sans font-semibold uppercase tracking-[0.4em] text-slate-500 mt-0.5 ml-1">
              Opticals
            </span>
          </Link>
          <h1 
            className="text-3xl text-slate-900 tracking-tight mb-2"
            style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
          >
            Recover Access
          </h1>
          <p className="text-[11px] text-slate-500 font-light">
            Receive a secure link to reset your credentials.
          </p>
        </div>

        {/* ── Auth Container ───────────────────────────────────── */}
        <div className="bg-white border border-slate-200 p-8 sm:p-12 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          {sent ? (
            /* ── Success State ── */
            <div className="text-center animate-in fade-in duration-500">
              <Mail size={32} strokeWidth={1} className="mx-auto mb-6 text-slate-900" />
              <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-900 mb-4">
                Check Your Inbox
              </h2>
              <p className="text-[11px] text-slate-500 font-light leading-relaxed mb-6">
                If an account exists for <span className="font-medium text-slate-900">{email}</span>, a secure reset link has been dispatched. Please verify your spam folder if it does not appear shortly.
              </p>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-8">
                Link expires in 1 hour
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center gap-3 w-full py-4 border border-slate-900 text-[10px] uppercase tracking-[0.2em] font-medium text-slate-900 hover:bg-slate-900 hover:text-white transition-colors group"
              >
                <ArrowLeft size={14} strokeWidth={1.5} className="group-hover:-translate-x-1 transition-transform" />
                Return to Sign In
              </Link>
            </div>
          ) : (
            /* ── Form State ── */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    strokeWidth={1.5}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="EMAIL@EXAMPLE.COM"
                    className="w-full text-[11px] text-slate-900 border border-slate-200 bg-white pl-12 pr-4 py-3.5 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none placeholder-slate-300"
                  />
                </div>
              </div>

              {/* Error State */}
              {error && (
                <div className="bg-slate-50 border border-slate-900 p-4 flex items-start gap-3 animate-in fade-in">
                  <AlertCircle size={16} strokeWidth={1.5} className="text-slate-900 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] uppercase tracking-[0.1em] font-semibold text-slate-900 leading-relaxed">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-8 w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-70 disabled:hover:bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em] font-medium transition-colors flex items-center justify-center gap-3"
              >
                {loading ? (
                  <><Loader2 size={16} strokeWidth={1.5} className="animate-spin" /> Processing...</>
                ) : (
                  'Dispatch Recovery Link'
                )}
              </button>

              <div className="text-center mt-6 pt-6 border-t border-slate-100">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] font-medium text-slate-400 hover:text-slate-900 transition-colors group"
                >
                  <ArrowLeft size={12} strokeWidth={1.5} className="group-hover:-translate-x-1 transition-transform" />
                  Return to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}