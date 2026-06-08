'use client'

/**
 * useAdminBilling — cross-page billing bus for the admin "Add to Billing" feature.
 *
 * The admin can click "Add to Billing" on ANY page (homepage, /products, etc.).
 * The Store Billing page at /admin/store-billing may or may not be open at that moment.
 *
 * Strategy:
 *   1. emitAddToBilling() writes the product to localStorage under the key
 *      'icon_billing_queue' (a JSON array) and also dispatches a same-tab
 *      window event for instant update if billing page IS open in same tab.
 *
 *   2. useAdminBillingListener() listens to both:
 *        - window 'adminBillingAdd'  → same-tab, instant
 *        - window 'storage'          → cross-tab (other tab fired the event)
 *      On mount it also drains any queued items written before the billing
 *      page was opened, so nothing is lost.
 *
 *   3. After draining, the queue is cleared so items aren't double-added.
 */

import { useEffect, useCallback } from 'react'
import type { Product } from '@/types'

export const BILLING_EVENT    = 'adminBillingAdd'
export const BILLING_QUEUE_KEY = 'icon_billing_queue'

export interface AdminBillingAddEvent extends CustomEvent {
  detail: { product: Product }
}

/** Called from ProductCard. Works whether billing page is open or not. */
export function emitAddToBilling(product: Product) {
  if (typeof window === 'undefined') return

  // 1. Write to localStorage queue (persists for cross-tab + deferred pickup)
  try {
    const raw   = localStorage.getItem(BILLING_QUEUE_KEY)
    const queue: Product[] = raw ? JSON.parse(raw) : []
    queue.push(product)
    localStorage.setItem(BILLING_QUEUE_KEY, JSON.stringify(queue))
  } catch { /* quota errors — ignore */ }

  // 2. Also fire same-tab event for instant pickup if billing page is already open
  window.dispatchEvent(
    new CustomEvent(BILLING_EVENT, { detail: { product } })
  )
}

/** Called inside StoreBillingPage. Handles same-tab, cross-tab, and queued adds. */
export function useAdminBillingListener(
  onAdd: (product: Product) => void
) {
  // Stable ref so the effect never re-runs on re-renders
  const onAddRef = useCallback(onAdd, [onAdd])

  useEffect(() => {
    // ── Drain any queued products written before this page mounted ──────
    try {
      const raw = localStorage.getItem(BILLING_QUEUE_KEY)
      if (raw) {
        const queue: Product[] = JSON.parse(raw)
        if (queue.length > 0) {
          queue.forEach(p => onAddRef(p))
          localStorage.removeItem(BILLING_QUEUE_KEY)
        }
      }
    } catch { /* ignore parse errors */ }

    // ── Same-tab listener ────────────────────────────────────────────────
    const handleSameTab = (e: Event) => {
      const { product } = (e as AdminBillingAddEvent).detail
      // Clear queue entry for this product so cross-tab handler won't double-add
      try {
        const raw = localStorage.getItem(BILLING_QUEUE_KEY)
        if (raw) {
          const queue: Product[] = JSON.parse(raw)
          const updated = queue.filter(p => p.id !== product.id)
          if (updated.length === 0) {
            localStorage.removeItem(BILLING_QUEUE_KEY)
          } else {
            localStorage.setItem(BILLING_QUEUE_KEY, JSON.stringify(updated))
          }
        }
      } catch { /* ignore */ }
      onAddRef(product)
    }

    // ── Cross-tab listener ───────────────────────────────────────────────
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== BILLING_QUEUE_KEY || !e.newValue) return
      try {
        const queue: Product[] = JSON.parse(e.newValue)
        if (queue.length > 0) {
          queue.forEach(p => onAddRef(p))
          localStorage.removeItem(BILLING_QUEUE_KEY)
        }
      } catch { /* ignore */ }
    }

    window.addEventListener(BILLING_EVENT, handleSameTab)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(BILLING_EVENT, handleSameTab)
      window.removeEventListener('storage', handleStorage)
    }
  }, [onAddRef])
}