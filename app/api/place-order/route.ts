import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance, createAdminClient } from '@/lib/supabase'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import type { PlaceOrderPayload } from '@/types'

// ── BOGO helper (mirrors useCart.ts — keep in sync) ───────────────────────────
function calcBogoDiscount(cartItems: PlaceOrderPayload['cart_items']): number {
  const unitPrices: number[] = []
  for (const item of cartItems) {
    const qty = item.quantity || 1
    const unitPrice = (item.total_price || 0) / qty
    for (let i = 0; i < qty; i++) unitPrices.push(unitPrice)
  }
  const totalUnits = unitPrices.length
  if (totalUnits < 2) return 0

  unitPrices.sort((a, b) => b - a) // descending
  const freeCount = Math.floor(totalUnits / 2)
  const discount = unitPrices.slice(totalUnits - freeCount).reduce((s, p) => s + p, 0)
  return Math.round(discount * 100) / 100
}

// ── Phone normalisation ───────────────────────────────────────────────────────
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) return null
  return digits
}

export async function POST(request: NextRequest) {
  const { allowed, remaining, resetIn } = rateLimit(request, 'place-order')
  if (!allowed) return rateLimitResponse(resetIn)

  const supabase = await createServerClientInstance()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let payload: PlaceOrderPayload & { phone?: string; payment_reference?: string; payment_screenshot_url?: string }
  try { payload = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const { cart_items, coupon_code, fulfillment_type, store_id, shipping_address, notes } = payload
  if (!cart_items?.length) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  if (fulfillment_type === 'pickup' && !store_id)
    return NextResponse.json({ error: 'Store required for pickup' }, { status: 400 })

  const db = createAdminClient()

  try {
    // ── Resolve phone number ───────────────────────────────────────────────
    let resolvedPhone: string | null = null

    if (payload.phone) {
      resolvedPhone = normalisePhone(payload.phone)
    }

    const { data: profileRow } = await db
      .from('profiles')
      .select('phone, full_name, whatsapp_opt_in')
      .eq('id', user.id)
      .single()

    const profile = profileRow as {
      phone?: string | null
      full_name?: string | null
      whatsapp_opt_in?: boolean
    } | null

    if (!resolvedPhone && profile?.phone) {
      resolvedPhone = normalisePhone(profile.phone)
    }

    if (!resolvedPhone) {
      console.warn('[place-order] Order blocked: no valid phone number for user', user.id)
      return NextResponse.json(
        {
          error:
            'A valid WhatsApp number is required to receive order updates. ' +
            'Please go back and enter your phone number.',
        },
        { status: 422 },
      )
    }

    // ── Upsert phone into profile ──────────────────────────────────────────
    if (!profile?.phone || normalisePhone(profile.phone) !== resolvedPhone) {
      await db
        .from('profiles')
        .update({ phone: resolvedPhone, whatsapp_opt_in: true })
        .eq('id', user.id)

      console.log(`[place-order] Updated profile phone for user ${user.id}: ${resolvedPhone}`)
    }

    // ── Validate coupon ────────────────────────────────────────────────────
    let couponDiscount = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let validatedCoupon: any = null

    if (coupon_code) {
      const { data: coupon } = await db
        .from('coupons')
        .select('*')
        .eq('code', coupon_code.toUpperCase())
        .eq('is_active', true)
        .single()

      const c = coupon as Record<string, unknown> | null
      if (c) {
        const now = new Date()
        const validUntil = c.valid_until ? new Date(c.valid_until as string) : null
        const isExpired = validUntil && now > validUntil
        const isExhausted = c.usage_limit && (c.used_count as number) >= (c.usage_limit as number)

        if (!isExpired && !isExhausted) {
          validatedCoupon = c
          const subtotal = cart_items.reduce((s, item) => s + (item.total_price || 0), 0)

          if (c.discount_type === 'bogo') {
            const totalUnits = cart_items.reduce((s, item) => s + (item.quantity || 1), 0)
            if (totalUnits >= 2) {
              couponDiscount = calcBogoDiscount(cart_items)
            }
          } else if (c.discount_type === 'percent') {
            if (subtotal >= (c.min_order_value as number)) {
              const raw = (subtotal * (c.discount_value as number)) / 100
              couponDiscount = c.max_discount ? Math.min(raw, c.max_discount as number) : raw
            }
          } else {
            // flat
            if (subtotal >= (c.min_order_value as number)) {
              couponDiscount = c.discount_value as number
            }
          }
        }
      }
    }

    const subtotal     = cart_items.reduce((s, item) => s + (item.total_price || 0), 0)
    const totalAmount  = Math.max(0, subtotal - couponDiscount)

    // ── Verify products ────────────────────────────────────────────────────
    const productIds = cart_items.map(i => i.product_id)
    const { data: products } = await db
      .from('products')
      .select('id, final_price, stock, is_active, name, brand, images')
      .in('id', productIds)
    if (!products?.length)
      return NextResponse.json({ error: 'Products not found' }, { status: 400 })

    const productMap = new Map((products as Record<string, unknown>[]).map(p => [p.id as string, p]))
    for (const item of cart_items) {
      const p = productMap.get(item.product_id) as Record<string, unknown> | undefined
      if (!p || !p.is_active)
        return NextResponse.json({ error: `Product ${item.product_id} is unavailable` }, { status: 400 })
      if ((p.stock as number) < item.quantity)
        return NextResponse.json({ error: `Insufficient stock for ${p.name}` }, { status: 400 })
    }

    // ── Create order — status: pending_admin_approval (NOT confirmed) ───────
    //
    // KEY CHANGE: Orders start as PENDING_ADMIN_APPROVAL.
    // No invoice, no email, no WhatsApp, no stock reduction at this stage.
    // All of that happens only when admin explicitly accepts the order.
    const { data: order, error: orderError } = await db.from('orders').insert({
      user_id:               user.id,
      status:                'pending_admin_approval',
      payment_status:        'pending_verification',
      subtotal,
      discount_amount:       couponDiscount,
      coupon_code:           validatedCoupon?.code || null,
      total_amount:          totalAmount,
      fulfillment_type,
      store_id:              store_id || null,
      shipping_address:      shipping_address
        ? (shipping_address as unknown as Record<string, unknown>)
        : null,
      notes:                 notes || null,
      payment_reference:     payload.payment_reference || null,
      payment_screenshot_url: payload.payment_screenshot_url || null,
    }).select().single()

    if (orderError || !order) {
      // Friendly error for duplicate UPI Transaction ID
      if (
        orderError?.code === '23505' ||
        orderError?.message?.includes('DUPLICATE_PAYMENT_REFERENCE') ||
        orderError?.message?.includes('idx_orders_payment_reference_unique')
      ) {
        return NextResponse.json(
          {
            error:
              'This UPI Transaction ID has already been used for another order. ' +
              'Please check your UPI app — your previous order may already be pending approval.',
          },
          { status: 409 },
        )
      }
      console.error('[place-order] Order creation failed:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    const orderRecord = order as Record<string, unknown>

    // ── Create order items ─────────────────────────────────────────────────
    const orderItems = cart_items.map(item => {
      const p   = productMap.get(item.product_id) as Record<string, unknown>
      const imgs = p.images as Array<{ url: string }> | null
      return {
        order_id:         orderRecord.id,
        product_id:       item.product_id,
        product_snapshot: { name: p.name, brand: p.brand, image_url: imgs?.[0]?.url || '' },
        quantity:         item.quantity,
        lens_config:      item.lens_power_type
          ? {
              power_type:       item.lens_power_type,
              package_code:     item.lens_package_code,
              left_eye:         item.left_eye_sph !== null
                ? { sph: item.left_eye_sph, cyl: item.left_eye_cyl, axis: item.left_eye_axis }
                : null,
              right_eye:        item.right_eye_sph !== null
                ? { sph: item.right_eye_sph, cyl: item.right_eye_cyl, axis: item.right_eye_axis }
                : null,
              pd:               item.pd,
              prescription_url: item.prescription_upload_url,
              upload_later:     item.prescription_upload_later,
            }
          : null,
        frame_price: item.frame_price || p.final_price,
        lens_price:  item.lens_price  || 0,
        total_price: item.total_price || p.final_price,
      }
    })

    const { error: itemsError } = await db.from('order_items').insert(orderItems)
    if (itemsError) {
      console.error('[place-order] Items error:', itemsError)
      await db.from('orders').delete().eq('id', orderRecord.id)
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
    }

    // ── Update coupon usage ────────────────────────────────────────────────
    if (validatedCoupon) {
      await db
        .from('coupons')
        .update({ used_count: (validatedCoupon.used_count as number) + 1 })
        .eq('id', validatedCoupon.id)
    }

    // ── Clear cart (stock is NOT reduced yet — that happens on admin approval) ──
    await db.from('cart_items').delete().eq('user_id', user.id).in('product_id', productIds)

    // ── NO invoice generation, NO email, NO WhatsApp at this stage ────────
    console.log(
      `[place-order] Order ${orderRecord.order_number} created as PENDING_ADMIN_APPROVAL.`,
      `Phone on file: ${resolvedPhone}. Awaiting admin review.`,
    )

    return NextResponse.json(
      {
        success:      true,
        order_id:     orderRecord.id,
        order_number: orderRecord.order_number,
        total_amount: totalAmount,
        status:       'pending_admin_approval',
      },
      { status: 201, headers: { 'X-RateLimit-Remaining': String(remaining) } },
    )
  } catch (error) {
    console.error('[place-order]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}