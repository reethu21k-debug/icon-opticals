'use client'

/**
 * AdminProductCard — a thin client wrapper around ProductCard.
 *
 * Server pages (like the homepage) can't call useAuth or check admin role
 * because they're React Server Components. This wrapper runs on the client,
 * detects whether the current user is an admin, and passes isAdmin={true}
 * to ProductCard so the "Add to Billing" button appears automatically.
 *
 * Usage (drop-in replacement for ProductCard in server components):
 *   import AdminProductCard from '@/components/product/AdminProductCard'
 *   <AdminProductCard product={p} />
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import ProductCard from './ProductCard'
import type { Product } from '@/types'

// Module-level admin cache — avoids re-querying on every card re-render.
// Reset is implicit on page refresh / new session.
let _adminResolved = false
let _isAdmin       = false
const _adminListeners = new Set<(v: boolean) => void>()

function broadcastAdmin(v: boolean) {
  _isAdmin       = v
  _adminResolved = true
  _adminListeners.forEach(fn => fn(v))
}

let _adminChecking = false

async function ensureAdminCheck(userId: string) {
  if (_adminChecking || _adminResolved) return
  _adminChecking = true
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  broadcastAdmin(data?.role === 'admin')
}

interface AdminProductCardProps {
  product:            Product
  initialWishlisted?: boolean
  userId?:            string
}

export default function AdminProductCard(props: AdminProductCardProps) {
  const { userId: authUserId, ready } = useAuth()
  const resolvedUserId = props.userId ?? authUserId ?? undefined

  // Pre-populate from cache (avoids flash on grids with many cards)
  const [isAdmin, setIsAdmin] = useState(_adminResolved ? _isAdmin : false)

  useEffect(() => {
    if (!ready) return

    // User is logged out — definitely not admin
    if (!resolvedUserId) {
      broadcastAdmin(false)
      return
    }

    // Already resolved — sync immediately
    if (_adminResolved) {
      setIsAdmin(_isAdmin)
      return
    }

    // Subscribe and trigger the check
    const handler = (v: boolean) => setIsAdmin(v)
    _adminListeners.add(handler)
    void ensureAdminCheck(resolvedUserId)

    return () => { _adminListeners.delete(handler) }
  }, [ready, resolvedUserId])

  return (
    <ProductCard
      {...props}
      userId={resolvedUserId}
      isAdmin={isAdmin}
    />
  )
}