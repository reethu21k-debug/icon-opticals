'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { createClient } from '@/lib/supabase'
import type { CartItemWithProduct, CartSummary, LensFlowState } from '@/types'

// ── BOGO helper ───────────────────────────────────────────────────────────────
function calcBogo(items: CartItemWithProduct[]): { discount: number; freeCount: number } {
  const unitPrices: number[] = []
  for (const item of items) {
    const qty = item.quantity || 1
    const unitPrice = (item.total_price || 0) / qty
    for (let i = 0; i < qty; i++) unitPrices.push(unitPrice)
  }
  const totalUnits = unitPrices.length
  if (totalUnits < 2) return { discount: 0, freeCount: 0 }
  unitPrices.sort((a, b) => b - a)
  const freeCount = Math.floor(totalUnits / 2)
  const discount = unitPrices.slice(totalUnits - freeCount).reduce((s, p) => s + p, 0)
  return { discount: Math.round(discount * 100) / 100, freeCount }
}

export function useCart(userId: string | null) {
  const [items, setItems] = useState<CartItemWithProduct[]>([])
  const [loading, setLoading] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [coupon, setCoupon] = useState<any | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)

  const fetchCart = useCallback(async () => {
    if (!userId) { setItems([]); return }
    setLoading(true)
    const supabase = createClient()
    const { data: cartData } = await supabase
      .from('cart_items')
      .select(`*, product:products(id, name, slug, brand, images, final_price, base_price, discount_percent, stock, is_active)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(0, 20)
    setItems((cartData || []) as CartItemWithProduct[])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchCart() }, [fetchCart])

  const addToCart = useCallback(async (
    productId: string,
    lensConfig: LensFlowState,
    framePrice: number
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'Please login to continue' }
    const supabase = createClient()

    let lensAddon = 0
    if (lensConfig.package_code) {
      const { data: pkgData } = await supabase
        .from('lens_packages').select('price_addon').eq('code', lensConfig.package_code).single()
      lensAddon = (pkgData as { price_addon?: number } | null)?.price_addon || 0
    }

    const totalPrice = framePrice + lensAddon
    const cartItem = {
      user_id: userId, product_id: productId, quantity: 1,
      lens_power_type: lensConfig.power_type,
      lens_package_code: lensConfig.package_code,
      left_eye_sph: lensConfig.prescription?.left_eye.sph ?? null,
      left_eye_cyl: lensConfig.prescription?.left_eye.cyl ?? null,
      left_eye_axis: lensConfig.prescription?.left_eye.axis ?? null,
      right_eye_sph: lensConfig.prescription?.right_eye.sph ?? null,
      right_eye_cyl: lensConfig.prescription?.right_eye.cyl ?? null,
      right_eye_axis: lensConfig.prescription?.right_eye.axis ?? null,
      pd: lensConfig.prescription?.pd ?? null,
      prescription_upload_url: lensConfig.prescription_url ?? null,
      prescription_upload_later: lensConfig.upload_later,
      frame_price: framePrice, lens_price: lensAddon, total_price: totalPrice,
    }

    const { error } = await supabase.from('cart_items').upsert(cartItem, {
      onConflict: 'user_id,product_id,lens_power_type,lens_package_code',
    })
    if (error) return { success: false, error: error.message }
    await fetchCart()
    return { success: true }
  }, [userId, fetchCart])

  const removeFromCart = useCallback(async (itemId: string) => {
    const supabase = createClient()
    await supabase.from('cart_items').delete().eq('id', itemId)
    setItems(prev => prev.filter(i => i.id !== itemId))
  }, [])

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity < 1) { await removeFromCart(itemId); return }
    const supabase = createClient()
    await supabase.from('cart_items').update({ quantity }).eq('id', itemId)
    setItems(prev => prev.map(i =>
      i.id === itemId
        ? { ...i, quantity, total_price: ((i.frame_price || 0) + (i.lens_price || 0)) * quantity }
        : i
    ))
  }, [removeFromCart])

  const applyCoupon = useCallback(async (code: string) => {
    setCouponError(null)
    const supabase = createClient()
    const { data: couponData, error } = await supabase
      .from('coupons').select('*')
      .eq('code', code.toUpperCase().trim()).eq('is_active', true).single()
    if (error || !couponData) { setCouponError('Invalid or expired coupon code'); setCoupon(null); return }

    const c = couponData as Record<string, unknown>

    const now = new Date()
    const validUntil = c.valid_until ? new Date(c.valid_until as string) : null
    if (validUntil && now > validUntil) { setCouponError('This coupon has expired'); setCoupon(null); return }

    if (c.usage_limit && (c.used_count as number) >= (c.usage_limit as number)) {
      setCouponError('This coupon has been fully redeemed'); setCoupon(null); return
    }

    if (c.discount_type === 'bogo') {
      const totalUnits = items.reduce((s, i) => s + (i.quantity || 1), 0)
      if (totalUnits < 2) {
        setCouponError('Add at least 2 items to use this Buy 1 Get 1 Free offer')
        setCoupon(null)
        return
      }
      setCoupon(c)
      return
    }

    const subtotal = items.reduce((s, i) => s + (i.total_price || 0), 0)
    if (subtotal < (c.min_order_value as number)) {
      setCouponError(`Minimum order value ₹${c.min_order_value} required`); setCoupon(null); return
    }
    setCoupon(c)
  }, [items])

  const removeCoupon = useCallback(() => { setCoupon(null); setCouponError(null) }, [])

  const summary: CartSummary = (() => {
    const subtotal = items.reduce((s, i) => s + (i.total_price || 0), 0)
    let discountAmount = 0
    let bogoFreeItemCount = 0

    if (coupon) {
      if (coupon.discount_type === 'bogo') {
        const { discount, freeCount } = calcBogo(items)
        discountAmount = discount
        bogoFreeItemCount = freeCount
      } else if (coupon.discount_type === 'percent') {
        const raw = (subtotal * coupon.discount_value) / 100
        discountAmount = coupon.max_discount ? Math.min(raw, coupon.max_discount) : raw
      } else {
        discountAmount = coupon.discount_value
      }
    }

    return {
      items,
      subtotal,
      discount_amount: Math.round(discountAmount * 100) / 100,
      bogo_free_item_count: bogoFreeItemCount,
      coupon: coupon || undefined,
      total: Math.max(0, subtotal - discountAmount),
      item_count: items.reduce((s, i) => s + (i.quantity ?? 0), 0),
    }
  })()

  return { items, summary, loading, coupon, couponError, addToCart, removeFromCart, updateQuantity, applyCoupon, removeCoupon, refresh: fetchCart }
}

export function useWishlist(userId: string | null) {
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())

  // React 19 changed useRef<T>(initialValue: T) to return RefObject<T> with a
  // *readonly* current. Cast to MutableRefObject so we can assign .current
  // on every render without triggering a stale-closure re-creation cycle.
  const wishlistRef = useRef<Set<string>>(new Set()) as MutableRefObject<Set<string>>
  wishlistRef.current = wishlistIds

  useEffect(() => {
    if (!userId) { setWishlistIds(new Set()); return }
    const supabase = createClient()

    // Extracted as a named async function so we can await the query directly
    // instead of chaining .then() — avoids @typescript-eslint/no-floating-promises
    // which flags unhandled .then() return values
    const loadWishlist = async () => {
      const { data: wishlistData } = await supabase
        .from('wishlist').select('product_id').eq('user_id', userId)
      if (wishlistData) {
        setWishlistIds(new Set((wishlistData as { product_id: string }[]).map(w => w.product_id)))
      }
    }
    // void — effect callbacks must be synchronous; void acknowledges the promise
    void loadWishlist()
  }, [userId])

  // userId is the only real dependency — wishlistRef is a stable ref, never stale
  const toggle = useCallback(async (productId: string) => {
    if (!userId) return
    const supabase = createClient()
    const alreadyWishlisted = wishlistRef.current.has(productId)
    if (alreadyWishlisted) {
      await supabase.from('wishlist').delete().eq('user_id', userId).eq('product_id', productId)
      setWishlistIds(prev => { const next = new Set(prev); next.delete(productId); return next })
    } else {
      await supabase.from('wishlist').insert({ user_id: userId, product_id: productId })
      setWishlistIds(prev => new Set([...prev, productId]))
    }
  }, [userId])  // ← wishlistIds removed from deps; read via ref instead

  return { wishlistIds, toggle, isWishlisted: (id: string) => wishlistIds.has(id) }
}