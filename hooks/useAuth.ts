'use client'

/**
 * Shared auth hook — one getSession() call and one onAuthStateChange subscription
 * shared across ALL components, preventing navigator-lock contention.
 */

import { useState, useEffect } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'

// Module-level cache — set up once per browser session
let _resolved = false
let _userId: string | null = null
const _listeners = new Set<(id: string | null) => void>()

function broadcast(id: string | null) {
  _userId = id
  _resolved = true
  _listeners.forEach(fn => fn(id))
}

let _subscribed = false
// Structural type — avoids importing Subscription which may not be exported
// from all versions of @supabase/supabase-js
let _subscription: { unsubscribe: () => void } | null = null

// async so we can await getSession() directly — avoids a floating .then() chain
// which @typescript-eslint/no-floating-promises would flag
async function ensureSubscription() {
  if (_subscribed || typeof window === 'undefined') return
  _subscribed = true
  const supabase = createClient()

  // One-time session check (uses cached token — no network lock needed)
  const { data: sessionResult } = await supabase.auth.getSession()
  broadcast(sessionResult.session?.user?.id ?? null)

  // Stay in sync on login / logout.
  // Explicit AuthChangeEvent + Session types satisfy strict TS overload resolution.
  const { data: authData } = supabase.auth.onAuthStateChange(
    (_event: AuthChangeEvent, session: Session | null) => {
      broadcast(session?.user?.id ?? null)
    }
  )
  _subscription = authData.subscription
}

export function useAuth(): { userId: string | null; ready: boolean } {
  // Pre-populate from module cache if already resolved (avoids flicker on re-render)
  const [state, setState] = useState<{ userId: string | null; ready: boolean }>({
    userId: _resolved ? _userId : null,
    ready: _resolved,
  })

  useEffect(() => {
    // void — ensureSubscription is async; we don't need to await it here,
    // and void silences @typescript-eslint/no-floating-promises
    void ensureSubscription()

    // If the global already resolved before this effect ran, sync immediately
    if (_resolved) {
      setState({ userId: _userId, ready: true })
    }
    const handler = (id: string | null) => setState({ userId: id, ready: true })
    _listeners.add(handler)
    return () => { _listeners.delete(handler) }
  }, [])

  return state
}

// Exported so tests or a top-level teardown can unsubscribe if needed
export function cleanupAuthSubscription() {
  _subscription?.unsubscribe()
  _subscription = null
  _subscribed = false
  _resolved = false
  _userId = null
}