// lib/admin-auth.ts
// Shared guard for admin-only API routes.
// Mirrors the inline `requireAdmin()` already used in
// app/api/admin/products/route.ts, extracted so new routes
// (variant-groups, variant search) don't duplicate it.

import { createServerClientInstance } from '@/lib/supabase'

export async function requireAdmin(): Promise<string | null> {
  try {
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((profile as { role: string } | null)?.role !== 'admin') return null
    return user.id
  } catch {
    return null
  }
}