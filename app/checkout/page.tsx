'use client'

export const dynamic = 'force-dynamic'

import { useState, Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useCart } from '@/hooks/useCart'
import {
  MapPin, Store as StoreIcon, Truck, ChevronRight, Loader2,
  Glasses, AlertCircle, Lock, Check, Phone,
} from 'lucide-react'

type FulfillmentType = 'pickup' | 'delivery'

interface AddressForm {
  name: string; phone: string; line1: string; line2: string
  city: string; state: string; pincode: string
}

// ── Phone validation ───────────────────────────────────────────────────────
// Returns a normalised E.164-ish string, or null if the number is not usable.
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`                         // bare Indian number
  if (digits.length === 12 && digits.startsWith('91')) return digits     // 91XXXXXXXXXX
  if (digits.length >= 11 && digits.length <= 15) return digits          // international
  return null
}

function CheckoutPageInner() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stores, setStores] = useState<any[]>([])
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('pickup')
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [address, setAddress] = useState<AddressForm>({
    name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '',
  })

  // FIX: dedicated phone field for pickup orders — always required
  const [pickupPhone, setPickupPhone] = useState('')

  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { summary, loading } = useCart(userId)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login?redirect=/checkout'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single()

      if (profile) {
        // Pre-fill both the delivery address form AND the pickup phone field
        setAddress(a => ({ ...a, name: profile.full_name || '', phone: profile.phone || '' }))
        setPickupPhone(profile.phone || '')
      }

      const { data: storeData } = await supabase
        .from('stores')
        .select('id, name, address, city, state, timings')
        .eq('is_active', true)
        .range(0, 19)
      if (storeData) setStores(storeData)
    }
    init()
  }, [router])

  const setAddrField = (key: keyof AddressForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setAddress(a => ({ ...a, [key]: e.target.value }))

  // ── Order placement ──────────────────────────────────────────────────────
  const placeOrder = async () => {
    if (!userId) return
    setError(null)

    // ── Fulfillment validation ─────────────────────────────────────────────
    if (fulfillment === 'pickup' && !selectedStore) {
      setError('Please select a boutique for collection.')
      return
    }

    // ── PHONE VALIDATION (both pickup and delivery) ────────────────────────
    // WhatsApp invoice delivery requires a valid phone number on every order.
    const rawPhone = fulfillment === 'delivery' ? address.phone : pickupPhone
    const normPhone = normalisePhone(rawPhone)
    if (!normPhone) {
      setError(
        'A valid WhatsApp number is required to receive your invoice. ' +
        'Please enter a 10-digit Indian number (e.g. 9876543210) or an ' +
        'international number with country code.',
      )
      return
    }

    // ── Delivery address validation ────────────────────────────────────────
    if (fulfillment === 'delivery') {
      if (!address.name || !address.line1 || !address.city || !address.state || !address.pincode) {
        setError('Please complete all delivery details.')
        return
      }
    }

    if (!summary.items.length) { setError('Your selection is empty.'); return }

    setPlacing(true)
    try {
      const res = await fetch('/api/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart_items: summary.items,
          coupon_code: summary.coupon?.code,
          fulfillment_type: fulfillment,
          store_id: fulfillment === 'pickup' ? selectedStore : undefined,
          shipping_address: fulfillment === 'delivery' ? address : undefined,
          // FIX: always send the normalised phone — the API will upsert it into
          //       profiles.phone so generate-invoice can always reach the customer.
          phone: normPhone,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Transaction failed. Please try again.'); return }
      router.push(`/orders/${data.order_id}?pending=true`)
    } catch {
      setError('An anomaly occurred. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  // ── Luxury Loading State ──────────────────────────────────────────────────
  if (loading || !userId) return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <Loader2 size={24} strokeWidth={1} className="animate-spin text-slate-900 mb-6" />
      <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-slate-500">Preparing Checkout</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-slate-50 py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="mb-12 border-b border-slate-200 pb-6">
          <h1
            className="text-4xl text-slate-900 tracking-tight mb-2"
            style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
          >
            Secure Checkout
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-medium">Finalize Your Selection</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">

          {/* ── Left Column: Forms ─────────────────────────────── */}
          <div className="lg:col-span-7 space-y-10">

            {/* Fulfillment Toggle */}
            <div className="bg-white p-8 border border-slate-200">
              <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-slate-900 mb-6">
                Fulfillment Method
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { value: 'pickup' as const, label: 'Boutique Collection', desc: 'Complimentary · Ready in 3–5 days', icon: <StoreIcon size={20} strokeWidth={1.25} /> },
                  { value: 'delivery' as const, label: 'Home Delivery', desc: 'Complimentary · 5–7 working days', icon: <Truck size={20} strokeWidth={1.25} /> },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFulfillment(opt.value)}
                    className={`p-6 border text-left transition-all duration-300 group ${
                      fulfillment === opt.value ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-900'
                    }`}
                  >
                    <div className={`mb-4 transition-colors duration-300 ${fulfillment === opt.value ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-900'}`}>
                      {opt.icon}
                    </div>
                    <p className="font-semibold text-xs uppercase tracking-[0.1em] text-slate-900 mb-1">{opt.label}</p>
                    <p className="text-[10px] text-slate-500 font-light">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── PICKUP: Store Picker + Phone ────────────────────────────── */}
            {fulfillment === 'pickup' && (
              <>
                <div className="bg-white p-8 border border-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <MapPin size={16} strokeWidth={1.5} className="text-slate-400" /> Select Boutique
                  </h2>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                    {stores.map(store => (
                      <button
                        key={store.id}
                        onClick={() => setSelectedStore(store.id)}
                        className={`w-full text-left p-6 border transition-all duration-300 group ${
                          selectedStore === store.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-xs uppercase tracking-[0.1em] text-slate-900 mb-1">{store.name}</p>
                            <p className="text-[11px] text-slate-500 font-light">{store.address}, {store.city}</p>
                          </div>
                          {selectedStore === store.id && (
                            <Check size={18} strokeWidth={1.5} className="text-slate-900 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* FIX: Phone field for pickup orders (WhatsApp invoice) */}
                <div className="bg-white p-8 border border-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-slate-900 mb-2 flex items-center gap-3">
                    <Phone size={16} strokeWidth={1.5} className="text-slate-400" /> WhatsApp Contact
                  </h2>
                  <p className="text-[10px] text-slate-400 mb-6 leading-relaxed">
                    Your invoice will be sent to this WhatsApp number immediately after payment confirmation.
                  </p>
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">
                      WhatsApp Number <span className="text-slate-900">*</span>
                    </label>
                    <input
                      type="tel"
                      value={pickupPhone}
                      onChange={e => setPickupPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full text-sm text-slate-900 border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── DELIVERY: Address Form (phone already inside) ────────────── */}
            {fulfillment === 'delivery' && (
              <div className="bg-white p-8 border border-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-slate-900 mb-2 flex items-center gap-3">
                  <Truck size={16} strokeWidth={1.5} className="text-slate-400" /> Delivery Address
                </h2>
                <p className="text-[10px] text-slate-400 mb-6 leading-relaxed">
                  Your WhatsApp invoice will be sent to the phone number provided below.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {([
                    { key: 'name' as const, label: 'Full Name', col: 'sm:col-span-1', type: 'text' },
                    // FIX: phone label clarified to "WhatsApp Number"
                    { key: 'phone' as const, label: 'WhatsApp Number *', col: 'sm:col-span-1', type: 'tel' },
                    { key: 'line1' as const, label: 'Address Line 1', col: 'sm:col-span-2', type: 'text' },
                    { key: 'line2' as const, label: 'Address Line 2 (Optional)', col: 'sm:col-span-2', type: 'text' },
                    { key: 'city' as const, label: 'City', col: 'sm:col-span-1', type: 'text' },
                    { key: 'state' as const, label: 'State', col: 'sm:col-span-1', type: 'text' },
                    { key: 'pincode' as const, label: 'Postal Code', col: 'sm:col-span-1', type: 'text' },
                  ]).map(field => (
                    <div key={field.key} className={field.col}>
                      <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        value={address[field.key]}
                        onChange={setAddrField(field.key)}
                        className="w-full text-sm text-slate-900 border border-slate-200 bg-white px-4 py-3 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="flex items-start gap-4 border border-slate-900 bg-slate-50 p-6 animate-in fade-in">
                <AlertCircle size={18} strokeWidth={1.5} className="text-slate-900 flex-shrink-0 mt-0.5" />
                <span className="text-[11px] uppercase tracking-[0.1em] font-semibold text-slate-900 leading-relaxed">
                  {error}
                </span>
              </div>
            )}
          </div>

          {/* ── Right Column: Order Summary ──────────────────────── */}
          <div className="lg:col-span-5">
            <div className="bg-white p-8 border border-slate-200 sticky top-24">
              <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-slate-900 mb-8 border-b border-slate-100 pb-4">
                Order Manifest
              </h2>

              {/* Items List */}
              <div className="space-y-6 mb-8 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                {summary.items.map(item => (
                  <div key={item.id} className="flex items-start gap-4 group">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0 transition-colors group-hover:border-slate-300">
                      <Glasses size={24} strokeWidth={1} />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="font-medium text-slate-900 truncate text-sm mb-1">{item.product?.name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500">QTY: {item.quantity}</p>
                    </div>
                    <span className="font-medium text-slate-900 flex-shrink-0 text-sm pt-1">
                      ₹{(item.total_price || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-slate-200 pt-6 space-y-4 text-xs tracking-wide">
                <div className="flex justify-between text-slate-500">
                  <span className="uppercase tracking-[0.1em]">Subtotal</span>
                  <span>₹{summary.subtotal.toLocaleString('en-IN')}</span>
                </div>
                {summary.discount_amount > 0 && (
                  <div className="flex justify-between text-slate-900">
                    <span className="uppercase tracking-[0.1em]">Discount ({summary.coupon?.code})</span>
                    <span>−₹{summary.discount_amount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span className="uppercase tracking-[0.1em]">Delivery</span>
                  <span className="text-slate-900 font-medium">Complimentary</span>
                </div>
                <div className="flex justify-between font-semibold text-base text-slate-900 pt-6 border-t border-slate-100 mt-2">
                  <span className="uppercase tracking-[0.1em] text-xs pt-1">Total Settled</span>
                  <span>₹{summary.total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Checkout Action */}
              <button
                onClick={placeOrder}
                disabled={placing}
                className="mt-10 w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-70 disabled:hover:bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em] font-medium transition-colors flex items-center justify-center gap-3 group"
              >
                {placing ? (
                  <><Loader2 size={16} strokeWidth={1.5} className="animate-spin" /> Authorizing...</>
                ) : (
                  <>Secure Order <ChevronRight size={16} strokeWidth={1.5} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 mt-4 text-[9px] uppercase tracking-[0.15em] text-slate-400">
                <Lock size={10} strokeWidth={2} />
                <span>Encrypted 256-bit Connection</span>
              </div>

              {/* WhatsApp invoice note */}
              <p className="text-center text-[9px] text-slate-400 mt-3 leading-relaxed">
                Your invoice will be delivered via WhatsApp immediately after payment confirmation.
              </p>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={24} strokeWidth={1} className="animate-spin text-slate-400" />
      </main>
    }>
      <CheckoutPageInner />
    </Suspense>
  )
}