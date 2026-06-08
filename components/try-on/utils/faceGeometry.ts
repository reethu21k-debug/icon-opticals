// components/try-on/utils/faceGeometry.ts
// ── All face-landmark mathematics for accurate glasses placement ─────────────
//
// COORDINATE NOTES:
//   - MediaPipe selfieMode:false → raw camera space (x=0 is physical left)
//   - Canvas has ctx.scale(-1,1) applied before drawGlasses for mirror mode
//   - All pixel values are in native video resolution space
//
// MEDIAPIPE FACE MESH LANDMARK REFERENCE (key points used here):
//   Right eye (user's right, camera left):
//     33  = outer corner, 133 = inner corner, 159 = top, 145 = bottom
//   Left eye (user's left, camera right):
//     263 = outer corner, 362 = inner corner, 386 = top, 374 = bottom
//   Iris (only with refineLandmarks:true, 478 total landmarks):
//     468 = right iris centre, 473 = left iris centre
//   Face outline:
//     234 = right cheek/jaw (NOT temple — it's too low)
//     454 = left  cheek/jaw (NOT temple — it's too low)
//     162 = right temple region (upper cheekbone / temporal)
//     389 = left  temple region (upper cheekbone / temporal)
//     127 = right hairline temple
//     356 = left  hairline temple
//   Nose:
//     6   = nose bridge (between eyes)
//     168 = nose root (glabella)
//     4   = nose tip
//   Forehead / chin:
//     10  = forehead top, 152 = chin bottom

import type { NormalizedLandmark, FrameDimensions, GlassesTransform } from '../types'

// ── Landmark indices ─────────────────────────────────────────────────────────
export const LM = {
  // Right eye (camera-left)
  RE_OUTER:  33,
  RE_INNER:  133,
  RE_TOP:    159,
  RE_BOTTOM: 145,
  RE_IRIS:   468,   // iris refinement only

  // Left eye (camera-right)
  LE_OUTER:  263,
  LE_INNER:  362,
  LE_TOP:    386,
  LE_BOTTOM: 374,
  LE_IRIS:   473,   // iris refinement only

  // Nose
  NOSE_BRIDGE: 6,    // between the eyes, glabella area
  NOSE_ROOT:   168,  // slightly higher than bridge
  NOSE_TIP:    4,

  // Temples — upper cheekbone region (much more accurate than 234/454)
  // 127 & 356 are the hairline-level temporal points
  // 162 & 389 are the mid-temple / upper cheekbone points
  R_TEMPLE_HIGH: 127,
  L_TEMPLE_HIGH: 356,
  R_TEMPLE_MID:  162,
  L_TEMPLE_MID:  389,

  // Jaw / cheek (used only for face-width fallback, not temple placement)
  R_JAW: 234,
  L_JAW: 454,

  // Forehead / chin
  FOREHEAD: 10,
  CHIN:     152,
} as const

// ── Primitives ───────────────────────────────────────────────────────────────
type Pt = { x: number; y: number; z: number }

function toPx(lm: NormalizedLandmark, w: number, h: number): Pt {
  return { x: lm.x * w, y: lm.y * h, z: lm.z * w }
}

function dist2(a: Pt, b: Pt): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function centroid(pts: Pt[]): Pt {
  const n = pts.length
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / n,
    y: pts.reduce((s, p) => s + p.y, 0) / n,
    z: pts.reduce((s, p) => s + p.z, 0) / n,
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// ── Smoothing ────────────────────────────────────────────────────────────────
export function smoothLandmarks(
  next: NormalizedLandmark[],
  prev: NormalizedLandmark[] | null,
  alpha = 0.55,
): NormalizedLandmark[] {
  if (!prev || prev.length !== next.length) return next
  return next.map((lm, i) => ({
    x: lerp(prev[i].x, lm.x, alpha),
    y: lerp(prev[i].y, lm.y, alpha),
    z: lerp(prev[i].z, lm.z, alpha),
  }))
}

// ── Main transform ───────────────────────────────────────────────────────────
export function calculateGlassesTransform(
  landmarks: NormalizedLandmark[],
  cw: number,
  ch: number,
  dims: FrameDimensions | null,
  imgW: number,
  imgH: number,
): GlassesTransform {

  const hasIris = landmarks.length >= 478

  // ── 1. Iris / eye centres ────────────────────────────────────────────────
  const reIris = hasIris
    ? toPx(landmarks[LM.RE_IRIS], cw, ch)
    : centroid([
        toPx(landmarks[LM.RE_OUTER],  cw, ch),
        toPx(landmarks[LM.RE_INNER],  cw, ch),
        toPx(landmarks[LM.RE_TOP],    cw, ch),
        toPx(landmarks[LM.RE_BOTTOM], cw, ch),
      ])

  const leIris = hasIris
    ? toPx(landmarks[LM.LE_IRIS], cw, ch)
    : centroid([
        toPx(landmarks[LM.LE_OUTER],  cw, ch),
        toPx(landmarks[LM.LE_INNER],  cw, ch),
        toPx(landmarks[LM.LE_TOP],    cw, ch),
        toPx(landmarks[LM.LE_BOTTOM], cw, ch),
      ])

  // ── 2. Eye geometry ──────────────────────────────────────────────────────
  const reTop    = toPx(landmarks[LM.RE_TOP],    cw, ch)
  const reBottom = toPx(landmarks[LM.RE_BOTTOM], cw, ch)
  const leTop    = toPx(landmarks[LM.LE_TOP],    cw, ch)
  const leBottom = toPx(landmarks[LM.LE_BOTTOM], cw, ch)

  // Inter-pupillary distance in pixels
  const ipdPx = dist2(reIris, leIris)

  // Average eye opening height
  const eyeHeightPx = (dist2(reTop, reBottom) + dist2(leTop, leBottom)) / 2

  // ── 3. Temple points ─────────────────────────────────────────────────────
  const rTempleMid  = toPx(landmarks[LM.R_TEMPLE_MID],  cw, ch)
  const lTempleMid  = toPx(landmarks[LM.L_TEMPLE_MID],  cw, ch)
  const rTempleHigh = toPx(landmarks[LM.R_TEMPLE_HIGH], cw, ch)
  const lTempleHigh = toPx(landmarks[LM.L_TEMPLE_HIGH], cw, ch)

  // 70% HIGH + 30% MID → reaches the ear-level hinge point
  // The HIGH landmarks (127/356) are at the hairline/temple junction where
  // the arm actually hooks over the ear. More weight here = wider, correct fit.
  const rTemple: Pt = {
    x: lerp(rTempleMid.x, rTempleHigh.x, 0.7),
    y: lerp(rTempleMid.y, rTempleHigh.y, 0.7),
    z: lerp(rTempleMid.z, rTempleHigh.z, 0.7),
  }
  const lTemple: Pt = {
    x: lerp(lTempleMid.x, lTempleHigh.x, 0.7),
    y: lerp(lTempleMid.y, lTempleHigh.y, 0.7),
    z: lerp(lTempleMid.z, lTempleHigh.z, 0.7),
  }

  const faceWidthPx = dist2(rTemple, lTemple)

  // ── 4. Nose reference ────────────────────────────────────────────────────
  const noseBridge = toPx(landmarks[LM.NOSE_BRIDGE], cw, ch)
  const noseTip    = toPx(landmarks[LM.NOSE_TIP],    cw, ch)

  // ── 5. Glasses centre X ──────────────────────────────────────────────────
  // Blend iris midpoint (80%) with nose bridge X (20%).
  // The nose bridge is always on the face's true vertical axis — this corrects
  // any subtle iris-landmark asymmetry that causes the horizontal drift.
  const irisX = (reIris.x + leIris.x) / 2
  const midX  = lerp(irisX, noseBridge.x, 0.2)

  // ── 6. Glasses centre Y ──────────────────────────────────────────────────
  //
  // WHAT WE WANT: the lens optical centres (pupil apertures in the PNG) must
  // land exactly on the iris landmarks.
  //
  // The glasses PNG is drawn so the pupil holes are at the IMAGE CENTRE Y.
  // Therefore: canvas draw-centre Y = iris Y.
  //
  // The only correction needed is for the nose-pad physics: real glasses rest
  // with the pad touching the nose, which places the frame's CENTRE slightly
  // ABOVE the iris (the lens bottom edge is at nose-bridge, not below it).
  // Empirically this is ~0.3× the eye-opening height upward.
  //
  // midY = irisY - eyeHeightPx × 0.3
  //
  // (Canvas Y positive = DOWN, so subtracting moves UP toward the forehead.)
  const irisY = (reIris.y + leIris.y) / 2
  const midY  = irisY - eyeHeightPx * 0.3

  // ── 7. Roll (head tilt) ──────────────────────────────────────────────────
  const roll = Math.atan2(leIris.y - reIris.y, leIris.x - reIris.x)

  // ── 8. Yaw (horizontal head turn) ───────────────────────────────────────
  const faceCentreX = (rTemple.x + lTemple.x) / 2
  const halfFaceW   = Math.max(faceWidthPx * 0.5, 1)
  const noseTipYaw  = (noseTip.x - faceCentreX) / halfFaceW
  const eyeMidYaw   = (midX      - faceCentreX) / halfFaceW
  const rawYaw      = lerp(noseTipYaw, eyeMidYaw, 0.3)
  const yawNorm     = Math.max(-1, Math.min(1, rawYaw))
  const scaleX      = Math.cos(Math.asin(Math.abs(yawNorm) * 0.75))

  // ── 9. Depth cue ─────────────────────────────────────────────────────────
  const depthOffset = (ipdPx / cw) * 20

  // ── 10. Width calculation ────────────────────────────────────────────────
  //
  // Drive width from the temple-to-temple pixel distance, scaled by the
  // frame-width-to-face-width ratio.
  //
  // The glasses PNG includes the full temple arms. A standard adult face is
  // ~138 mm temple-to-temple. We add 1.15× padding because the landmark
  // points are still slightly inside the physical ear position.
  const AVG_FACE_WIDTH_MM = 138
  const frameWidthMM      = dims?.frameWidth ?? AVG_FACE_WIDTH_MM
  const widthScale        = frameWidthMM / AVG_FACE_WIDTH_MM

  const glassesWidthPx = faceWidthPx * widthScale * 1.15

  // ── 11. Height ───────────────────────────────────────────────────────────
  const aspectRatio     = imgH > 0 ? imgH / imgW : 0.35
  const glassesHeightPx = glassesWidthPx * aspectRatio

  // ── 12. Confidence ───────────────────────────────────────────────────────
  const confidence = Math.min(1, ipdPx / (cw * 0.018))

  return {
    x:           midX,
    y:           midY,
    width:       glassesWidthPx,
    height:      glassesHeightPx,
    angle:       roll,
    scaleX:      Math.max(0.3, scaleX),
    depthOffset,
    confidence,
  }
}

// ── Draw glasses ──────────────────────────────────────────────────────────────
export function drawGlasses(
  ctx:       CanvasRenderingContext2D,
  img:       HTMLImageElement,
  transform: GlassesTransform,
  opacity = 1,
): void {
  if (transform.confidence < 0.15 || !img.complete || img.naturalWidth === 0) return

  // Smooth fade-in between confidence 0.15 → 0.45
  const normalised       = Math.max(0, (transform.confidence - 0.15) / 0.30)
  const effectiveOpacity = opacity * Math.min(1, normalised)

  ctx.save()
  ctx.globalAlpha = effectiveOpacity

  ctx.translate(transform.x, transform.y)
  ctx.rotate(transform.angle)
  ctx.scale(transform.scaleX, 1)

  ctx.drawImage(
    img,
    -transform.width  / 2,
    -transform.height / 2,
     transform.width,
     transform.height,
  )

  ctx.restore()
}

// ── Screenshot compositor ─────────────────────────────────────────────────────
export function compositeScreenshot(
  video:      HTMLVideoElement,
  glassesImg: HTMLImageElement,
  transform:  GlassesTransform,
  isMirrored: boolean,
): string {
  const w = video.videoWidth 
  const h = video.videoHeight

  const offscreen = document.createElement('canvas')
  offscreen.width  = w
  offscreen.height = h
  const ctx = offscreen.getContext('2d')!

  // Draw video (mirrored if needed)
  ctx.save()
  if (isMirrored) { ctx.translate(w, 0); ctx.scale(-1, 1) }
  ctx.drawImage(video, 0, 0, w, h)
  ctx.restore()

  // Draw glasses on top (same mirror applied so it aligns with video)
  ctx.save()
  if (isMirrored) { ctx.translate(w, 0); ctx.scale(-1, 1) }
  drawGlasses(ctx, glassesImg, transform)
  ctx.restore()

  return offscreen.toDataURL('image/png')
}