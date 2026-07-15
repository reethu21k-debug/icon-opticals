'use client'

export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { CalendarCheck, MapPin, Clock, Loader2, Check, Info, FileText, ChevronRight, Home } from 'lucide-react'

// Booking type
interface Booking {
  id: string
  booking_number: string
  booking_date: string
  time_slot: string
  purpose: string
  notes?: string
  store?: { name: string; address: string; city: string; phone?: string }
  [key: string]: unknown
}

// Elevated Nomenclature for Appointments
const PURPOSE_LABELS: Record<string, string> = {
  eye_test: 'Comprehensive Eye Assessment', 
  frame_trial: 'Bespoke Frame Fitting', 
  pickup: 'Collection & Adjustment', 
  repair: 'Maintenance & Repair',
}

function BookingConfirmedPageInner() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    createClient()
      .from('bookings')
      .select('*, store:stores(name, address, city, phone)')
      .eq('id', id).single()
      .then(({ data }: { data: Booking | null }) => { setBooking(data); setLoading(false) })
  }, [id])

  if (loading) return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50/50 via-white to-rose-50/20 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-200/40 rounded-full blur-[100px] animate-float pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-200/50 rounded-full blur-[100px] animate-float-delayed pointer-events-none" />
      
      <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_0_rgba(15,23,42,0.04)] p-10 rounded-3xl flex flex-col items-center z-10">
        <Loader2 size={32} strokeWidth={1.5} className="animate-spin text-slate-900 mb-6" />
        <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">Retrieving Itinerary</p>
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
      {/* Decorative ambient background */}
      <div className="absolute top-[-10%] left-[-10%] w-[45rem] h-[45rem] bg-rose-200/20 rounded-full blur-[120px] animate-float pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45rem] h-[45rem] bg-slate-200/40 rounded-full blur-[120px] animate-float-delayed pointer-events-none" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* ── Success Header ─────────────────────────────────────── */}
        <div className="text-center mb-14 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="w-20 h-20 bg-emerald-50/80 backdrop-blur-md border border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_8px_32px_rgba(16,185,129,0.15)] relative">
            <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping opacity-75" />
            <Check size={32} strokeWidth={2.5} className="text-emerald-600 relative z-10" />
          </div>
          <p className="text-[9px] uppercase tracking-[0.35em] text-slate-400 mb-3 font-bold flex items-center justify-center gap-3">
            <span className="w-8 h-[1px] bg-slate-300"></span>
            Status: Confirmed
            <span className="w-8 h-[1px] bg-slate-300"></span>
          </p>
          <h1 
            className="text-4xl md:text-5xl text-slate-900 tracking-tight mb-5"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            Reservation Secured
          </h1>
          <p className="text-[12px] text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
            Your boutique appointment is confirmed. A formal itinerary has been dispatched to your email for your records.
          </p>
        </div>

        {booking ? (
          <div className="relative animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            
            {/* ── Ticket Structure ───────────────────────────────────── */}
            <div className="shadow-[0_24px_80px_-15px_rgba(15,23,42,0.1)] rounded-[2.5rem] relative overflow-hidden flex flex-col">
              
              {/* Ticket Top Stub (Dark Mode) */}
              <div className="bg-slate-900 px-8 py-10 md:px-12 md:py-12 text-white relative overflow-hidden z-10">
                {/* Subtle glare overlay */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent opacity-50 pointer-events-none" />
                <div className="relative z-10">
                  <p className="text-[9px] uppercase tracking-[0.25em] text-slate-400 mb-3 font-semibold flex items-center gap-2">
                    Reservation Reference
                  </p>
                  <p className="text-3xl md:text-4xl font-light tracking-[0.15em] font-mono text-white/90 drop-shadow-md">
                    {booking.booking_number}
                  </p>
                </div>
              </div>

              {/* Skeuomorphic perforations at the junction */}
              <div className="absolute left-[-16px] top-[140px] md:top-[156px] w-8 h-8 bg-[#f5f6f8] rounded-full shadow-inner z-20" />
              <div className="absolute right-[-16px] top-[140px] md:top-[156px] w-8 h-8 bg-[#f5f6f8] rounded-full shadow-inner z-20" />
              
              {/* Dashed separator */}
              <div className="h-[2px] w-full bg-slate-900 relative z-20">
                <div className="absolute inset-0 border-t-[3px] border-dashed border-white/40" />
              </div>

              {/* Ticket Body (Glassmorphic) */}
              <div className="bg-white/80 backdrop-blur-2xl p-8 md:p-12 space-y-10 relative z-10">
                
                {/* Location */}
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center flex-shrink-0">
                    <MapPin size={22} strokeWidth={1.5} className="text-slate-700" />
                  </div>
                  <div className="pt-1">
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-1.5">Boutique Location</p>
                    <p className="font-bold text-sm uppercase tracking-[0.12em] text-slate-900 mb-1.5">
                      {booking.store?.name}
                    </p>
                    <p className="text-[12px] text-slate-600 font-medium leading-relaxed max-w-[90%]">
                      {booking.store?.address}, {booking.store?.city}
                    </p>
                    {booking.store?.phone && (
                      <a href={`tel:${booking.store.phone}`} className="text-[10px] uppercase tracking-[0.15em] text-slate-900 hover:text-slate-500 transition-colors mt-3 inline-block font-bold bg-slate-100/50 px-3 py-1.5 rounded-lg border border-slate-200/50">
                        📞 {booking.store.phone}
                      </a>
                    )}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center flex-shrink-0">
                    <Clock size={22} strokeWidth={1.5} className="text-slate-700" />
                  </div>
                  <div className="pt-1">
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-1.5">Scheduled Time</p>
                    <p className="font-bold text-sm uppercase tracking-[0.12em] text-slate-900 mb-1.5">
                      {new Date(booking.booking_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-[12px] text-slate-600 uppercase tracking-widest font-bold bg-slate-100/50 px-3 py-1.5 rounded-lg border border-slate-200/50 inline-block mt-1">
                      {booking.time_slot}
                    </p>
                  </div>
                </div>

                {/* Purpose */}
                <div className="border-t border-slate-200/60 pt-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">
                    Purpose of Visit
                  </span>
                  <span className="text-xs uppercase tracking-[0.15em] font-bold text-slate-900 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 text-center">
                    {PURPOSE_LABELS[booking.purpose] || booking.purpose}
                  </span>
                </div>

                {/* Client Notes */}
                {booking.notes && (
                  <div className="bg-white/50 border border-slate-200/60 rounded-2xl p-6 flex items-start gap-5 shadow-sm">
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 flex-shrink-0">
                      <FileText size={18} strokeWidth={1.5} className="text-slate-500" />
                    </div>
                    <div className="pt-1">
                      <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-900 mb-2.5">
                        Client Requests
                      </p>
                      <p className="text-[12px] text-slate-600 font-medium leading-relaxed italic">
                        &quot;{booking.notes}&quot;
                      </p>
                    </div>
                  </div>
                )}

                {/* Reception Notice */}
                <div className="bg-slate-900 rounded-2xl p-6 flex items-start gap-5 shadow-md relative overflow-hidden">
                  {/* Subtle accent glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-700 rounded-full blur-3xl opacity-30 pointer-events-none" />
                  <div className="p-2 bg-slate-800 rounded-xl border border-slate-700 flex-shrink-0 relative z-10">
                    <Info size={18} strokeWidth={1.5} className="text-slate-300" />
                  </div>
                  <div className="pt-1 relative z-10">
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-300 mb-2">
                      Reception Protocol
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                      To ensure a seamless reception and dedicated consultation, we kindly request your arrival <span className="text-white font-semibold">5 minutes prior</span> to your scheduled appointment.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/60 backdrop-blur-2xl border border-white/50 shadow-xl rounded-[2.5rem] p-16 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            <div className="w-20 h-20 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6">
              <CalendarCheck size={28} strokeWidth={1.5} className="text-slate-400" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-600 font-bold">Itinerary Not Found</p>
          </div>
        )}

        {/* ── Footer Actions ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-5 mt-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 relative z-10">
          <Link 
            href="/booking" 
            className="flex-1 py-5 text-center bg-white/60 backdrop-blur-md border border-white shadow-sm text-slate-600 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-white hover:text-slate-900 hover:shadow-md transition-all rounded-xl flex items-center justify-center gap-3"
          >
            <CalendarCheck size={16} strokeWidth={2} /> Schedule Another
          </Link>
          <Link 
            href="/" 
            className="flex-[1.5] py-5 text-center bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em] font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 rounded-xl flex items-center justify-center gap-3 btn-shine relative overflow-hidden"
          >
            <Home size={16} strokeWidth={2} /> Return to Boutique <ChevronRight size={16} strokeWidth={2} />
          </Link>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-20px) scale(1.05); } }
        @keyframes float-delayed { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(20px) scale(0.95); } }
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 10s ease-in-out infinite; }
        
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
      `}} />
    </main>
  )
}

export default function BookingConfirmedPage() {
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
      <BookingConfirmedPageInner />
    </Suspense>
  )
}