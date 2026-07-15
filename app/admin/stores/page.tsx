'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Pencil, Trash2, MapPin, X, Loader2, Phone, Save } from 'lucide-react'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}
type DayKey = typeof DAYS[number]

interface Timings { [key: string]: { open: string; close: string } }

interface StoreForm {
  name: string; address: string; city: string; state: string; pincode: string
  phone: string; email: string; latitude: string; longitude: string; is_active: boolean
  timings: Timings
}

const defaultTimings: Timings = Object.fromEntries(DAYS.map(d => [d, { open: '10:00', close: '21:00' }]))

const emptyForm: StoreForm = {
  name: '', address: '', city: '', state: '', pincode: '',
  phone: '', email: '', latitude: '', longitude: '', is_active: true,
  timings: { ...defaultTimings },
}

export default function AdminStoresPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stores, setStores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState<StoreForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const fetchStores = async () => {
    setLoading(true)
    const { data } = await supabase.from('stores').select('*').order('city').range(0, 49)
    setStores(data || [])
    setLoading(false)
  }
  useEffect(() => { fetchStores() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEdit = (store: any) => {
    setEditing(store)
    setForm({
      name: store.name, address: store.address, city: store.city,
      state: store.state, pincode: store.pincode, phone: store.phone || '',
      email: store.email || '', latitude: store.latitude?.toString() || '',
      longitude: store.longitude?.toString() || '', is_active: store.is_active,
      timings: store.timings || { ...defaultTimings },
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.address || !form.city) { alert('Nomenclature, Address, and City are mandatory fields.'); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(), address: form.address.trim(), city: form.city.trim(),
      state: form.state.trim(), pincode: form.pincode.trim(), phone: form.phone || null,
      email: form.email || null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      is_active: form.is_active, timings: form.timings,
    }
    if (editing) await supabase.from('stores').update(payload).eq('id', editing.id)
    else await supabase.from('stores').insert(payload)
    setSaving(false); setShowForm(false); setEditing(null); setForm(emptyForm)
    fetchStores()
  }

  const updateTiming = (day: string, field: 'open' | 'close', val: string) =>
    setForm(f => ({ ...f, timings: { ...f.timings, [day]: { ...f.timings[day], [field]: val } } }))

  const setStr = (key: keyof StoreForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* ── Dashboard Header ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-6 border-b border-slate-200 pb-6">
        <div>
          <h1 
            className="text-3xl text-slate-900 tracking-tight mb-2"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            Boutique Directory
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-slate-400">
            {stores.length} Global {stores.length === 1 ? 'Location' : 'Locations'}
          </p>
        </div>
        <button 
          onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true) }}
          className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white text-[10px] uppercase tracking-[0.2em] font-medium px-6 py-3.5 transition-colors"
        >
          <Plus size={14} strokeWidth={1.5} /> Register Boutique
        </button>
      </div>

      {/* ── Boutique Grid ────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-100 h-40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stores.map(store => (
            <div key={store.id} className="bg-white border border-slate-200 p-8 hover:border-slate-900 transition-colors duration-300 group flex flex-col justify-between">
              
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300 text-slate-900">
                    <MapPin size={16} strokeWidth={1} />
                  </div>
                  <div className="pt-0.5">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-2">
                      {store.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-light leading-relaxed">
                      {store.address}<br />
                      {store.city}, {store.state} {store.pincode}
                    </p>
                    {store.phone && (
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mt-3 flex items-center gap-2">
                        <Phone size={10} strokeWidth={1.5} /> {store.phone}
                      </p>
                    )}
                  </div>
                </div>
                
                <span className={`text-[9px] uppercase tracking-[0.15em] px-3 py-1.5 border font-semibold ml-4 flex-shrink-0 ${
                  store.is_active ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-400'
                }`}>
                  {store.is_active ? 'Active' : 'Closed'}
                </span>
              </div>

              <div className="flex items-center gap-4 pt-6 border-t border-slate-100 justify-end">
                <button 
                  onClick={() => handleEdit(store)} 
                  className="text-[9px] uppercase tracking-[0.2em] font-medium text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2"
                  aria-label="Edit Boutique"
                >
                  <Pencil size={12} strokeWidth={1.5} /> Edit
                </button>
                <div className="w-[1px] h-3 bg-slate-200" />
                <button 
                  onClick={async () => { if (!confirm('Deactivate this boutique?')) return; await supabase.from('stores').update({ is_active: false }).eq('id', store.id); fetchStores() }}
                  className="text-[9px] uppercase tracking-[0.2em] font-medium text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2"
                  aria-label="Deactivate Boutique"
                >
                  <Trash2 size={12} strokeWidth={1.5} /> Deactivate
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── Configuration Modal ──────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
            
            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 px-8 py-6 flex items-start justify-between z-10">
              <div>
                <p className="text-[9px] uppercase tracking-[0.25em] text-slate-400 mb-2">Location Configuration</p>
                <h2 className="text-2xl text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                  {editing ? 'Modify Boutique' : 'Register Boutique'}
                </h2>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-1 -mr-2 -mt-1">
                <X size={24} strokeWidth={1} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {([
                  { key: 'name' as const, label: 'Boutique Nomenclature', col: 'sm:col-span-2' },
                  { key: 'address' as const, label: 'Street Address', col: 'sm:col-span-2' },
                  { key: 'city' as const, label: 'City', col: 'sm:col-span-1' },
                  { key: 'state' as const, label: 'State / Province', col: 'sm:col-span-1' },
                  { key: 'pincode' as const, label: 'Postal Code', col: 'sm:col-span-1' },
                  { key: 'phone' as const, label: 'Contact Number', col: 'sm:col-span-1' },
                  { key: 'email' as const, label: 'Electronic Mail', col: 'sm:col-span-1' },
                  { key: 'latitude' as const, label: 'Latitude (Coordinates)', col: 'sm:col-span-1' },
                  { key: 'longitude' as const, label: 'Longitude (Coordinates)', col: 'sm:col-span-1' },
                ]).map(f => (
                  <div key={f.key} className={f.col}>
                    <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">{f.label}</label>
                    <input 
                      type="text" 
                      value={form[f.key] as string} 
                      onChange={setStr(f.key)}
                      className="w-full text-[11px] text-slate-900 border border-slate-200 bg-white px-4 py-3.5 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none placeholder-slate-300" 
                    />
                  </div>
                ))}
              </div>

              {/* Operating Hours */}
              <div className="border-t border-slate-100 pt-8">
                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] block mb-6">Operating Hours</label>
                <div className="space-y-4">
                  {DAYS.map((day: DayKey) => (
                    <div key={day} className="flex items-center gap-4 border border-slate-200 p-4">
                      <span className="text-[10px] font-semibold text-slate-900 uppercase tracking-[0.15em] w-24">
                        {DAY_LABELS[day]}
                      </span>
                      <div className="flex-1 flex items-center gap-4">
                        <input 
                          type="time" 
                          value={form.timings[day]?.open || '10:00'}
                          onChange={e => updateTiming(day, 'open', e.target.value)}
                          className="w-full border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-900 focus:outline-none focus:border-slate-900 rounded-none appearance-none uppercase tracking-widest" 
                        />
                        <span className="text-[9px] uppercase tracking-widest text-slate-400">TO</span>
                        <input 
                          type="time" 
                          value={form.timings[day]?.close || '21:00'}
                          onChange={e => updateTiming(day, 'close', e.target.value)}
                          className="w-full border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-900 focus:outline-none focus:border-slate-900 rounded-none appearance-none uppercase tracking-widest" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-6 border-t border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer group w-max">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-slate-300 bg-white group-hover:border-slate-900 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={form.is_active} 
                      onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                      className="absolute opacity-0 cursor-pointer w-full h-full" 
                    />
                    {form.is_active && <div className="w-2 h-2 bg-slate-900" />}
                  </div>
                  <span className="text-[10px] uppercase tracking-widest font-medium text-slate-700">
                    Boutique Currently Operating
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-6">
                <button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[10px] uppercase tracking-[0.2em] font-medium transition-colors flex items-center justify-center gap-3"
                >
                  {saving ? (
                    <><Loader2 size={16} strokeWidth={1.5} className="animate-spin" /> Committing...</>
                  ) : (
                    <><Save size={16} strokeWidth={1.5} /> {editing ? 'Update Location Details' : 'Register Location'}</>
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