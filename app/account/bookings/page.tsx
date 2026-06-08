'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { CalendarCheck, ChevronRight, MapPin, Clock, RefreshCw, Loader2 } from 'lucide-react'

type BookingStatus = 'confirmed' | 'completed' | 'cancelled' | 'no_show'

// Elevated Status Styles (Structural & Monochrome)
const STATUS_STYLES: Record<string, string> = {
  confirmed: 'border-slate-900 text-slate-900 font-semibold',
  completed: 'border-transparent text-slate-400',
  cancelled: 'border-slate-200 text-slate-400 line-through',
  no_show:   'bg-slate-50 border-slate-200 text-slate-600',
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show:   'No Show',
}

// Elevated Nomenclature for Appointments
const PURPOSE_LABELS: Record<string, string> = {
  eye_test:    'Comprehensive Assessment',
  frame_trial: 'Bespoke Fitting',
  pickup:      'Order Collection',
  repair:      'Maintenance & Repair',
}

export default function MyBookingsPage() {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchBookings = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login?redirect=/account/bookings'); return }

    const { data } = await supabase
      .from('bookings')
      .select('id, booking_number, booking_date, time_slot, purpose, status, notes, store:stores(name, city)')
      .eq('user_id', user.id)
      .order('booking_date', { ascending: false })
      .order('time_slot')
      .range(0, 49)

    setBookings(data || [])
    setLoading(false)
    if (showRefreshing) setRefreshing(false)
  }

  useEffect(() => {
    fetchBookings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Loader2 size={24} strokeWidth={1} className="animate-spin text-slate-900 mb-4" />
      <p className="text-[9px] uppercase tracking-[0.2em] font-medium text-slate-500">Retrieving Itineraries</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-slate-50 py-16 md:py-24">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6">
        
        {/* ── Breadcrumb & Header ──────────────────────────────── */}
        <div className="mb-12 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/account" className="text-[9px] uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Client Portal</Link>
            <ChevronRight size={12} strokeWidth={1.5} className="text-slate-300" />
            <span className="text-[9px] uppercase tracking-widest font-semibold text-slate-900">Appointments</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <h1 
                className="text-4xl text-slate-900 tracking-tight mb-2"
                style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
              >
                My Appointments
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-medium">
                {bookings.length} {bookings.length === 1 ? 'Record' : 'Records'}
              </p>
            </div>
            
            <button
              onClick={() => fetchBookings(true)}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-[9px] uppercase tracking-[0.15em] font-medium text-slate-900 hover:border-slate-900 transition-colors disabled:opacity-40"
            >
              <RefreshCw size={12} strokeWidth={2} className={refreshing ? 'animate-spin' : ''} />
              Synchronize
            </button>
          </div>
        </div>

        {bookings.length === 0 ? (
          /* ── Empty State ─────────────────────────────────────── */
          <div className="bg-white border border-slate-200 shadow-2xl p-16 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <CalendarCheck size={48} strokeWidth={1} className="mx-auto text-slate-300 mb-6" />
            <h2 
              className="text-2xl text-slate-900 tracking-tight mb-4"
              style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
            >
              No Appointments Scheduled
            </h2>
            <p className="text-xs text-slate-500 font-light mb-10 leading-relaxed max-w-sm mx-auto">
              You currently have no upcoming itineraries. Secure a private consultation or bespoke fitting at your preferred boutique.
            </p>
            <Link 
              href="/booking" 
              className="inline-flex items-center justify-center gap-3 py-4 px-10 bg-slate-900 hover:bg-slate-800 text-white text-[10px] uppercase tracking-[0.2em] font-medium transition-colors"
            >
              <CalendarCheck size={14} strokeWidth={1.5} /> Schedule Appointment
            </Link>
          </div>
        ) : (
          /* ── Bookings Ledger ─────────────────────────────────── */
          <div className="space-y-6">
            {bookings.map(booking => {
              const status = booking.status as BookingStatus
              const isPast = new Date(booking.booking_date + 'T23:59:59') < new Date()
              
              return (
                <div 
                  key={booking.id} 
                  className="bg-white border border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-500 p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700"
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-6 flex-wrap">
                    
                    <div className="flex-1 min-w-0 w-full">
                      {/* Booking Number & Status */}
                      <div className="flex items-center gap-4 mb-4 flex-wrap">
                        <p className="font-mono text-sm tracking-widest text-slate-900 font-medium">
                          {booking.booking_number}
                        </p>
                        <span className={`text-[9px] uppercase tracking-[0.15em] px-3 py-1 border ${STATUS_STYLES[status] || 'border-slate-200 text-slate-500'}`}>
                          {STATUS_LABELS[status] || status}
                        </span>
                        {isPast && status === 'confirmed' && (
                          <span className="text-[9px] uppercase tracking-[0.15em] px-3 py-1 border border-slate-900 bg-slate-50 text-slate-900 font-medium">
                            Awaiting Update
                          </span>
                        )}
                      </div>

                      {/* Purpose */}
                      <p className="text-sm font-semibold text-slate-900 uppercase tracking-widest mb-4">
                        {PURPOSE_LABELS[booking.purpose] || booking.purpose}
                      </p>

                      {/* Store & Time */}
                      <div className="flex flex-col sm:flex-row gap-y-2 gap-x-6 text-[11px] text-slate-500 font-light">
                        <span className="flex items-center gap-2">
                          <MapPin size={14} strokeWidth={1.5} className="text-slate-400" />
                          {booking.store?.name}{booking.store?.city ? `, ${booking.store.city}` : ''}
                        </span>
                        <span className="flex items-center gap-2">
                          <Clock size={14} strokeWidth={1.5} className="text-slate-400" />
                          <span className="uppercase tracking-widest">
                            {new Date(booking.booking_date + 'T00:00:00').toLocaleDateString('en-IN', {
                              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                            })}
                            {' · '}
                            {booking.time_slot}
                          </span>
                        </span>
                      </div>

                      {/* Notes */}
                      {booking.notes && (
                        <div className="mt-6 pt-4 border-t border-slate-100">
                          <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-1">
                            Client Requests
                          </p>
                          <p className="text-[11px] text-slate-600 font-light italic leading-relaxed">
                            &quot;{booking.notes}&quot;
                          </p>
                        </div>
                      )}
                    </div>

                    {/* CTA for Confirmed Upcoming Bookings */}
                    {status === 'confirmed' && !isPast && (
                      <div className="sm:text-right w-full sm:w-auto pt-4 sm:pt-0">
                        <Link
                          href="/booking"
                          className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] font-medium text-slate-900 hover:text-slate-500 transition-colors group"
                        >
                          Schedule Another <ChevronRight size={12} strokeWidth={1.5} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Cancelled / No-Show Message */}
                  {(status === 'cancelled' || status === 'no_show') && (
                    <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <p className="text-[11px] text-slate-500 font-light leading-relaxed">
                        {status === 'cancelled'
                          ? 'This itinerary was cancelled. You may secure a new appointment at your convenience.'
                          : 'We missed you. You may schedule a new appointment below.'}
                      </p>
                      <Link
                        href="/booking"
                        className="flex-shrink-0 text-center text-[9px] uppercase tracking-[0.2em] border border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-medium px-6 py-2.5 transition-colors"
                      >
                        Rebook Session
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}