// 'use client'

// export const dynamic = 'force-dynamic'

// import { useState, useEffect } from 'react'
// import { useRouter } from 'next/navigation'
// import Link from 'next/link'
// import { createClient } from '@/lib/supabase'
// import { User, ShoppingBag, Heart, CalendarCheck, LogOut, BookOpen, Loader2, Save } from 'lucide-react'

// export default function AccountPage() {
//   const router = useRouter()
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   const [user, setUser] = useState<any>(null)
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   const [profile, setProfile] = useState<any>(null)
//   const [loading, setLoading] = useState(true)
//   const [saving, setSaving] = useState(false)
//   const [name, setName] = useState('')
//   const [phone, setPhone] = useState('')
//   const [emailOptIn, setEmailOptIn] = useState(false)

//   useEffect(() => {
//     const init = async () => {
//       const supabase = createClient()
//       const { data: { user } } = await supabase.auth.getUser()
//       if (!user) { router.push('/auth/login?redirect=/account'); return }
//       setUser(user)
//       const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
//       if (p) {
//         setProfile(p)
//         setName(p.full_name || '')
//         setPhone(p.phone || '')
//         setEmailOptIn(p.email_opt_in || false)
//       }
//       setLoading(false)
//     }
//     init()
//   }, [router])

//   const handleSave = async () => {
//     if (!user) return
//     setSaving(true)
//     const supabase = createClient()
//     await supabase.from('profiles').update({ full_name: name, phone, email_opt_in: emailOptIn }).eq('id', user.id)
//     setSaving(false)
//   }

//   const handleLogout = async () => {
//     await createClient().auth.signOut()
//     router.push('/')
//   }

//   if (loading) return (
//     <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
//       <Loader2 size={24} strokeWidth={1} className="animate-spin text-slate-900 mb-4" />
//       <p className="text-[9px] uppercase tracking-[0.2em] font-medium text-slate-500">Authenticating Client</p>
//     </main>
//   )

//   return (
//     <main className="min-h-screen bg-slate-50 py-16 md:py-24">
//       <div className="max-w-[1000px] mx-auto px-4 sm:px-6">
        
//         <div className="mb-12 border-b border-slate-200 pb-6">
//           <h1 
//             className="text-4xl text-slate-900 tracking-tight mb-2"
//             style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
//           >
//             Client Profile
//           </h1>
//           <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-medium">
//             Manage your boutique preferences
//           </p>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16">
          
//           {/* ── Editorial Sidebar ────────────────────────────────── */}
//           <div className="md:col-span-4 space-y-2">
//             {[
//               { href: '/account', label: 'Personal Details', icon: User, active: true },
//               { href: '/account/orders', label: 'Transaction Ledger', icon: ShoppingBag, active: false },
//               { href: '/account/bookings', label: 'Appointments', icon: BookOpen, active: false },
//               { href: '/wishlist', label: 'Curated Wishlist', icon: Heart, active: false },
//               { href: '/booking', label: 'Schedule Consultation', icon: CalendarCheck, active: false },
//             ].map(item => (
//               <Link key={item.href} href={item.href}
//                 className={`flex items-center gap-4 px-5 py-4 text-[10px] uppercase tracking-[0.2em] font-medium transition-all duration-300 ${
//                   item.active 
//                     ? 'bg-slate-900 text-white shadow-md' 
//                     : 'text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
//                 }`}>
//                 <item.icon size={16} strokeWidth={item.active ? 2 : 1.5} /> {item.label}
//               </Link>
//             ))}
            
//             <div className="pt-6 mt-6 border-t border-slate-200">
//               <button onClick={handleLogout}
//                 className="w-full flex items-center gap-4 px-5 py-4 text-[10px] uppercase tracking-[0.2em] font-medium text-slate-400 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition-all duration-300">
//                 <LogOut size={16} strokeWidth={1.5} /> Terminate Session
//               </button>
//             </div>
//           </div>

//           {/* ── Main Form Canvas ─────────────────────────────────── */}
//           <div className="md:col-span-8">
//             <div className="bg-white border border-slate-200 shadow-2xl p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
              
//               <div className="flex items-center gap-6 mb-10 pb-8 border-b border-slate-100">
//                 <div className="w-20 h-20 border border-slate-200 bg-slate-50 flex items-center justify-center text-3xl font-light text-slate-900 flex-shrink-0" style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}>
//                   {name.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
//                 </div>
//                 <div>
//                   <p className="text-xl text-slate-900 tracking-tight mb-1" style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}>
//                     {name || 'Unidentified Client'}
//                   </p>
//                   <p className="text-[11px] uppercase tracking-widest text-slate-400">
//                     {user?.email}
//                   </p>
//                 </div>
//               </div>

//               <div className="space-y-8">
                
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
//                   <div>
//                     <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Full Name</label>
//                     <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="ENTER FULL NAME"
//                       className="w-full text-[11px] text-slate-900 border border-slate-200 bg-white px-4 py-3.5 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none placeholder-slate-300 uppercase tracking-widest" />
//                   </div>
//                   <div>
//                     <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Contact Number</label>
//                     <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXXXXXXX"
//                       className="w-full text-[11px] text-slate-900 border border-slate-200 bg-white px-4 py-3.5 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none placeholder-slate-300 uppercase tracking-widest" />
//                   </div>
//                 </div>

//                 <div>
//                   <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Secure Email Address</label>
//                   <input type="email" value={user?.email || ''} disabled
//                     className="w-full text-[11px] text-slate-400 border border-slate-100 bg-slate-50 px-4 py-3.5 cursor-not-allowed rounded-none appearance-none uppercase tracking-widest" />
//                 </div>

//                 <div className="pt-6 border-t border-slate-100">
//                   <label className="flex items-start gap-4 cursor-pointer group w-max">
//                     <div className="relative flex items-center justify-center w-4 h-4 border border-slate-300 bg-white group-hover:border-slate-900 transition-colors mt-0.5">
//                       <input type="checkbox" checked={emailOptIn} onChange={e => setEmailOptIn(e.target.checked)} className="absolute opacity-0 cursor-pointer w-full h-full" />
//                       {emailOptIn && <div className="w-2 h-2 bg-slate-900" />}
//                     </div>
//                     <div>
//                       <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-900">Editorial Dispatches</p>
//                       <p className="text-[11px] text-slate-500 font-light mt-1 max-w-sm leading-relaxed">
//                         Receive exclusive exhibition invitations, bespoke offers, and curated lookbooks from ICON Opticals.
//                       </p>
//                     </div>
//                   </label>
//                 </div>

//                 <div className="pt-8">
//                   <button onClick={handleSave} disabled={saving}
//                     className="w-full sm:w-auto px-10 py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-70 text-white text-[10px] uppercase tracking-[0.2em] font-medium transition-colors flex items-center justify-center gap-3">
//                     {saving ? (
//                       <><Loader2 size={16} strokeWidth={1.5} className="animate-spin" /> Committing...</>
//                     ) : (
//                       <><Save size={16} strokeWidth={1.5} /> Update Profile</>
//                     )}
//                   </button>
//                 </div>

//               </div>
//             </div>
//           </div>

//         </div>
//       </div>
//     </main>
//   )
// }
'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  User, ShoppingBag, Heart, CalendarCheck, LogOut, BookOpen,
  Loader2, Save, CheckCircle, AlertCircle, MessageCircle,
} from 'lucide-react'

// ── Phone normalisation (mirrors checkout page) ──────────────────────────────
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.startsWith('91') && digits.length === 12) return digits
  if (digits.length >= 11 && digits.length <= 15) return digits
  return null
}

export default function AccountPage() {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [saveStatus, setSaveStatus]     = useState<'idle' | 'success' | 'error'>('idle')
  const [saveError, setSaveError]       = useState<string | null>(null)

  const [name, setName]                 = useState('')
  const [phone, setPhone]               = useState('')
  const [emailOptIn, setEmailOptIn]     = useState(false)
  // FIX Bug 3: expose whatsapp_opt_in so the user can control it
  const [whatsappOptIn, setWhatsappOptIn] = useState(true)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login?redirect=/account'); return }
      setUser(user)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (p) {
        setName(p.full_name || '')
        setPhone(p.phone || '')
        setEmailOptIn(p.email_opt_in || false)
        // FIX Bug 3: load whatsapp_opt_in (default true if null)
        setWhatsappOptIn(p.whatsapp_opt_in !== false)
      }
      setLoading(false)
    }
    init()
  }, [router])

  const handleSave = async () => {
    if (!user) return

    // FIX Bug 4: validate phone format before saving
    // If a phone is entered, it must be a valid format
    if (phone.trim()) {
      const normalised = normalisePhone(phone)
      if (!normalised) {
        setSaveStatus('error')
        setSaveError(
          'Please enter a valid WhatsApp number — 10-digit Indian number (e.g. 9876543210) ' +
          'or international number with country code.',
        )
        return
      }
      // Store the normalised form so generate-invoice always gets a clean number
      // (we keep local state as-is so the input doesn't jump)
    }

    setSaveStatus('idle')
    setSaveError(null)
    setSaving(true)

    try {
      const supabase = createClient()
      const normalisedPhone = phone.trim() ? (normalisePhone(phone) ?? phone.trim()) : null

      // FIX Bug 3: include whatsapp_opt_in in the update
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name:       name.trim(),
          phone:           normalisedPhone,
          email_opt_in:    emailOptIn,
          whatsapp_opt_in: whatsappOptIn,  // ← was missing before
        })
        .eq('id', user.id)

      if (error) throw error

      setSaveStatus('success')
      // Auto-clear success message after 4 s
      setTimeout(() => setSaveStatus('idle'), 4000)

    } catch (err) {
      console.error('[AccountPage] Save failed:', err)
      setSaveStatus('error')
      setSaveError('Profile update failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <Loader2 size={24} strokeWidth={1} className="animate-spin text-slate-900 mb-4" />
      <p className="text-[9px] uppercase tracking-[0.2em] font-medium text-slate-500">Authenticating Client</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-slate-50 py-16 md:py-24">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6">

        <div className="mb-12 border-b border-slate-200 pb-6">
          <h1
            className="text-4xl text-slate-900 tracking-tight mb-2"
            style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
          >
            Client Profile
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-medium">
            Manage your boutique preferences
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16">

          {/* ── Sidebar ───────────────────────────────────────────────── */}
          <div className="md:col-span-4 space-y-2">
            {[
              { href: '/account',           label: 'Personal Details',      icon: User,         active: true  },
              { href: '/account/orders',    label: 'Transaction Ledger',    icon: ShoppingBag,  active: false },
              { href: '/account/bookings',  label: 'Appointments',          icon: BookOpen,     active: false },
              { href: '/wishlist',          label: 'Curated Wishlist',      icon: Heart,        active: false },
              { href: '/booking',           label: 'Schedule Consultation', icon: CalendarCheck,active: false },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-5 py-4 text-[10px] uppercase tracking-[0.2em] font-medium transition-all duration-300 ${
                  item.active
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
                }`}
              >
                <item.icon size={16} strokeWidth={item.active ? 2 : 1.5} /> {item.label}
              </Link>
            ))}

            <div className="pt-6 mt-6 border-t border-slate-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-5 py-4 text-[10px] uppercase tracking-[0.2em] font-medium text-slate-400 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition-all duration-300"
              >
                <LogOut size={16} strokeWidth={1.5} /> Terminate Session
              </button>
            </div>
          </div>

          {/* ── Main Form ─────────────────────────────────────────────── */}
          <div className="md:col-span-8">
            <div className="bg-white border border-slate-200 shadow-2xl p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

              {/* Avatar / Name header */}
              <div className="flex items-center gap-6 mb-10 pb-8 border-b border-slate-100">
                <div
                  className="w-20 h-20 border border-slate-200 bg-slate-50 flex items-center justify-center text-3xl font-light text-slate-900 flex-shrink-0"
                  style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
                >
                  {name.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p
                    className="text-xl text-slate-900 tracking-tight mb-1"
                    style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
                  >
                    {name || 'Unidentified Client'}
                  </p>
                  <p className="text-[11px] uppercase tracking-widest text-slate-400">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-8">

                {/* Name + WhatsApp Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="ENTER FULL NAME"
                      className="w-full text-[11px] text-slate-900 border border-slate-200 bg-white px-4 py-3.5 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none placeholder-slate-300 uppercase tracking-widest"
                    />
                  </div>

                  {/* FIX Bug 3 + 4: renamed label, added WhatsApp note */}
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">
                      WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full text-[11px] text-slate-900 border border-slate-200 bg-white px-4 py-3.5 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none placeholder-slate-300 uppercase tracking-widest"
                    />
                    <p className="text-[9px] text-slate-400 mt-1.5 leading-relaxed">
                      Your invoice is delivered to this number after every purchase.
                    </p>
                  </div>
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">
                    Secure Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full text-[11px] text-slate-400 border border-slate-100 bg-slate-50 px-4 py-3.5 cursor-not-allowed rounded-none appearance-none uppercase tracking-widest"
                  />
                </div>

                {/* Notification Preferences */}
                <div className="pt-6 border-t border-slate-100 space-y-6">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-900">
                    Notification Preferences
                  </p>

                  {/* Email opt-in */}
                  <label className="flex items-start gap-4 cursor-pointer group w-max">
                    <div className="relative flex items-center justify-center w-4 h-4 border border-slate-300 bg-white group-hover:border-slate-900 transition-colors mt-0.5 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={emailOptIn}
                        onChange={e => setEmailOptIn(e.target.checked)}
                        className="absolute opacity-0 cursor-pointer w-full h-full"
                      />
                      {emailOptIn && <div className="w-2 h-2 bg-slate-900" />}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-900">
                        Editorial Dispatches
                      </p>
                      <p className="text-[11px] text-slate-500 font-light mt-1 max-w-sm leading-relaxed">
                        Exclusive exhibition invitations, bespoke offers, and curated lookbooks.
                      </p>
                    </div>
                  </label>

                  {/* FIX Bug 3: WhatsApp opt-in toggle (was completely missing) */}
                  <label className="flex items-start gap-4 cursor-pointer group w-max">
                    <div className="relative flex items-center justify-center w-4 h-4 border border-slate-300 bg-white group-hover:border-slate-900 transition-colors mt-0.5 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={whatsappOptIn}
                        onChange={e => setWhatsappOptIn(e.target.checked)}
                        className="absolute opacity-0 cursor-pointer w-full h-full"
                      />
                      {whatsappOptIn && <div className="w-2 h-2 bg-slate-900" />}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-900 flex items-center gap-2">
                        <MessageCircle size={12} strokeWidth={1.5} />
                        WhatsApp Invoice Delivery
                      </p>
                      <p className="text-[11px] text-slate-500 font-light mt-1 max-w-sm leading-relaxed">
                        Receive your purchase invoice instantly on WhatsApp after every order.
                        Requires a valid WhatsApp number above.
                      </p>
                    </div>
                  </label>
                </div>

                {/* FIX Bug 7: save feedback (was completely missing) */}
                {saveStatus === 'success' && (
                  <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50 px-5 py-4 animate-in fade-in">
                    <CheckCircle size={16} strokeWidth={1.5} className="text-emerald-600 flex-shrink-0" />
                    <p className="text-[10px] uppercase tracking-[0.1em] font-semibold text-emerald-700">
                      Profile updated successfully.
                    </p>
                  </div>
                )}
                {saveStatus === 'error' && saveError && (
                  <div className="flex items-start gap-3 border border-red-200 bg-red-50 px-5 py-4 animate-in fade-in">
                    <AlertCircle size={16} strokeWidth={1.5} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] uppercase tracking-[0.1em] font-semibold text-red-700 leading-relaxed">
                      {saveError}
                    </p>
                  </div>
                )}

                {/* Save button */}
                <div className="pt-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full sm:w-auto px-10 py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-70 text-white text-[10px] uppercase tracking-[0.2em] font-medium transition-colors flex items-center justify-center gap-3"
                  >
                    {saving
                      ? <><Loader2 size={16} strokeWidth={1.5} className="animate-spin" /> Saving...</>
                      : <><Save size={16} strokeWidth={1.5} /> Update Profile</>
                    }
                  </button>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}