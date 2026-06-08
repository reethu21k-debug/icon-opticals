// app/api/admin/upload-tryon-image/route.ts
// ── Upload transparent PNG for Virtual Try-On overlay ────────────────────────
//
// Separate from upload-image/route.ts because:
//   • Accepts PNG (not just WebP/JPG) — transparency is essential
//   • Does NOT force-resize or crop (preserves aspect ratio and alpha)
//   • Stores in a separate Cloudinary folder: lenskart/tryon/
//   • Larger file-size limit: 3MB vs 1MB for product images

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance, createAdminClient } from '@/lib/supabase'
import { cloudinary } from '@/lib/cloudinary'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // ── Rate limiting ─────────────────────────────────────────────────────
  const { allowed, resetIn } = rateLimit(request, 'default')
  if (!allowed) return rateLimitResponse(resetIn)

  // ── Auth: admin only ──────────────────────────────────────────────────
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((profile as { role?: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Parse form data ───────────────────────────────────────────────────
  const formData  = await request.formData()
  const file      = formData.get('file')      as File   | null
  const productId = (formData.get('productId') as string) || 'unknown'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // ── Validation ────────────────────────────────────────────────────────
  const validTypes = ['image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Only PNG and WebP images are accepted for try-on overlays.' },
      { status: 400 }
    )
  }

  const MAX_SIZE = 3_000_000 // 3 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'File must be under 3 MB. Tip: use TinyPNG.com to compress without losing transparency.' },
      { status: 400 }
    )
  }

  // ── Upload to Cloudinary ─────────────────────────────────────────────
  try {
    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder:         `lenskart/tryon/${productId}`,
            public_id:      `tryon_${Date.now()}`,
            // Keep as PNG to preserve alpha channel
            format:         'png',
            // No cropping or resizing — admin should provide a clean asset
            transformation: [{ quality: 'auto:best' }],
            // Tell Cloudinary this has transparency
            flags:          'preserve_transparency',
          },
          (error, result) => {
            if (error || !result) reject(error)
            else resolve({ secure_url: result.secure_url, public_id: result.public_id })
          }
        )
        stream.end(buffer)
      }
    )

    return NextResponse.json({
      url:       result.secure_url,
      public_id: result.public_id,
    })
  } catch (error) {
    console.error('[upload-tryon-image]', error)
    return NextResponse.json({ error: 'Upload failed. Check Cloudinary credentials.' }, { status: 500 })
  }
}
