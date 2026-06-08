'use client'
// components/try-on/TryOnCanvas.tsx
// ── Canvas overlay that draws glasses aligned to the webcam feed ─────────────
//
// COORDINATE SYSTEM (important):
//
//   MediaPipe FaceMesh (selfieMode: false):
//     Returns landmarks in RAW camera space — x=0 is physical left of frame.
//     user's right eye ≈ x:0.35, left eye ≈ x:0.65 in raw space.
//
//   Video element:
//     Has CSS `transform: scaleX(-1)` applied by the parent so it looks like
//     a mirror / selfie view to the user.
//
//   Canvas:
//     NO CSS transform — stays in raw pixel space.
//     In the draw loop we apply ctx.scale(-1,1) + ctx.translate(-w,0) to flip
//     the drawing output, making it match the mirrored video.
//
//   Result: glasses pixels land exactly on the correct eye positions.
//
// FIXES vs original implementation:
//   1. canvas.width/height = video.videoWidth/Height (native res, not CSS px)
//   2. Single ctx flip in drawFrame (no CSS mirror on canvas — avoids double-flip)
//   3. img.crossOrigin = 'anonymous' + wait for onload
//   4. syncCanvasSize on loadedmetadata so it works even if video resizes
//   5. latestLm ref pattern — RAF loop never goes stale

import { useEffect, useRef, useCallback } from 'react'
import { calculateGlassesTransform, drawGlasses } from './utils/faceGeometry'
import type { NormalizedLandmark, FrameDimensions, GlassesTransform } from './types'

interface TryOnCanvasProps {
  landmarks:    NormalizedLandmark[] | null
  videoRef:     React.RefObject<HTMLVideoElement>
  glassesUrl:   string
  frameDims?:   FrameDimensions | null
  /** true = video has CSS scaleX(-1) mirror applied (default for selfie view) */
  isMirrored?:  boolean
  opacity?:     number
  onTransform?: (t: GlassesTransform) => void
}

export function TryOnCanvas({
  landmarks,
  videoRef,
  glassesUrl,
  frameDims    = null,
  isMirrored   = true,
  opacity      = 1,
  onTransform,
}: TryOnCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef    = useRef<HTMLImageElement | null>(null)
  const rafRef    = useRef<number>(0)
  const latestLm  = useRef<NormalizedLandmark[] | null>(null)

  // Keep landmark ref hot without triggering RAF re-registration
  useEffect(() => { latestLm.current = landmarks }, [landmarks])

  // ── Load glasses PNG ────────────────────────────────────────────────────
  useEffect(() => {
    if (!glassesUrl) { imgRef.current = null; return }

    const img       = new Image()
    img.crossOrigin = 'anonymous'
    img.src         = glassesUrl
    imgRef.current  = img   // set immediately; drawGlasses checks img.complete

    img.onerror = () => {
      console.error('[TryOnCanvas] Could not load glasses image:', glassesUrl)
      imgRef.current = null
    }

    return () => { imgRef.current = null }
  }, [glassesUrl])

  // ── Sync canvas intrinsic size → video native resolution ────────────────
  const syncSize = useCallback(() => {
    const v = videoRef.current
    const c = canvasRef.current
    if (!v || !c) return
    if (v.videoWidth > 0 && v.videoHeight > 0) {
      if (c.width !== v.videoWidth)  c.width  = v.videoWidth
      if (c.height !== v.videoHeight) c.height = v.videoHeight
    }
  }, [videoRef])

  // ── RAF draw loop ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const video  = videoRef.current
    if (!canvas || !video) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    syncSize()
    video.addEventListener('loadedmetadata', syncSize)
    video.addEventListener('resize', syncSize)          // handles mid-session res changes

    let running = true

    function frame() {
      if (!running) return
      rafRef.current = requestAnimationFrame(frame)

      const lm  = latestLm.current
      const img = imgRef.current
      const cw  = canvas!.width
      const ch  = canvas!.height

      ctx!.clearRect(0, 0, cw, ch)

      if (!lm || lm.length === 0 || !img || !img.complete || img.naturalWidth === 0 || cw === 0 || ch === 0) return

      // Compute in native video coordinate space
      const transform = calculateGlassesTransform(
        lm, cw, ch, frameDims ?? null, img.naturalWidth, img.naturalHeight
      )
      onTransform?.(transform)

      // ── Mirror context to match CSS-flipped video ─────────────────────
      //
      // The video is CSS scaleX(-1). The canvas has NO CSS transform.
      // We flip the ctx so what we draw ends up visually aligned with
      // the mirrored video. One flip here, no CSS flip on the element.
      ctx!.save()
      if (isMirrored) {
        ctx!.translate(cw, 0)
        ctx!.scale(-1, 1)
      }

      drawGlasses(ctx!, img, transform, opacity)

      ctx!.restore()
    }

    rafRef.current = requestAnimationFrame(frame)

    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
      video.removeEventListener('loadedmetadata', syncSize)
      video.removeEventListener('resize', syncSize)
    }
  }, [videoRef, isMirrored, opacity, frameDims, onTransform, syncSize])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'absolute',
        inset:         0,
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',
        // NO CSS transform here — mirroring is handled by ctx.scale in the draw loop
      }}
    />
  )
}