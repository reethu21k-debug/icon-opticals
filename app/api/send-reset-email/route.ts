import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase'
import { rateLimit, rateLimitResponse, isBot } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // ── Bot check ────────────────────────────────────────────────
  if (isBot(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Rate limit: 5 requests per minute per IP ─────────────────
  const rl = rateLimit(request, 'send-reset-email')
  if (!rl.allowed) {
    return rateLimitResponse(rl.resetIn)
  }

  // ── Parse body ───────────────────────────────────────────────
  let email: string
  try {
    const body = await request.json()
    email = (body.email || '').trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  // ── Send reset email via Supabase ────────────────────────────
  // We always return success (even if email not found) to prevent
  // user enumeration attacks.
  try {
    const supabase = await createServerClientInstance()
    const siteUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'

    // Supabase handles token generation, expiry, and email delivery
    // The redirectTo URL is where the user lands after clicking the link
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/reset-password`,
    })

    // Always return 200 regardless of whether the email exists
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[send-reset-email] Supabase error:', err)
    // Still return 200 to avoid leaking info
    return NextResponse.json({ success: true })
  }
}

// Reject all other HTTP methods
export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}