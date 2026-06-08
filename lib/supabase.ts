import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ── Browser Client singleton ──────────────────────────────────
// One shared instance prevents navigator-lock contention when many components
// call createClient() + getUser() at the same time (e.g. a grid of ProductCards).
let _browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Server-side: always a fresh instance (no window, no shared state needed)
  if (typeof window === 'undefined') {
    return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  if (!_browserClient) {
    _browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return _browserClient
}

// ── Server Client — ONLY call from server components / API routes
export async function createServerClientInstance() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAll(cookiesToSet: any[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: object }) =>
            cookieStore.set(name, value, options)
          )
        } catch { /* Server Component context — ignore */ }
      },
    },
  })
}

// ── Admin / Service Role Client — server-side API routes ONLY ─
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createBrowserClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── In-process cache (5-min TTL) ─────────────────────────────
const _cache = new Map<string, { data: unknown; expires: number }>()

export function getCached<T>(key: string): T | null {
  const entry = _cache.get(key)
  if (!entry || Date.now() > entry.expires) { _cache.delete(key); return null }
  return entry.data as T
}
export function setCached<T>(key: string, data: T, ttlMs = 5 * 60_000): void {
  _cache.set(key, { data, expires: Date.now() + ttlMs })
}
export function invalidateCache(pattern?: string): void {
  if (!pattern) { _cache.clear(); return }
  for (const key of _cache.keys()) if (key.includes(pattern)) _cache.delete(key)
}