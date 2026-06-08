'use client'

// components/try-on/useFaceTracking.ts

import { useEffect, useRef, useState, useCallback } from 'react'
import { smoothLandmarks } from './utils/faceGeometry'
import type { FaceTrackingState, NormalizedLandmark } from './types'

const CDN_BASE  = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/'
const LOCAL_BASE = '/mediapipe/'

const PROCESS_THROTTLE =
  typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) ? 3 : 2

// ─── Singleton script promise ────────────────────────────────────────────────
let loadPromise: Promise<string> | null = null

export function resetFaceMeshLoader() {
  loadPromise = null
}

// ─── False-alarm detector ────────────────────────────────────────────────────
// MediaPipe WASM deliberately calls abort() as a one-shot diagnostic probe
// during the very first initialize(). This is NOT a real failure. We must
// never surface it as modelError.
//
// We also treat EEXIST (errno 20 / "File exists") as a false alarm.
// That error fires when the WASM virtual-FS already has the model files
// registered from a prior FaceMesh instance — it is NOT a loading failure.
function isFalseAlarm(err: unknown): boolean {
  const msg =
    err instanceof Error   ? err.message   :
    typeof err === 'string' ? err           :
    String(err ?? '')

  // ErrnoError objects thrown by the WASM FS have .code and .errno fields
  const code  = (err as { code?: string })?.code  ?? ''
  const errno = (err as { errno?: number })?.errno ?? 0

  return (
    err instanceof WebAssembly.RuntimeError ||
    /abort/i.test(msg)              ||
    /Module\.arguments/i.test(msg)  ||
    /plain arguments/i.test(msg)    ||
    /RuntimeError/i.test(msg)       ||
    /jsStackTrace/i.test(msg)       ||
    /dataFileDownloads/i.test(msg)  ||
    /face_mesh_solution/i.test(msg) ||
    msg.trim() === 'abort'          ||
    msg.trim() === 'undefined'      ||
    // WASM FS "File exists" — fires when staticInit runs twice on the same FS
    code === 'EEXIST'               ||
    errno === 20                    ||
    /EEXIST/i.test(msg)             ||
    /File exists/i.test(msg)
  )
}

// ─── Install Module shim ─────────────────────────────────────────────────────
function installMediaPipeGlobals() {
  if (typeof window === 'undefined') return
  const g = window as unknown as Record<string, unknown>

  const mod: Record<string, unknown> = (g.Module as Record<string, unknown>) ?? {}
  g.Module = mod

  // Safe property writer — the real WASM module may define some props as
  // getter-only via Object.defineProperty. A plain assignment throws a
  // TypeError in strict mode ("setting getter-only property 'quit'").
  // We fall back to Object.defineProperty so we can always override them.
  function safeSet(key: string, value: unknown) {
    try {
      mod[key] = value
    } catch {
      try {
        Object.defineProperty(mod, key, {
          value,
          writable:     true,
          configurable: true,
          enumerable:   false,
        })
      } catch { /* truly sealed — skip silently */ }
    }
  }

  // Pre-define all properties Emscripten might trap on
  const defs: Record<string, unknown> = {
    arguments_: undefined,
    thisProgram: undefined,
    quit: (code: number, e: unknown) => {
      const m = e instanceof Error ? e.message : String(e ?? '')
      if (code !== 0 && !isFalseAlarm(m)) console.error('[MP] quit', code, e)
    },
    preRun: [],
    postRun: [],
    print: () => {},
    printErr: (t: unknown) => { if (!isFalseAlarm(String(t ?? ''))) console.warn('[MP]', t) },
    canvas: undefined,
    setStatus: () => {},
    monitorRunDependencies: () => {},
    // onAbort must NOT throw — just log and return
    onAbort: (msg: unknown) => {
      if (!isFalseAlarm(String(msg ?? ''))) console.error('[MP] fatal abort:', msg)
    },
    expectedDataFileDownloads: 0,
    dataFileDownloads: {},
    preloadResults: {},
    calledRun: false,
  }

  for (const [k, v] of Object.entries(defs)) {
    if (!(k in mod)) safeSet(k, v)
  }
  // Always override these three — they must be our no-throw versions
  safeSet('onAbort',  defs.onAbort)
  safeSet('quit',     defs.quit)
  safeSet('printErr', defs.printErr)

  const buildMod = (o?: Record<string, unknown>) => Object.assign({}, mod, o ?? {})
  if (!g.createMediapipeSolutionsWasm)         g.createMediapipeSolutionsWasm         = buildMod
  if (!g.createMediapipeSolutionsPackedAssets) g.createMediapipeSolutionsPackedAssets = buildMod
}

// ─── Script injection ─────────────────────────────────────────────────────────
function injectScript(src: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const win = window as Window & { FaceMesh?: unknown }
    if (win.FaceMesh) { resolve(); return }

    installMediaPipeGlobals()

    document.getElementById('mp-facemesh-script')?.remove()

    const el = Object.assign(document.createElement('script'), {
      id:    'mp-facemesh-script',
      src,
      async: false,
    })

    const tid = setTimeout(() => {
      loadPromise = null
      reject(new Error('MediaPipe timed out'))
    }, 30_000)

    el.onload = () => {
      clearTimeout(tid)
      win.FaceMesh ? resolve() : reject(new Error('FaceMesh global missing after load'))
    }
    el.onerror = () => {
      clearTimeout(tid)
      el.remove()
      loadPromise = null
      reject(new Error(`Script load failed: ${src}`))
    }

    document.head.appendChild(el)
  })
}

function loadFaceMeshScript(): Promise<string> {
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    if (typeof window === 'undefined') throw new Error('SSR')
    installMediaPipeGlobals()
    if (process.env.NEXT_PUBLIC_MEDIAPIPE_LOCAL === 'true') {
      try { await injectScript(`${LOCAL_BASE}face_mesh.js`); return LOCAL_BASE }
      catch { console.warn('[TryOn] local MP failed, using CDN') }
    }
    await injectScript(`${CDN_BASE}face_mesh.js`)
    return CDN_BASE
  })()
  loadPromise.catch(() => { loadPromise = null })
  return loadPromise
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface FaceMeshResults {
  multiFaceLandmarks?: NormalizedLandmark[][]
}
interface FaceMeshInstance {
  setOptions(o: Record<string, unknown>): void
  onResults(cb: (r: FaceMeshResults) => void): void
  initialize(): Promise<void>
  send(i: { image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement }): Promise<void>
  close(): void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useFaceTracking(): FaceTrackingState {
  const [isModelLoading, setIsModelLoading] = useState(true)
  const [modelError,     setModelError]     = useState<string | null>(null)
  const [faceDetected,   setFaceDetected]   = useState(false)
  const [landmarks,      setLandmarks]      = useState<NormalizedLandmark[] | null>(null)

  const fmRef        = useRef<FaceMeshInstance | null>(null)
  const smoothedRef  = useRef<NormalizedLandmark[] | null>(null)
  const frameRef     = useRef(0)
  const mountedRef   = useRef(true)
  const sendingRef   = useRef(false)   // prevent concurrent sends

  useEffect(() => {
    mountedRef.current = true

    ;(async () => {
      try {
        const base = await loadFaceMeshScript()
        if (!mountedRef.current) return

        const FaceMesh = (window as unknown as {
          FaceMesh: new (o: Record<string, unknown>) => FaceMeshInstance
        }).FaceMesh

        if (typeof FaceMesh !== 'function') throw new Error('FaceMesh not found on window')

        const makeFM = (): FaceMeshInstance => {
          const fm = new FaceMesh({ locateFile: (f: string) => `${base}${f}` })
          fm.setOptions({
            maxNumFaces:            1,
            refineLandmarks:        true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence:  0.5,
            selfieMode:             false,
          })
          fm.onResults((res: FaceMeshResults) => {
            if (!mountedRef.current) return
            const raw = res.multiFaceLandmarks?.[0] ?? null
            if (raw) {
              smoothedRef.current = smoothLandmarks(raw, smoothedRef.current, 0.55)
              setLandmarks(smoothedRef.current)
              setFaceDetected(true)
            } else {
              setFaceDetected(false)
            }
          })
          return fm
        }

        // ── Single-instance initialisation ─────────────────────────────────
        //
        // CRITICAL: create ONE FaceMesh and call initialize() ONCE.
        //
        // The old retry loop called makeFM() up to 4× (3 retries + 1 fallback).
        // Every new FaceMesh() constructor calls createMediapipeSolutionsWasm →
        // staticInit, which registers the model files into the Emscripten virtual
        // FS. The second call finds those files already present → EEXIST (errno 20)
        // → the packed-assets loader hangs on "still waiting on run dependencies"
        // forever and face tracking never starts.
        //
        // The false-alarm abort() MediaPipe throws during initialize() does NOT
        // corrupt the instance — it remains fully usable. We simply swallow it
        // and continue with the same fm object.
        if (!mountedRef.current) return
        const fm = makeFM()

        try {
          await fm.initialize()
        } catch (e) {
          if (!isFalseAlarm(e)) {
            try { fm.close() } catch { /* ignore */ }
            throw e   // genuine failure — let the outer catch handle it
          }
          // False-alarm abort probe — instance is intact, carry on
          console.warn('[TryOn] MediaPipe false-alarm during initialize() — instance usable, continuing.')
        }

        if (!mountedRef.current) { try { fm.close() } catch { /* ignore */ }; return }

        fmRef.current = fm
        setIsModelLoading(false)
        setModelError(null)

      } catch (e) {
        if (!mountedRef.current) return
        // Last-resort: if even the propagated error is a false-alarm, hide it
        if (isFalseAlarm(e)) {
          console.warn('[TryOn] Suppressing false-alarm from modelError.')
          setIsModelLoading(false)
          return
        }
        const msg = e instanceof Error ? e.message : String(e)
        console.error('[TryOn] init failed:', msg)
        setModelError(msg)
        setIsModelLoading(false)
      }
    })()

    return () => {
      mountedRef.current = false
      fmRef.current?.close()
      fmRef.current = null
    }
  }, [])

  const processFrame = useCallback(async (video: HTMLVideoElement) => {
    const fm = fmRef.current
    if (!fm) return
    if (video.readyState < 2 || video.paused || video.ended) return
    if (sendingRef.current) return   // skip if previous send still in-flight

    frameRef.current++
    if (frameRef.current % PROCESS_THROTTLE !== 0) return

    sendingRef.current = true
    try {
      await fm.send({ image: video })
    } catch {
      // suppress teardown / WASM abort noise
    } finally {
      sendingRef.current = false
    }
  }, [])   // ← no deps: fmRef is a ref, always stable

  return { landmarks, isModelLoading, modelError, processFrame, faceDetected }
}