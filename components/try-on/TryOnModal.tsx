'use client'
// components/try-on/TryOnModal.tsx
// ── Virtual Try-On modal — full UI shell ────────────────────────────────────

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  Suspense,
  lazy,
} from 'react'
import {
  X,
  Camera,
  FlipHorizontal,
  Maximize,
  Minimize,
  Download,
  EyeOff,
  Eye,
  Info,
} from 'lucide-react'
import type { TryOnProduct } from './types'
import type { VirtualTryOnHandle } from './VirtualTryOn'

// Lazy-load the heavy engine (MediaPipe loads inside it)
const VirtualTryOn = lazy(() => import('./VirtualTryOn'))

// ── Props ─────────────────────────────────────────────────────────────────────
interface TryOnModalProps {
  product: TryOnProduct
  onClose: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TryOnModal({ product, onClose }: TryOnModalProps) {
  const tryOnRef      = useRef<VirtualTryOnHandle>(null)
  const fullscreenRef = useRef<HTMLDivElement>(null)

  const [showGlasses,   setShowGlasses]   = useState(true)
  const [isFullscreen,  setIsFullscreen]  = useState(false)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [showInfo,      setShowInfo]      = useState(false)
  const [toastMsg,      setToastMsg]      = useState<string | null>(null)

  // ── Toast helper ───────────────────────────────────────────────────────
  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }, [])

  // ── Close on Escape ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // ── Prevent body scroll while open ────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // ── Fullscreen API ─────────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = async () => {
    if (!fullscreenRef.current) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await fullscreenRef.current.requestFullscreen()
      }
    } catch {
      // Fullscreen not supported — ignore
    }
  }

  // ── Screenshot ─────────────────────────────────────────────────────────
  const handleScreenshot = useCallback(() => {
    const url = tryOnRef.current?.takeScreenshot()
    if (!url) { toast('No face detected — position your face in frame first'); return }
    setScreenshotUrl(url)
  }, [toast])

  const downloadScreenshot = useCallback(() => {
    if (!screenshotUrl) return
    const a = document.createElement('a')
    a.href     = screenshotUrl
    a.download = `${product.name.replace(/\s+/g, '-').toLowerCase()}-tryon.png`
    a.click()
    toast('Image saved!')
  }, [screenshotUrl, product.name, toast])

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Virtual Try-On: ${product.name}`}
    >
      {/* ── Main panel ─────────────────────────────────────────── */}
      <div
        ref={fullscreenRef}
        className={`
          bg-white w-full flex flex-col overflow-hidden
          animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-500
          ${isFullscreen
            ? 'fixed inset-0 rounded-none'
            : 'sm:max-w-4xl sm:rounded-[2rem] max-h-[100vh] sm:max-h-[92vh] shadow-[0_32px_80px_rgba(15,23,42,0.35)]'
          }
        `}
      >
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-400 mb-1">
              Virtual Try-On
            </p>
            <h2
              className="text-2xl sm:text-3xl text-slate-900 leading-tight tracking-tight"
              style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}
            >
              {product.name}
            </h2>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400 mt-0.5">
              {product.brand}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2.5 rounded-full border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 transition-all -mr-1 -mt-1"
            aria-label="Close try-on"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* ── Try-on viewport ──────────────────────────────────── */}
        {/* Explicit min-height ensures the camera view is always visible */}
        <div className="relative bg-slate-950" style={{ flex: '1 1 0', minHeight: '320px', height: 0 }}>

          {/* Screenshot preview overlay */}
          {screenshotUrl ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
              <img
                src={screenshotUrl}
                alt="Try-on screenshot"
                className="max-h-full max-w-full object-contain"
                style={{ maxHeight: '80%' }}
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={downloadScreenshot}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 text-xs font-bold uppercase tracking-widest rounded-full hover:bg-slate-100 transition-colors"
                >
                  <Download size={14} strokeWidth={2} />
                  Save Photo
                </button>
                <button
                  onClick={() => setScreenshotUrl(null)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-full hover:bg-white/20 transition-colors border border-white/20"
                >
                  Back to Try-On
                </button>
              </div>
            </div>
          ) : null}

          {/* FIX: container must be position:absolute + inset-0 so VirtualTryOn
              fills the viewport div regardless of its own flex/height state     */}
          <div className="absolute inset-0">
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <svg
                      className="animate-spin"
                      width={28} height={28}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" d="M12 2a10 10 0 0 1 0 20" opacity={0.25} />
                      <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    <p className="text-white/50 text-xs tracking-widest uppercase">
                      Initialising…
                    </p>
                  </div>
                </div>
              }
            >
              <VirtualTryOn
                ref={tryOnRef}
                product={product}
                showGlasses={showGlasses}
              />
            </Suspense>
          </div>
        </div>

        {/* ── Control bar ──────────────────────────────────────── */}
        <div className="flex-shrink-0 px-5 py-4 bg-white border-t border-slate-100">
          <div className="flex items-center justify-between gap-3">

            {/* Left controls */}
            <div className="flex items-center gap-2">
              {/* Compare toggle */}
              <ControlButton
                label={showGlasses ? 'Hide Glasses' : 'Show Glasses'}
                icon={showGlasses ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
                onClick={() => setShowGlasses((v) => !v)}
                active={!showGlasses}
              />

              {/* Mirror toggle */}
              <ControlButton
                label="Flip"
                icon={<FlipHorizontal size={16} strokeWidth={1.75} />}
                onClick={() => tryOnRef.current?.toggleMirror()}
              />

              {/* Switch camera */}
              <ControlButton
                label="Switch Camera"
                icon={<Camera size={16} strokeWidth={1.75} />}
                onClick={() => tryOnRef.current?.switchCamera()}
              />

              {/* Info */}
              <ControlButton
                label="Tips"
                icon={<Info size={16} strokeWidth={1.75} />}
                onClick={() => setShowInfo((v) => !v)}
                active={showInfo}
              />
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              {/* Fullscreen */}
              <ControlButton
                label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                icon={isFullscreen
                  ? <Minimize size={16} strokeWidth={1.75} />
                  : <Maximize size={16} strokeWidth={1.75} />
                }
                onClick={toggleFullscreen}
              />

              {/* Screenshot — primary CTA */}
              <button
                onClick={handleScreenshot}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-[0.18em] rounded-full transition-all active:scale-[0.97]"
                aria-label="Take screenshot"
              >
                <Download size={14} strokeWidth={2} />
                <span className="hidden sm:inline">Capture</span>
              </button>
            </div>
          </div>

          {/* Info panel */}
          {showInfo && (
            <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">
                Tips for best results
              </p>
              <ul className="space-y-1.5">
                {[
                  'Face the camera directly in good lighting',
                  'Keep your face within the oval guide',
                  'Remove your current glasses if wearing any',
                  'Try front camera for most accurate tracking',
                  'Hold your head at a comfortable, natural angle',
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-[11px] text-slate-600 font-light">
                    <span className="mt-0.5 w-1 h-1 rounded-full bg-slate-400 flex-shrink-0 block" />
                    {tip}
                  </li>
                ))}
              </ul>

              {/* Dimensions if available */}
              {product.frame_width_mm && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
                    Frame Specifications
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {[
                      { label: 'Frame W', value: product.frame_width_mm,   unit: 'mm' },
                      { label: 'Lens W',  value: product.lens_width_mm,    unit: 'mm' },
                      { label: 'Bridge',  value: product.bridge_width_mm,  unit: 'mm' },
                      { label: 'Temple',  value: product.temple_length_mm, unit: 'mm' },
                      { label: 'Height',  value: product.frame_height_mm,  unit: 'mm' },
                    ]
                      .filter((d) => d.value != null)
                      .map((d) => (
                        <div key={d.label} className="text-center">
                          <p className="text-[9px] text-slate-400 uppercase tracking-widest">{d.label}</p>
                          <p className="text-xs font-bold text-slate-900 mt-0.5">{d.value}{d.unit}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Toast notification ─────────────────────────────────── */}
      {toastMsg && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[400] px-5 py-2.5 rounded-full text-white text-xs font-medium tracking-wide animate-in fade-in zoom-in-95 duration-200"
          style={{ background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(8px)' }}
        >
          {toastMsg}
        </div>
      )}
    </div>
  )
}

// ── ControlButton ──────────────────────────────────────────────────────────────
function ControlButton({
  label,
  icon,
  onClick,
  active = false,
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`
        p-2.5 rounded-full border transition-all active:scale-[0.93]
        ${active
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50'
        }
      `}
    >
      {icon}
    </button>
  )
}