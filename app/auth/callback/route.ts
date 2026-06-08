import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = decodeURIComponent(searchParams.get('next') || '/')

  if (code) {
    const supabase = await createServerClientInstance()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      // Create profile if first time Google/OAuth login
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!profile) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
          avatar_url: data.user.user_metadata?.avatar_url || null,
          email_opt_in: false,
          whatsapp_opt_in: true,
          role: 'customer',
        })
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — send back to login with error flag
  return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
}