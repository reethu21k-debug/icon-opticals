// app/api/admin/store-billing/route.ts
//
// Store Billing API — creates orders on behalf of walk-in customers.
//
// ─── CHANGES in this version ──────────────────────────────────────────────────
//  [FEATURE-1] Lens selection: cart items now carry full lens_config (power_type,
//              package_code, prescription fields) identical to the customer cart.
//  [FEATURE-2] Admin price override: cart items may include a price_override
//              { original_price, overridden_price, reason } object. When present
//              the overridden_price is used for billing. The override metadata
//              plus admin user + timestamp are stored on order_items for auditing.
//  [HIGH-4]    Lens prices are now validated against DB lens_packages.
//              Frame prices use the override when present, otherwise DB final_price.
//              Client-submitted prices for unlisted overrides are rejected.

export const runtime = 'nodejs'
export const maxDuration = 60 // awaits generate-invoice which can take up to ~30s

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerClientInstance } from '@/lib/supabase'
import { formatPhone } from '@/lib/whatsapp'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PriceOverride {
  original_price:    number
  overridden_price:  number
  reason:            string
}

interface CartItem {
  product_id:               string
  quantity:                 number
  // Lens config
  lens_price?:              number | null
  lens_power_type?:         string | null
  lens_package_code?:       string | null
  left_eye_sph?:            number | null
  left_eye_cyl?:            number | null
  left_eye_axis?:           number | null
  right_eye_sph?:           number | null
  right_eye_cyl?:           number | null
  right_eye_axis?:          number | null
  pd?:                      number | null
  prescription_upload_url?: string | null
  // Price override (admin only)
  price_override?:          PriceOverride | null
}

interface StoreBillingPayload {
  customer_type: 'existing' | 'new'
  customer_id?:    string
  customer_phone?: string
  customer_email?: string
  new_customer?: { full_name: string; phone: string; email?: string }
  cart_items:        CartItem[]
  notes?:            string
  store_id?:         string
  fulfillment_type?: 'pickup' | 'delivery'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) return null
  return digits
}

async function getAdminUserId(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${process.env.ADMIN_API_SECRET}`) return 'system'
  try {
    const supabase = await createServerClientInstance()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const db = createAdminClient()
    const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
    const p = profile as { role?: string } | null
    if (p?.role !== 'admin') return null
    return user.id
  } catch { return null }
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Authenticate and capture admin identity for audit log
  const adminUserId = await getAdminUserId(request)
  if (!adminUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: StoreBillingPayload
  try { payload = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const {
    customer_type, customer_id, customer_phone, customer_email,
    new_customer, cart_items, notes, store_id, fulfillment_type = 'pickup',
  } = payload

  if (!cart_items?.length) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }
  for (const item of cart_items) {
    if (!item.product_id || !Number.isInteger(item.quantity) || item.quantity < 1) {
      return NextResponse.json({ error: 'Invalid cart item' }, { status: 400 })
    }
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const db = createAdminClient()

  try {
    // ── STEP 1: Resolve or create customer ──────────────────────────────────
    let customerId:    string
    let customerName:  string = 'Customer'
    let customerPhone: string | null = null
    let customerEmail: string = ''
    let isNewCustomer = false
    let passwordSetupLink: string | null = null

    if (customer_type === 'existing') {
      if (customer_id) {
        const { data: prof } = await db.from('profiles').select('id, full_name, phone').eq('id', customer_id).single()
        const p = prof as { id: string; full_name?: string; phone?: string } | null
        if (!p) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
        customerId = p.id; customerName = p.full_name || 'Customer'; customerPhone = p.phone || null
        try { const { data: au } = await db.auth.admin.getUserById(customerId); customerEmail = au?.user?.email ?? '' } catch { /**/ }

      } else if (customer_phone || customer_email) {
        if (customer_phone) {
          const norm = normalisePhone(customer_phone)
          if (!norm) return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
          const { data: prof } = await db.from('profiles').select('id, full_name, phone').eq('phone', norm).maybeSingle()
          const p = prof as { id: string; full_name?: string; phone?: string } | null
          if (!p) return NextResponse.json({ error: `No customer found with phone ${norm}` }, { status: 404 })
          customerId = p.id; customerName = p.full_name || 'Customer'; customerPhone = p.phone || null
        } else {
          const { data: usersResult } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
          const matchedUser = usersResult?.users?.find(u => u.email?.toLowerCase() === customer_email!.toLowerCase())
          if (!matchedUser) return NextResponse.json({ error: `No customer found with email ${customer_email}` }, { status: 404 })
          customerId = matchedUser.id; customerEmail = matchedUser.email ?? ''
          const { data: prof } = await db.from('profiles').select('full_name, phone').eq('id', customerId).single()
          const p = prof as { full_name?: string; phone?: string } | null
          customerName = p?.full_name || 'Customer'; customerPhone = p?.phone || null
        }
        if (!customerEmail) {
          try { const { data: au } = await db.auth.admin.getUserById(customerId!); customerEmail = au?.user?.email ?? '' } catch { /**/ }
        }
      } else {
        return NextResponse.json({ error: 'Provide customer_id, customer_phone, or customer_email' }, { status: 400 })
      }

    } else {
      // ── New customer ──────────────────────────────────────────────────────
      if (!new_customer?.full_name || !new_customer?.phone) {
        return NextResponse.json({ error: 'full_name and phone are required for new customers' }, { status: 400 })
      }
      const normPhone = normalisePhone(new_customer.phone)
      if (!normPhone) return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })

      const { data: existingProf } = await db.from('profiles').select('id').eq('phone', normPhone).maybeSingle()
      if (existingProf) {
        return NextResponse.json({ error: `A customer with phone ${normPhone} already exists. Use "Existing Customer" instead.` }, { status: 409 })
      }

      isNewCustomer = true
      customerName  = new_customer.full_name.trim()
      customerPhone = normPhone
      customerEmail = new_customer.email?.trim() ?? ''

      let newUserId: string

      if (customerEmail) {
        const { data: created, error: createErr } = await db.auth.admin.createUser({
          email: customerEmail, phone: normPhone,
          email_confirm: true, phone_confirm: true,
          user_metadata: { full_name: customerName },
        })
        if (createErr || !created?.user) {
          if (createErr?.message?.includes('already been registered') || createErr?.message?.includes('already exists')) {
            return NextResponse.json({ error: `An account with email ${customerEmail} already exists. Use "Existing Customer" instead.` }, { status: 409 })
          }
          return NextResponse.json({ error: createErr?.message || 'Failed to create user account' }, { status: 500 })
        }
        newUserId = created.user.id
        try {
          const { data: linkData } = await db.auth.admin.generateLink({
            type: 'recovery', email: customerEmail, options: { redirectTo: `${baseUrl}/auth/reset-password` },
          })
          passwordSetupLink = (linkData as { properties?: { action_link?: string } })?.properties?.action_link ?? null
        } catch (linkErr) { console.warn('[store-billing] generateLink failed (non-critical):', linkErr) }

      } else {
        const { data: created, error: createErr } = await db.auth.admin.createUser({
          phone: normPhone, phone_confirm: true, user_metadata: { full_name: customerName },
        })
        if (createErr || !created?.user) {
          if (createErr?.message?.includes('already been registered') || createErr?.message?.includes('already exists')) {
            return NextResponse.json({ error: `An account with phone ${normPhone} already exists. Use "Existing Customer" instead.` }, { status: 409 })
          }
          return NextResponse.json({ error: createErr?.message || 'Failed to create user account' }, { status: 500 })
        }
        newUserId = created.user.id
      }

      customerId = newUserId
      const { error: profileErr } = await db.from('profiles').insert({
        id: customerId, full_name: customerName, phone: normPhone,
        role: 'customer', whatsapp_opt_in: true,
        created_by_admin: true, registration_source: 'store_billing',
      })
      if (profileErr) {
        await db.auth.admin.deleteUser(customerId).catch(() => {})
        return NextResponse.json({ error: 'Failed to create customer profile' }, { status: 500 })
      }
      console.log(`[store-billing] New customer created: ${customerName} (${customerId})`)
    }

    // ── STEP 2: Validate products (server-side) ────────────────────────────
    const productIds = cart_items.map(i => i.product_id)
    const { data: products } = await db
      .from('products')
      .select('id, name, brand, final_price, stock, is_active, images')
      .in('id', productIds)

    if (!products?.length) return NextResponse.json({ error: 'Products not found' }, { status: 400 })

    const productMap = new Map((products as Record<string, unknown>[]).map(p => [p.id as string, p]))

    for (const item of cart_items) {
      const p = productMap.get(item.product_id) as Record<string, unknown> | undefined
      if (!p) return NextResponse.json({ error: `Product ${item.product_id} not found` }, { status: 400 })
      if (!p.is_active) return NextResponse.json({ error: `Product "${p.name}" is unavailable` }, { status: 400 })
      if ((p.stock as number) < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock for "${p.name}" (have ${p.stock}, need ${item.quantity})` }, { status: 400 })
      }
    }

    // ── STEP 3: Validate lens packages server-side ─────────────────────────
    // Collect all requested package codes
    const packageCodes = [...new Set(
      cart_items
        .map(i => i.lens_package_code)
        .filter((c): c is string => !!c),
    )]

    const lensPackageMap = new Map<string, number>()
    if (packageCodes.length > 0) {
      const { data: pkgs } = await db
        .from('lens_packages')
        .select('code, price_addon')
        .in('code', packageCodes)
        .eq('is_active', true)

      if (pkgs) {
        for (const pkg of pkgs as Array<{ code: string; price_addon: number }>) {
          lensPackageMap.set(pkg.code, pkg.price_addon)
        }
      }

      // Reject any unknown/inactive package
      for (const code of packageCodes) {
        if (!lensPackageMap.has(code)) {
          return NextResponse.json({ error: `Lens package "${code}" is unavailable` }, { status: 400 })
        }
      }
    }

    // ── STEP 4: Validate price overrides ──────────────────────────────────
    // Overrides are allowed only from admin (already verified above).
    // We sanity-check the original_price matches DB final_price so the client
    // cannot fabricate a misleading original price in the audit record.
    const overrideTimestamp = new Date().toISOString()
    for (const item of cart_items) {
      if (!item.price_override) continue
      const p = productMap.get(item.product_id) as Record<string, unknown>
      const dbPrice = p.final_price as number
      if (Math.abs(item.price_override.original_price - dbPrice) > 0.01) {
        return NextResponse.json({
          error: `Price override original_price mismatch for "${p.name}". Expected ${dbPrice}, got ${item.price_override.original_price}.`,
        }, { status: 400 })
      }
      if (item.price_override.overridden_price < 0) {
        return NextResponse.json({ error: `Override price cannot be negative for "${p.name}".` }, { status: 400 })
      }
    }

    // ── STEP 5: Compute validated item totals ──────────────────────────────
    const validatedItems = cart_items.map(item => {
      const p = productMap.get(item.product_id) as Record<string, unknown>

      // Frame price: use admin override if present, otherwise DB price
      const dbFramePrice  = p.final_price as number
      const framePrice    = item.price_override
        ? item.price_override.overridden_price
        : dbFramePrice

      // Lens price: resolve from DB lens_packages, not from client submission
      const lensPrice = item.lens_package_code
        ? (lensPackageMap.get(item.lens_package_code) ?? 0)
        : 0

      const totalPrice = framePrice * item.quantity + lensPrice

      return {
        ...item,
        frame_price:    framePrice,
        lens_price:     lensPrice,
        total_price:    totalPrice,
        // Carry resolved audit fields
        _db_frame_price: dbFramePrice,
      }
    })

    const subtotal    = validatedItems.reduce((s, i) => s + i.total_price, 0)
    const totalAmount = Math.max(0, subtotal)

    // ── STEP 6: Create order ───────────────────────────────────────────────
    const { data: order, error: orderErr } = await db.from('orders').insert({
      user_id:          customerId,
      status:           'confirmed',
      payment_status:   'paid',
      subtotal,
      discount_amount:  0,
      total_amount:     totalAmount,
      fulfillment_type,
      store_id:         store_id || null,
      notes:            notes?.slice(0, 500) || null,
      created_by_admin: true,
      sales_channel:    'store_billing',
    }).select().single()

    if (orderErr || !order) {
      console.error('[store-billing] order insert error:', orderErr)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    const orderRecord = order as Record<string, unknown>

    // ── STEP 7: Create order items (with lens_config + price_override_audit) ─
    const orderItems = validatedItems.map(item => {
      const p    = productMap.get(item.product_id) as Record<string, unknown>
      const imgs = p.images as Array<{ url: string }> | null

      // Build lens_config object (mirrors customer cart schema)
      const lensConfig = item.lens_power_type ? {
        power_type:       item.lens_power_type,
        package_code:     item.lens_package_code ?? null,
        left_eye:         item.left_eye_sph != null
          ? { sph: item.left_eye_sph, cyl: item.left_eye_cyl, axis: item.left_eye_axis }
          : null,
        right_eye:        item.right_eye_sph != null
          ? { sph: item.right_eye_sph, cyl: item.right_eye_cyl, axis: item.right_eye_axis }
          : null,
        pd:               item.pd ?? null,
        prescription_url: item.prescription_upload_url ?? null,
        upload_later:     !item.left_eye_sph && !item.prescription_upload_url && item.lens_power_type === 'with_power',
      } : null

      // Build price_override_audit object — stored for full traceability
      const priceOverrideAudit = item.price_override ? {
        original_price:   item._db_frame_price,          // DB authoritative price
        overridden_price: item.price_override.overridden_price,
        reason:           item.price_override.reason,
        admin_user_id:    adminUserId,
        modified_at:      overrideTimestamp,
      } : null

      return {
        order_id:            orderRecord.id,
        product_id:          item.product_id,
        product_snapshot:    { name: p.name, brand: p.brand, image_url: imgs?.[0]?.url || '' },
        quantity:            item.quantity,
        lens_config:         lensConfig,
        frame_price:         item.frame_price,
        lens_price:          item.lens_price,
        total_price:         item.total_price,
        price_override_audit: priceOverrideAudit,
      }
    })

    const { error: itemsErr } = await db.from('order_items').insert(orderItems)
    if (itemsErr) {
      console.error('[store-billing] order items error:', itemsErr)
      await db.from('orders').delete().eq('id', orderRecord.id)
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
    }

    // ── STEP 8: Reduce stock — atomic conditional UPDATE ──────────────────
    for (const item of validatedItems) {
      const p = productMap.get(item.product_id) as Record<string, unknown>
      const newStock = Math.max(0, (p.stock as number) - item.quantity)
      const { error: stockErr, count } = await db
        .from('products')
        .update({ stock: newStock })
        .eq('id', item.product_id)
        .gte('stock', item.quantity)
        .select('id')

      if (stockErr) {
        console.error(`[store-billing] stock update error for ${item.product_id}:`, stockErr)
      } else if (count === 0) {
        console.warn(`[store-billing] Stock race detected for product ${item.product_id} on order ${orderRecord.order_number as string}. Manual stock check required.`)
      }
    }

    // ── Log price overrides ───────────────────────────────────────────────
    const overriddenItems = validatedItems.filter(i => i.price_override)
    if (overriddenItems.length > 0) {
      console.log(
        `[store-billing] Price overrides on order ${orderRecord.order_number as string}:`,
        overriddenItems.map(i => ({
          product_id:      i.product_id,
          original:        i._db_frame_price,
          overridden:      i.frame_price,
          reason:          i.price_override?.reason,
          admin_user_id:   adminUserId,
        })),
      )
    }

    console.log(
      `[store-billing] Order ${orderRecord.order_number as string} created`,
      `for ${customerName} | items: ${validatedItems.length} | total: ₹${totalAmount}`,
    )

    // ── STEP 9: Generate invoice ──────────────────────
    // IMPORTANT: do NOT fire-and-forget here. Vercel freezes this function the
    // instant we return a response -- any in-flight fetch that hasn't completed
    // gets killed, silently dropping the invoice + confirmation email.
    // Awaiting keeps the function alive until generate-invoice responds.
    // generate-invoice has maxDuration=60 and returns once the PDF is uploaded.
    try {
      const invoiceRes = await fetch(`${baseUrl}/api/generate-invoice`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ADMIN_API_SECRET}` },
        body: JSON.stringify({
          order_id:     orderRecord.id,
          order_number: orderRecord.order_number,
          user_id:      customerId,
          force:        false,
          phone:        customerPhone,
        }),
      })

      // FIX: await fetch() only throws on network errors, NOT on HTTP 4xx/5xx.
      // Without this check, a 500 from generate-invoice (e.g. pdfkit crashing
      // because its AFM font files are missing from the Vercel bundle) was
      // completely invisible — the order appeared to succeed but no invoice,
      // email, or WhatsApp was ever sent. Now failures are visible in Vercel logs.
      if (!invoiceRes.ok) {
        const errBody = await invoiceRes.json().catch(() => ({}))
        console.error(
          `[store-billing] ❌ generate-invoice HTTP ${invoiceRes.status} for order ${orderRecord.order_number as string}:`,
          errBody,
        )
      } else {
        console.log(`[store-billing] ✅ Invoice generated for order ${orderRecord.order_number as string}`)
      }
    } catch (err) {
      // Network-level error (DNS failure, connection refused, etc.)
      // Non-fatal: order already created. Log for visibility.
      console.error('[store-billing] invoice trigger network error (order still created):', err)
    }

    // ── STEP 10: New customer notifications ───────────────────────────────
    //
    // IMPORTANT: use Promise.allSettled and await — do NOT fire-and-forget.
    // Vercel freezes this function the instant `return NextResponse.json(...)`
    // executes, silently killing any in-flight fetch that hasn't completed.
    // Awaiting keeps the function alive until both notifications are sent.
    if (isNewCustomer) {
      const newCustomerNotifications: Promise<void>[] = []

      if (passwordSetupLink && customerEmail) {
        const setupHtml = `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f9fafb;">
            <h2 style="font-size:20px;font-weight:600;color:#0f172a;margin:0 0 16px;">Welcome to Icon Opticals</h2>
            <p style="color:#374151;margin:0 0 12px;">Hello ${customerName},</p>
            <p style="color:#374151;margin:0 0 12px;">Your account has been created. You can now log in to view your orders and invoices.</p>
            <p style="color:#374151;margin:0 0 24px;">Click below to set your password:</p>
            <a href="${passwordSetupLink}"
               style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;font-weight:600;border-radius:4px;font-size:14px;">
              Set Your Password →
            </a>
            <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;">If you did not visit our store, please ignore this email.</p>
            <p style="color:#9ca3af;font-size:12px;margin:4px 0 0;">— Icon Opticals</p>
          </div>
        `
        newCustomerNotifications.push(
          fetch(`${baseUrl}/api/send-email`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ADMIN_API_SECRET}` },
            body: JSON.stringify({
              to:   customerEmail,
              type: 'generic_html',
              data: { subject: 'Set up your Icon Opticals account', html: setupHtml },
            }),
          })
            .then(() => console.log(`[store-billing] ✅ Setup email sent → ${customerEmail}`))
            .catch(err => console.error('[store-billing] ❌ Setup email failed:', err)),
        )
      }

      if (customerPhone) {
        const formattedPhone = formatPhone(customerPhone)
        if (formattedPhone) {
          const WA_API_URL = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
          const waText =
            `Hello ${customerName} 👓\n\n` +
            `Welcome to Icon Opticals! Your purchase has been confirmed.\n\n` +
            `🧾 Order: ${orderRecord.order_number as string}\n` +
            `💰 Amount: ₹${totalAmount}\n\n` +
            (passwordSetupLink
              ? `Set your account password to view invoices:\n${passwordSetupLink}\n\n`
              : '') +
            `Thank you for shopping with us!\n— Icon Opticals`

          newCustomerNotifications.push(
            fetch(WA_API_URL, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type:    'individual',
                to:                formattedPhone,
                type:              'text',
                text:              { body: waText },
              }),
            })
              .then(() => console.log(`[store-billing] ✅ Setup WhatsApp sent → ${formattedPhone}`))
              .catch(err => console.error('[store-billing] ❌ Setup WhatsApp failed:', err)),
          )
        }
      }

      // Wait for all new-customer notifications before returning
      await Promise.allSettled(newCustomerNotifications)
    }
    return NextResponse.json({
      success:         true,
      order_id:        orderRecord.id,
      order_number:    orderRecord.order_number,
      customer_id:     customerId,
      customer_name:   customerName,
      total_amount:    totalAmount,
      is_new_customer: isNewCustomer,
    }, { status: 201 })

  } catch (error) {
    console.error('[store-billing] unhandled error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── GET: Search customers ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  if (!(await getAdminUserId(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q     = searchParams.get('q')?.trim() || ''
  const field = searchParams.get('field') || 'phone'

  if (!q || q.length < 3) return NextResponse.json({ customers: [] })

  const db = createAdminClient()

  try {
    if (field === 'email') {
      const { data: usersResult } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const matched = (usersResult?.users || [])
        .filter(u => u.email?.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 10)

      const profileIds = matched.map(u => u.id)
      const { data: profiles } = profileIds.length
        ? await db.from('profiles').select('id, full_name, phone').in('id', profileIds)
        : { data: [] }

      const profileMap = new Map(
        ((profiles || []) as Array<{ id: string; full_name?: string; phone?: string }>).map(p => [p.id, p]),
      )

      return NextResponse.json({
        customers: matched.map(u => ({
          id: u.id, email: u.email ?? '',
          full_name: profileMap.get(u.id)?.full_name ?? '',
          phone:     profileMap.get(u.id)?.phone ?? '',
        })),
      })
    }

    // Phone search
    const norm = normalisePhone(q)
    if (!norm) return NextResponse.json({ customers: [] })

    const { data: profiles } = await db
      .from('profiles').select('id, full_name, phone').ilike('phone', `%${norm}%`).limit(10)

    const profileRows = (profiles || []) as Array<{ id: string; full_name?: string; phone?: string }>
    const ids = profileRows.map(p => p.id)

    const emailMap = new Map<string, string>()
    if (ids.length) {
      const { data: usersResult } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
      for (const u of usersResult?.users || []) {
        if (ids.includes(u.id)) emailMap.set(u.id, u.email ?? '')
      }
    }

    return NextResponse.json({
      customers: profileRows.map(p => ({
        id: p.id, full_name: p.full_name ?? '', phone: p.phone ?? '', email: emailMap.get(p.id) ?? '',
      })),
    })

  } catch (err) {
    console.error('[store-billing] customer search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}