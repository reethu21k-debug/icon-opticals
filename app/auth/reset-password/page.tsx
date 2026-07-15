'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { Loader2, Eye, EyeOff, Check, AlertCircle } from 'lucide-react'

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
          setSessionReady(true)
          setChecking(false)
        }
      }
    )

    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session) {
        setSessionReady(true)
      }
      setChecking(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message)
        return
      }

      setDone(true)
      await supabase.auth.signOut()
      setTimeout(() => router.push('/auth/login'), 3000)
    } catch {
      setError('An anomaly occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Verifying State ─────────────────────────────────────────
  if (checking) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 size={24} strokeWidth={1} className="animate-spin text-slate-900 mb-4" />
        <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-slate-500">Verifying Reset Credentials</span>
      </main>
    )
  }

  // ── Token Expired State ─────────────────────────────────────
  if (!sessionReady) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-[440px]">
          <div className="bg-white border border-slate-200 p-8 sm:p-12 text-center shadow-2xl animate-in fade-in duration-700">
            <div className="flex justify-center mb-6">
              <AlertCircle className="text-slate-900" size={32} strokeWidth={1} />
            </div>
            <h2 className="text-3xl text-slate-900 mb-4 tracking-tight" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              Link Expired
            </h2>
            <p className="text-xs text-slate-500 font-light leading-relaxed mb-8">
              This verification link is no longer valid. Please dispatch a new request to recover access to your credentials.
            </p>
            <Link
              href="/auth/forgot-password"
              className="block w-full py-4 bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-slate-800 transition-colors"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-[440px]">
        
        {/* ── Brand Header ─────────────────────────────────────── */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Link href="/" className="flex flex-col items-center justify-center group mb-8">
            <span 
              className="text-3xl tracking-[0.1em] text-slate-900 transition-colors group-hover:text-slate-700" 
              style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
            >
              ICON
            </span>
            <span className="text-[8px] font-sans font-semibold uppercase tracking-[0.4em] text-slate-500 mt-0.5 ml-1">
              Opticals
            </span>
          </Link>
          <h1 
            className="text-3xl text-slate-900 tracking-tight mb-2"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            Reset Credentials
          </h1>
          <p className="text-[11px] text-slate-500 font-light">Establish a secure password for your client account.</p>
        </div>

        {/* ── Form Card ────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 p-8 sm:p-12 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          {done ? (
            /* ── Success State ── */
            <div className="text-center py-4 animate-in fade-in duration-500">
              <Check className="text-slate-900 mx-auto mb-6" size={32} strokeWidth={1} />
              <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-900 mb-4">
                Password Updated
              </h2>
              <p className="text-xs text-slate-500 font-light leading-relaxed mb-1">
                Your credentials have been reconfigured successfully.
              </p>
              <p className="text-[10px] text-slate-400 font-light mt-4 animate-pulse">Redirecting to authorization portal…</p>
            </div>
          ) : (
            /* ── Form State ── */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="MINIMUM 6 CHARACTERS"
                    className="w-full text-[11px] text-slate-900 border border-slate-200 bg-white px-4 py-3.5 pr-12 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none placeholder-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors outline-none"
                  >
                    {showPw ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </div>
                
                {/* Micro Strength Bar Indicator */}
                {password && (
                  <div className="mt-3 flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`h-[1px] flex-1 transition-colors duration-500 ${
                          password.length >= i * 3
                            ? 'bg-slate-900'
                            : 'bg-slate-100'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="RE-ENTER NEW PASSWORD"
                    className={`w-full text-[11px] text-slate-900 border bg-white px-4 py-3.5 pr-12 focus:outline-none rounded-none appearance-none placeholder-slate-300 transition-colors ${
                      confirm && password !== confirm
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 focus:border-slate-900 hover:border-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors outline-none"
                  >
                    {showConfirm ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </div>
                {confirm && password !== confirm && (
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-2 font-medium">Passwords mismatch</p>
                )}
              </div>

              {/* Error Output Container */}
              {error && (
                <div className="bg-slate-50 border border-slate-900 p-4 flex items-start gap-3 animate-in fade-in">
                  <AlertCircle size={16} strokeWidth={1.5} className="text-slate-900 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] uppercase tracking-[0.1em] font-semibold text-slate-900 leading-relaxed">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (!!confirm && password !== confirm)}
                className="mt-8 w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em] font-medium transition-colors flex items-center justify-center gap-3"
              >
                {loading ? (
                  <><Loader2 size={16} strokeWidth={1.5} className="animate-spin" /> Authorizing...</>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={24} strokeWidth={1} className="animate-spin text-slate-400" />
      </main>
    }>
      <ResetPasswordInner />
    </Suspense>
  )
}