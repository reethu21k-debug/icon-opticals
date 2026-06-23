'use client'

// components/admin/VariantGroupManager.tsx
//
// "Product Variant Linking (Optional)" section for the admin product edit
// drawer. Renders a toggle; when OFF, nothing else is shown and the product
// behaves like a normal product. When ON, the admin can search existing
// products and link them together as color variants.
//
// This component is intentionally self-contained — it talks to
// /api/admin/variant-groups directly and does not change anything about how
// the rest of the product form works.

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Loader2, AlertCircle, Check, Palette, Save } from 'lucide-react'
import type { ProductVariantSearchResult } from '@/types'

interface VariantGroupManagerProps {
  productId: string
  productName: string
}

export default function VariantGroupManager({ productId, productName }: VariantGroupManagerProps) {
  const [loading, setLoading]   = useState(true)
  const [enabled, setEnabled]   = useState(false)
  const [selected, setSelected] = useState<ProductVariantSearchResult[]>([])

  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<ProductVariantSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load current linking state ────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/variant-groups?product_id=${productId}`)
      const data = await res.json()
      if (res.ok) {
        setEnabled(!!data.enabled)
        setSelected(data.variants || [])
      }
    } catch {
      /* silent — section just stays empty */
    }
    setLoading(false)
  }, [productId])

  useEffect(() => { load() }, [load])

  // ── Search existing products ──────────────────────────────────────────────
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    if (query.trim().length < 2) { setResults([]); return }

    searchDebounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `/api/admin/variant-groups/search?q=${encodeURIComponent(query.trim())}&exclude=${productId}`,
        )
        const data = await res.json()
        setResults(res.ok ? (data.results || []) : [])
      } catch {
        setResults([])
      }
      setSearching(false)
    }, 300)

    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current) }
  }, [query, productId])

  const isSelected = (id: string) => selected.some(s => s.id === id)

  const toggleSelect = (p: ProductVariantSearchResult) => {
    setSelected(prev => (isSelected(p.id) ? prev.filter(s => s.id !== p.id) : [...prev, p]))
    setSavedMsg(null)
  }

  const removeSelected = (id: string) => {
    setSelected(prev => prev.filter(s => s.id !== id))
    setSavedMsg(null)
  }

  // ── Toggle handler ─────────────────────────────────────────────────────────
  const handleToggle = async () => {
    if (enabled) {
      // Turning OFF — unlink this product entirely.
      if (selected.length > 0 && !confirm('Disable variant linking for this product? It will be removed from its color group.')) {
        return
      }
      setSaving(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/variant-groups?product_id=${productId}`, { method: 'DELETE' })
        if (!res.ok) {
          const b = await res.json().catch(() => ({}))
          setError(b.error || 'Failed to disable variant linking')
          setSaving(false)
          return
        }
        setEnabled(false)
        setSelected([])
        setQuery('')
        setResults([])
        setSavedMsg('Variant linking disabled.')
      } catch {
        setError('Network error')
      }
      setSaving(false)
    } else {
      setEnabled(true)
      setSavedMsg(null)
    }
  }

  // ── Save handler ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (selected.length === 0) {
      setError('Select at least one product to link as a color variant.')
      return
    }
    setSaving(true)
    setError(null)
    setSavedMsg(null)
    try {
      const res = await fetch('/api/admin/variant-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, variant_product_ids: selected.map(s => s.id) }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        setError(b.error || `Error ${res.status}`)
        setSaving(false)
        return
      }
      setSavedMsg('Variant group saved.')
      await load()
    } catch {
      setError('Network error')
    }
    setSaving(false)
  }

  return (
    <section className="bg-white/50 p-7 rounded-3xl border border-white shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white shadow-sm border border-slate-100 rounded-xl">
            <Palette size={16} strokeWidth={2} className="text-slate-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em]">Product Variant Linking</p>
            <p className="text-[9px] text-slate-400 font-light mt-0.5">
              Link this product to other color variants so customers can switch between them
            </p>
          </div>
        </div>
        <span className="flex-shrink-0 text-[8px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
          Optional
        </span>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between mt-5 mb-2 p-4 bg-slate-50/80 border border-slate-200/60 rounded-2xl">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700">Enable Variant Linking</p>
          <p className="text-[9px] text-slate-400 mt-0.5">
            {enabled ? 'Customers will see a color switcher on this product.' : 'No color selector will appear — product works as-is.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading || saving}
          aria-pressed={enabled}
          className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors duration-300 disabled:opacity-50 ${
            enabled ? 'bg-slate-900' : 'bg-slate-300'
          }`}
        >
          <span
            className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300"
            style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
          />
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest py-4">
          <Loader2 size={13} className="animate-spin" /> Loading variant data...
        </div>
      )}

      {!loading && enabled && (
        <div className="mt-5 space-y-5">

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle size={14} strokeWidth={2.5} className="text-rose-600 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-rose-800">{error}</p>
              </div>
              <button onClick={() => setError(null)}><X size={13} className="text-rose-400" /></button>
            </div>
          )}

          {savedMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2">
              <Check size={13} strokeWidth={3} className="text-emerald-600" />
              <p className="text-[11px] text-emerald-800">{savedMsg}</p>
            </div>
          )}

          {/* Current product chip */}
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Current Product</p>
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[11px] font-bold uppercase tracking-wide">
              <Check size={13} strokeWidth={3} /> {productName}
            </div>
          </div>

          {/* Search */}
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Search Existing Products</p>
            <div className="relative">
              <Search size={14} strokeWidth={2} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name or brand..."
                className="w-full text-[12px] font-medium text-slate-900 bg-white/70 border border-slate-200/60 rounded-xl pl-11 pr-5 py-3.5 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all shadow-sm placeholder-slate-400"
              />
              {searching && (
                <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
              )}
            </div>

            {results.length > 0 && (
              <div className="mt-3 border border-slate-200/60 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white/70">
                {results.map(p => {
                  const checked = isSelected(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleSelect(p)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-300'}`}>
                        {checked && <Check size={12} strokeWidth={3} className="text-white" />}
                      </div>
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt="" className="w-9 h-9 rounded-lg border border-slate-100 object-contain bg-white p-1 flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg border border-slate-100 bg-slate-50 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-900 truncate">{p.name}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-widest">
                          {p.brand}{p.frame_color ? ` · ${p.frame_color}` : ''}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            {query.trim().length >= 2 && !searching && results.length === 0 && (
              <p className="text-[10px] text-slate-400 uppercase tracking-widest text-center py-4">No matching products</p>
            )}
          </div>

          {/* Selected variants */}
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Selected Variants {selected.length > 0 && `(${selected.length})`}
            </p>
            {selected.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic py-2">No variants selected yet — search above to add some.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selected.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 pl-3 pr-2 py-2 bg-white border border-slate-200 rounded-xl shadow-sm"
                  >
                    <Check size={12} strokeWidth={3} className="text-emerald-600" />
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                      {p.frame_color || p.name}
                    </span>
                    <button onClick={() => removeSelected(p.id)} className="text-slate-300 hover:text-rose-600 transition-colors">
                      <X size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || selected.length === 0}
            className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-[10px] uppercase tracking-[0.2em] font-bold transition-all shadow-md flex items-center justify-center gap-2.5"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} strokeWidth={2.5} />}
            Save Variant Group
          </button>
        </div>
      )}
    </section>
  )
}