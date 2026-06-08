// // lib/cloudinary-url.ts
// // Browser-safe Cloudinary URL builder — NO Node.js SDK dependency.
// // Safe to import from client components and server components alike.

// // ── Image URL builder ─────────────────────────────────────────────────────────

// export function getOptimizedUrl(
//   publicId: string,
//   options: {
//     width?:   number
//     height?:  number
//     quality?: string
//     format?:  string
//   } = {},
// ): string {
//   const {
//     width   = 400,
//     height  = 400,
//     quality = 'auto:good',
//     format  = 'auto',
//   } = options

//   const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

//   if (!cloudName) {
//     console.warn(
//       '[cloudinary-url] NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set. ' +
//       'Add it to .env.local and restart the dev server.',
//     )
//     return ''
//   }

//   const transforms = [
//     `f_${format}`,
//     `q_${quality}`,
//     width  ? `w_${width}`  : '',
//     height ? `h_${height}` : '',
//     'c_fill',
//   ]
//     .filter(Boolean)
//     .join(',')

//   return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}`
// }

// // ── Invoice URL helpers ───────────────────────────────────────────────────────

// /**
//  * Corrects legacy invoice URLs that were uploaded with resource_type:'image'
//  * instead of 'raw'. The /image/upload/ prefix causes Cloudinary to attempt
//  * image transformations on a PDF, resulting in 400/404. Rewriting to
//  * /raw/upload/ makes the URL resolve correctly.
//  *
//  * New invoices already have /raw/upload/ and pass through unchanged.
//  */
// export function fixInvoiceUrl(url: string): string {
//   if (!url) return url
//   return url.replace('/image/upload/', '/raw/upload/')
// }

// /**
//  * Returns a URL that goes through the /api/view-invoice Next.js proxy.
//  *
//  * WHY WE PROXY:
//  *   Cloudinary serves raw resources with Content-Disposition: attachment by
//  *   default, causing browsers to download rather than display the PDF.
//  *   Additionally, the raw Cloudinary CDN URL requires signed access that is
//  *   subject to CDN-level auth restrictions (which caused the 401 errors).
//  *
//  *   The proxy route (/api/view-invoice) fetches the PDF via Cloudinary's API
//  *   endpoint (not the CDN), bypasses all CDN auth restrictions, and re-serves
//  *   the bytes with:
//  *     Content-Type: application/pdf
//  *     Content-Disposition: inline        (opens in browser PDF viewer)
//  *
//  * USE THIS EVERYWHERE a user is expected to VIEW the invoice (order detail
//  * page, account orders page, etc.).
//  *
//  * For download links, append &dl=1:
//  *   getInvoiceViewUrl(url) + '&dl=1'
//  */
// export function getInvoiceViewUrl(url: string): string {
//   if (!url) return ''
//   const fixed = fixInvoiceUrl(url)
//   return `/api/view-invoice?url=${encodeURIComponent(fixed)}`
// }

// /**
//  * Returns an absolute view URL (includes the app base URL).
//  * Use this in emails and WhatsApp messages where relative URLs don't work.
//  */
// export function getInvoiceViewUrlAbsolute(url: string, baseUrl: string): string {
//   if (!url) return ''
//   const relative = getInvoiceViewUrl(url)
//   const base = baseUrl.replace(/\/$/, '')
//   return `${base}${relative}`
// }
// lib/cloudinary-url.ts
// Browser-safe Cloudinary URL builder — NO Node.js SDK dependency.
// Safe to import from client components and server components alike.

// ── Image URL builder ─────────────────────────────────────────────────────────

export function getOptimizedUrl(
  publicId: string,
  options: {
    width?:   number
    height?:  number
    quality?: string
    format?:  string
    /**
     * Cloudinary crop mode.
     * - 'fill'  (default) — crops to exact dimensions, may cut off edges
     * - 'pad'   — pads with background colour, never crops (use for product cards)
     * - 'fit'   — scales down to fit within dimensions, no crop, no pad
     * - 'scale' — stretches/squishes to exact dimensions
     */
    crop?:    'fill' | 'pad' | 'fit' | 'scale'
    /** Background colour used when crop='pad'. Cloudinary colour name or hex without #. Defaults to 'white'. */
    background?: string
  } = {},
): string {
  const {
    width      = 400,
    height     = 400,
    quality    = 'auto:good',
    format     = 'auto',
    crop       = 'fill',
    background,
  } = options

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

  if (!cloudName) {
    console.warn(
      '[cloudinary-url] NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set. ' +
      'Add it to .env.local and restart the dev server.',
    )
    return ''
  }

  const transforms = [
    `f_${format}`,
    `q_${quality}`,
    width  ? `w_${width}`  : '',
    height ? `h_${height}` : '',
    `c_${crop}`,
    crop === 'pad' ? `b_${background ?? 'white'}` : '',
  ]
    .filter(Boolean)
    .join(',')

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}`
}

// ── Invoice URL helpers ───────────────────────────────────────────────────────

/**
 * Corrects legacy invoice URLs that were uploaded with resource_type:'image'
 * instead of 'raw'. The /image/upload/ prefix causes Cloudinary to attempt
 * image transformations on a PDF, resulting in 400/404. Rewriting to
 * /raw/upload/ makes the URL resolve correctly.
 *
 * New invoices already have /raw/upload/ and pass through unchanged.
 */
export function fixInvoiceUrl(url: string): string {
  if (!url) return url
  return url.replace('/image/upload/', '/raw/upload/')
}

/**
 * Returns a URL that goes through the /api/view-invoice Next.js proxy.
 *
 * WHY WE PROXY:
 *   Cloudinary serves raw resources with Content-Disposition: attachment by
 *   default, causing browsers to download rather than display the PDF.
 *   Additionally, the raw Cloudinary CDN URL requires signed access that is
 *   subject to CDN-level auth restrictions (which caused the 401 errors).
 *
 *   The proxy route (/api/view-invoice) fetches the PDF via Cloudinary's API
 *   endpoint (not the CDN), bypasses all CDN auth restrictions, and re-serves
 *   the bytes with:
 *     Content-Type: application/pdf
 *     Content-Disposition: inline        (opens in browser PDF viewer)
 *
 * USE THIS EVERYWHERE a user is expected to VIEW the invoice (order detail
 * page, account orders page, etc.).
 *
 * For download links, append &dl=1:
 *   getInvoiceViewUrl(url) + '&dl=1'
 */
export function getInvoiceViewUrl(url: string): string {
  if (!url) return ''
  const fixed = fixInvoiceUrl(url)
  return `/api/view-invoice?url=${encodeURIComponent(fixed)}`
}

/**
 * Returns an absolute view URL (includes the app base URL).
 * Use this in emails and WhatsApp messages where relative URLs don't work.
 */
export function getInvoiceViewUrlAbsolute(url: string, baseUrl: string): string {
  if (!url) return ''
  const relative = getInvoiceViewUrl(url)
  const base = baseUrl.replace(/\/$/, '')
  return `${base}${relative}`
}