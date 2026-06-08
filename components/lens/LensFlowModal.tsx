'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight, Eye, Shield, Zap, Glasses, Upload, Clock, AlertCircle, ChevronDown, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { LensFlowState, LensPowerType, Product } from '@/types'

interface LensPackage { id: string; name: string; code: string; description: string | null; price_addon: number; features: string[]; is_active: boolean }

interface LensFlowModalProps {
  product: Product
  userId: string
  onClose: () => void
  onComplete: (config: LensFlowState) => void
}

const POWER_TYPES: { value: LensPowerType; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'with_power', label: 'With Power', desc: 'Single vision correction', icon: <Eye size={24} strokeWidth={1.5} /> },
  { value: 'zero_power', label: 'Zero Power', desc: 'No prescription needed', icon: <Glasses size={24} strokeWidth={1.5} /> },
  { value: 'progressive', label: 'Progressive', desc: 'Near and far vision', icon: <Zap size={24} strokeWidth={1.5} /> },
  { value: 'frame_only', label: 'Frame Only', desc: 'Without any lenses', icon: <Shield size={24} strokeWidth={1.5} /> },
]

const SPH_VALUES = Array.from({ length: 33 }, (_, i) => (-8 + i * 0.25).toFixed(2))
const CYL_VALUES = Array.from({ length: 17 }, (_, i) => (-4 + i * 0.25).toFixed(2))
const AXIS_VALUES = Array.from({ length: 180 }, (_, i) => i + 1)

export default function LensFlowModal({ product, onClose, onComplete }: LensFlowModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [lensPackages, setLensPackages] = useState<LensPackage[]>([])
  const [loadingPackages, setLoadingPackages] = useState(true)
  const [state, setState] = useState<LensFlowState>({
    step: 1, power_type: null, package_code: null,
    prescription: null, upload_later: false, prescription_url: null,
  })

  const FALLBACK_PACKAGES: LensPackage[] = [
    { id: 'f1', name: 'Standard Clear', code: 'basic', description: 'Essential clear lenses for daily use', price_addon: 0, features: ['CR39', 'UV Protection'], is_active: true },
    { id: 'f2', name: 'Anti-Glare', code: 'anti_glare', description: 'Reduces reflections and eye strain', price_addon: 500, features: ['Anti-Reflective', 'Scratch Resistant', 'UV400'], is_active: true },
    { id: 'f3', name: 'Blue Light Filter', code: 'blue_cut', description: 'Blocks harmful blue light from screens', price_addon: 800, features: ['Blue Light Filter', 'Anti-Glare', 'UV400', 'Scratch Resistant'], is_active: true },
    { id: 'f4', name: 'Premium HD', code: 'premium_hd', description: 'Crystal clear optics with full protection', price_addon: 1500, features: ['HD Optics', 'Blue Cut', 'Anti-Glare', 'UV400', 'Water Repellent'], is_active: true },
  ]

  useEffect(() => {
    setLoadingPackages(true)
    createClient()
      .from('lens_packages')
      .select('*')
      .eq('is_active', true)
      .order('price_addon')
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setLensPackages(data as LensPackage[])
        } else {
          setLensPackages(FALLBACK_PACKAGES)
        }
        setLoadingPackages(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePowerType = (type: LensPowerType) => {
    setState(s => ({ ...s, power_type: type }))
    if (type === 'frame_only') { onComplete({ ...state, power_type: type, step: 3 }); return }
    setStep(2)
  }

  const handlePackage = (code: string) => {
    const next = { ...state, package_code: code }
    setState(next)
    if (state.power_type === 'zero_power') { onComplete({ ...next, step: 3 }); return }
    setStep(3)
  }

  const lensAddon = lensPackages.find(p => p.code === state.package_code)?.price_addon || 0

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300 font-sans">
      <div className="bg-white/95 backdrop-blur-3xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[85vh] shadow-[0_24px_80px_rgba(15,23,42,0.2)] sm:rounded-[2.5rem] flex flex-col relative animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-500 border border-white">
        
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="sticky top-0 bg-white/60 backdrop-blur-xl z-20 px-8 py-7 flex items-start justify-between border-b border-slate-200/50 sm:rounded-t-[2.5rem]">
          <div>
            <div className="flex items-center gap-3 mb-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-[9px] font-bold tracking-widest shadow-sm">
                0{step}
              </span>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.25em]">
                {['Lens Power', 'Lens Package', 'Prescription Details'][step - 1]}
              </p>
            </div>
            <h2 className="text-3xl text-slate-900 tracking-tight" style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}>
              {product.name}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 bg-white shadow-sm border border-slate-100 hover:bg-slate-50 rounded-full transition-all p-2 -mr-2 -mt-1">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* ── Minimalist Progress Bar ──────────────────────────── */}
        <div className="w-full h-[3px] bg-slate-100 absolute top-[104px] left-0 z-30">
          <div 
            className="h-full bg-slate-900 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(15,23,42,0.3)]" 
            style={{ width: `${(step / 3) * 100}%` }} 
          />
        </div>

        <div className="p-6 sm:p-10 flex-1 overflow-y-auto custom-scrollbar relative">
          
          {/* ── Step 1: Power Type ─────────────────────────────── */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-900 mb-6 px-1">
                Select Lens Requirement
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {POWER_TYPES.map(pt => (
                  <button 
                    key={pt.value} 
                    onClick={() => handlePowerType(pt.value)}
                    className="flex flex-col items-center justify-center text-center p-8 bg-white/50 border border-slate-200/60 rounded-2xl hover:border-slate-400 hover:bg-white hover:shadow-[0_8px_30px_rgba(15,23,42,0.06)] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-5 text-slate-400 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all duration-300 shadow-sm">
                      {pt.icon}
                    </div>
                    <span className="text-xs uppercase tracking-[0.15em] font-bold text-slate-900 mb-2">
                      {pt.label}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {pt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Lens Package ───────────────────────────── */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center justify-between mb-6 px-1">
                <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-900">
                  Select Lens Package
                </h3>
                <button onClick={() => setStep(1)} className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400 hover:text-slate-900 bg-white border border-slate-200/60 shadow-sm px-3 py-1.5 rounded-lg transition-all">
                  ← Back
                </button>
              </div>

              {loadingPackages ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white/50 border border-slate-100/60 rounded-2xl p-6 flex justify-between animate-pulse">
                      <div className="w-2/3">
                        <div className="h-3 bg-slate-200/60 rounded-full w-full mb-3" />
                        <div className="h-2 bg-slate-100 rounded-full w-3/4 mb-5" />
                        <div className="flex gap-2"><div className="h-4 bg-slate-100 rounded-md w-16" /><div className="h-4 bg-slate-100 rounded-md w-20" /></div>
                      </div>
                      <div className="h-5 bg-slate-200/60 rounded-md w-16" />
                    </div>
                  ))}
                </div>
              ) : lensPackages.length === 0 ? (
                <div className="text-center py-16 bg-white/50 border border-slate-200/60 rounded-2xl shadow-sm">
                  <AlertCircle size={24} className="mx-auto text-slate-300 mb-3" strokeWidth={1.5} />
                  <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-500">No packages available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {lensPackages.map(pkg => (
                    <button 
                      key={pkg.code} 
                      onClick={() => handlePackage(pkg.code)}
                      className={`w-full text-left p-6 sm:p-8 rounded-2xl border transition-all duration-300 group shadow-sm relative overflow-hidden ${
                        state.package_code === pkg.code 
                          ? 'border-slate-900 bg-white shadow-md transform -translate-y-0.5' 
                          : 'border-slate-200/60 bg-white/50 hover:bg-white hover:border-slate-300 hover:shadow-md'
                      }`}
                    >
                      {state.package_code === pkg.code && (
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-slate-100 to-transparent opacity-50 rounded-tr-2xl pointer-events-none" />
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 relative z-10">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1.5">
                            {state.package_code === pkg.code && (
                              <span className="w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center text-white flex-shrink-0">
                                <Check size={10} strokeWidth={3} />
                              </span>
                            )}
                            <p className="text-xs uppercase tracking-[0.15em] font-bold text-slate-900">{pkg.name}</p>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium mb-5 leading-relaxed">{pkg.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {pkg.features.map(f => (
                              <span key={f} className={`text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-md border ${
                                state.package_code === pkg.code ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white border-slate-100 text-slate-500'
                              }`}>
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0 sm:pt-0.5">
                          {pkg.price_addon > 0 ? (
                            <p className="text-sm font-bold text-slate-900 tracking-wider bg-white border border-slate-100 shadow-sm px-3 py-1.5 rounded-lg inline-block">+₹{pkg.price_addon}</p>
                          ) : (
                            <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg inline-block">Complimentary</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Prescription ───────────────────────────── */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <PrescriptionStep state={state} setState={setState} onBack={() => setStep(2)} onComplete={() => onComplete({ ...state, step: 3 })} />
            </div>
          )}
        </div>

        {/* ── Sticky Footer (Add-on Indicator) ────────────────── */}
        <div className={`border-t border-slate-200/50 px-8 py-5 bg-white/80 backdrop-blur-md transition-all duration-500 sm:rounded-b-[2.5rem] ${lensAddon > 0 ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 hidden'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500">Lens Add-on Total</span>
            <span className="text-base font-bold text-slate-900 tracking-wider">+₹{lensAddon}</span>
          </div>
        </div>
        
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(148, 163, 184, 0.3); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(148, 163, 184, 0.5); }
        .btn-shine::after { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent); transform: skewX(-20deg); transition: all 0.6s ease; }
        .btn-shine:hover::after { left: 150%; }
      `}} />
    </div>
  )
}

function PrescriptionStep({ state, setState, onBack, onComplete }: {
  state: LensFlowState
  setState: React.Dispatch<React.SetStateAction<LensFlowState>>
  onBack: () => void
  onComplete: () => void
}) {
  const [method, setMethod] = useState<'manual' | 'upload' | 'later'>('manual')
  const [prescription, setPrescription] = useState({
    left_eye: { sph: '0.00', cyl: '0.00', axis: 1 },
    right_eye: { sph: '0.00', cyl: '0.00', axis: 1 },
    pd: 64,
  })

  const handleSave = () => {
    if (method === 'later') {
      setState(s => ({ ...s, upload_later: true }))
    } else if (method === 'manual') {
      setState(s => ({
        ...s,
        prescription: {
          left_eye: { sph: parseFloat(prescription.left_eye.sph), cyl: parseFloat(prescription.left_eye.cyl), axis: prescription.left_eye.axis },
          right_eye: { sph: parseFloat(prescription.right_eye.sph), cyl: parseFloat(prescription.right_eye.cyl), axis: prescription.right_eye.axis },
          pd: prescription.pd,
        },
      }))
    }
    onComplete()
  }

  type EyeKey = 'left_eye' | 'right_eye'
  type FieldKey = 'sph' | 'cyl' | 'axis'

  return (
    <div>
      <div className="flex items-center justify-between mb-8 px-1">
        <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-900">
          Provide Prescription
        </h3>
        <button onClick={onBack} className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400 hover:text-slate-900 bg-white border border-slate-200/60 shadow-sm px-3 py-1.5 rounded-lg transition-all">
          ← Back
        </button>
      </div>

      {/* ── Segmented Control Tabs ─────────────────────────────────── */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl flex border border-slate-200/50 mb-8 shadow-inner">
        {([['manual', 'Enter Manually'], ['upload', 'Upload Later'], ['later', 'Skip for Now']] as const).map(([key, label]) => (
          <button 
            key={key} 
            onClick={() => setMethod(key)}
            className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-300 rounded-xl ${
              method === key 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50 transform scale-100' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 scale-95 border border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Manual Entry Forms ─────────────────────────────── */}
      {method === 'manual' && (
        <div className="space-y-6">
          {(['right_eye', 'left_eye'] as EyeKey[]).map(eye => (
            <div key={eye} className="bg-white/60 border border-slate-200/60 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5 border-b border-slate-100/80 pb-4">
                <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                  <Eye size={16} strokeWidth={2} className="text-slate-500" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-900">
                  {eye === 'right_eye' ? 'Right Eye (OD)' : 'Left Eye (OS)'}
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-4 sm:gap-6">
                {(['sph', 'cyl', 'axis'] as FieldKey[]).map(field => (
                  <div key={field} className="relative group">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block mb-2 px-1">
                      {field === 'sph' ? 'Sphere' : field === 'cyl' ? 'Cylinder' : 'Axis'}
                    </label>
                    <div className="relative">
                      <select
                        value={prescription[eye][field]}
                        onChange={e => setPrescription(p => ({ ...p, [eye]: { ...p[eye], [field]: field === 'axis' ? parseInt(e.target.value) : e.target.value } }))}
                        className="w-full appearance-none bg-white border border-slate-200/60 rounded-xl text-sm font-bold text-slate-900 px-4 py-3 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all shadow-sm cursor-pointer"
                      >
                        {field === 'axis'
                          ? AXIS_VALUES.map(v => <option key={v} value={v}>{v}°</option>)
                          : field === 'sph'
                            ? SPH_VALUES.map(v => <option key={v} value={v}>{parseFloat(v) > 0 ? '+' : ''}{v}</option>)
                            : CYL_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                      <ChevronDown size={14} strokeWidth={2} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-white/60 border border-slate-200/60 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 px-1">
              <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">
                Pupillary Distance (PD)
              </label>
              <span className="text-xs font-bold text-slate-900 tracking-wider bg-white px-3 py-1.5 rounded-lg border border-slate-200/50 shadow-sm">{prescription.pd} mm</span>
            </div>
            
            {/* Styled Range Slider */}
            <div className="px-2">
              <input 
                type="range" min={55} max={75} step={0.5} value={prescription.pd}
                onChange={e => setPrescription(p => ({ ...p, pd: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-slate-400/20"
                style={{
                  background: `linear-gradient(to right, #0f172a 0%, #0f172a ${(prescription.pd - 55) / (75 - 55) * 100}%, #e2e8f0 ${(prescription.pd - 55) / (75 - 55) * 100}%, #e2e8f0 100%)`
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-3 px-2">
              <span>55mm</span>
              <span>65mm</span>
              <span>75mm</span>
            </div>
          </div>
        </div>
      )}

      {method === 'upload' && (
        <div className="bg-white/60 border border-slate-200/60 rounded-2xl p-12 text-center flex flex-col items-center shadow-sm">
          <div className="w-16 h-16 bg-white rounded-2xl border border-slate-100 flex items-center justify-center mb-6 shadow-sm">
            <Upload size={24} strokeWidth={2} className="text-slate-600" />
          </div>
          <p className="text-xs uppercase tracking-[0.15em] font-bold text-slate-900 mb-3">Upload Required Later</p>
          <p className="text-[11px] text-slate-500 font-medium max-w-xs leading-relaxed">
            You may proceed to checkout. A concierge member will contact you to securely collect your prescription details.
          </p>
        </div>
      )}

      {method === 'later' && (
        <div className="bg-slate-900 rounded-2xl p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-lg text-center sm:text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-700 rounded-full blur-3xl opacity-40 pointer-events-none" />
          <div className="w-14 h-14 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center flex-shrink-0 shadow-inner relative z-10">
            <Clock size={24} strokeWidth={1.5} className="text-slate-300" />
          </div>
          <div className="pt-1 relative z-10">
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-white mb-2">Skip for Now</p>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-sm">
              Our team will contact you to collect your exact prescription details after your order is successfully placed.
            </p>
          </div>
        </div>
      )}

      <button onClick={handleSave}
        className="mt-8 w-full py-5 rounded-xl bg-slate-900 text-white text-[10px] uppercase tracking-[0.25em] font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-3 group btn-shine relative overflow-hidden">
        Confirm Selection <ChevronRight size={16} strokeWidth={2} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  )
}