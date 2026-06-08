// app/api/view-invoice/route.ts
//
// Proxy route: fetches the PDF from Cloudinary via the API (not CDN) and
// re-serves it with:
//   Content-Type: application/pdf
//   Content-Disposition: inline  (or attachment when ?dl=1)
//
// ─── WHY THE ORIGINAL CODE RETURNED 401 ────────────────────────────────────
//
// cloudinary.url() with sign_url:true generates a CDN URL (res.cloudinary.com).
// Cloudinary CDN has its own access-control layer that returns 401 regardless
// of whether the signature is cryptographically valid, if the account delivery
// mode doesn't allow signed delivery for that resource type.
//
// Fix: use cloudinary.utils.private_download_url() which targets
// api.cloudinary.com (not the CDN). Auth is via HMAC-SHA256 query-string
// signature. CDN delivery restrictions do not apply to the API endpoint.
//
// ─── WHY THE SECOND VERSION RETURNED 404 ──────────────────────────────────
//
// For resource_type:'raw' uploads, Cloudinary ALWAYS stores the file extension
// inside the public_id — even when format:'pdf' is passed separately in the
// upload options. So the actual stored public_id is:
//
//   lenskart/invoices/invoice_ORD-XXXX.pdf   ← .pdf IS part of public_id
//
// The previous version stripped '.pdf' before calling private_download_url,
// then re-added it via format:'pdf'. Cloudinary looked up 'invoice_ORD-XXXX'
// (no extension) → not found → 404.
//
// Fix: keep '.pdf' in the public_id. Pass null as format to private_download_url.
//
// ─── VERCEL / SERVERLESS ────────────────────────────────────────────────────
// runtime:'nodejs' is mandatory. Edge runtime lacks Node crypto (needed by
// Cloudinary SDK for HMAC-SHA256). Add 'cloudinary' to
// serverComponentsExternalPackages in next.config.js.

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { cloudinary } from '@/lib/cloudinary'

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parses a Cloudinary secure_url and returns the public_id exactly as
 * Cloudinary stored it — WITH the .pdf extension for raw resources.
 *
 * Handles:
 *   /raw/upload/v{version}/{folder}/{name}.pdf   ← current uploads
 *   /raw/upload/{folder}/{name}.pdf              ← no version prefix
 *   /image/upload/...                            ← legacy wrong resource_type
 *
 * Returns null if URL doesn't belong to our Cloudinary cloud.
 */
function parseCloudinaryUrl(url: string, cloudName: string): string | null {
  const prefixes = [
    `https://res.cloudinary.com/${cloudName}/raw/upload/`,
    `https://res.cloudinary.com/${cloudName}/image/upload/`,
  ]

  let remainder: string | undefined
  for (const prefix of prefixes) {
    if (url.startsWith(prefix)) {
      remainder = url.slice(prefix.length)
      break
    }
  }
  if (remainder === undefined) return null

  // Strip optional version segment e.g. "v1778913958/"
  remainder = remainder.replace(/^v\d+\//, '')

  // What remains IS the public_id, including the .pdf extension.
  // For raw resources Cloudinary stores the extension as part of the public_id.
  // Do NOT strip it — stripping causes a 404 lookup mismatch.
  if (!remainder) return null
  return remainder
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── 1. Read + decode the url param ────────────────────────────────────────

  const rawUrl = request.nextUrl.searchParams.get('url')
  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  let resolvedUrl: string
  try {
    resolvedUrl = decodeURIComponent(rawUrl)
  } catch {
    resolvedUrl = rawUrl
  }

  // ── 2. Validate env ────────────────────────────────────────────────────────

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloudName) {
    console.error('[view-invoice] NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set')
    return NextResponse.json(
      { error: 'Server misconfiguration: missing cloud name' },
      { status: 500 },
    )
  }

  // ── 3. Security: only proxy our own Cloudinary URLs ───────────────────────

  const allowed = [
    `https://res.cloudinary.com/${cloudName}/raw/upload/`,
    `https://res.cloudinary.com/${cloudName}/image/upload/`,
  ]
  if (!allowed.some(p => resolvedUrl.startsWith(p))) {
    console.warn('[view-invoice] Blocked foreign URL:', resolvedUrl)
    return NextResponse.json(
      { error: 'Forbidden: URL does not belong to this app' },
      { status: 403 },
    )
  }

  // ── 4. Parse URL → public_id ───────────────────────────────────────────────

  const publicId = parseCloudinaryUrl(resolvedUrl, cloudName)
  if (!publicId) {
    console.error('[view-invoice] Could not parse URL:', resolvedUrl)
    return NextResponse.json({ error: 'Could not parse Cloudinary URL' }, { status: 400 })
  }

  // ── 5. Build API download URL ──────────────────────────────────────────────
  //
  // private_download_url targets api.cloudinary.com — NOT the CDN.
  //
  // CRITICAL: pass null as format (second argument).
  // For raw resources the public_id already ends in .pdf. Passing format:'pdf'
  // would make Cloudinary append .pdf again → looks up 'invoice_ORD-XXXX.pdf'
  // with an extra format qualifier → 404.
  // Passing null means "use the public_id as-is, no format suffix".

  let downloadUrl: string
  try {
    downloadUrl = cloudinary.utils.private_download_url(
      publicId,
      null as unknown as string, // format=null → don't append extension
      {
        resource_type: 'raw',
        type:          'upload',
      },
    )
  } catch (err) {
    console.error('[view-invoice] Failed to build private download URL:', err)
    return NextResponse.json({ error: 'Failed to build download URL' }, { status: 500 })
  }

  console.log(
    '[view-invoice] Fetching PDF',
    '\n  public_id  :', publicId,
    '\n  api host   :', downloadUrl.split('?')[0],
  )

  // ── 6. Fetch from Cloudinary API ──────────────────────────────────────────

  let cloudinaryResponse: Response
  try {
    cloudinaryResponse = await fetch(downloadUrl, {
      signal:  AbortSignal.timeout(20_000),
      headers: {
        'User-Agent': 'InvoiceProxy/1.0 (Next.js server)',
        'Accept':     'application/pdf, application/octet-stream, */*',
      },
      cache: 'no-store',
    })
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError'
    console.error('[view-invoice] Network error:', err)
    return NextResponse.json(
      { error: isTimeout ? 'Cloudinary request timed out' : 'Failed to reach Cloudinary' },
      { status: 502 },
    )
  }

  // ── 7. Handle non-OK responses ────────────────────────────────────────────

  if (!cloudinaryResponse.ok) {
    let body = ''
    try { body = await cloudinaryResponse.text() } catch { /* ignore */ }

    console.error(
      `[view-invoice] Cloudinary API ${cloudinaryResponse.status}`,
      '\n  public_id:', publicId,
      '\n  body     :', body.slice(0, 300),
    )

    if (cloudinaryResponse.status === 404) {
      return NextResponse.json(
        {
          error: 'Invoice not found in Cloudinary',
          hint:
            `Looked up public_id: "${publicId}". ` +
            'Verify the file exists in Cloudinary Media Library → lenskart/invoices/. ' +
            'If missing, regenerate with force:true via POST /api/generate-invoice.',
        },
        { status: 404 },
      )
    }

    if (cloudinaryResponse.status === 401) {
      return NextResponse.json(
        {
          error: 'Cloudinary API auth failed (401)',
          hint:  'CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET is wrong. ' +
                 'Check Cloudinary Dashboard → Settings → Access Keys.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      { error: `Invoice fetch failed (Cloudinary returned ${cloudinaryResponse.status})` },
      { status: 502 },
    )
  }

  // ── 8. Read + validate PDF bytes ──────────────────────────────────────────

  let pdfBuffer: ArrayBuffer
  try {
    pdfBuffer = await cloudinaryResponse.arrayBuffer()
  } catch (err) {
    console.error('[view-invoice] Failed to read response body:', err)
    return NextResponse.json({ error: 'Failed to read PDF data' }, { status: 502 })
  }

  if (pdfBuffer.byteLength === 0) {
    console.error('[view-invoice] Empty body for public_id:', publicId)
    return NextResponse.json({ error: 'Cloudinary returned an empty file' }, { status: 502 })
  }

  const magic = Buffer.from(pdfBuffer.slice(0, 5)).toString('latin1')
  if (!magic.startsWith('%PDF-')) {
    const preview = Buffer.from(pdfBuffer.slice(0, 200)).toString('utf8').replace(/\s+/g, ' ')
    console.error(
      '[view-invoice] Response is not a PDF',
      '\n  public_id  :', publicId,
      '\n  first bytes:', JSON.stringify(preview),
    )
    return NextResponse.json({ error: 'Retrieved file is not a valid PDF' }, { status: 502 })
  }

  // ── 9. Serve PDF to client ────────────────────────────────────────────────

  // public_id already ends in .pdf so the filename is clean
  const rawFilename = publicId.split('/').pop() ?? 'invoice.pdf'
  const filename    = rawFilename.endsWith('.pdf') ? rawFilename : `${rawFilename}.pdf`

  // ?dl=1 → force download   |   default → open inline in browser PDF viewer
  const forceDownload = request.nextUrl.searchParams.get('dl') === '1'

  console.log(
    `[view-invoice] Serving ${pdfBuffer.byteLength} bytes as "${filename}"`,
    forceDownload ? '(download)' : '(inline)',
  )

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type':           'application/pdf',
      'Content-Length':         String(pdfBuffer.byteLength),
      'Content-Disposition':    `${forceDownload ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Cache-Control':          'private, max-age=3600, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}