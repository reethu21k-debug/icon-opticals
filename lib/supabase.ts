import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'

// ── Env var validation ────────────────────────────────────────
// Read lazily inside functions so a missing var throws with a clear message
// at call time rather than crashing the entire module at import time.
function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      '[supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
      'must be set in your Vercel project environment variables.'
    )
  }
  return { url, key }
}

// ── Browser Client singleton ──────────────────────────────────
// One shared instance prevents navigator-lock contention when many components
// call createClient() + getUser() at the same time (e.g. a grid of ProductCards).
let _browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  const { url, key } = getEnv()
  // Server-side: always a fresh instance (no window, no shared state needed)
  if (typeof window === 'undefined') {
    return createBrowserClient(url, key)
  }
  if (!_browserClient) {
    _browserClient = createBrowserClient(url, key)
  }
  return _browserClient
}

// ── Server Client — ONLY call from server components / API routes
export async function createServerClientInstance() {
  const { url, key } = getEnv()
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch { /* Server Component context — ignore */ }
      },
    },
  })
}

// ── Admin / Service Role Client — server-side API routes ONLY ─
export function createAdminClient() {
  const { url } = getEnv()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('[supabase] SUPABASE_SERVICE_ROLE_KEY not set')
  return createBrowserClient(url, serviceKey, {
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