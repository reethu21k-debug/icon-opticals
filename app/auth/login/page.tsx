'use client'

import { useState, Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'

function validatePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`
  return null
}

/* ── Interactive Ultra-Premium Theme ────────────────────────────────────── */

const LOGIN_CSS = `
  /* Master Keyframes */
  @keyframes bg-drift       { 0% { background-position: 0 0; } 100% { background-position: 32px 32px; } }
  @keyframes lp-slide-up    { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes blur-reveal    { from { opacity: 0; filter: blur(12px); transform: translateY(20px); } to { opacity: 1; filter: blur(0); transform: translateY(0); } }
  @keyframes alert-pop      { 0% { opacity: 0; transform: translateY(-10px) scale(0.98); filter: blur(4px); } 100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
  @keyframes btn-sheen      { 0% { transform: translateX(-150%) skewX(-20deg); } 100% { transform: translateX(200%) skewX(-20deg); } }

  .lp-root {
    min-height: 100vh;
    background-color: #f9fafb;
    background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
    background-size: 32px 32px;
    position: relative;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Outfit', sans-serif;
    padding: 3rem 24px;
    overflow: hidden;
  }
  
  .lp-root::before {
    content: ''; position: absolute; inset: 0;
    background-image: radial-gradient(#e5e7eb 1.5px, transparent 1.5px);
    background-size: 32px 32px;
    animation: bg-drift 20s linear infinite;
    mask-image: radial-gradient(ellipse at center, black 0%, transparent 80%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 80%);
    opacity: 0.8; pointer-events: none;
  }

  .lp-container {
    max-width: 1100px; 
    width: 100%;
    display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 2rem;
    position: relative; z-index: 10;
    min-height: 680px; /* Swapped fixed height for min-height to allow expansion */
  }
  
  @media (max-width: 1024px) { 
    .lp-container { grid-template-columns: 1fr 1fr; gap: 1.5rem; } 
  }
  @media (max-width: 860px) {
    .lp-container { grid-template-columns: 1fr; max-width: 520px; min-height: auto; }
    .lp-root { padding: 2rem 16px; }
    .lp-panel { display: none !important; }
  }

  /* ═══════════════════════════════════════════════════════════════════
     IMAGE LEFT PANEL 
  ═══════════════════════════════════════════════════════════════════ */
  
  .lp-panel {
    border-radius: 24px;
    position: relative; overflow: hidden;
    box-shadow: 0 40px 80px -20px rgba(0,0,0,0.6);
    opacity: 0; animation: blur-reveal 1.4s cubic-bezier(0.16,1,0.3,1) forwards;
    padding: 0;
    /* Removed height: 100% to let CSS Grid naturally stretch the container */
  }

  /* ═══════════════════════════════════════════════════════════════════
     RIGHT PANEL (Form Side)
  ═══════════════════════════════════════════════════════════════════ */
  
  .lp-form-side {
    background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
    border: 1px solid #ffffff; border-radius: 24px; 
    padding: 2.5rem 3.5rem; 
    /* Removed height: 100% to let CSS Grid naturally stretch the container */ 
    box-shadow: 0 20px 40px rgba(0,0,0,0.03), inset 0 0 0 1px rgba(255,255,255,0.8);
    display: flex; flex-direction: column; justify-content: center; 
    opacity: 0; animation: blur-reveal 1.2s cubic-bezier(0.16,1,0.3,1) 0.2s forwards;
  }
  @media (max-width: 1200px) { .lp-form-side { padding: 2rem 3rem; } }
  @media (max-width: 860px)  { .lp-form-side { padding: 2.5rem 2rem; background: #ffffff; border: 1px solid #e5e7eb; box-shadow: 0 10px 30px rgba(0,0,0,0.05); } }

  .anim-stagger { opacity: 0; }
  .loaded .anim-stagger { animation: lp-slide-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .d-1 { animation-delay: 0.4s; } .d-2 { animation-delay: 0.5s; } .d-3 { animation-delay: 0.6s; }
  .d-4 { animation-delay: 0.7s; } .d-5 { animation-delay: 0.8s; }

  .lp-form-header { margin-bottom: 2rem; } 
  .lp-form-eyebrow { font-size: 9px; text-transform: uppercase; letter-spacing: 0.28em; color: #6b7280; font-weight: 600; margin-bottom: 0.75rem; }
  .lp-form-title {
    font-family: 'Cormorant Garamond', serif; font-size: clamp(2rem, 2.5vw, 2.4rem);
    font-weight: 400; letter-spacing: 0.01em; line-height: 1.1; margin-bottom: 0.5rem;
    background: linear-gradient(to right, #111827, #4b5563); -webkit-background-clip: text; color: transparent; background-clip: text;
  }
  .lp-form-sub { font-size: 14px; color: #6b7280; font-weight: 300; line-height: 1.5; }

  /* Sliding Segmented Control Tabs */
  .lp-tabs-container {
    position: relative; display: flex; background: #f3f4f6; padding: 4px; 
    border-radius: 10px; margin-bottom: 1.75rem; border: 1px solid rgba(0,0,0,0.03); 
  }
  .lp-tab-pill {
    position: absolute; top: 4px; bottom: 4px; width: calc(50% - 4px);
    background: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .lp-tabs-container[data-mode="login"] .lp-tab-pill { transform: translateX(0); }
  .lp-tabs-container[data-mode="signup"] .lp-tab-pill { transform: translateX(100%); }
  
  .lp-tab {
    flex: 1; padding: 0.75rem; background: transparent; border: none; cursor: pointer;
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.22em; font-weight: 600; color: #9ca3af;
    position: relative; z-index: 1; transition: color 0.4s ease;
  }
  .lp-tab.active { color: #111827; }

  /* Google btn */
  .lp-google-btn {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
    border: 1px solid #e5e7eb; padding: 0.9rem; border-radius: 10px; 
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 600;
    color: #111827; background: #ffffff; cursor: pointer;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); margin-bottom: 1.5rem;
    box-shadow: 0 2px 6px rgba(0,0,0,0.02);
  }
  .lp-google-btn:hover { border-color: #d1d5db; box-shadow: 0 8px 16px rgba(0,0,0,0.04); transform: translateY(-1px) scale(1.01); }
  .lp-google-btn:active { transform: translateY(0) scale(0.99); }

  .lp-divider { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
  .lp-divider-line { flex: 1; height: 1px; background: #e5e7eb; }
  .lp-divider-text { font-size: 9px; text-transform: uppercase; letter-spacing: 0.25em; color: #9ca3af; font-weight: 600; }

  /* Smooth expanding fields */
  .expand-grid {
    display: grid; grid-template-rows: 0fr; opacity: 0;
    transition: grid-template-rows 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease;
  }
  .expand-grid.open { grid-template-rows: 1fr; opacity: 1; }
  .expand-inner { overflow: hidden; display: flex; flex-direction: column; gap: 1.25rem; }
  .expand-grid.open .expand-inner { padding-bottom: 1.25rem; }

  /* Reactive Form Fields */
  .lp-fields { display: flex; flex-direction: column; gap: 1.25rem; } 
  .lp-field-group { position: relative; transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
  
  .lp-field-label { display: inline-block; margin-bottom: 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #6b7280; font-weight: 600; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); transform-origin: left bottom; }
  .lp-field-label .req { color: #111827; }
  
  /* Focus-within effects for the label */
  .lp-field-group:focus-within .lp-field-label { color: #111827; transform: translateY(-2px); }
  
  .lp-input {
    width: 100%; box-sizing: border-box; padding: 1rem 1.25rem; 
    border: 1px solid transparent; border-radius: 10px; background: #f9fafb; outline: none;
    font-size: 14px; color: #111827; font-family: 'Outfit', sans-serif; font-weight: 300; appearance: none;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .lp-input::placeholder { color: #9ca3af; font-weight: 300; transition: opacity 0.3s; }
  .lp-input:hover:not(:focus) { background: #f3f4f6; }
  .lp-input:focus { background: #ffffff; border-color: #111827; box-shadow: 0 10px 25px rgba(0,0,0,0.06); transform: translateY(-2px); }
  .lp-input:focus::placeholder { opacity: 0; }
  
  .lp-hint { font-size: 11px; color: #6b7280; margin-top: 6px; line-height: 1.5; font-weight: 300; }

  /* Ultimate Submit Button */
  .lp-submit {
    width: 100%; display: inline-flex; align-items: center; justify-content: space-between; gap: 16px;
    padding: 1rem 2rem; background: #111827; color: #ffffff; border-radius: 10px; 
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.22em; font-weight: 600;
    border: 1px solid #111827; cursor: pointer;
    transition: all 0.5s cubic-bezier(0.16,1,0.3,1); position: relative; overflow: hidden;
    margin-top: 0.25rem; font-family: 'Outfit', sans-serif;
  }
  
  /* Idle ambient sheen */
  .lp-submit::before {
    content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(to right, transparent, rgba(255,255,255,0.05), transparent);
    animation: btn-sheen 6s infinite; pointer-events: none;
  }
  
  /* Hover sheen sweep */
  .lp-submit::after {
    content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
    background: linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent);
    transform: skewX(-20deg); transition: 0.7s cubic-bezier(0.16,1,0.3,1); z-index: 0;
  }
  
  .lp-submit:hover { background: #1f2937; box-shadow: 0 15px 30px -10px rgba(17,24,39,0.7); transform: translateY(-2px) scale(1.01); }
  .lp-submit:hover::after { left: 150%; }
  .lp-submit:active { transform: scale(0.98); box-shadow: 0 5px 15px -5px rgba(17,24,39,0.7); }
  .lp-submit span { position: relative; z-index: 1; }
  .lp-submit:disabled { opacity: 0.65; cursor: not-allowed; transform: none; box-shadow: none; }

  /* Arrow Microanimation */
  .arr-wrap { position: relative; display: inline-flex; width: 16px; height: 16px; overflow: hidden; align-items: center; }
  .arr-1, .arr-2 { position: absolute; transition: transform 0.5s cubic-bezier(0.16,1,0.3,1); display: flex; align-items: center; }
  .arr-1 { left: 0; transform: translateX(0); }
  .arr-2 { left: 0; transform: translateX(-150%); }
  .lp-submit:hover .arr-1 { transform: translateX(150%); }
  .lp-submit:hover .arr-2 { transform: translateX(0); }

  /* Alerts */
  .lp-error { font-size: 12px; color: #dc2626; border: 1px solid #fecaca; background: #fef2f2; padding: 0.85rem 1rem; border-radius: 10px; border-left: 4px solid #dc2626; line-height: 1.5; font-weight: 400; animation: alert-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
  .lp-success { font-size: 12px; color: #059669; border: 1px solid #a7f3d0; background: #ecfdf5; padding: 0.85rem 1rem; border-radius: 10px; border-left: 4px solid #059669; line-height: 1.5; font-weight: 400; animation: alert-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }

  /* Footer links */
  .lp-form-footer { margin-top: 1.75rem; text-align: center; }
  .lp-form-footer a { font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #9ca3af; text-decoration: none; transition: color .3s ease; font-weight: 600; }
  .lp-form-footer a:hover { color: #111827; text-decoration: underline; text-underline-offset: 4px; }

  /* Mobile logo */
  .lp-mobile-logo { display: none; text-align: center; margin-bottom: 2rem; }
  @media (max-width: 860px) { .lp-mobile-logo { display: block; } }
  .lp-mobile-wordmark { font-family: 'Cormorant Garamond', serif; font-size: 2.2rem; color: #111827; font-weight: 400; letter-spacing: 0.01em; }
  .lp-mobile-tagline { font-size: 9px; text-transform: uppercase; letter-spacing: 0.35em; color: #6b7280; display: block; margin-top: 4px; font-weight: 600; }
`

/* ── Google Icon SVG ──────────────────────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

/* ── Inner Login Component ─────────────────────────────────────────────────── */

function LoginPageInner() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  
  // Trigger entrance animations client-side
  useEffect(() => { setMounted(true) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      window.location.href = redirect
    } else {
      if (!name.trim()) { setError('Please enter your full name.'); setLoading(false); return }
      const normalisedPhone = validatePhone(phone)
      if (!normalisedPhone) {
        setError('Please enter a valid WhatsApp number (e.g. 9876543210 or +91 9876543210).')
        setLoading(false); return
      }
      if (password.length < 8) { setError('Password must be at least 8 characters.'); setLoading(false); return }

      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) { setError(error.message); setLoading(false); return }
      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id, full_name: name.trim(),
          phone: normalisedPhone, email_opt_in: false, whatsapp_opt_in: true,
        })
      }
      setSuccess(`Registration successful! A verification link has been sent to your email.`)
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null); setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <main className={`lp-root ${mounted ? 'loaded' : ''}`}>
      <style dangerouslySetInnerHTML={{ __html: LOGIN_CSS }} />

      <div className="lp-container">
        
        {/* ── LEFT COLUMN (Image anchored to TOP so text is never cut off) ──────── */}
        <div className="lp-panel">
          <Image
            src="/login image.png"
            alt="Icon Opticals Campaign"
            fill
            style={{ objectFit: 'cover', objectPosition: 'top' }} /* <-- THE CRITICAL FIX */
            priority
          />
        </div>

        {/* ── RIGHT COLUMN (Form Side) ───────────────── */}
        <div className="lp-form-side">

          {/* Mobile logo */}
          <div className="lp-mobile-logo anim-stagger d-1">
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span className="lp-mobile-wordmark">Icon Opticals</span>
              <span className="lp-mobile-tagline">Premium Eyewear</span>
            </Link>
          </div>

          {/* Header */}
          <div className="lp-form-header anim-stagger d-1">
            <p className="lp-form-eyebrow">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </p>
            <h1 className="lp-form-title">
              {mode === 'login' ? 'Client Portal' : 'Client Registration'}
            </h1>
            <p className="lp-form-sub">
              {mode === 'login'
                ? 'Sign in to access your personalized boutique experience.'
                : 'Register for an exclusive client account.'}
            </p>
          </div>

          {/* Smooth Sliding Segmented Control */}
          <div className="lp-tabs-container anim-stagger d-2" data-mode={mode}>
            <div className="lp-tab-pill" />
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                type="button"
                className={`lp-tab${mode === m ? ' active' : ''}`}
                onClick={() => { setMode(m); setError(null); setSuccess(null) }}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Google OAuth */}
          <div className="anim-stagger d-3">
            <button type="button" className="lp-google-btn" onClick={handleGoogle} disabled={loading}>
              <GoogleIcon />
              Continue with Google
            </button>

            {mode === 'signup' && (
              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: '1.25rem', lineHeight: 1.5, textAlign: 'center', fontWeight: 300 }}>
                Using Google? Add your WhatsApp number in{' '}
                <Link href="/account" style={{ color: '#111827', textDecoration: 'underline', fontWeight: 500 }}>Account Settings</Link>{' '}
                after registration for invoice delivery.
              </p>
            )}

            <div className="lp-divider">
              <div className="lp-divider-line" />
              <span className="lp-divider-text">or with email</span>
              <div className="lp-divider-line" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="anim-stagger d-4">
            <div className="lp-fields">
              
              {/* Smooth Expanding Grid for Registration Fields */}
              <div className={`expand-grid ${mode === 'signup' ? 'open' : ''}`}>
                <div className="expand-inner">
                  <div className="lp-field-group">
                    <label className="lp-field-label">Full Name <span className="req">*</span></label>
                    <input
                      type="text" value={name} onChange={e => setName(e.target.value)}
                      required={mode === 'signup'} placeholder="Your full name" className="lp-input"
                      disabled={mode === 'login'}
                    />
                  </div>
                  <div className="lp-field-group">
                    <label className="lp-field-label">WhatsApp Number <span className="req">*</span></label>
                    <input
                      type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      required={mode === 'signup'} placeholder="+91 9876543210" className="lp-input"
                      disabled={mode === 'login'}
                    />
                    <p className="lp-hint">Invoices and tracking updates will be securely delivered here.</p>
                  </div>
                </div>
              </div>

              <div className="lp-field-group">
                <label className="lp-field-label">Email Address <span className="req">*</span></label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="your@email.com" className="lp-input"
                />
              </div>

              <div className="lp-field-group">
                <label className="lp-field-label">
                  Password <span className="req">*</span>
                  {mode === 'signup' && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af', marginLeft: 6 }}>(min 8 chars)</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    required placeholder="••••••••" className="lp-input"
                    style={{ paddingRight: '3.5rem' }}
                  />
                  <button
                    type="button" onClick={() => setShowPw(v => !v)}
                    style={{ 
                      position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', 
                      background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', 
                      display: 'flex', alignItems: 'center', transition: 'color 0.3s, transform 0.2s',
                      padding: '4px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#111827'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'translateY(-50%) scale(0.85)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'translateY(-50%) scale(1)'}
                  >
                    {showPw ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              {error && <div className="lp-error">{error}</div>}
              {success && <div className="lp-success">{success}</div>}

              <button type="submit" disabled={loading} className="lp-submit">
                <span>
                  {loading
                    ? <><Loader2 size={14} strokeWidth={2} style={{ animation: 'spin 1s linear infinite', display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} /> Processing...</>
                    : mode === 'login' ? 'Sign In' : 'Create Account'}
                </span>
                {!loading && (
                  <span className="arr-wrap">
                    <span className="arr-1"><ArrowRight size={14} strokeWidth={2} /></span>
                    <span className="arr-2"><ArrowRight size={14} strokeWidth={2} /></span>
                  </span>
                )}
              </button>
            </div>
          </form>

          {mode === 'login' && (
            <div className="lp-form-footer anim-stagger d-5">
              <Link href="/auth/forgot-password">Forgot Password?</Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={24} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite', color: '#9ca3af' }} />
      </main>
    }>
      <LoginPageInner />
    </Suspense>
  )
}