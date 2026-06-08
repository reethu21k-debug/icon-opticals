'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarCheck, ChevronDown, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

type BookingStatus = 'confirmed' | 'completed' | 'cancelled' | 'no_show'
const STATUS_OPTIONS: BookingStatus[] = ['confirmed', 'completed', 'cancelled', 'no_show']

// Elevated Status Styles (Structural & Monochrome)
const STATUS_STYLES: Record<BookingStatus, string> = {
  confirmed: 'border-slate-900 text-slate-900 font-semibold',
  completed: 'border-transparent text-slate-400',
  cancelled: 'border-slate-200 text-slate-400 line-through',
  no_show:   'bg-slate-50 border-slate-200 text-slate-600',
}

// Elevated Nomenclature for Appointments
const PURPOSE_LABELS: Record<string, string> = {
  eye_test:    'Comprehensive Assessment',
  frame_trial: 'Bespoke Fitting',
  pickup:      'Collection & Adjustment',
  repair:      'Maintenance & Repair',
}

export default function AdminBookingsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [bookings, setBookings] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const PER_PAGE = 20

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(PER_PAGE),
        ...(dateFilter   && { date: dateFilter }),
        ...(statusFilter && { status: statusFilter }),
      })
      const res = await fetch(`/api/admin/bookings?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error ${res.status}`)
      }
      const json = await res.json()
      setBookings(json.data)
      setTotal(json.count)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load itinerary ledger')
      setBookings([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, dateFilter, statusFilter])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  const updateStatus = async (bookingId: string, status: BookingStatus) => {
    setUpdatingId(bookingId)
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bookingId, status }),
      })
      if (!res.ok) throw new Error('Update failed')
      await fetchBookings()
    } catch {
      alert('An anomaly occurred while updating the status. Please retry.')
    } finally {
      setUpdatingId(null)
    }
  }

  const today    = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* ── Dashboard Header ─────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6 border-b border-slate-200 pb-6">
        <div>
          <h1 
            className="text-3xl text-slate-900 tracking-tight mb-2"
            style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
          >
            Reservation Ledger
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-slate-400">
            {total} Total Records
          </p>
        </div>

        {/* ── Control Panel ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            {[{ label: 'Today', value: today }, { label: 'Tomorrow', value: tomorrow }, { label: 'All', value: '' }].map(({ label, value }) => (
              <button
                key={label}
                onClick={() => { setDateFilter(value); setPage(0) }}
                className={`px-4 py-2 border text-[9px] uppercase tracking-[0.15em] font-medium transition-colors ${
                  dateFilter === value 
                    ? 'border-slate-900 bg-slate-900 text-white' 
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-900 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="w-[1px] h-8 bg-slate-200 hidden sm:block mx-2" />

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="date" 
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); setPage(0) }}
              className="border border-slate-200 bg-white rounded-none px-4 py-2 text-[10px] uppercase tracking-widest text-slate-900 focus:outline-none focus:border-slate-900 appearance-none"
            />
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value as BookingStatus | ''); setPage(0) }}
                className="border border-slate-200 bg-white rounded-none px-4 py-2 pr-10 text-[10px] uppercase tracking-[0.1em] text-slate-900 focus:outline-none focus:border-slate-900 appearance-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
              <ChevronDown size={12} strokeWidth={1.5} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {(dateFilter || statusFilter) && (
              <button
                onClick={() => { setDateFilter(''); setStatusFilter(''); setPage(0) }}
                className="text-[9px] uppercase tracking-[0.15em] font-medium text-slate-400 hover:text-slate-900 transition-colors underline underline-offset-4 ml-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Error Output ─────────────────────────────────────── */}
      {error && (
        <div className="mb-8 p-4 bg-slate-50 border border-slate-900 flex items-start gap-3 animate-in fade-in">
          <AlertCircle size={16} strokeWidth={1.5} className="text-slate-900 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] uppercase tracking-[0.1em] font-semibold text-slate-900">{error}</p>
        </div>
      )}

      {/* ── Ledger Table ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-slate-900 bg-white">
              <tr>
                {['Reference', 'Client', 'Boutique', 'Schedule', 'Purpose', 'Status', 'Manage'].map(h => (
                  <th key={h} className="px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-6 py-5">
                        <div className="h-3 bg-slate-100 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-24 text-center">
                    <CalendarCheck size={32} strokeWidth={1} className="mx-auto mb-6 text-slate-300" />
                    <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-slate-500">
                      No Records Found
                    </p>
                  </td>
                </tr>
              ) : bookings.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors duration-200 group">
                  <td className="px-6 py-5 font-mono text-xs tracking-widest text-slate-900 font-medium whitespace-nowrap">
                    {b.booking_number}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <p className="font-medium text-xs text-slate-900 uppercase tracking-wide">
                      {b.profile?.full_name || 'Anonymous'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-light mt-1">{b.profile?.phone || 'No Contact'}</p>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <p className="font-medium text-xs text-slate-900">{b.store?.name}</p>
                    <p className="text-[11px] text-slate-500 font-light mt-1">{b.store?.city}</p>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <p className="font-medium text-xs text-slate-900">
                      {new Date(b.booking_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium mt-1">{b.time_slot}</p>
                  </td>
                  <td className="px-6 py-5 text-[10px] uppercase tracking-[0.1em] font-medium text-slate-500 whitespace-nowrap">
                    {PURPOSE_LABELS[b.purpose] || b.purpose}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1.5 border text-[9px] uppercase tracking-[0.15em] font-semibold ${STATUS_STYLES[b.status as BookingStatus] || 'border-slate-200 text-slate-500'}`}>
                      {b.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="relative inline-block">
                      <select
                        value={b.status}
                        disabled={updatingId === b.id}
                        onChange={e => updateStatus(b.id, e.target.value as BookingStatus)}
                        className="bg-transparent border-b border-slate-200 text-[10px] uppercase tracking-[0.1em] text-slate-900 font-medium px-2 py-2 pr-6 appearance-none cursor-pointer focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} strokeWidth={1.5} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-slate-900 transition-colors" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────────── */}
        {total > PER_PAGE && (
          <div className="px-8 py-6 border-t border-slate-200 flex items-center justify-between bg-white">
            <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-slate-400">
              Showing {page * PER_PAGE + 1} – {Math.min((page + 1) * PER_PAGE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="p-3 border border-slate-200 text-slate-900 disabled:opacity-30 hover:border-slate-900 transition-colors"
                aria-label="Previous Page"
              >
                <ChevronLeft size={16} strokeWidth={1.25} />
              </button>
              <button
                disabled={(page + 1) * PER_PAGE >= total}
                onClick={() => setPage(p => p + 1)}
                className="p-3 border border-slate-200 text-slate-900 disabled:opacity-30 hover:border-slate-900 transition-colors"
                aria-label="Next Page"
              >
                <ChevronRight size={16} strokeWidth={1.25} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}