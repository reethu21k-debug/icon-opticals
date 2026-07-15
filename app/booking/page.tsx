'use client'

export const dynamic = 'force-dynamic'

import { useState, Suspense, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { Calendar, Clock, MapPin, ChevronRight, Loader2, AlertCircle, Glasses, Search, Package, Wrench, Check } from 'lucide-react'

// Store type
interface Store {
  id: string
  name: string
  address: string
  city: string
  timings?: string
}

type BookingPurpose = 'eye_test' | 'frame_trial' | 'pickup' | 'repair'

const PURPOSES: { value: BookingPurpose; label: string; icon: React.ReactNode }[] = [
  { value: 'eye_test', label: 'Comprehensive Eye Test', icon: <Search size={22} strokeWidth={1.5} /> },
  { value: 'frame_trial', label: 'Bespoke Frame Fitting', icon: <Glasses size={22} strokeWidth={1.5} /> },
  { value: 'pickup', label: 'Order Collection', icon: <Package size={22} strokeWidth={1.5} /> },
  { value: 'repair', label: 'Maintenance & Repair', icon: <Wrench size={22} strokeWidth={1.5} /> },
]

const TIME_SLOTS = [
  '10:00–10:30', '10:30–11:00', '11:00–11:30', '11:30–12:00',
  '12:00–12:30', '12:30–13:00', '14:00–14:30', '14:30–15:00',
  '15:00–15:30', '15:30–16:00', '16:00–16:30', '16:30–17:00',
  '17:00–17:30', '17:30–18:00', '18:00–18:30', '18:30–19:00',
]

function BookingPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedStore = searchParams.get('store')

  const [userId, setUserId] = useState<string | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<string>(preselectedStore || '')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [purpose, setPurpose] = useState<BookingPurpose>('eye_test')
  const [notes, setNotes] = useState('')
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [initializing, setInitializing] = useState(true)

  const today = new Date().toISOString().split('T')[0]
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: User | null } }) => {
      if (!user) { router.push('/auth/login?redirect=/booking'); return }
      setUserId(user.id)
    })
    supabase.from('stores').select('id, name, address, city, timings').eq('is_active', true)
      .range(0, 19).then(({ data }: { data: Store[] | null }) => { 
        if (data) setStores(data)
        setInitializing(false)
      })
  }, [router])

  useEffect(() => {
    if (!selectedStore || !selectedDate) { setBookedSlots([]); return }
    const supabase = createClient()
    supabase.from('bookings').select('time_slot')
      .eq('store_id', selectedStore).eq('booking_date', selectedDate).neq('status', 'cancelled')
      .then(({ data }: { data: Array<{ time_slot: string }> | null }) => { setBookedSlots((data || []).map(b => b.time_slot)) })
  }, [selectedStore, selectedDate])

  const storeObj = stores.find(s => s.id === selectedStore)
  const availableSlots = useMemo(() => TIME_SLOTS.filter(slot => !bookedSlots.includes(slot)), [bookedSlots])

  const handleBook = async () => {
    if (!userId || !selectedStore || !selectedDate || !selectedSlot) return
    setError(null); setBooking(true)
    const supabase = createClient()

    const { data: existing } = await supabase.from('bookings').select('id')
      .eq('store_id', selectedStore).eq('booking_date', selectedDate).eq('time_slot', selectedSlot).neq('status', 'cancelled').single()
    
    if (existing) { 
      setError('This appointment window is no longer available. Please select an alternative time.')
      setBooking(false)
      return 
    }

    const { data: newBooking, error: bookErr } = await supabase.from('bookings')
      .insert({ user_id: userId, store_id: selectedStore, booking_date: selectedDate, time_slot: selectedSlot, purpose, notes: notes || null })
      .select('id, booking_number').single()

    if (bookErr || !newBooking) { 
      setError('An anomaly occurred while securing your reservation. Please retry.')
      setBooking(false)
      return 
    }

    const bookingRecord = newBooking as { id: string; booking_number: string }
    router.push(`/booking/confirmed?id=${bookingRecord.id}`)
  }

  if (initializing) return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50/50 via-white to-rose-50/20 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-200/40 rounded-full blur-[100px] animate-float pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-200/50 rounded-full blur-[100px] animate-float-delayed pointer-events-none" />
      
      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_0_rgba(15,23,42,0.04)] p-10 rounded-3xl flex flex-col items-center z-10">
        <Loader2 size={32} strokeWidth={1.5} className="animate-spin text-slate-900 mb-6" />
        <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">Initializing Concierge</p>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-20px) scale(1.05); } }
        @keyframes float-delayed { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(20px) scale(0.95); } }
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 10s ease-in-out infinite; }
      `}} />
    </main>
  )

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50/50 via-white to-rose-50/20 py-16 md:py-24 relative overflow-hidden font-sans">
      {/* Decorative breathing ambient background */}
      <div className="absolute top-[-10%] left-[-10%] w-[45rem] h-[45rem] bg-rose-200/20 rounded-full blur-[120px] animate-float pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45rem] h-[45rem] bg-slate-200/40 rounded-full blur-[120px] animate-float-delayed pointer-events-none" />

      <div className="max-w-[840px] mx-auto px-4 sm:px-6 relative z-10">
        
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="mb-16 text-center">
          <p className="text-[9px] uppercase tracking-[0.35em] text-slate-400 mb-4 font-bold flex items-center justify-center gap-3">
            <span className="w-8 h-[1px] bg-slate-300"></span>
            Reservations
            <span className="w-8 h-[1px] bg-slate-300"></span>
          </p>
          <h1 
            className="text-4xl md:text-5xl text-slate-900 tracking-tight mb-5"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            Boutique Concierge
          </h1>
          <p className="text-[12px] text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
            Secure a private reservation at your preferred location for a highly personalized eyewear experience.
          </p>
        </div>

        {/* ── Architectural Progress Bar ───────────────────────── */}
        <div className="flex items-center mb-16 relative w-full max-w-[560px] mx-auto">
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/60 shadow-inner rounded-full -z-10 -translate-y-1/2" />
          <div 
            className="absolute top-1/2 left-0 h-[3px] bg-slate-900 rounded-full -z-10 -translate-y-1/2 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(15,23,42,0.3)]" 
            style={{ width: `${((step - 1) / 2) * 100}%` }} 
          />
          
          {['Location', 'Schedule', 'Confirm'].map((label, i) => (
            <div key={label} className="flex flex-col items-center flex-1">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-500 ${
                i + 1 < step 
                  ? 'bg-white border-2 border-slate-900 text-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.08)]' 
                  : i + 1 === step 
                    ? 'bg-slate-900 border-[3px] border-slate-900 text-white shadow-[0_8px_20px_rgba(15,23,42,0.2)] scale-110' 
                    : 'bg-white/40 backdrop-blur-md border-[3px] border-white text-slate-400'
              }`}>
                {i + 1 < step ? <Check size={16} strokeWidth={3} /> : `0${i + 1}`}
              </div>
              <span className={`text-[9px] uppercase tracking-[0.25em] font-bold mt-5 transition-colors duration-500 hidden sm:block ${
                i + 1 <= step ? 'text-slate-900' : 'text-slate-400'
              }`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Step Container ───────────────────────────────────── */}
        <div className="bg-white/60 backdrop-blur-3xl border border-white/80 p-8 sm:p-14 shadow-[0_24px_80px_-15px_rgba(15,23,42,0.08)] sm:rounded-[2.5rem] relative overflow-hidden">
          
          {/* Subtle top glare effect */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

          {/* Step 1: Location & Purpose */}
          {step === 1 && (
            <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
              
              <div>
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100/60">
                    <MapPin size={16} strokeWidth={2} className="text-slate-500" />
                  </div>
                  Select Boutique
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[340px] overflow-y-auto pr-3 custom-scrollbar relative">
                  {stores.map(store => (
                    <button 
                      key={store.id} 
                      onClick={() => setSelectedStore(store.id)}
                      className={`text-left p-6 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                        selectedStore === store.id 
                          ? 'bg-white border-2 border-slate-900 shadow-lg transform -translate-y-1' 
                          : 'bg-white/40 border-2 border-transparent hover:bg-white/80 hover:border-white hover:shadow-md'
                      }`}
                    >
                      {selectedStore === store.id && (
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-slate-100 to-transparent opacity-50 rounded-tr-xl pointer-events-none" />
                      )}
                      <p className={`font-bold text-xs uppercase tracking-[0.12em] mb-2 transition-colors ${selectedStore === store.id ? 'text-slate-900' : 'text-slate-700'}`}>{store.name}</p>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{store.address}, {store.city}</p>
                    </button>
                  ))}
                  {/* Fading edge for scroll indication */}
                  <div className="sticky bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white/60 to-transparent pointer-events-none" />
                </div>
              </div>

              <div>
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100/60">
                    <Search size={16} strokeWidth={2} className="text-slate-500" />
                  </div>
                  Reason for Visit
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {PURPOSES.map(p => (
                    <button 
                      key={p.value} 
                      onClick={() => setPurpose(p.value)}
                      className={`p-5 rounded-2xl text-left transition-all duration-300 flex items-center gap-5 group relative overflow-hidden ${
                        purpose === p.value 
                          ? 'bg-white border-2 border-slate-900 shadow-lg transform -translate-y-1' 
                          : 'bg-white/40 border-2 border-transparent hover:bg-white/80 hover:border-white hover:shadow-md'
                      }`}
                    >
                      {purpose === p.value && (
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-50/50 to-transparent opacity-50 pointer-events-none" />
                      )}
                      <div className={`w-14 h-14 rounded-[1rem] flex items-center justify-center transition-all duration-300 flex-shrink-0 relative z-10 ${
                        purpose === p.value ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-400 group-hover:text-slate-900 group-hover:shadow-sm'
                      }`}>
                        {p.icon}
                      </div>
                      <p className={`font-bold text-[11px] uppercase tracking-[0.12em] relative z-10 transition-colors ${purpose === p.value ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>{p.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-slate-200/50">
                <button 
                  disabled={!selectedStore} 
                  onClick={() => setStep(2)}
                  className="w-full py-5 rounded-xl bg-slate-900 disabled:opacity-40 text-white text-[10px] uppercase tracking-[0.2em] font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-3 group btn-shine relative overflow-hidden"
                >
                  Proceed to Schedule <ChevronRight size={16} strokeWidth={2} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
              
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100/60">
                      <Calendar size={16} strokeWidth={2} className="text-slate-500" />
                    </div>
                    Select Date
                  </h3>
                  <button onClick={() => setStep(1)} className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400 hover:text-slate-900 transition-colors px-4 py-2 rounded-xl hover:bg-white/60">
                    ← Back
                  </button>
                </div>
                
                {/* Custom-styled Date Wrapper */}
                <div className="relative group">
                  <input 
                    type="date" 
                    min={today} 
                    max={maxDate} 
                    value={selectedDate}
                    onChange={e => { setSelectedDate(e.target.value); setSelectedSlot('') }}
                    className="w-full text-[13px] font-bold text-slate-900 uppercase tracking-[0.15em] bg-white/60 backdrop-blur-md border border-white rounded-2xl shadow-sm px-6 py-5 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all cursor-pointer appearance-none pl-14" 
                  />
                  <Calendar size={18} strokeWidth={2} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-900 transition-colors pointer-events-none" />
                </div>
              </div>

              {selectedDate && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                  <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100/60">
                      <Clock size={16} strokeWidth={2} className="text-slate-500" />
                    </div>
                    Appointment Window
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {TIME_SLOTS.map((slot, i) => {
                      const booked = bookedSlots.includes(slot)
                      return (
                        <button 
                          key={slot} 
                          disabled={booked} 
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-4 px-2 rounded-xl text-[11px] uppercase tracking-widest font-bold transition-all duration-300 shadow-sm border-2 animate-in fade-in zoom-in-95 ${
                            booked 
                              ? 'border-transparent bg-slate-50/40 text-slate-300 cursor-not-allowed line-through shadow-none'
                              : selectedSlot === slot 
                                ? 'border-slate-900 bg-slate-900 text-white transform -translate-y-1 shadow-[0_8px_20px_rgba(15,23,42,0.15)]'
                                : 'border-transparent bg-white/60 text-slate-600 hover:bg-white hover:border-slate-300 hover:-translate-y-0.5'
                          }`}
                          style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
                        >
                          {slot}
                        </button>
                      )
                    })}
                  </div>
                  {availableSlots.length === 0 && (
                    <div className="mt-6 p-5 bg-rose-50/80 backdrop-blur-md border border-rose-200/60 rounded-2xl flex items-center gap-4 shadow-sm animate-in fade-in">
                      <div className="p-2 bg-rose-100/80 rounded-full">
                        <AlertCircle size={16} strokeWidth={2.5} className="text-rose-600" />
                      </div>
                      <p className="text-[11px] uppercase tracking-widest text-rose-900 font-bold">
                        No availability for this date.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-900 block mb-4 flex items-center justify-between">
                  Client Notes 
                  <span className="font-semibold text-slate-400 tracking-widest normal-case text-[9px] bg-white px-2 py-1 rounded-md">Optional</span>
                </label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Please specify any special requests or requirements..." 
                  rows={3}
                  className="w-full text-[12px] font-medium text-slate-900 bg-white/60 backdrop-blur-md border border-white rounded-2xl shadow-sm px-6 py-5 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all resize-none leading-relaxed placeholder:text-slate-400" 
                />
              </div>

              <div className="pt-8 border-t border-slate-200/50 flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => setStep(1)} 
                  className="flex-1 py-5 rounded-xl bg-white/60 backdrop-blur-md border border-white shadow-sm text-slate-600 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-white hover:text-slate-900 hover:shadow-md transition-all"
                >
                  Back
                </button>
                <button 
                  disabled={!selectedDate || !selectedSlot} 
                  onClick={() => setStep(3)}
                  className="flex-[2] py-5 rounded-xl bg-slate-900 disabled:opacity-40 text-white text-[10px] uppercase tracking-[0.2em] font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-3 group btn-shine relative overflow-hidden"
                >
                  Review Itinerary <ChevronRight size={16} strokeWidth={2} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

            </div>
          )}

          {/* Step 3: Review & Confirm - TICKET STYLE */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] uppercase tracking-[0.25em] font-bold text-slate-900 flex items-center gap-3">
                  <div className="w-8 h-[2px] bg-slate-900 rounded-full" /> Review Itinerary
                </h3>
                <button onClick={() => setStep(2)} className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400 hover:text-slate-900 transition-colors px-4 py-2 rounded-xl hover:bg-white/60">
                  ← Edit
                </button>
              </div>
              
              {/* Ticket Layout */}
              <div className="relative bg-white/80 backdrop-blur-2xl border border-white p-8 md:p-10 rounded-3xl shadow-[0_10px_40px_rgba(15,23,42,0.06)] overflow-hidden">
                
                {/* Skeuomorphic perforations */}
                <div className="absolute left-[-16px] top-[50%] w-8 h-8 bg-slate-100 rounded-full shadow-inner border border-slate-200/50" />
                <div className="absolute right-[-16px] top-[50%] w-8 h-8 bg-slate-100 rounded-full shadow-inner border border-slate-200/50" />
                
                {/* Dashed separator */}
                <div className="absolute left-8 right-8 top-[50%] border-t-[3px] border-dashed border-slate-200/60" />

                {/* Top Section */}
                <div className="pb-10">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-2">Location</p>
                      <p className="text-base font-bold text-slate-900 uppercase tracking-widest">{storeObj?.name}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      {PURPOSES.find(p => p.value === purpose)?.icon}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-2">Address</p>
                    <p className="text-xs font-semibold text-slate-700 max-w-[80%] leading-relaxed">{storeObj ? `${storeObj.address}, ${storeObj.city}` : ''}</p>
                  </div>
                </div>

                {/* Bottom Section */}
                <div className="pt-10 grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-2">Date</p>
                    <p className="text-[12px] font-bold text-slate-900 uppercase tracking-widest leading-snug">
                      {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-2">Time</p>
                    <p className="text-[12px] font-bold text-slate-900 uppercase tracking-widest">{selectedSlot}</p>
                  </div>
                  
                  <div className="col-span-2">
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-2">Appointment Type</p>
                    <p className="text-[12px] font-bold text-slate-900 uppercase tracking-widest">{PURPOSES.find(p => p.value === purpose)?.label}</p>
                  </div>

                  {notes && (
                    <div className="col-span-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-2">Special Request</p>
                      <p className="text-[11px] font-medium text-slate-700 italic leading-relaxed">{notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-rose-50/80 backdrop-blur-md border border-rose-200/60 rounded-2xl p-5 flex items-start gap-4 shadow-sm animate-in fade-in">
                  <div className="p-2 bg-rose-100/80 rounded-full mt-0.5">
                    <AlertCircle size={16} strokeWidth={2.5} className="text-rose-600 flex-shrink-0" />
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.1em] font-bold text-rose-900 leading-relaxed mt-1">{error}</p>
                </div>
              )}

              <div className="pt-8">
                <button 
                  onClick={handleBook} 
                  disabled={booking}
                  className="w-full py-5 rounded-xl bg-slate-900 text-white text-[11px] uppercase tracking-[0.25em] font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-3 disabled:opacity-60 btn-shine relative overflow-hidden"
                >
                  {booking ? (
                    <><Loader2 size={18} strokeWidth={2} className="animate-spin" /> Authorizing...</>
                  ) : (
                    <>Confirm Reservation <ChevronRight size={16} strokeWidth={2} /></>
                  )}
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(148, 163, 184, 0.3);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(148, 163, 184, 0.5);
        }
        
        /* Shine effect for primary buttons */
        .btn-shine::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent);
          transform: skewX(-20deg);
          transition: all 0.6s ease;
        }
        .btn-shine:hover::after {
          left: 150%;
        }

        @keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-20px) scale(1.05); } }
        @keyframes float-delayed { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(20px) scale(0.95); } }
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 10s ease-in-out infinite; }
      `}} />
    </main>
  )
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-slate-50/50 via-white to-rose-50/20 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-rose-200/30 rounded-full blur-[120px] animate-float pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[40rem] h-[40rem] bg-slate-200/40 rounded-full blur-[120px] animate-float-delayed pointer-events-none" />
        <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-sm p-10 rounded-3xl flex flex-col items-center z-10">
          <Loader2 size={32} strokeWidth={1.5} className="animate-spin text-slate-900" />
        </div>
      </main>
    }>
      <BookingPageInner />
    </Suspense>
  )
}