'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ToggleLeft, ToggleRight, Loader2, X, ChevronDown, Gift } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type DiscountType = 'percent' | 'flat' | 'bogo'

interface Coupon {
  id: string
  code: string
  description: string | null
  discount_type: DiscountType
  discount_value: number
  min_order_value: number
  max_discount: number | null
  usage_limit: number | null
  used_count: number
  valid_until: string | null
  is_active: boolean
  created_at: string
}

const TYPE_LABELS: Record<DiscountType, string> = {
  percent: '% OFF',
  flat: 'FLAT OFF',
  bogo: 'BUY 1 GET 1',
}

const EMPTY_FORM = {
  code: '',
  description: '',
  discount_type: 'percent' as DiscountType,
  discount_value: '',
  min_order_value: '0',
  max_discount: '',
  usage_limit: '',
  valid_until: '',
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
    setCoupons((data || []) as Coupon[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  const isBogo = form.discount_type === 'bogo'

  const handleCreate = async () => {
    setFormError(null)
    if (!form.code.trim()) { setFormError('Privilege Code is mandatory.'); return }
    if (!isBogo && (!form.discount_value || Number(form.discount_value) <= 0)) {
      setFormError('Discount parameters must be greater than zero.'); return
    }
    if (!isBogo && form.discount_type === 'percent' && Number(form.discount_value) > 100) {
      setFormError('Percentage threshold exceeded.'); return
    }

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('coupons').insert({
      code: form.code.toUpperCase().trim(),
      description: form.description || null,
      discount_type: form.discount_type,
      // For BOGO, discount_value is 0 — the actual discount is computed at checkout
      // from cart items: floor(N/2) cheapest units are free.
      discount_value: isBogo ? 0 : Number(form.discount_value),
      min_order_value: isBogo ? 0 : Number(form.min_order_value || 0),
      max_discount: (!isBogo && form.discount_type === 'percent' && form.max_discount)
        ? Number(form.max_discount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      valid_until: form.valid_until || null,
      is_active: true,
    })

    setSaving(false)
    if (error) { setFormError(error.message); return }
    setShowForm(false)
    setForm(EMPTY_FORM)
    fetchCoupons()
  }

  const toggleActive = async (coupon: Coupon) => {
    setTogglingId(coupon.id)
    const supabase = createClient()
    await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id)
    setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c))
    setTogglingId(null)
  }

  const deleteCoupon = async (id: string) => {
    if (!confirm('Permanently void this code? This cannot be undone.')) return
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('coupons').delete().eq('id', id)
    setCoupons(prev => prev.filter(c => c.id !== id))
    setDeletingId(null)
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  // ── BOGO discount column ────────────────────────────────────────────────────
  // BOGO discount_value is always 0 in DB — the actual discount is computed
  // dynamically at checkout (cheapest item(s) free for every 2 units ordered).
  const discountLabel = (c: Coupon) => {
    if (c.discount_type === 'bogo') return 'Cheapest item(s) free'
    if (c.discount_type === 'percent') return `${c.discount_value}% OFF${c.max_discount ? ` (MAX ₹${c.max_discount})` : ''}`
    return `₹${c.discount_value} OFF`
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* ── Dashboard Header ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-6 border-b border-slate-200 pb-6">
        <div>
          <h1
            className="text-3xl text-slate-900 tracking-tight mb-2"
            style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
          >
            Privilege Codes
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-slate-400">
            {coupons.length} Active {coupons.length !== 1 ? 'Records' : 'Record'}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(null); setForm(EMPTY_FORM) }}
          className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white text-[10px] uppercase tracking-[0.2em] font-medium px-6 py-3.5 transition-colors"
        >
          <Plus size={14} strokeWidth={1.5} /> Generate Code
        </button>
      </div>

      {/* ── Privilege Code Ledger ────────────────────────────── */}
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-slate-900 bg-white">
              <tr>
                {['Reference', 'Classification', 'Parameters', 'Min Settlement', 'Usage', 'Expiration', 'Status', 'Manage'].map(h => (
                  <th key={h} className="px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-6 py-5">
                        <div className="h-3 bg-slate-100 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-24 text-center">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-slate-500">
                      No Privilege Codes Generated.
                    </p>
                  </td>
                </tr>
              ) : coupons.map(c => (
                <tr key={c.id} className={`hover:bg-slate-50/50 transition-colors duration-200 group ${c.discount_type === 'bogo' ? 'bg-emerald-50/30' : ''}`}>
                  <td className="px-6 py-5">
                    <span className="font-mono text-xs tracking-widest text-slate-900 font-medium whitespace-nowrap">{c.code}</span>
                    {c.description && <p className="text-[9px] uppercase tracking-widest text-slate-400 mt-1 max-w-[160px] truncate">{c.description}</p>}
                  </td>

                  {/* Classification — BOGO gets a special badge */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    {c.discount_type === 'bogo' ? (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.15em]">
                        <Gift size={10} strokeWidth={2} />
                        {TYPE_LABELS.bogo}
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-slate-900">
                        {TYPE_LABELS[c.discount_type]}
                      </span>
                    )}
                  </td>

                  {/* Parameters — BOGO shows descriptive rule */}
                  <td className="px-6 py-5 whitespace-nowrap">
                    {c.discount_type === 'bogo' ? (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.1em] font-medium text-emerald-700">
                          {discountLabel(c)}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-0.5">Every 2 items → 1 free</p>
                      </div>
                    ) : (
                      <span className="text-[10px] uppercase tracking-[0.1em] font-medium text-slate-600">
                        {discountLabel(c)}
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-5 text-[10px] uppercase tracking-[0.15em] font-medium text-slate-500 whitespace-nowrap">
                    {c.discount_type === 'bogo' ? '—' : `₹${c.min_order_value}`}
                  </td>
                  <td className="px-6 py-5 text-[10px] uppercase tracking-[0.15em] font-medium text-slate-500 whitespace-nowrap">
                    {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ''} UTILIZED
                  </td>
                  <td className="px-6 py-5 text-[10px] uppercase tracking-[0.15em] font-medium text-slate-500 whitespace-nowrap">
                    {fmtDate(c.valid_until)}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(c)}
                      disabled={togglingId === c.id}
                      className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-50"
                      aria-label="Toggle Status"
                    >
                      {togglingId === c.id ? (
                        <Loader2 size={20} strokeWidth={1} className="animate-spin text-slate-900" />
                      ) : c.is_active ? (
                        <ToggleRight size={24} strokeWidth={1.5} className="text-slate-900" />
                      ) : (
                        <ToggleLeft size={24} strokeWidth={1} className="text-slate-300" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <button
                      onClick={() => deleteCoupon(c.id)}
                      disabled={deletingId === c.id}
                      className="text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-50"
                      aria-label="Void Code"
                    >
                      {deletingId === c.id ? <Loader2 size={16} strokeWidth={1.5} className="animate-spin" /> : <Trash2 size={16} strokeWidth={1.5} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── BOGO Logic Reference ─────────────────────────────── */}
      <div className="mt-6 bg-emerald-50 border border-emerald-200 px-6 py-5 flex gap-4">
        <Gift size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-900 mb-1">Buy 1 Get 1 Logic</p>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            When a customer applies a BOGO coupon, the system automatically makes the cheapest item(s) free.
            For every 2 units in the cart, 1 is free — so 2 items → 1 free, 4 items → 2 free, 3 items → 1 free.
            The highest-priced items are always charged. The discount is calculated dynamically at checkout
            based on actual cart contents.
          </p>
        </div>
      </div>

      {/* ── Code Generator Modal ─────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-500">

            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 px-8 py-6 flex items-start justify-between z-10">
              <div>
                <p className="text-[9px] uppercase tracking-[0.25em] text-slate-400 mb-2">Generation Protocol</p>
                <h2 className="text-2xl text-slate-900 tracking-tight" style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}>
                  New Privilege Code
                </h2>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-1 -mr-2 -mt-1">
                <X size={24} strokeWidth={1} />
              </button>
            </div>

            <div className="p-8 space-y-8">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Code */}
                <div>
                  <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Privilege Reference (Code)</label>
                  <input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="E.G. SUMMER2026"
                    className="w-full text-[11px] text-slate-900 font-mono border border-slate-200 bg-white px-4 py-3.5 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none placeholder-slate-300 uppercase tracking-widest"
                  />
                </div>

                {/* Type */}
                <div className="relative">
                  <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Algorithm Type</label>
                  <select
                    value={form.discount_type}
                    onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as DiscountType }))}
                    className="w-full text-[11px] uppercase tracking-widest text-slate-900 border border-slate-200 bg-white px-4 py-3.5 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none cursor-pointer"
                  >
                    <option value="percent">Percentage Void</option>
                    <option value="flat">Fixed Settlement Void</option>
                    <option value="bogo">Buy 1 Get 1 Free (BOGO)</option>
                  </select>
                  <ChevronDown size={14} strokeWidth={1} className="absolute right-4 bottom-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* BOGO Explanation Block */}
              {isBogo && (
                <div className="border border-emerald-200 bg-emerald-50 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Gift size={16} strokeWidth={1.5} className="text-emerald-700" />
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-emerald-900">How BOGO Works</p>
                  </div>
                  <div className="space-y-2 text-[11px] text-emerald-800 leading-relaxed">
                    <p>
                      <strong>Rule:</strong> For every 2 items in the cart, the cheaper one is free. Extra unpaired items are charged at full price.
                    </p>
                    <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                      {[
                        { cart: '2 items', free: '1 free' },
                        { cart: '3 items', free: '1 free' },
                        { cart: '4 items', free: '2 free' },
                      ].map(ex => (
                        <div key={ex.cart} className="bg-white border border-emerald-200 px-3 py-2.5">
                          <p className="font-bold text-slate-900 text-[10px]">{ex.cart}</p>
                          <p className="text-emerald-600 text-[9px] font-semibold mt-0.5">{ex.free}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[10px] text-emerald-700">
                      No discount value needed — the system calculates the discount dynamically at checkout based on actual cart prices.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Discount Value */}
                {!isBogo && (
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">
                      {form.discount_type === 'percent' ? 'Percentage %' : 'Void Amount (₹)'}
                    </label>
                    <input
                      type="number" min="1" max={form.discount_type === 'percent' ? '100' : undefined}
                      value={form.discount_value}
                      onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                      placeholder={form.discount_type === 'percent' ? '10' : '500'}
                      className="w-full text-[11px] font-mono text-slate-900 border border-slate-200 bg-white px-4 py-3.5 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none placeholder-slate-300"
                    />
                  </div>
                )}

                {/* Min Order Value */}
                {!isBogo && (
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Min. Settlement Barrier (₹)</label>
                    <input
                      type="number" min="0"
                      value={form.min_order_value}
                      onChange={e => setForm(f => ({ ...f, min_order_value: e.target.value }))}
                      placeholder="0"
                      className="w-full text-[11px] font-mono text-slate-900 border border-slate-200 bg-white px-4 py-3.5 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none placeholder-slate-300"
                    />
                  </div>
                )}

                {/* Max Discount */}
                {form.discount_type === 'percent' && (
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Max. Void Barrier (₹) — Opt.</label>
                    <input
                      type="number" min="0"
                      value={form.max_discount}
                      onChange={e => setForm(f => ({ ...f, max_discount: e.target.value }))}
                      placeholder="E.G. 1000"
                      className="w-full text-[11px] font-mono text-slate-900 border border-slate-200 bg-white px-4 py-3.5 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none placeholder-slate-300"
                    />
                  </div>
                )}

                {/* Usage Limit */}
                <div>
                  <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Execution Limit — Opt.</label>
                  <input
                    type="number" min="1"
                    value={form.usage_limit}
                    onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))}
                    placeholder="UNRESTRICTED"
                    className="w-full text-[11px] font-mono text-slate-900 border border-slate-200 bg-white px-4 py-3.5 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none placeholder-slate-300"
                  />
                </div>

                {/* Valid Until */}
                <div>
                  <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Expiration Date — Opt.</label>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                    className="w-full text-[11px] uppercase tracking-widest text-slate-900 border border-slate-200 bg-white px-4 py-3.5 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Internal Notation — Opt.</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="E.G. VIP SPRING LAUNCH EXCLUSIVE"
                  className="w-full text-[11px] uppercase tracking-widest text-slate-900 border border-slate-200 bg-white px-4 py-3.5 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none placeholder-slate-300"
                />
              </div>

              {/* Error Output */}
              {formError && (
                <div className="text-[10px] uppercase tracking-[0.1em] font-semibold text-slate-900 bg-slate-50 border border-slate-900 px-4 py-3 flex items-start gap-3">
                  {formError}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => { setShowForm(false); setFormError(null) }}
                  className="flex-1 py-4 border border-slate-200 text-slate-900 text-[10px] uppercase tracking-[0.2em] font-medium hover:border-slate-900 transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-[2] py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[10px] uppercase tracking-[0.2em] font-medium transition-colors flex items-center justify-center gap-3"
                >
                  {saving ? (
                    <><Loader2 size={16} strokeWidth={1.5} className="animate-spin" /> Committing...</>
                  ) : (
                    'Activate Privilege Code'
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}