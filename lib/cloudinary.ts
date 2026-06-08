// lib/cloudinary.ts
// SERVER-SIDE ONLY — Do NOT import this in client components.
// For URL building in client components, use lib/cloudinary-url.ts instead.
//
// ─── DESIGN NOTES ────────────────────────────────────────────────────────────
//
// 1. ENV VALIDATION AT CALL TIME, NOT MODULE LOAD
//    The original code threw at module-load time if env vars were missing. On
//    Vercel this caused the entire serverless function bundle to fail to
//    initialise, producing cryptic 500 errors with no useful message. We now
//    validate lazily (inside getCloudinary()) so the error is caught and logged
//    at the point where Cloudinary is actually used, not during cold-start.
//
// 2. SINGLE CONFIGURED INSTANCE
//    We cache the configured instance after the first successful call to avoid
//    re-configuring cloudinary on every request in the same process.
//
// 3. UPLOAD ERROR SURFACE
//    uploadInvoicePDF() validates the PDF magic bytes before even calling
//    Cloudinary, so the caller gets a clear error immediately rather than
//    uploading garbage and discovering the problem later.
//
// 4. RAW RESOURCE FORMAT
//    For PDF invoices we use resource_type:'raw' + format:'pdf'.
//    - resource_type:'raw' → Cloudinary stores the file as-is (no image
//      processing, no transcoding).
//    - format:'pdf' → Appends .pdf to the delivery URL and sets
//      Content-Type:application/pdf on the CDN response.
//    - public_id stored WITHOUT extension (Cloudinary handles the extension
//      via the format parameter). The secure_url ends in .pdf.
//    - overwrite:true → Re-generating an invoice replaces the old file in
//      Cloudinary. The version number increments. The DB is always updated
//      with the new URL, so there is no stale-version problem.
//
// ─────────────────────────────────────────────────────────────────────────────

import { v2 as cloudinaryV2 } from 'cloudinary'

// ── Lazy singleton ────────────────────────────────────────────────────────────

let _initialized = false

function getCloudinary() {
  if (_initialized) return cloudinaryV2

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey    = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  const missing = (
    [
      !cloudName && 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
      !apiKey    && 'CLOUDINARY_API_KEY',
      !apiSecret && 'CLOUDINARY_API_SECRET',
    ] as Array<string | false>
  ).filter(Boolean) as string[]

  if (missing.length > 0) {
    throw new Error(
      `[cloudinary] Missing environment variable(s): ${missing.join(', ')}. ` +
      `Add them to .env.local (dev) or Vercel Environment Variables (prod). ` +
      `Find your values at https://console.cloudinary.com → Dashboard.`,
    )
  }

  cloudinaryV2.config({
    cloud_name: cloudName as string,
    api_key:    apiKey    as string,
    api_secret: apiSecret as string,
    secure:     true,
  })

  _initialized = true
  return cloudinaryV2
}

// Export the configured instance for use in route handlers.
// Accessing this property triggers lazy initialization.
export const cloudinary: typeof cloudinaryV2 = new Proxy(cloudinaryV2, {
  get(target, prop) {
    // Ensure initialized before any property access
    getCloudinary()
    return Reflect.get(target, prop)
  },
})

// ── Product image upload ──────────────────────────────────────────────────────

export async function uploadProductImage(
  file: string,
  productId: string,
  index: number,
): Promise<{ url: string; public_id: string }> {
  const cl = getCloudinary()
  const result = await cl.uploader.upload(file, {
    folder:        `lenskart/products/${productId}`,
    public_id:     `img_${index}`,
    overwrite:     true,
    format:        'webp',
    transformation: [
      { width: 800, height: 800, crop: 'fill', gravity: 'auto' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
    ],
  })
  return { url: result.secure_url, public_id: result.public_id }
}

// ── Invoice PDF upload ────────────────────────────────────────────────────────

/**
 * Uploads a PDF buffer to Cloudinary and returns the public URL + public_id.
 *
 * The returned `url` (result.secure_url) looks like:
 *   https://res.cloudinary.com/{cloud}/raw/upload/v{version}/lenskart/invoices/invoice_{order}.pdf
 *
 * The returned `public_id` (result.public_id) looks like:
 *   lenskart/invoices/invoice_{order}   ← WITHOUT .pdf extension
 *
 * This asymmetry (extension in URL, not in public_id) is standard Cloudinary
 * behaviour when format is specified separately from public_id for raw uploads.
 *
 * IMPORTANT: Always store BOTH url AND public_id in your database. The
 * view-invoice route derives public_id from the URL, but having it stored
 * directly avoids parsing ambiguity.
 */
export async function uploadInvoicePDF(
  pdfBuffer: Buffer,
  orderNumber: string,
): Promise<{ url: string; public_id: string }> {
  // ── Validate buffer ────────────────────────────────────────────────────

  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length < 10) {
    throw new Error(
      `[uploadInvoicePDF] Invalid buffer: expected Buffer with at least 10 bytes, ` +
      `got ${Buffer.isBuffer(pdfBuffer) ? pdfBuffer.length + ' bytes' : typeof pdfBuffer}`,
    )
  }

  const magic = pdfBuffer.slice(0, 5).toString('ascii')
  if (!magic.startsWith('%PDF-')) {
    throw new Error(
      `[uploadInvoicePDF] Buffer is not a valid PDF (expected "%PDF-", ` +
      `got "${magic}"). Check that generatePDFBuffer() completed without errors.`,
    )
  }

  // ── Build upload payload ───────────────────────────────────────────────

  // Base64 data-URI upload: more reliable than upload_stream for binary
  // payloads in serverless environments where the writable stream lifecycle
  // can be unpredictable. The entire buffer is sent in a single request body.
  const base64Payload = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`

  // Sanitise order number for use as a Cloudinary public_id segment.
  // Cloudinary public_ids allow: a-z A-Z 0-9 _ - / .
  // We replace anything else with underscores.
  const safeName = orderNumber.replace(/[^a-zA-Z0-9_\-.]/g, '_')

  const cl = getCloudinary()

  console.log(`[uploadInvoicePDF] Uploading ${pdfBuffer.length} bytes for order "${orderNumber}"`)

  let result: Awaited<ReturnType<typeof cl.uploader.upload>>
  try {
    result = await cl.uploader.upload(base64Payload, {
      folder:        'lenskart/invoices',
      public_id:     `invoice_${safeName}`,  // WITHOUT .pdf — format param handles extension
      resource_type: 'raw',
      format:        'pdf',
      overwrite:     true,      // re-generating replaces the old file; version increments
      type:          'upload',  // default; explicit for clarity
      // Do NOT add image transformations — raw resources don't support them
    })
  } catch (err) {
    console.error('[uploadInvoicePDF] Cloudinary upload failed:', err)
    throw new Error(
      `[uploadInvoicePDF] Upload to Cloudinary failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  console.log(
    `[uploadInvoicePDF] Upload succeeded.`,
    `\n  public_id  : ${result.public_id}`,
    `\n  secure_url : ${result.secure_url}`,
    `\n  version    : ${result.version}`,
    `\n  bytes      : ${result.bytes}`,
  )

  // Validate that the returned URL is a /raw/upload/ URL (not /image/upload/)
  if (!result.secure_url.includes('/raw/upload/')) {
    console.warn(
      '[uploadInvoicePDF] Unexpected URL pattern — expected /raw/upload/:',
      result.secure_url,
    )
  }

  return {
    url:       result.secure_url,
    public_id: result.public_id,
  }
}

// ── Image deletion ────────────────────────────────────────────────────────────

export async function deleteImage(publicId: string): Promise<void> {
  const cl = getCloudinary()
  await cl.uploader.destroy(publicId)
}

// ── Upload signature for client-side prescription uploads ────────────────────

export async function generateUploadSignature(): Promise<{
  signature:  string
  timestamp:  number
  cloudName:  string
  apiKey:     string
}> {
  const cl        = getCloudinary()
  const apiSecret = process.env.CLOUDINARY_API_SECRET as string
  const apiKey    = process.env.CLOUDINARY_API_KEY    as string
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string

  const timestamp = Math.round(Date.now() / 1000)
  const folder    = 'lenskart/prescriptions'

  const signature = cl.utils.api_sign_request(
    { timestamp, folder },
    apiSecret,
  )

  return { signature, timestamp, cloudName, apiKey }
}