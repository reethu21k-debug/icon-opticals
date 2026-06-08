'use client'
// components/try-on/VirtualTryOn.tsx

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react'
import { useFaceTracking } from './useFaceTracking'
import {
  calculateGlassesTransform,
  drawGlasses,
  compositeScreenshot,
} from './utils/faceGeometry'
import type { TryOnProduct, CameraStatus, GlassesTransform, FrameDimensions } from './types'

export interface VirtualTryOnHandle {
  takeScreenshot(): string | null
  toggleMirror(): void
  switchCamera(): Promise<void>
  isMirrored: boolean
}

interface VirtualTryOnProps {
  product: TryOnProduct
  showGlasses?: boolean
}

async function getCamera(facingMode: 'user' | 'environment'): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    })
  } catch (err) {
    const e = err as DOMException
    if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError' || e.name === 'NotFoundError') throw err
    return navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false })
  }
}

const VirtualTryOn = forwardRef<VirtualTryOnHandle, VirtualTryOnProps>(
  function VirtualTryOn({ product, showGlasses = true }, ref) {
    const videoRef  = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rafIdRef  = useRef<number>(0)
    const streamRef = useRef<MediaStream | null>(null)

    const glassesImgRef    = useRef<HTMLImageElement | null>(null)
    const lastTransformRef = useRef<GlassesTransform | null>(null)

    const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle')
    const [cameraError,  setCameraError]  = useState<string | null>(null)
    const [facingMode,   setFacingMode]   = useState<'user' | 'environment'>('user')
    const [isMirrored,   setIsMirrored]   = useState(true)

    const { landmarks, isModelLoading, modelError, processFrame, faceDetected } =
      useFaceTracking()

    // ── Stable refs so the RAF loop never re-registers ────────────────────
    // The loop reads these refs directly — no stale closures, no restart.
    const showGlassesRef = useRef(showGlasses)
    const isMirroredRef  = useRef(isMirrored)
    const landmarksRef   = useRef(landmarks)
    const productRef     = useRef(product)
    const processFrameRef = useRef(processFrame)

    useEffect(() => { showGlassesRef.current  = showGlasses  }, [showGlasses])
    useEffect(() => { isMirroredRef.current   = isMirrored   }, [isMirrored])
    useEffect(() => { landmarksRef.current    = landmarks    }, [landmarks])
    useEffect(() => { productRef.current      = product      }, [product])
    useEffect(() => { processFrameRef.current = processFrame }, [processFrame])

    // ── Load glasses image ────────────────────────────────────────────────
    useEffect(() => {
      const src =
        product.try_on_image_url ??
        product.images.find((i) => i.is_primary)?.url ??
        product.images[0]?.url ??
        null

      if (!src) { glassesImgRef.current = null; return }

      const img       = new Image()
      img.crossOrigin = 'anonymous'
      const corsUrl   = src.includes('res.cloudinary.com') && !src.includes('?')
        ? `${src}?_cors=1`
        : src

      img.onload  = () => { glassesImgRef.current = img }
      img.onerror = () => {
        // Retry without crossOrigin as fallback (some servers block CORS preflight)
        const fb    = new Image()
        fb.onload   = () => { glassesImgRef.current = fb }
        fb.onerror  = () => { glassesImgRef.current = null }
        fb.src      = src
      }
      img.src = corsUrl

      return () => { /* intentionally keep glassesImgRef until next product loads */ }
    }, [product])

    // ── Camera ────────────────────────────────────────────────────────────
    const startCamera = useCallback(async (facing: 'user' | 'environment') => {
      if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
        setCameraStatus('error')
        setCameraError('Camera API not available. Please use HTTPS or a supported browser.')
        return
      }
      setCameraStatus('requesting')
      setCameraError(null)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      try {
        const stream = await getCamera(facing)
        streamRef.current = stream
        const video = videoRef.current
        if (!video) { stream.getTracks().forEach((t) => t.stop()); return }
        video.srcObject = stream
        video.load()
        await video.play().catch(() => {})
        setCameraStatus('active')
      } catch (err) {
        const e = err as DOMException
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          setCameraStatus('denied')
          setCameraError('Camera permission denied. Please allow camera access and try again.')
        } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
          setCameraStatus('error')
          setCameraError('No camera found on this device.')
        } else {
          setCameraStatus('error')
          setCameraError(`Camera error: ${(e as Error).message || 'Unknown error'}.`)
        }
      }
    }, [])

    useEffect(() => {
      startCamera(facingMode)
      return () => {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }, [facingMode, startCamera])

    // ── RAF draw loop ─────────────────────────────────────────────────────
    //
    // Runs exactly ONCE — empty deps [].
    // All values are read from refs, never from the closure.
    // This is the only correct pattern for a RAF loop in React:
    // never put state/props in deps, always use refs.
    useEffect(() => {
      let animId = 0

      const loop = () => {
        animId = requestAnimationFrame(loop)
        rafIdRef.current = animId

        const video  = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas) return

        // Sync canvas intrinsic size to video native resolution
        const vw = video.videoWidth  || 1280
        const vh = video.videoHeight || 720
        if (canvas.width !== vw)  canvas.width  = vw
        if (canvas.height !== vh) canvas.height = vh

        // Send frame to MediaPipe (throttled inside processFrame)
        if (video.readyState >= 2) {
          processFrameRef.current(video).catch(() => {})
        }

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Guard: need landmarks + loaded image + showGlasses on
        const lm  = landmarksRef.current
        const img = glassesImgRef.current

        if (
          !showGlassesRef.current   ||
          !lm  || lm.length === 0   ||
          !img || !img.complete     ||
          img.naturalWidth === 0
        ) return

        const p = productRef.current
        const dims: FrameDimensions | null = p.frame_width_mm != null
          ? {
              frameWidth:   p.frame_width_mm,
              lensWidth:    p.lens_width_mm    ?? 52,
              bridgeWidth:  p.bridge_width_mm  ?? 18,
              templeLength: p.temple_length_mm ?? 145,
              frameHeight:  p.frame_height_mm  ?? 40,
            }
          : null

        const transform = calculateGlassesTransform(
          lm,
          canvas.width,
          canvas.height,
          dims,
          img.naturalWidth,
          img.naturalHeight,
        )
        lastTransformRef.current = transform

        ctx.save()
        if (isMirroredRef.current) {
          ctx.translate(canvas.width, 0)
          ctx.scale(-1, 1)
        }
        drawGlasses(ctx, img, transform)
        ctx.restore()
      }

      animId = requestAnimationFrame(loop)
      rafIdRef.current = animId

      return () => {
        cancelAnimationFrame(animId)
      }
    }, []) // ← truly empty: everything is via refs

    // ── Imperative handle ─────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      isMirrored,
      toggleMirror: () => setIsMirrored((m) => !m),
      switchCamera: async () => {
        const next: 'user' | 'environment' = facingMode === 'user' ? 'environment' : 'user'
        setFacingMode(next)
        setIsMirrored(next === 'user')
      },
      takeScreenshot: (): string | null => {
        const video = videoRef.current
        const img   = glassesImgRef.current
        const tx    = lastTransformRef.current
        if (!video || !img || !tx) return null
        try { return compositeScreenshot(video, img, tx, isMirroredRef.current) }
        catch { return null }
      },
    }), [facingMode, isMirrored])

    // ── Render ────────────────────────────────────────────────────────────
    return (
      <div className="relative w-full h-full overflow-hidden bg-black rounded-2xl select-none">

        {/* Video — CSS-mirrored for selfie view */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: isMirrored ? 'scaleX(-1)' : 'none' }}
          playsInline
          muted
          autoPlay
          aria-label="Camera feed"
        />

        {/* Canvas — no CSS transform; ctx.scale handles mirroring */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          aria-hidden="true"
        />

        {/* Requesting camera */}
        {cameraStatus === 'requesting' && (
          <Overlay>
            <SpinnerIcon />
            <p className="text-white text-sm font-light mt-3 tracking-wide">
              Requesting camera access…
            </p>
          </Overlay>
        )}

        {/* Camera denied / error */}
        {(cameraStatus === 'denied' || cameraStatus === 'error') && cameraError && (
          <Overlay>
            <CameraOffIcon />
            <p className="text-white/80 text-sm font-light mt-3 max-w-xs text-center leading-relaxed">
              {cameraError}
            </p>
            {cameraStatus === 'denied' && (
              <p className="text-white/50 text-xs mt-2 text-center">
                Open browser settings → Site Settings → Camera → Allow
              </p>
            )}
            <button
              onClick={() => startCamera(facingMode)}
              className="mt-4 px-5 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold tracking-widest uppercase transition-colors"
            >
              Retry
            </button>
          </Overlay>
        )}

        {/* Model loading */}
        {cameraStatus === 'active' && isModelLoading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs tracking-widest uppercase"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
            >
              <SpinnerIcon small />
              <span>Loading face tracking…</span>
            </div>
          </div>
        )}

        {/* Model error */}
        {modelError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <div
              className="px-4 py-2 rounded-full text-red-300 text-xs tracking-wide"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
            >
              Face tracking unavailable — {modelError}
            </div>
          </div>
        )}

        {/* No face hint */}
        {cameraStatus === 'active' && !isModelLoading && !modelError && !faceDetected && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
            <div
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-xs tracking-widest uppercase"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
            >
              <FaceGuideIcon />
              <span>Position your face in frame</span>
            </div>
          </div>
        )}

        {/* Face oval guide */}
        {cameraStatus === 'active' && !faceDetected && !isModelLoading && (
          <FaceGuide />
        )}
      </div>
    )
  }
)

VirtualTryOn.displayName = 'VirtualTryOn'
export default VirtualTryOn

// ── Sub-components ────────────────────────────────────────────────────────────

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm z-10">
      {children}
    </div>
  )
}

function SpinnerIcon({ small }: { small?: boolean }) {
  const s = small ? 16 : 32
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="animate-spin">
      <path strokeLinecap="round" d="M12 2a10 10 0 0 1 0 20" opacity={0.3} />
      <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}

function CameraOffIcon() {
  return (
    <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 1l22 22M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06A4 4 0 1 1 7.41 9.12" />
    </svg>
  )
}

function FaceGuideIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5}>
      <circle cx={12} cy={8} r={5} />
      <path d="M5.5 20a8 8 0 0 1 13 0" />
    </svg>
  )
}

function FaceGuide() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
      <div style={{
        position: 'absolute', width: '54%', height: '74%',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -53%)',
        border: '1.5px dashed rgba(255,255,255,0.30)',
        borderRadius: '50%',
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.20)',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -62%)',
        width: '28%', height: '1px',
        background: 'rgba(255,255,255,0.15)',
      }} />
    </div>
  )
}