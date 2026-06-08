'use client'

// app/admin/store-billing/page.tsx
//
// Store Billing — POS interface for walk-in customers.
// Allows admin to:
//   1. Search products and build a cart
//   2. Select lenses via the full LensFlowModal (same as customer experience)
//   3. Override product price per item (admin-only, stored in audit log)
//   4. Select existing customer (by phone/email) or create new one
//   5. Generate bill → order confirmed + invoice sent automatically

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, User, UserPlus,
  CheckCircle, Loader2, AlertCircle, ReceiptText, X, Phone,
  Mail, RefreshCw, Package, ChevronRight, Glasses, Pencil,
  Check, Info,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAdminBillingListener } from '@/hooks/useAdminBilling'
import LensFlowModal from '@/components/lens/LensFlowModal'
import type { LensFlowState, Product as GlobalProduct } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product {
  id:               string
  name:             string
  brand:            string
  category:         string
  final_price:      number
  base_price:       number
  discount_percent: number
  stock:            number
  is_active:        boolean
  images:           Array<{ url: string; is_primary: boolean }>
}

interface PriceOverride {
  original_price: number
  overridden_price: number
  reason: string
}

interface CartItem {
  product:        Product
  quantity:       number
  frame_price:    number    // effective unit frame price (after override if any)
  lens_price:     number
  total_price:    number
  lens_config:    LensFlowState | null
  price_override: PriceOverride | null
}

interface Customer {
  id:        string
  full_name: string
  phone:     string
  email:     string
}

type CustomerTab = 'existing' | 'new'

// ── Currency helper ───────────────────────────────────────────────────────────
const fmt = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

// ── Price Override Modal ──────────────────────────────────────────────────────

interface PriceOverrideModalProps {
  item:     CartItem
  onSave:   (override: PriceOverride | null) => void
  onClose:  () => void
}

function PriceOverrideModal({ item, onSave, onClose }: PriceOverrideModalProps) {
  const originalPrice  = item.product.final_price
  const [newPrice, setNewPrice] = useState(
    item.price_override ? String(item.price_override.overridden_price) : String(originalPrice),
  )
  const [reason, setReason] = useState(item.price_override?.reason ?? '')
  const [error, setError]   = useState('')

  const parsedPrice = parseFloat(newPrice)
  const isValid     = !isNaN(parsedPrice) && parsedPrice >= 0
  const hasChanged  = isValid && parsedPrice !== originalPrice

  const handleSave = () => {
    if (!isValid) { setError('Please enter a valid price.'); return }
    if (hasChanged && !reason.trim()) { setError('Please provide a reason for the price override.'); return }
    if (hasChanged) {
      onSave({ original_price: originalPrice, overridden_price: parsedPrice, reason: reason.trim() })
    } else {
      onSave(null) // Remove override if price matches original
    }
    onClose()
  }

  const discount = isValid ? Math.round(((originalPrice - parsedPrice) / originalPrice) * 100) : 0

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-all">
      <div className="bg-white/95 backdrop-blur-2xl w-full max-w-md shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] rounded-3xl p-8 relative border border-white animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors p-2 bg-white rounded-full shadow-sm hover:shadow-md border border-slate-100">
          <X size={16} strokeWidth={2} />
        </button>

        <div className="mb-8">
          <p className="text-[9px] uppercase tracking-[0.25em] font-bold text-slate-400 mb-2">Admin Override</p>
          <h3 className="text-2xl font-light text-slate-900 tracking-tight" style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}>
            Edit Product Price
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1.5 truncate pr-8">{item.product.name}</p>
        </div>

        {/* Original price reference */}
        <div className="bg-slate-50/80 backdrop-blur-sm border border-slate-100/60 rounded-2xl p-5 mb-6 flex items-center justify-between shadow-inner">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Original Price (MRP)</p>
            <p className="text-base font-semibold text-slate-800">{fmt(originalPrice)}</p>
          </div>
          {item.price_override && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Current Override</p>
              <p className="text-base font-semibold text-amber-600">{fmt(item.price_override.overridden_price)}</p>
            </div>
          )}
        </div>

        {/* New price input */}
        <div className="mb-6">
          <label className="text-[10px] uppercase tracking-widest font-bold text-slate-600 block mb-2 px-1">
            New Unit Price <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newPrice}
              onChange={e => { setNewPrice(e.target.value); setError('') }}
              className="w-full pl-9 pr-4 py-4 bg-white/50 border border-slate-200/60 rounded-xl text-sm font-bold text-slate-900 shadow-sm focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all"
              placeholder="0.00"
              autoFocus
            />
          </div>
          {isValid && hasChanged && (
            <div className="mt-3 flex items-center gap-2 px-1">
              {parsedPrice < originalPrice ? (
                <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
                  <Check size={12} strokeWidth={2.5}/> Discount: {fmt(originalPrice - parsedPrice)} ({discount}% off)
                </p>
              ) : (
                <p className="text-[11px] font-bold text-amber-600 flex items-center gap-1.5">
                  <AlertCircle size={12} strokeWidth={2.5}/> Price increase: +{fmt(parsedPrice - originalPrice)}
                </p>
              )}
            </div>
          )}
          {isValid && !hasChanged && (
            <p className="text-[11px] font-semibold text-slate-400 mt-3 flex items-center gap-1.5 px-1">
              <Check size={12} strokeWidth={2.5}/> Same as original — no override will be applied
            </p>
          )}
        </div>

        {/* Reason */}
        <div className="mb-8">
          <label className="text-[10px] uppercase tracking-widest font-bold text-slate-600 block mb-2 px-1">
            Reason / Notes
            {hasChanged && <span className="text-rose-400 ml-1">*</span>}
          </label>
          <input
            type="text"
            value={reason}
            onChange={e => { setReason(e.target.value); setError('') }}
            placeholder="e.g. Loyal customer, bulk discount…"
            className="w-full px-4 py-4 bg-white/50 border border-slate-200/60 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all"
          />
        </div>

        {/* Audit note */}
        <div className="flex items-start gap-3 bg-slate-50/50 border border-slate-100 p-4 mb-6 rounded-2xl">
          <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100 flex-shrink-0">
            <Info size={14} className="text-slate-500" strokeWidth={2} />
          </div>
          <p className="text-[10px] font-medium text-slate-500 leading-relaxed mt-0.5">
            Price overrides are stored in the order record for auditing. The original price, updated price, admin user, and timestamp are captured.
          </p>
        </div>

        {error && (
          <p className="text-xs font-bold text-rose-500 mb-6 flex items-center gap-2 bg-rose-50 p-3 rounded-xl border border-rose-100">
            <AlertCircle size={14} strokeWidth={2} /> {error}
          </p>
        )}

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-xl border border-slate-200 bg-white shadow-sm text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="flex-1 py-4 rounded-xl bg-slate-900 shadow-md text-white text-[10px] font-bold uppercase tracking-[0.15em] hover:bg-slate-800 transition-all disabled:opacity-40"
          >
            Apply Price
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Lens Config Badge ─────────────────────────────────────────────────────────

function LensConfigBadge({ config, onEdit }: { config: LensFlowState | null; onEdit: () => void }) {
  if (!config?.power_type) {
    return (
      <button
        onClick={onEdit}
        className="text-[10px] font-bold text-slate-400 hover:text-slate-800 flex items-center gap-1.5 underline underline-offset-4 transition-colors"
      >
        <Glasses size={12} strokeWidth={2} /> Add lens
      </button>
    )
  }

  const labels: Record<string, string> = {
    frame_only:  'Frame Only',
    zero_power:  'Zero Power',
    with_power:  'With Power',
    progressive: 'Progressive',
  }

  return (
    <button
      onClick={onEdit}
      className="flex items-center gap-2 text-[10px] bg-slate-100/80 border border-slate-200/60 rounded-lg hover:bg-white hover:border-slate-300 px-3 py-1.5 transition-all shadow-sm group"
    >
      <Glasses size={12} strokeWidth={2} className="text-slate-600" />
      <span className="text-slate-800 font-bold tracking-wide">{labels[config.power_type] ?? config.power_type}</span>
      {config.package_code && (
        <span className="text-slate-500 font-medium">· {config.package_code}</span>
      )}
      <Pencil size={10} strokeWidth={2} className="text-slate-400 group-hover:text-slate-800 ml-1 transition-colors" />
    </button>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StoreBillingPage() {
  const supabase = createClient()

  // ── Product Search ─────────────────────────────────────────────────────
  const [productQuery, setProductQuery]     = useState('')
  const [productResults, setProductResults] = useState<Product[]>([])
  const [searchingProducts, setSearchingProducts] = useState(false)
  const productSearchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Cart ───────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([])

  // ── Lens modal ─────────────────────────────────────────────────────────
  const [lensModalProduct, setLensModalProduct] = useState<Product | null>(null)

  // ── Price override modal ───────────────────────────────────────────────
  const [priceOverrideItem, setPriceOverrideItem] = useState<CartItem | null>(null)

  // ── Customer ───────────────────────────────────────────────────────────
  const [customerTab, setCustomerTab]           = useState<CustomerTab>('existing')
  const [customerQuery, setCustomerQuery]       = useState('')
  const [customerField, setCustomerField]       = useState<'phone' | 'email'>('phone')
  const [customerResults, setCustomerResults]   = useState<Customer[]>([])
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [newCustomer, setNewCustomer] = useState({ full_name: '', phone: '', email: '' })

  // ── Billing state ──────────────────────────────────────────────────────
  const [notes, setNotes]     = useState('')
  const [storeId, setStoreId] = useState('')
  const [stores, setStores]   = useState<Array<{ id: string; name: string }>>([])

  const [generating, setGenerating]       = useState(false)
  const [billingError, setBillingError]   = useState<string | null>(null)
  const [success, setSuccess]             = useState<{
    order_number: string; customer_name: string; total: number
  } | null>(null)

  // ── Remote add-to-billing toast ─────────────────────────────────────────
  const [billingToast, setBillingToast] = useState<string | null>(null)

  /** Called when admin clicks "Add to Billing" on any ProductCard */
  const handleRemoteAddToBilling = useCallback((product: import('@/types').Product) => {
    // Map the global Product type to the local billing Product type
    const billingProduct: Product = {
      id:               product.id,
      name:             product.name,
      brand:            product.brand,
      category:         product.category,
      final_price:      product.final_price,
      base_price:       product.base_price,
      discount_percent: product.discount_percent,
      stock:            product.stock ?? 0,
      is_active:        true,
      images:           (product.images ?? []).map(img => ({
        url:        img.url ?? '',
        is_primary: img.is_primary ?? false,
      })),
    }
    // Add directly to cart as frame-only (no lens flow) for instant billing
    setCart(prev => {
      const existing = prev.find(i => i.product.id === billingProduct.id)
      if (existing) {
        return prev.map(i =>
          i.product.id === billingProduct.id
            ? {
                ...i,
                quantity:    i.quantity + 1,
                total_price: i.frame_price * (i.quantity + 1) + i.lens_price,
              }
            : i,
        )
      }
      return [...prev, {
        product:        billingProduct,
        quantity:       1,
        frame_price:    billingProduct.final_price,
        lens_price:     0,
        total_price:    billingProduct.final_price,
        lens_config:    null,
        price_override: null,
      }]
    })
    // Show toast
    setBillingToast(`${product.name} added to billing`)
    setTimeout(() => setBillingToast(null), 2800)
  }, [])

  useAdminBillingListener(handleRemoteAddToBilling)

  // ── Load stores on mount ───────────────────────────────────────────────
  useEffect(() => {
    supabase.from('stores').select('id, name').eq('is_active', true).then(({ data }: { data: Array<{ id: string; name: string }> | null }) => {
      setStores((data || []) as Array<{ id: string; name: string }>)
      if (data?.[0]) setStoreId(data[0].id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Product search ─────────────────────────────────────────────────────
  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setProductResults([]); return }
    setSearchingProducts(true)
    const { data } = await supabase
      .from('products')
      .select('id, name, brand, category, final_price, base_price, discount_percent, stock, is_active, images')
      .eq('is_active', true)
      .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
      .order('name')
      .limit(12)
    setProductResults((data || []) as Product[])
    setSearchingProducts(false)
  }, [supabase])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchProducts(productQuery), 280)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [productQuery, searchProducts])

  // ── Cart helpers ───────────────────────────────────────────────────────

  /** Add product to cart — opens lens modal immediately */
  const addToCart = (product: Product) => {
    setProductQuery('')
    setProductResults([])
    // Open lens selection right away (same as customer flow)
    setLensModalProduct(product)
  }

  /** Called when admin completes lens selection in the modal */
  const handleLensComplete = (config: LensFlowState) => {
    if (!lensModalProduct) return
    const product    = lensModalProduct
    
    // We compute lens addon price from the packages via the custom attribute _lens_addon
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      const lensAddon = (config as LensFlowState & { _lens_addon?: number })._lens_addon ?? 0

      if (existing) {
        return prev.map(i =>
          i.product.id === product.id
            ? {
                ...i,
                lens_config:  config,
                lens_price:   lensAddon,
                frame_price:  i.price_override?.overridden_price ?? product.final_price,
                total_price:  (i.price_override?.overridden_price ?? product.final_price) * i.quantity + lensAddon,
              }
            : i,
        )
      }

      const framePrice = product.final_price
      return [...prev, {
        product,
        quantity:       1,
        frame_price:    framePrice,
        lens_price:     lensAddon,
        total_price:    framePrice + lensAddon,
        lens_config:    config,
        price_override: null,
      }]
    })

    setLensModalProduct(null)
    productSearchRef.current?.focus()
  }

  const openLensModal = (item: CartItem) => setLensModalProduct(item.product)

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(i => {
        if (i.product.id !== productId) return i
        const newQty    = Math.max(1, i.quantity + delta)
        const unitFrame = i.frame_price
        return {
          ...i,
          quantity:    newQty,
          total_price: unitFrame * newQty + i.lens_price,
        }
      })
      .filter(i => i.quantity > 0),
    )
  }

  const removeFromCart = (productId: string) =>
    setCart(prev => prev.filter(i => i.product.id !== productId))

  /** Apply or remove a price override for a cart item */
  const applyPriceOverride = (productId: string, override: PriceOverride | null) => {
    setCart(prev => prev.map(i => {
      if (i.product.id !== productId) return i
      const framePrice = override ? override.overridden_price : i.product.final_price
      return {
        ...i,
        price_override: override,
        frame_price:    framePrice,
        total_price:    framePrice * i.quantity + i.lens_price,
      }
    }))
  }

  const subtotal  = cart.reduce((s, i) => s + i.total_price, 0)
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0)

  // ── Customer search ────────────────────────────────────────────────────
  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 3) { setCustomerResults([]); return }
    setSearchingCustomers(true)
    const res = await fetch(
      `/api/admin/store-billing?q=${encodeURIComponent(q)}&field=${customerField}`,
      { credentials: 'include' },
    )
    if (res.ok) {
      const { customers } = await res.json()
      setCustomerResults(customers || [])
    }
    setSearchingCustomers(false)
  }, [customerField])

  const customerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (customerDebounce.current) clearTimeout(customerDebounce.current)
    customerDebounce.current = setTimeout(() => searchCustomers(customerQuery), 350)
    return () => { if (customerDebounce.current) clearTimeout(customerDebounce.current) }
  }, [customerQuery, searchCustomers])

  // ── Validate ───────────────────────────────────────────────────────────
  const cartValid     = cart.length > 0
  const customerValid = selectedCustomer !== null ||
    (customerTab === 'new' && newCustomer.full_name.trim() && newCustomer.phone.trim())

  // ── Generate bill ──────────────────────────────────────────────────────
  const handleGenerateBill = async () => {
    if (!cartValid || !customerValid) return
    setGenerating(true)
    setBillingError(null)

    const body: Record<string, unknown> = {
      cart_items: cart.map(i => {
        const cfg = i.lens_config
        return {
          product_id:               i.product.id,
          quantity:                 i.quantity,
          frame_price:              i.frame_price,
          lens_price:               i.lens_price,
          total_price:              i.total_price,
          // Lens config fields
          lens_power_type:          cfg?.power_type    ?? null,
          lens_package_code:        cfg?.package_code  ?? null,
          left_eye_sph:             cfg?.prescription?.left_eye.sph   ?? null,
          left_eye_cyl:             cfg?.prescription?.left_eye.cyl   ?? null,
          left_eye_axis:            cfg?.prescription?.left_eye.axis  ?? null,
          right_eye_sph:            cfg?.prescription?.right_eye.sph  ?? null,
          right_eye_cyl:            cfg?.prescription?.right_eye.cyl  ?? null,
          right_eye_axis:           cfg?.prescription?.right_eye.axis ?? null,
          pd:                       cfg?.prescription?.pd             ?? null,
          prescription_upload_url:  cfg?.prescription_url             ?? null,
          // Price override fields
          price_override:           i.price_override ?? null,
        }
      }),
      notes:            notes || undefined,
      store_id:         storeId || undefined,
      fulfillment_type: 'pickup',
    }

    if (selectedCustomer) {
      body.customer_type = 'existing'
      body.customer_id   = selectedCustomer.id
    } else {
      body.customer_type = 'new'
      body.new_customer  = {
        full_name: newCustomer.full_name.trim(),
        phone:     newCustomer.phone.trim(),
        email:     newCustomer.email.trim() || undefined,
      }
    }

    try {
      const res = await fetch('/api/admin/store-billing', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setBillingError(data.error || 'Failed to generate bill')
        setGenerating(false)
        return
      }

      setSuccess({
        order_number:  data.order_number,
        customer_name: data.customer_name,
        total:         data.total_amount,
      })
    } catch (err) {
      setBillingError('Network error — please try again')
      console.error('[store-billing] handleGenerateBill:', err)
    }

    setGenerating(false)
  }

  // ── Reset everything ───────────────────────────────────────────────────
  const resetAll = () => {
    setCart([])
    setSelectedCustomer(null)
    setNewCustomer({ full_name: '', phone: '', email: '' })
    setCustomerQuery('')
    setCustomerResults([])
    setProductQuery('')
    setProductResults([])
    setNotes('')
    setBillingError(null)
    setSuccess(null)
    setCustomerTab('existing')
    setLensModalProduct(null)
    setPriceOverrideItem(null)
  }

  // ── Success screen ─────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50/50 via-white to-rose-50/20 flex flex-col items-center justify-center text-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-200/30 rounded-full blur-[100px] animate-float pointer-events-none" />
        
        <div className="bg-white/70 backdrop-blur-3xl border border-white/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] rounded-[2.5rem] p-12 md:p-16 max-w-lg w-full relative z-10 animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 shadow-[0_8px_32px_rgba(16,185,129,0.15)] flex items-center justify-center mx-auto mb-8 relative">
            <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping opacity-75" />
            <CheckCircle className="text-emerald-600 relative z-10" size={32} strokeWidth={2} />
          </div>
          <h2 className="text-3xl tracking-tight text-slate-900 mb-3" style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}>Bill Generated</h2>
          <p className="text-sm font-medium text-slate-500 mb-1.5">Order No. <span className="font-bold text-slate-900">{success.order_number}</span></p>
          <p className="text-sm font-medium text-slate-500 mb-1.5">Customer: <span className="font-bold text-slate-800">{success.customer_name}</span></p>
          <p className="text-3xl font-light text-slate-900 mt-6 mb-8 bg-white/50 py-3 rounded-2xl border border-slate-100 shadow-sm">{fmt(success.total)}</p>
          <p className="text-xs font-medium text-slate-500 mb-10 max-w-[280px] mx-auto leading-relaxed">
            Invoice is being generated and will be sent to the customer via WhatsApp and email automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={resetAll}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-900 shadow-md text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all btn-shine relative overflow-hidden"
            >
              <Plus size={14} strokeWidth={2} /> New Bill
            </button>
            <a
              href="/admin/orders"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-700 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all"
            >
              View Orders
            </a>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-20px) scale(1.05); } }
          .animate-float { animation: float 8s ease-in-out infinite; }
          .btn-shine::after { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent); transform: skewX(-20deg); transition: all 0.6s ease; }
          .btn-shine:hover::after { left: 150%; }
        `}} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 via-white to-rose-50/20 p-6 md:p-10 relative overflow-hidden font-sans">
      
      {/* Decorative ambient background orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45rem] h-[45rem] bg-rose-200/20 rounded-full blur-[120px] animate-float pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45rem] h-[45rem] bg-slate-200/40 rounded-full blur-[120px] animate-float-delayed pointer-events-none" />

      <div className="max-w-[1400px] mx-auto relative z-10">

        {/* ── Remote Add-to-Billing Toast ─────────────────────────────────── */}
        {billingToast && (
          <div
            style={{
              position:     'fixed',
              bottom:       32,
              right:        32,
              zIndex:       9999,
              display:      'flex',
              alignItems:   'center',
              gap:          12,
              background:   'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(16px)',
              border:       '1px solid rgba(255,255,255,0.1)',
              color:        '#fff',
              padding:      '16px 24px',
              borderRadius: 20,
              fontSize:     12,
              fontWeight:   700,
              letterSpacing: '0.05em',
              boxShadow:    '0 20px 40px -10px rgba(15,23,42,0.3)',
              animation:    'billingToastIn .4s cubic-bezier(.22,1,.36,1)',
            }}
          >
            <style>{`
              @keyframes billingToastIn {
                from { opacity:0; transform:translateY(20px) scale(.95) }
                to   { opacity:1; transform:translateY(0) scale(1) }
              }
            `}</style>
            <div className="p-1.5 bg-white/10 rounded-lg">
              <ReceiptText size={16} strokeWidth={2} />
            </div>
            <span>{billingToast}</span>
          </div>
        )}

        {/* ── Lens Flow Modal ────────────────────────────────────────────── */}
        {lensModalProduct && (
          <LensFlowModalWithPrice
            product={lensModalProduct as unknown as GlobalProduct}
            existingConfig={cart.find(i => i.product.id === lensModalProduct.id)?.lens_config ?? null}
            onClose={() => setLensModalProduct(null)}
            onComplete={handleLensComplete}
          />
        )}

        {/* ── Price Override Modal ───────────────────────────────────────── */}
        {priceOverrideItem && (
          <PriceOverrideModal
            item={priceOverrideItem}
            onSave={override => applyPriceOverride(priceOverrideItem.product.id, override)}
            onClose={() => setPriceOverrideItem(null)}
          />
        )}

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
              <ReceiptText size={16} strokeWidth={2} className="text-slate-500" />
            </div>
            <h1 className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-400">Admin Interface</h1>
          </div>
          <h2 className="text-3xl md:text-4xl font-light tracking-tight text-slate-900 mb-2" style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}>
            Store Billing
          </h2>
          <p className="text-xs font-medium text-slate-500">Create and process in-store orders for walk-in clientele.</p>
        </div>

        {/* ── Main grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8">

          {/* ══ LEFT: Products + Cart ════════════════════════════════════ */}
          <div className="space-y-8">

            {/* Product Search */}
            <div className="bg-white/60 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgba(15,23,42,0.04)] rounded-[2rem] p-8">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-5 px-1">
                Product Catalog
              </h3>
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2} />
                <input
                  ref={productSearchRef}
                  type="text"
                  value={productQuery}
                  onChange={e => setProductQuery(e.target.value)}
                  placeholder="Search by model name or design house…"
                  className="w-full pl-11 pr-5 py-4 bg-white/50 border border-slate-200/60 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all shadow-sm"
                />
                {searchingProducts && (
                  <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" strokeWidth={2} />
                )}
              </div>

              {/* Product results */}
              {productResults.length > 0 && (
                <div className="mt-4 bg-white/40 border border-slate-200/50 rounded-2xl divide-y divide-slate-100/60 max-h-72 overflow-y-auto custom-scrollbar shadow-inner">
                  {productResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/80 transition-colors text-left group"
                    >
                      <div className="w-12 h-12 flex-shrink-0 bg-white border border-slate-100 shadow-sm rounded-xl flex items-center justify-center overflow-hidden p-1.5">
                        {p.images?.[0]?.url
                          ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-contain" />
                          : <Package size={18} className="text-slate-300" strokeWidth={1.5} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate mb-1">{p.name}</p>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{p.brand}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-slate-900 mb-1">{fmt(p.final_price)}</p>
                        <p className={`text-[10px] font-bold tracking-wide ${p.stock < 5 ? 'text-rose-500' : 'text-emerald-600'}`}>
                          {p.stock} IN STOCK
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all flex-shrink-0 ml-2 shadow-sm">
                        <Plus size={14} strokeWidth={2} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {productQuery.length >= 2 && productResults.length === 0 && !searchingProducts && (
                <div className="mt-4 p-6 bg-white/40 border border-slate-200/50 rounded-2xl text-center shadow-inner">
                  <Package size={24} className="mx-auto text-slate-300 mb-3" strokeWidth={1.5} />
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">No products found for &ldquo;{productQuery}&rdquo;</p>
                </div>
              )}
            </div>

            {/* Cart */}
            <div className="bg-white/60 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgba(15,23,42,0.04)] rounded-[2rem] p-8">
              <div className="flex items-center justify-between mb-6 px-1">
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 flex items-center gap-2">
                  <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                    <ShoppingCart size={14} strokeWidth={2} className="text-slate-500" />
                  </div>
                  Shopping Cart
                  {itemCount > 0 && (
                    <span className="bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded-full font-bold ml-1 shadow-sm">
                      {itemCount}
                    </span>
                  )}
                </h3>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1.5 uppercase tracking-widest px-3 py-1.5 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 size={12} strokeWidth={2} /> Clear
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="py-16 text-center bg-white/40 border border-slate-200/50 rounded-2xl shadow-inner">
                  <div className="w-16 h-16 bg-white rounded-full border border-slate-100 shadow-sm flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart size={24} className="text-slate-300" strokeWidth={1.5} />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cart is empty</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-2">Search and add products above</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div
                      key={item.product.id}
                      className="p-5 bg-white/70 border border-white shadow-sm rounded-2xl hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        {/* Thumbnail */}
                        <div className="w-14 h-14 rounded-xl border border-slate-100 bg-white flex-shrink-0 flex items-center justify-center overflow-hidden p-1.5 shadow-sm">
                          {item.product.images?.[0]?.url
                            ? <img src={item.product.images[0].url} alt={item.product.name} className="w-full h-full object-contain" />
                            : <Package size={20} className="text-slate-300" strokeWidth={1.5} />
                          }
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-xs font-bold text-slate-900 truncate mb-1">{item.product.name}</p>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{item.product.brand}</p>
                          
                          {/* Lens + Price Edit row */}
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <LensConfigBadge
                              config={item.lens_config}
                              onEdit={() => openLensModal(item)}
                            />

                            <button
                              onClick={() => setPriceOverrideItem(item)}
                              className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm border ${
                                item.price_override
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'
                                  : 'bg-white text-slate-500 hover:text-slate-900 hover:border-slate-300 border-slate-200/60'
                              }`}
                            >
                              <Pencil size={10} strokeWidth={2} />
                              {item.price_override ? `Override: ${fmt(item.price_override.overridden_price)}` : 'Edit Price'}
                            </button>

                            {item.lens_price > 0 && (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100/80 px-2 py-1 rounded-md border border-slate-200/60">
                                + {fmt(item.lens_price)} LENS
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Controls & Price */}
                        <div className="flex flex-col items-end gap-4 flex-shrink-0">
                          {/* Quantity */}
                          <div className="flex items-center bg-slate-50/80 border border-slate-200/60 rounded-xl p-1 shadow-inner">
                            <button
                              onClick={() => updateQty(item.product.id, -1)}
                              className="w-7 h-7 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                            >
                              <Minus size={12} strokeWidth={2} />
                            </button>
                            <span className="text-[11px] font-bold text-slate-900 w-8 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQty(item.product.id, +1)}
                              disabled={item.quantity >= item.product.stock}
                              className="w-7 h-7 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors disabled:opacity-40"
                            >
                              <Plus size={12} strokeWidth={2} />
                            </button>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">{fmt(item.total_price)}</p>
                            {item.quantity > 1 && (
                              <p className="text-[10px] font-semibold text-slate-400 mt-1">{fmt(item.frame_price)} ea.</p>
                            )}
                            {item.price_override && (
                              <p className="text-[10px] font-bold text-amber-500 line-through mt-1">
                                {fmt(item.price_override.original_price)}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Remove */}
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-full transition-all ml-1 -mt-1 -mr-1"
                        >
                          <X size={16} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Subtotal */}
                  <div className="flex justify-between items-center px-4 pt-6 pb-2 border-t border-slate-200/60 mt-4">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">Subtotal</span>
                    <span className="text-2xl font-light tracking-tight text-slate-900">{fmt(subtotal)}</span>
                  </div>

                  {/* Price override count note */}
                  {cart.some(i => i.price_override) && (
                    <div className="px-4 pb-2">
                      <p className="text-[10px] font-bold text-amber-600 flex items-center gap-1.5 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                        <AlertCircle size={12} strokeWidth={2} />
                        {cart.filter(i => i.price_override).length} item(s) have price overrides — captured in order audit log.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* ══ RIGHT: Customer + Summary ════════════════════════════════ */}
          <div className="space-y-8">

            {/* Customer Selection */}
            <div className="bg-white/60 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgba(15,23,42,0.04)] rounded-[2rem] p-8">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-5 flex items-center gap-2 px-1">
                <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                  <User size={14} strokeWidth={2} className="text-slate-500" />
                </div>
                Client Profile
              </h3>

              {!selectedCustomer && (
                <div className="flex bg-slate-100/50 border border-slate-200/60 rounded-xl p-1 mb-6 shadow-inner">
                  <button
                    onClick={() => { setCustomerTab('existing'); setCustomerQuery(''); setCustomerResults([]) }}
                    className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] rounded-lg transition-all ${
                      customerTab === 'existing' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Existing
                  </button>
                  <button
                    onClick={() => { setCustomerTab('new'); setCustomerResults([]); setCustomerQuery('') }}
                    className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] rounded-lg transition-all ${
                      customerTab === 'new' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    New Client
                  </button>
                </div>
              )}

              {selectedCustomer ? (
                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 flex items-start justify-between shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[14px] flex items-center justify-center text-white text-base font-semibold shadow-md flex-shrink-0">
                      {selectedCustomer.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="pt-0.5">
                      <p className="text-sm font-bold text-slate-900 mb-1">{selectedCustomer.full_name}</p>
                      {selectedCustomer.phone && (
                        <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mt-1">
                          <Phone size={10} strokeWidth={2.5}/> {selectedCustomer.phone}
                        </p>
                      )}
                      {selectedCustomer.email && (
                        <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mt-1">
                          <Mail size={10} strokeWidth={2.5}/> {selectedCustomer.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-full transition-all"
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>
              ) : customerTab === 'existing' ? (
                <div>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => { setCustomerField('phone'); setCustomerQuery(''); setCustomerResults([]) }}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl border transition-all ${
                        customerField === 'phone' ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200/60 text-slate-500 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      Phone
                    </button>
                    <button
                      onClick={() => { setCustomerField('email'); setCustomerQuery(''); setCustomerResults([]) }}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl border transition-all ${
                        customerField === 'email' ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200/60 text-slate-500 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      Email
                    </button>
                  </div>

                  <div className="relative">
                    {customerField === 'phone'
                      ? <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2} />
                      : <Mail  size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2} />
                    }
                    <input
                      type={customerField === 'phone' ? 'tel' : 'email'}
                      value={customerQuery}
                      onChange={e => setCustomerQuery(e.target.value)}
                      placeholder={customerField === 'phone' ? 'Enter phone number…' : 'Enter email address…'}
                      className="w-full pl-10 pr-4 py-4 bg-white/50 border border-slate-200/60 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all shadow-sm"
                    />
                    {searchingCustomers && (
                      <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" strokeWidth={2} />
                    )}
                  </div>

                  {customerResults.length > 0 && (
                    <div className="mt-3 bg-white/60 border border-slate-200/50 rounded-2xl divide-y divide-slate-100/60 max-h-56 overflow-y-auto custom-scrollbar shadow-inner">
                      {customerResults.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedCustomer(c); setCustomerResults([]) }}
                          className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/80 transition-colors text-left group"
                        >
                          <div className="w-10 h-10 bg-slate-100 border border-slate-200/50 rounded-[10px] flex items-center justify-center text-slate-500 text-sm font-bold flex-shrink-0 shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-colors">
                            {c.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate mb-0.5">{c.full_name}</p>
                            <p className="text-[10px] font-semibold text-slate-500 truncate">{c.phone || c.email}</p>
                          </div>
                          <ChevronRight size={14} strokeWidth={2} className="text-slate-300 group-hover:text-slate-900 transition-colors flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {customerQuery.length >= 3 && customerResults.length === 0 && !searchingCustomers && (
                    <div className="mt-3 p-6 bg-white/40 border border-slate-200/50 rounded-2xl text-center shadow-inner">
                      <User size={20} className="mx-auto text-slate-300 mb-2" strokeWidth={2} />
                      <p className="text-[11px] font-bold text-slate-500 mb-3">No client found</p>
                      <button
                        onClick={() => {
                          setCustomerTab('new')
                          if (customerField === 'phone') setNewCustomer(prev => ({ ...prev, phone: customerQuery }))
                          else setNewCustomer(prev => ({ ...prev, email: customerQuery }))
                          setCustomerQuery('')
                        }}
                        className="text-[10px] font-bold uppercase tracking-widest text-slate-700 bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-all"
                      >
                        Create Profile →
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 block mb-2 px-1">
                      Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCustomer.full_name}
                      onChange={e => setNewCustomer(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Client's full name"
                      className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 block mb-2 px-1">
                      Phone Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={newCustomer.phone}
                      onChange={e => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="10-digit mobile number"
                      className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 block mb-2 px-1">
                      Email Address <span className="text-slate-400 normal-case tracking-widest font-semibold">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={newCustomer.email}
                      onChange={e => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="client@email.com"
                      className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all shadow-sm"
                    />
                    <div className="mt-3 bg-slate-50/80 border border-slate-100 p-3 rounded-xl flex items-start gap-2.5">
                      <UserPlus size={14} className="mt-0.5 flex-shrink-0 text-slate-400" strokeWidth={2} />
                      <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                        A new account will be created. If email is provided, a secure password setup link will be automatically dispatched.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes & Store */}
            <div className="bg-white/60 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgba(15,23,42,0.04)] rounded-[2rem] p-8 space-y-6">
              {stores.length > 0 && (
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 block mb-2 px-1">
                    Store Location
                  </label>
                  <div className="relative">
                    <select
                      value={storeId}
                      onChange={e => setStoreId(e.target.value)}
                      className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-xl text-sm font-bold tracking-wide text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all appearance-none shadow-sm cursor-pointer"
                    >
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                      <ChevronRight size={14} className="text-slate-400 rotate-90" strokeWidth={2} />
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 block mb-2 px-1">
                  Internal Notes <span className="text-slate-400 normal-case tracking-widest font-semibold">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Special instructions, prescription notes…"
                  rows={2}
                  className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/60 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all resize-none shadow-sm"
                />
              </div>
            </div>

            {/* Order Summary + Generate Bill (DARK GLASS TICKET) */}
            <div className="bg-slate-900 border border-slate-700/50 rounded-[2.5rem] p-8 md:p-10 text-white shadow-[0_20px_40px_rgba(15,23,42,0.3)] relative overflow-hidden">
              
              {/* Inner ambient glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-slate-700/50 rounded-full blur-[80px] pointer-events-none" />
              
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-6 relative z-10">
                Order Summary
              </h3>

              <div className="relative z-10">
                {cart.length === 0 ? (
                  <div className="py-6 mb-4 border-b border-slate-800">
                    <p className="text-xs font-semibold text-slate-500 text-center">No items added to billing</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6 pb-6 border-b border-slate-800 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                      {cart.map(item => (
                        <div key={item.product.id} className="text-xs">
                          <div className="flex justify-between items-start gap-4">
                            <span className="text-slate-300 font-medium leading-relaxed">
                              {item.product.name}
                              {item.quantity > 1 && <span className="text-slate-500 font-bold ml-1">×{item.quantity}</span>}
                            </span>
                            <span className="text-white font-bold flex-shrink-0 mt-0.5">{fmt(item.total_price)}</span>
                          </div>
                          
                          {/* Lens / price override details */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {item.lens_config?.power_type && item.lens_config.power_type !== 'frame_only' && (
                              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 bg-slate-800/50 px-2 py-1 rounded-md border border-slate-700/50">
                                Lens: {item.lens_config.power_type.replace('_', ' ')}
                                {item.lens_price > 0 && ` +${fmt(item.lens_price)}`}
                              </span>
                            )}
                            {item.price_override && (
                              <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400 bg-amber-900/20 px-2 py-1 rounded-md border border-amber-800/30 flex items-center gap-1">
                                <Check size={10} strokeWidth={3}/> Override
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-end mb-8">
                      <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-400">Total Amount</span>
                      <span className="text-4xl font-light text-white tracking-tight" style={{ fontFamily: 'Didot, "Bodoni MT", "Playfair Display", Times, serif' }}>{fmt(subtotal)}</span>
                    </div>
                  </>
                )}

                {(selectedCustomer || (newCustomer.full_name && newCustomer.phone)) && (
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-1">Billing To</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-200 font-bold truncate pr-4">
                        {selectedCustomer?.full_name || newCustomer.full_name}
                      </span>
                      {!selectedCustomer && (
                        <span className="text-[9px] uppercase tracking-widest font-bold bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md border border-emerald-500/20 flex-shrink-0">New Client</span>
                      )}
                    </div>
                  </div>
                )}

                {billingError && (
                  <div className="flex items-start gap-3 bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs p-4 mb-6 rounded-xl shadow-inner">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <span className="font-medium leading-relaxed">{billingError}</span>
                  </div>
                )}

                <button
                  onClick={handleGenerateBill}
                  disabled={!cartValid || !customerValid || generating}
                  className="
                    w-full flex items-center justify-center gap-3 py-5 rounded-xl
                    text-[11px] uppercase tracking-[0.2em] font-bold
                    bg-white text-slate-900 shadow-xl hover:shadow-2xl hover:-translate-y-0.5
                    disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-xl
                    transition-all btn-shine relative overflow-hidden
                  "
                >
                  {generating ? (
                    <><Loader2 size={16} strokeWidth={2} className="animate-spin" /> Authorizing…</>
                  ) : (
                    <><ReceiptText size={16} strokeWidth={2} /> Generate Invoice</>
                  )}
                </button>

                {(!cartValid || !customerValid) && (
                  <div className="mt-5 space-y-2 text-center">
                    {!cartValid && (
                      <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-500 flex items-center justify-center gap-1.5">
                        <AlertCircle size={12} strokeWidth={2.5} /> Add at least one product
                      </p>
                    )}
                    {!customerValid && (
                      <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-500 flex items-center justify-center gap-1.5">
                        <AlertCircle size={12} strokeWidth={2.5} /> {customerTab === 'existing' ? 'Select a client profile' : 'Complete client details'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Reset Button */}
            {(cart.length > 0 || selectedCustomer) && (
              <div className="flex justify-end animate-in fade-in">
                <button
                  onClick={resetAll}
                  className="flex items-center gap-2 px-5 py-3 bg-white/60 backdrop-blur-md border border-white shadow-sm rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-md transition-all"
                >
                  <RefreshCw size={12} strokeWidth={2} /> Reset Interface
                </button>
              </div>
            )}
            
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(148, 163, 184, 0.3);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(148, 163, 184, 0.5);
        }
        
        /* Shine effect for primary buttons */
        .btn-shine::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent);
          transform: skewX(-20deg);
          transition: all 0.6s ease;
        }
        .btn-shine:hover::after {
          left: 150%;
        }

        @keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-20px) scale(1.05); } }
        @keyframes float-delayed { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(20px) scale(0.95); } }
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 10s ease-in-out infinite; }
      `}} />
    </div>
  )
}

// ── LensFlowModalWithPrice ────────────────────────────────────────────────────
// Thin wrapper around LensFlowModal that resolves lens package price_addon
// and attaches it to the config before calling onComplete.

interface LensFlowModalWithPriceProps {
  product:        GlobalProduct
  existingConfig: LensFlowState | null
  onClose:        () => void
  onComplete:     (config: LensFlowState & { _lens_addon?: number }) => void
}

function LensFlowModalWithPrice({ product, existingConfig: _existing, onClose, onComplete }: LensFlowModalWithPriceProps) {
  const [packages, setPackages] = useState<Array<{ code: string; price_addon: number }>>([])

  useEffect(() => {
    createClient()
      .from('lens_packages')
      .select('code, price_addon')
      .eq('is_active', true)
      .then(({ data }: { data: Array<{ code: string; price_addon: number }> | null }) => {
        if (data) setPackages(data)
      })
  }, [])

  const handleComplete = (config: LensFlowState) => {
    const pkg = packages.find(p => p.code === config.package_code)
    const withAddon = { ...config, _lens_addon: pkg?.price_addon ?? 0 }
    onComplete(withAddon)
  }

  return (
    <LensFlowModal
      product={product}
      userId=""
      onClose={onClose}
      onComplete={handleComplete}
    />
  )
}