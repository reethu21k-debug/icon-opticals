// components/try-on/types.ts
// ── Shared types for the Virtual Try-On feature ──────────────────────────────

/** A single MediaPipe normalized landmark: coordinates in [0, 1] */
export interface NormalizedLandmark {
  x: number
  y: number
  z: number
}

/** Frame physical dimensions, all in millimetres */
export interface FrameDimensions {
  frameWidth: number      // temple-to-temple total width
  lensWidth: number       // individual lens width
  bridgeWidth: number     // nose bridge
  templeLength: number    // ear-arm length
  frameHeight: number     // vertical lens height
}

/** Computed glasses transform in canvas pixel-space */
export interface GlassesTransform {
  /** Glasses centre X (pixels) */
  x: number
  /** Glasses centre Y (pixels) */
  y: number
  /** Rendered width (pixels) */
  width: number
  /** Rendered height (pixels) */
  height: number
  /** Roll angle in radians (follows head tilt) */
  angle: number
  /** Horizontal perspective scale (1.0 = frontal, <1 = turned face) */
  scaleX: number
  /** Depth signal — positive = closer to camera */
  depthOffset: number
  /** Confidence 0-1; below 0.5 we skip rendering */
  confidence: number
}

/** State returned by useFaceTracking */
export interface FaceTrackingState {
  /** Smoothed landmark array (478 landmarks w/ iris refinement) */
  landmarks: NormalizedLandmark[] | null
  /** True while the MediaPipe model is still downloading/initialising */
  isModelLoading: boolean
  /** Non-null when initialisation failed */
  modelError: string | null
  /** Send a video frame for processing; call each RAF iteration */
  processFrame: (video: HTMLVideoElement) => Promise<void>
  /** True once a face has been detected in current session */
  faceDetected: boolean
}

/** Camera access status */
export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'error'

/** Minimal product shape the try-on needs */
export interface TryOnProduct {
  id: string
  name: string
  brand: string
  /** Transparent PNG URL — preferred overlay source */
  try_on_image_url: string | null
  /** Fallback product images */
  images: Array<{ url: string; is_primary?: boolean }>
  frame_width_mm: number | null
  lens_width_mm: number | null
  bridge_width_mm: number | null
  temple_length_mm: number | null
  frame_height_mm: number | null
}
