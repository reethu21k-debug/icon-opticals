'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Send, Users, Clock, Check, AlertCircle, Loader2, Plus, X, FileText } from 'lucide-react'

export default function AdminMarketingPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [optedInCount, setOptedInCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState<string | null>(null)
  const [draft, setDraft] = useState({ subject: '', content: '' })
  const supabase = createClient()

  const fetchData = async () => {
    setLoading(true)
    const [{ data: cData }, { count }] = await Promise.all([
      supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false }).range(0, 19),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('email_opt_in', true),
    ])
    setCampaigns(cData || [])
    setOptedInCount(count || 0)
    setLoading(false)
  }
  useEffect(() => { fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    if (!draft.subject.trim() || !draft.content.trim()) { setSendError('Subject and content are mandatory.'); return }
    setSendError(null); setSendSuccess(null); setSending(true)

    const { data: campaign, error: createErr } = await supabase.from('marketing_campaigns')
      .insert({ subject: draft.subject, content: draft.content, status: 'draft' }).select('id').single()
    if (createErr || !campaign) { setSendError('Failed to initialize dispatch log.'); setSending(false); return }

    const { data: recipients } = await supabase.from('profiles').select('id').eq('email_opt_in', true).range(0, 999)
    if (!recipients?.length) { setSendError('No opted-in clientele located.'); setSending(false); return }

    const res = await fetch('/api/send-marketing-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: (campaign as { id: string }).id, subject: draft.subject, content: draft.content, recipient_ids: (recipients as { id: string }[]).map(r => r.id) }),
    })
    const result = await res.json()
    setSending(false)
    if (!res.ok) { setSendError(result.error || 'Dispatch sequence failed.'); return }
    setSendSuccess(`Dispatch completed. Reached ${result.sent} clients (${result.failed} failed).`)
    setDraft({ subject: '', content: '' }); setShowCompose(false); fetchData()
  }

  const getStatusIcon = (status: string) => {
    if (status === 'sent') return <Check size={14} strokeWidth={2} className="text-slate-900" />
    if (status === 'sending') return <Loader2 size={14} strokeWidth={1.5} className="text-slate-400 animate-spin" />
    if (status === 'failed') return <AlertCircle size={14} strokeWidth={1.5} className="text-slate-500" />
    return <Clock size={14} strokeWidth={1.5} className="text-slate-400" />
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
            Editorial Dispatches
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-slate-400">
            Authorized Personnel Only · Opt-In Clientele
          </p>
        </div>
        <button 
          onClick={() => setShowCompose(true)} 
          className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white text-[10px] uppercase tracking-[0.2em] font-medium px-6 py-3.5 transition-colors"
        >
          <Plus size={14} strokeWidth={1.5} /> Draft Dispatch
        </button>
      </div>

      {/* ── Top Analytics Grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Opt-In Clientele', value: optedInCount, icon: <Users size={18} strokeWidth={1.25} /> },
          { label: 'Dispatches Sent', value: campaigns.filter(c => c.status === 'sent').length, icon: <Send size={18} strokeWidth={1.25} /> },
          { label: 'Total Transmissions', value: campaigns.reduce((s: number, c: Record<string, number>) => s + (c.sent_count || 0), 0), icon: <FileText size={18} strokeWidth={1.25} /> },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-slate-200 p-6 flex flex-col justify-between group hover:border-slate-900 transition-colors duration-300">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[9px] uppercase tracking-[0.15em] font-medium text-slate-400">
                {stat.label}
              </span>
              <div className="text-slate-400 group-hover:text-slate-900 transition-colors duration-300">
                {stat.icon}
              </div>
            </div>
            <p className="text-3xl font-light text-slate-900 tracking-tight font-mono">
              {stat.value.toLocaleString('en-IN')}
            </p>
          </div>
        ))}
      </div>

      {/* ── Protocol Notice ──────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-900 p-6 mb-8 flex items-start gap-4">
        <AlertCircle size={18} strokeWidth={1.5} className="text-slate-900 flex-shrink-0 mt-0.5" />
        <div className="text-slate-900">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold mb-2">Communication Protocol</p>
          <ul className="list-disc list-inside text-[11px] font-light text-slate-600 space-y-1">
            <li>Transmissions strictly limited to verified, opted-in clientele.</li>
            <li>Maintain exclusivity: Maximum frequency of 1–2 dispatches per week.</li>
            <li>System dispatches in batched sequences of 50 to ensure optimal delivery.</li>
            <li>Unsubscribe access is automatically appended to all outgoing dispatches.</li>
          </ul>
        </div>
      </div>

      {/* ── Success Indicator ────────────────────────────────── */}
      {sendSuccess && (
        <div className="bg-white border border-slate-200 p-4 mb-8 flex items-start gap-3 animate-in fade-in">
          <Check size={16} strokeWidth={1.5} className="text-slate-900 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] uppercase tracking-[0.1em] font-medium text-slate-900 leading-relaxed">{sendSuccess}</p>
        </div>
      )}

      {/* ── Dispatch Ledger ──────────────────────────────────── */}
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-[11px] uppercase tracking-[0.15em] font-bold text-slate-900">
            Dispatch Ledger
          </h2>
        </div>
        
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 size={24} strokeWidth={1} className="animate-spin mx-auto text-slate-400" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-16 text-center">
            <Send size={32} strokeWidth={1} className="mx-auto mb-4 text-slate-300" />
            <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-slate-500">
              No Dispatches Recorded
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {campaigns.map(c => (
              <div key={c.id} className="px-8 py-5 flex items-start justify-between gap-6 hover:bg-slate-50/50 transition-colors duration-200">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(c.status)}
                    <span className="font-medium text-xs text-slate-900 uppercase tracking-wide truncate">
                      {c.subject}
                    </span>
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 pl-6">
                    {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 flex flex-col items-end justify-center">
                  <span className={`inline-flex items-center px-3 py-1.5 border text-[9px] uppercase tracking-[0.15em] font-semibold ${
                    c.status === 'sent' ? 'border-slate-900 text-slate-900' : 
                    c.status === 'failed' ? 'border-slate-200 text-slate-400 line-through' : 
                    'border-slate-200 text-slate-500'
                  }`}>
                    {c.status.toUpperCase()}
                  </span>
                  {c.status === 'sent' && (
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 mt-2">
                      {c.sent_count} DELIVERED {c.failed_count > 0 ? `· ${c.failed_count} FAILED` : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Draft Composer Modal ─────────────────────────────── */}
      {showCompose && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
            
            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 px-8 py-6 flex items-start justify-between z-10">
              <div>
                <p className="text-[9px] uppercase tracking-[0.25em] text-slate-400 mb-2">Composer</p>
                <h2 className="text-2xl text-slate-900 tracking-tight" style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}>
                  Draft Editorial Dispatch
                </h2>
              </div>
              <button onClick={() => setShowCompose(false)} className="text-slate-400 hover:text-slate-900 transition-colors p-1 -mr-2 -mt-1">
                <X size={24} strokeWidth={1} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              
              {/* Audience Notice */}
              <div className="border border-slate-200 bg-slate-50 p-6 flex items-center gap-4">
                <Users size={18} strokeWidth={1.5} className="text-slate-900 flex-shrink-0" />
                <p className="text-[11px] text-slate-600 font-light">
                  This transmission will be securely routed to <span className="font-semibold text-slate-900">{optedInCount} opted-in clients</span>.
                </p>
              </div>

              {/* Form Fields */}
              <div>
                <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Subject Line</label>
                <input 
                  type="text" 
                  value={draft.subject} 
                  onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))} 
                  maxLength={100}
                  placeholder="E.G., EXCLUSIVE INVITATION: THE SUMMER COLLECTION"
                  className="w-full text-[11px] text-slate-900 border border-slate-200 bg-white px-4 py-3.5 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none placeholder-slate-300" 
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest block">HTML Body Content</label>
                  <span className="text-[8px] uppercase tracking-widest text-slate-400">Inline HTML Allowed</span>
                </div>
                <textarea 
                  value={draft.content} 
                  onChange={e => setDraft(d => ({ ...d, content: e.target.value }))} 
                  rows={12}
                  placeholder="<h1>An Exclusive Preview</h1>..."
                  className="w-full text-[11px] font-mono text-slate-900 border border-slate-200 bg-white px-4 py-3.5 focus:outline-none focus:border-slate-900 hover:border-slate-400 transition-colors rounded-none appearance-none placeholder-slate-300 resize-y leading-relaxed" 
                />
                <p className="text-[9px] uppercase tracking-widest text-slate-400 mt-3">
                  Mandatory unsubscribe protocols will be automatically attached to the footer of this dispatch.
                </p>
              </div>

              {/* Error Output */}
              {sendError && (
                <div className="bg-slate-50 border border-slate-900 p-4 flex items-start gap-3 animate-in fade-in">
                  <AlertCircle size={16} strokeWidth={1.5} className="text-slate-900 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] uppercase tracking-[0.1em] font-semibold text-slate-900 leading-relaxed">{sendError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setShowCompose(false)} 
                  className="flex-1 py-4 border border-slate-200 text-slate-900 text-[10px] uppercase tracking-[0.2em] font-medium hover:border-slate-900 transition-colors"
                >
                  Discard Draft
                </button>
                <button 
                  onClick={handleSend} 
                  disabled={sending || !draft.subject.trim() || !draft.content.trim()}
                  className="flex-[2] py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[10px] uppercase tracking-[0.2em] font-medium transition-colors flex items-center justify-center gap-3"
                >
                  {sending ? (
                    <><Loader2 size={16} strokeWidth={1.5} className="animate-spin" /> Transmitting...</>
                  ) : (
                    <><Send size={16} strokeWidth={1.5} /> Dispatch to {optedInCount} Clients</>
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