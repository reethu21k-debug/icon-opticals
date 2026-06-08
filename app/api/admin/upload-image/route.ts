import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance, createAdminClient } from '@/lib/supabase'
import { cloudinary } from '@/lib/cloudinary'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const { allowed, resetIn } = rateLimit(request, 'default')
  if (!allowed) return rateLimitResponse(resetIn)

  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role?: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const productId = (formData.get('productId') as string) || 'unknown'
  const index = parseInt((formData.get('index') as string) || '0')

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const validTypes = ['image/webp', 'image/jpeg', 'image/jpg']
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Only WebP and JPG images are allowed.' }, { status: 400 })
  }
  if (file.size > 1_000_000) {
    return NextResponse.json({ error: 'Image must be under 1MB.' }, { status: 400 })
  }

  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `lenskart/products/${productId}`, public_id: `img_${index}_${Date.now()}`,
          format: 'webp', transformation: [{ width: 800, height: 800, crop: 'fill' }, { quality: 'auto:good' }] },
        (error, result) => { if (error || !result) reject(error); else resolve({ secure_url: result.secure_url, public_id: result.public_id }) }
      )
      stream.end(buffer)
    })
    return NextResponse.json({ url: result.secure_url, public_id: result.public_id })
  } catch (error) {
    console.error('[upload-image]', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
