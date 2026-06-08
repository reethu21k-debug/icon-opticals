// import { NextRequest, NextResponse } from 'next/server'

// // ── Simple in-memory rate limiter ────────────────────────────
// // For production, use Upstash Redis or Vercel KV

// interface RateLimitEntry {
//   count: number
//   resetAt: number
// }

// const store = new Map<string, RateLimitEntry>()

// interface RateLimitConfig {
//   limit: number       // max requests
//   window: number      // time window in ms
// }

// const CONFIGS: Record<string, RateLimitConfig> = {
//   'place-order':          { limit: 5,   window: 60_000 },   // 5/min per IP
//   'generate-invoice':     { limit: 10,  window: 60_000 },
//   'send-email':           { limit: 10,  window: 60_000 },
//   'send-whatsapp':        { limit: 5,   window: 60_000 },
//   'send-marketing-email': { limit: 2,   window: 60_000 },   // admin only
//   'send-reset-email':      { limit: 5,   window: 60_000 },   // 5 req/min per IP
//   'default':              { limit: 30,  window: 60_000 },
// }

// export function rateLimit(
//   request: NextRequest,
//   endpoint: string
// ): { allowed: boolean; remaining: number; resetIn: number } {
//   const config = CONFIGS[endpoint] || CONFIGS.default
//   const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
//   const key = `${endpoint}:${ip}`
//   const now = Date.now()

//   const entry = store.get(key)

//   if (!entry || now > entry.resetAt) {
//     store.set(key, { count: 1, resetAt: now + config.window })
//     return { allowed: true, remaining: config.limit - 1, resetIn: config.window }
//   }

//   if (entry.count >= config.limit) {
//     return { allowed: false, remaining: 0, resetIn: entry.resetAt - now }
//   }

//   entry.count++
//   return {
//     allowed: true,
//     remaining: config.limit - entry.count,
//     resetIn: entry.resetAt - now,
//   }
// }

// // ── Rate limit response helper ────────────────────────────────
// export function rateLimitResponse(resetIn: number): NextResponse {
//   return NextResponse.json(
//     { error: 'Too many requests. Please try again later.' },
//     {
//       status: 429,
//       headers: {
//         'Retry-After': String(Math.ceil(resetIn / 1000)),
//         'X-RateLimit-Reset': String(Date.now() + resetIn),
//       },
//     }
//   )
// }

// // ── Bot detection (basic) ─────────────────────────────────────
// export function isBot(request: NextRequest): boolean {
//   const ua = request.headers.get('user-agent') || ''
//   const botPatterns = [
//     /bot/i, /crawler/i, /spider/i, /scraper/i,
//     /curl/i, /wget/i, /python-requests/i, /axios/i,
//   ]
//   return botPatterns.some(p => p.test(ua))
// }

// // ── Admin auth guard for API routes ──────────────────────────
// export async function requireAdmin(request: NextRequest): Promise<string | null> {
//   // Check Authorization header for service calls
//   const authHeader = request.headers.get('authorization')
//   if (authHeader === `Bearer ${process.env.ADMIN_API_SECRET}`) {
//     return 'admin'
//   }
//   return null
// }

// // ── Cleanup old entries (call periodically) ───────────────────
// export function cleanupRateLimitStore(): void {
//   const now = Date.now()
//   for (const [key, entry] of store.entries()) {
//     if (now > entry.resetAt) store.delete(key)
//   }
// }

// // Clean up every 10 minutes
// if (typeof setInterval !== 'undefined') {
//   setInterval(cleanupRateLimitStore, 10 * 60_000)
// }
// lib/rate-limit.ts
//
// ── ⚠️  SERVERLESS LIMITATION ────────────────────────────────────────────────
//
// This in-memory store resets on EVERY Vercel cold start (= a new Lambda
// container). In a serverless environment that happens frequently, making
// this limiter ineffective — a burst of requests will see a fresh, empty
// store each time a new container wakes up.
//
// TODO before production: replace with Upstash Redis (edge-compatible) or
// Vercel KV so the rate-limit counter is shared across all container instances
// and persists across cold starts.
//
//   npm install @upstash/ratelimit @upstash/redis
//   https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
//
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
  count:   number
  resetAt: number
}

// In-memory store — shared within a single container instance only
const store = new Map<string, RateLimitEntry>()

interface RateLimitConfig {
  limit:  number   // max requests
  window: number   // time window in ms
}

const CONFIGS: Record<string, RateLimitConfig> = {
  'place-order':           { limit: 5,  window: 60_000 },   // 5/min per IP
  'generate-invoice':      { limit: 10, window: 60_000 },
  'send-email':            { limit: 10, window: 60_000 },
  'send-whatsapp':         { limit: 5,  window: 60_000 },
  'send-marketing-email':  { limit: 2,  window: 60_000 },   // admin only
  'send-reset-email':      { limit: 5,  window: 60_000 },
  'default':               { limit: 30, window: 60_000 },
}

export function rateLimit(
  request: NextRequest,
  endpoint: string,
): { allowed: boolean; remaining: number; resetIn: number } {
  const config = CONFIGS[endpoint] || CONFIGS.default
  const ip     = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const key    = `${endpoint}:${ip}`
  const now    = Date.now()

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.window })
    return { allowed: true, remaining: config.limit - 1, resetIn: config.window }
  }

  if (entry.count >= config.limit) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now }
  }

  entry.count++
  return {
    allowed:   true,
    remaining: config.limit - entry.count,
    resetIn:   entry.resetAt - now,
  }
}

// ── Rate limit response helper ────────────────────────────────────────────────

export function rateLimitResponse(resetIn: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status:  429,
      headers: {
        'Retry-After':       String(Math.ceil(resetIn / 1000)),
        'X-RateLimit-Reset': String(Date.now() + resetIn),
      },
    },
  )
}

// ── Bot detection (basic) ─────────────────────────────────────────────────────

export function isBot(request: NextRequest): boolean {
  const ua = request.headers.get('user-agent') || ''
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python-requests/i, /axios/i,
  ]
  return botPatterns.some(p => p.test(ua))
}

// ── Admin auth guard for API routes ──────────────────────────────────────────

export async function requireAdmin(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.ADMIN_API_SECRET}`) {
    return 'admin'
  }
  return null
}

// ── Cleanup old entries (within-container housekeeping) ───────────────────────
//
// Only relevant within a single long-running container. Does nothing to help
// with the cross-container isolation problem described above.

export function cleanupRateLimitStore(): void {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key)
  }
}

// Clean up every 10 minutes within the running container
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 10 * 60_000)
}