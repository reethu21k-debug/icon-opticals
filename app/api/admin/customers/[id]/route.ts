// app/api/admin/customers/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerClientInstance, createAdminClient } from '@/lib/supabase'

// ── Local types ───────────────────────────────────────────────────────────────

interface ProfileRow {
  id: string
  full_name: string | null
  phone: string | null
  created_at: string
  avatar_url: string | null
}

interface OrderRow {
  id: string
  order_number: string
  status: string
  total_amount: number
  discount_amount: number
  coupon_code: string | null
  fulfillment_type: string
  shipping_address: Record<string, string> | null
  invoice_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface OrderItemRow {
  id: string
  order_id: string
  product_id: string
  quantity: number
  frame_price: number
  lens_price: number
  total_price: number
  lens_config: { power_type?: string; package_code?: string } | null
  product_snapshot: {
    name?: string
    brand?: string
    frame_color?: string
    category?: string
    images?: Array<{ url?: string; is_primary?: boolean }>
  } | null
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const supabase = await createServerClientInstance()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: adminProfile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if ((adminProfile as { role?: string } | null)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const customerId = params.id

  // ── Fetch profile ──────────────────────────────────────────────────────────
  const { data: profileData, error: profileError } = await db
    .from('profiles')
    .select('id, full_name, phone, created_at, avatar_url')
    .eq('id', customerId)
    .single()

  if (profileError || !profileData) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  const profile = profileData as ProfileRow

  // ── Fetch email from auth.users ────────────────────────────────────────────
  let email: string | null = null
  try {
    const { data: authUser } = await db.auth.admin.getUserById(customerId)
    email = authUser?.user?.email ?? null
  } catch {
    console.warn('[admin/customers/[id]] Could not fetch email')
  }

  // ── Fetch all orders ───────────────────────────────────────────────────────
  const { data: ordersData, error: ordersError } = await db
    .from('orders')
    .select(
      `id, order_number, status, total_amount, discount_amount, coupon_code,
       fulfillment_type, shipping_address, invoice_url, notes, created_at, updated_at`
    )
    .eq('user_id', customerId)
    .order('created_at', { ascending: false })

  if (ordersError) {
    console.error('[admin/customers/[id] GET orders]', ordersError)
    return NextResponse.json({ error: ordersError.message }, { status: 500 })
  }

  const orders = (ordersData ?? []) as OrderRow[]

  // ── Fetch order items ──────────────────────────────────────────────────────
  const orderIds = orders.map(o => o.id)
  const orderItemsMap = new Map<string, OrderItemRow[]>()

  if (orderIds.length > 0) {
    const { data: itemsData, error: itemsError } = await db
      .from('order_items')
      .select(
        `id, order_id, product_id, quantity, frame_price, lens_price, total_price,
         lens_config, product_snapshot`
      )
      .in('order_id', orderIds)

    if (!itemsError && itemsData) {
      for (const item of itemsData as OrderItemRow[]) {
        const list = orderItemsMap.get(item.order_id) ?? []
        list.push(item)
        orderItemsMap.set(item.order_id, list)
      }
    }
  }

  // ── Merge items onto orders ────────────────────────────────────────────────
  const enrichedOrders = orders.map(o => ({
    ...o,
    items: orderItemsMap.get(o.id) ?? [],
  }))

  // ── Compute analytics ──────────────────────────────────────────────────────
  const completedStatuses = new Set(['completed', 'confirmed', 'processing', 'ready_for_pickup'])
  const pendingStatuses   = new Set(['pending', 'pending_admin_approval'])
  const cancelledStatuses = new Set(['cancelled', 'rejected'])

  let totalSpent      = 0
  let completedOrders = 0
  let pendingOrders   = 0
  let cancelledOrders = 0
  const productFreq   = new Map<string, { name: string; count: number; image: string | null }>()

  for (const order of enrichedOrders) {
    if (completedStatuses.has(order.status)) {
      totalSpent      += order.total_amount ?? 0
      completedOrders += 1
    } else if (pendingStatuses.has(order.status)) {
      pendingOrders += 1
    } else if (cancelledStatuses.has(order.status)) {
      cancelledOrders += 1
    }

    for (const item of order.items) {
      const snap  = item.product_snapshot ?? {}
      const pid   = item.product_id ?? 'unknown'
      const name  = snap.name ?? 'Unknown Product'
      const image = snap.images?.find(img => img.is_primary)?.url
                 ?? snap.images?.[0]?.url
                 ?? null
      const qty   = item.quantity ?? 1
      const entry = productFreq.get(pid)
      if (!entry) productFreq.set(pid, { name, count: qty, image })
      else entry.count += qty
    }
  }

  const aov = completedOrders > 0 ? totalSpent / completedOrders : 0

  const topProducts = [...productFreq.entries()]
    .map(([pid, d]) => ({ product_id: pid, ...d }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // ── Collect unique shipping addresses ──────────────────────────────────────
  const addressSet        = new Set<string>()
  const shippingAddresses: Record<string, string>[] = []
  for (const order of enrichedOrders) {
    if (order.shipping_address) {
      const key = JSON.stringify(order.shipping_address)
      if (!addressSet.has(key)) {
        addressSet.add(key)
        shippingAddresses.push(order.shipping_address)
      }
    }
  }

  return NextResponse.json({
    customer: {
      id:                 profile.id,
      full_name:          profile.full_name ?? 'Unknown',
      phone:              profile.phone ?? null,
      email,
      avatar_url:         profile.avatar_url ?? null,
      created_at:         profile.created_at,
      shipping_addresses: shippingAddresses,
    },
    orders: enrichedOrders,
    analytics: {
      total_orders:        enrichedOrders.length,
      completed_orders:    completedOrders,
      pending_orders:      pendingOrders,
      cancelled_orders:    cancelledOrders,
      total_spent:         totalSpent,
      average_order_value: aov,
      top_products:        topProducts,
      last_active:         enrichedOrders[0]?.created_at ?? null,
    },
  })
}