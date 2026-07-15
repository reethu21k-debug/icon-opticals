// 'use client'

// export const dynamic = 'force-dynamic'

// import { useState, useEffect } from 'react'
// import Image from 'next/image'
// import Link from 'next/link'
// import { useRouter } from 'next/navigation'
// import { Trash2, Plus, Minus, ShoppingBag, ChevronRight, Gift } from 'lucide-react'
// import { createClient } from '@/lib/supabase'
// import { useCart } from '@/hooks/useCart'
// import { getOptimizedUrl } from '@/lib/cloudinary-url'
// import type { CartItemWithProduct } from '@/types'

// // ── BOGO helper ──────────────────────────────────────────────────────────────
// function getBogoFreeMap(
//   items: CartItemWithProduct[],
//   freeCount: number
// ): Map<string, number> {
//   if (freeCount <= 0) return new Map()
//   const expanded: { id: string; unitPrice: number }[] = []
//   for (const item of items) {
//     const qty = item.quantity || 1
//     const unitPrice = (item.total_price || 0) / qty
//     for (let i = 0; i < qty; i++) expanded.push({ id: item.id, unitPrice })
//   }
//   expanded.sort((a, b) => b.unitPrice - a.unitPrice)
//   const map = new Map<string, number>()
//   for (const entry of expanded.slice(expanded.length - freeCount)) {
//     map.set(entry.id, (map.get(entry.id) || 0) + 1)
//   }
//   return map
// }

// // ── Cart Styles ──────────────────────────────────────────────────────────────

// const CART_CSS = `
//   @keyframes cart-fade-up { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }

//   .ct-root { min-height: 100vh; background: #fff; }
//   .ct-wrap { max-width: 1400px; margin: 0 auto; padding: 3rem 24px 5rem; }
//   @media (max-width: 640px) { .ct-wrap { padding: 2rem 16px 4rem; } }

//   .ct-header {
//     display: flex; align-items: flex-end; justify-content: space-between;
//     padding-bottom: 1.75rem; border-bottom: 1px solid #e2e8f0; margin-bottom: 2.5rem;
//     animation: cart-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both;
//   }
//   .ct-eyebrow { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.3em; color: #94a3b8; font-weight: 600; margin-bottom: 6px; }
//   .ct-title { font-family: var(--font-playfair), Georgia, serif; font-size: clamp(2rem, 4vw, 3rem); color: #0f172a; font-weight: 400; letter-spacing: -0.02em; }
//   .ct-count { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.28em; color: #94a3b8; font-weight: 600; }

//   .ct-bogo {
//     display: flex; align-items: center; gap: 1rem;
//     background: #0f172a; padding: 1.25rem 1.5rem; margin-bottom: 2rem;
//     animation: cart-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both;
//   }
//   .ct-bogo-title { font-family: var(--font-playfair), Georgia, serif; color: #fff; font-size: 1.05rem; }
//   .ct-bogo-sub { font-size: 9px; text-transform: uppercase; letter-spacing: 0.22em; color: #64748b; margin-top: 2px; }

//   .ct-grid { display: grid; grid-template-columns: 1fr 360px; gap: 3.5rem; align-items: start; }
//   @media (max-width: 1024px) { .ct-grid { grid-template-columns: 1fr; gap: 2.5rem; } }

//   .ct-items { display: flex; flex-direction: column; gap: 1rem; }
//   .ct-item {
//     display: flex; gap: 1.5rem; padding: 1.5rem;
//     border: 1px solid #e2e8f0; background: #fff;
//     transition: border-color .2s;
//     animation: cart-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both;
//   }
//   .ct-item:hover { border-color: #cbd5e1; }
//   .ct-item.bogo-item { border-color: #0f172a; background: #f8fafc; }

//   .ct-img-wrap {
//     flex-shrink: 0; width: 120px; height: 120px;
//     background: #f8fafc; border: 1px solid #f1f5f9;
//     display: flex; align-items: center; justify-content: center;
//     position: relative; overflow: hidden; text-decoration: none;
//   }
//   .ct-free-badge {
//     position: absolute; top: 0; right: 0;
//     background: #0f172a; color: #fff;
//     font-size: 8px; text-transform: uppercase; letter-spacing: 0.2em; padding: 3px 6px;
//   }

//   .ct-item-body { flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem; min-width: 0; }
//   .ct-brand { font-size: 9px; text-transform: uppercase; letter-spacing: 0.22em; color: #94a3b8; }
//   .ct-name {
//     font-family: var(--font-playfair), Georgia, serif;
//     font-size: 1.2rem; color: #0f172a; text-decoration: none; line-height: 1.2;
//     transition: color .18s; display: block;
//   }
//   .ct-name:hover { color: #475569; }
//   .ct-bogo-tag {
//     display: inline-flex; align-items: center; margin-top: 8px;
//     border: 1px solid #0f172a; font-size: 8.5px; text-transform: uppercase;
//     letter-spacing: 0.18em; color: #0f172a; padding: 2px 8px;
//   }
//   .ct-lens-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
//   .ct-lens-tag { font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; border: 1px solid #e2e8f0; color: #64748b; padding: 3px 8px; background: #fff; }

//   .ct-item-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 0.75rem; border-top: 1px solid #f1f5f9; }
//   .ct-qty { display: flex; align-items: center; border: 1px solid #e2e8f0; }
//   .ct-qty-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; color: #64748b; transition: background .15s, color .15s; }
//   .ct-qty-btn:hover { background: #f8fafc; color: #0f172a; }
//   .ct-qty-num { width: 32px; text-align: center; font-size: 12px; font-weight: 600; color: #0f172a; }
//   .ct-delete { background: none; border: none; cursor: pointer; color: #cbd5e1; padding: 4px; display: flex; align-items: center; transition: color .15s; }
//   .ct-delete:hover { color: #0f172a; }

//   .ct-price { text-align: right; }
//   .ct-price-main { font-family: var(--font-playfair), Georgia, serif; font-size: 1.2rem; color: #0f172a; }
//   .ct-price-strike { font-size: 10px; color: #cbd5e1; text-decoration: line-through; }
//   .ct-price-hint { font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; margin-top: 2px; }

//   /* Summary */
//   .ct-summary { position: sticky; top: 5.5rem; }
//   .ct-summary-inner { border: 1px solid #e2e8f0; background: #fff; padding: 2rem; }
//   .ct-summary-title { font-family: var(--font-playfair), Georgia, serif; font-size: 1.5rem; color: #0f172a; padding-bottom: 1.25rem; border-bottom: 1px solid #f1f5f9; margin-bottom: 1.5rem; }

//   .ct-coupon-applied { display: flex; align-items: center; justify-content: space-between; border: 1px solid #0f172a; padding: 0.875rem 1rem; background: #f8fafc; margin-bottom: 1.5rem; }
//   .ct-coupon-code { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.22em; color: #0f172a; }
//   .ct-coupon-saved { font-size: 9px; text-transform: uppercase; letter-spacing: 0.18em; color: #64748b; margin-top: 2px; }
//   .ct-coupon-remove { font-size: 9px; text-transform: uppercase; letter-spacing: 0.18em; color: #94a3b8; background: none; border: none; cursor: pointer; transition: color .15s; }
//   .ct-coupon-remove:hover { color: #0f172a; }
//   .ct-coupon-row { display: flex; border: 1px solid #e2e8f0; margin-bottom: 1.5rem; }
//   .ct-coupon-input { flex: 1; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; padding: 0.875rem 1rem; border: none; outline: none; color: #0f172a; background: transparent; font-family: 'Inter', sans-serif; }
//   .ct-coupon-input::placeholder { color: #cbd5e1; }
//   .ct-coupon-btn { padding: 0 1rem; border-left: 1px solid #e2e8f0; font-size: 9px; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 700; color: #0f172a; background: none; border-top: none; border-right: none; border-bottom: none; cursor: pointer; transition: background .15s; }
//   .ct-coupon-btn:hover { background: #f8fafc; }
//   .ct-coupon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
//   .ct-coupon-error { font-size: 10px; color: #dc2626; margin-top: -1rem; margin-bottom: 1rem; }

//   .ct-summary-rows { display: flex; flex-direction: column; gap: 0.875rem; padding-bottom: 1.25rem; border-bottom: 1px solid #f1f5f9; margin-bottom: 1.25rem; }
//   .ct-row { display: flex; justify-content: space-between; align-items: baseline; }
//   .ct-row-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8; }
//   .ct-row-val { font-size: 13px; font-weight: 500; color: #0f172a; }
//   .ct-row-val.discount { color: #059669; }
//   .ct-row-val.free-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.2em; }

//   .ct-total-row { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 1.75rem; }
//   .ct-total-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.22em; color: #94a3b8; }
//   .ct-total-val { font-family: var(--font-playfair), Georgia, serif; font-size: 2rem; color: #0f172a; letter-spacing: -0.02em; }

//   .ct-checkout-btn {
//     width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
//     padding: 1.1rem; background: #0f172a; color: #fff;
//     font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.22em; font-weight: 600;
//     text-decoration: none; border: none; cursor: pointer; font-family: 'Inter', sans-serif;
//     position: relative; overflow: hidden; transition: background .2s;
//   }
//   .ct-checkout-btn::before {
//     content: ''; position: absolute; inset: 0; background: #1e293b;
//     transform: translateX(-110%) skewX(-8deg);
//     transition: transform .5s cubic-bezier(.22,1,.36,1);
//   }
//   .ct-checkout-btn:hover::before { transform: translateX(110%) skewX(-8deg); }
//   .ct-checkout-btn span { position: relative; z-index: 1; }
//   .ct-secure { font-size: 9px; text-transform: uppercase; letter-spacing: 0.22em; color: #cbd5e1; text-align: center; margin-top: 1rem; display: flex; align-items: center; justify-content: center; gap: 6px; }

//   /* Empty state */
//   .ct-empty { min-height: 100vh; background: #fff; display: flex; align-items: center; justify-content: center; }
//   .ct-empty-inner { text-align: center; max-width: 400px; padding: 2rem; animation: cart-fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both; }
//   .ct-empty-icon { width: 72px; height: 72px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem; color: #cbd5e1; }
//   .ct-empty-title { font-family: var(--font-playfair), Georgia, serif; font-size: 2rem; color: #0f172a; margin-bottom: 0.75rem; font-weight: 400; }
//   .ct-empty-desc { font-size: 13px; color: #64748b; line-height: 1.65; margin-bottom: 2rem; }
//   .ct-shop-btn { display: inline-flex; align-items: center; gap: 8px; padding: 1rem 2rem; background: #0f172a; color: #fff; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.22em; font-weight: 600; text-decoration: none; font-family: 'Inter', sans-serif; transition: background .2s; }
//   .ct-shop-btn:hover { background: #1e293b; }
// `

// // ── CartPage ─────────────────────────────────────────────────────────────────

// export default function CartPage() {
//   const [userId, setUserId] = useState<string | null>(null)
//   const [couponInput, setCouponInput] = useState('')
//   const [applyingCoupon, setApplyingCoupon] = useState(false)
//   const router = useRouter()

//   useEffect(() => {
//     createClient().auth.getUser().then(({ data }) => {
//       if (!data.user) router.push('/auth/login?redirect=/cart')
//       else setUserId(data.user.id)
//     })
//   }, [router])

//   const {
//     items, summary, loading,
//     coupon, couponError,
//     removeFromCart, updateQuantity,
//     applyCoupon, removeCoupon,
//   } = useCart(userId)

//   const handleApplyCoupon = async () => {
//     if (!couponInput.trim()) return
//     setApplyingCoupon(true)
//     await applyCoupon(couponInput.trim())
//     setApplyingCoupon(false)
//   }

//   const isBogo = coupon?.discount_type === 'bogo'
//   const bogoFreeMap = isBogo
//     ? getBogoFreeMap(items, summary.bogo_free_item_count)
//     : new Map<string, number>()

//   if (loading) return <CartSkeleton />

//   if (!loading && items.length === 0) {
//     return (
//       <div className="ct-empty">
//         <style dangerouslySetInnerHTML={{ __html: CART_CSS }} />
//         <div className="ct-empty-inner">
//           <div className="ct-empty-icon">
//             <ShoppingBag size={28} strokeWidth={1} />
//           </div>
//           <p className="ct-eyebrow">Shopping Bag</p>
//           <h2 className="ct-empty-title">Your Cart is Empty</h2>
//           <p className="ct-empty-desc">
//             Explore our collection and add your favourite frames to begin your checkout experience.
//           </p>
//           <Link href="/products" className="ct-shop-btn">
//             <span>Discover Frames</span>
//             <ChevronRight size={14} strokeWidth={1.5} />
//           </Link>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <main className="ct-root">
//       <style dangerouslySetInnerHTML={{ __html: CART_CSS }} />
//       <div className="ct-wrap">

//         {/* Header */}
//         <header className="ct-header">
//           <div>
//             <p className="ct-eyebrow">Shopping Bag</p>
//             <h1 className="ct-title">Your Cart</h1>
//           </div>
//           <p className="ct-count">{summary.item_count} Item{summary.item_count !== 1 ? 's' : ''}</p>
//         </header>

//         {/* BOGO Banner */}
//         {isBogo && summary.bogo_free_item_count > 0 && (
//           <div className="ct-bogo">
//             <Gift size={18} strokeWidth={1.5} style={{ color: '#fff', flexShrink: 0 }} />
//             <div>
//               <p className="ct-bogo-title">Buy 1 Get 1 Free Applied</p>
//               <p className="ct-bogo-sub">
//                 {summary.bogo_free_item_count} cheapest item{summary.bogo_free_item_count > 1 ? 's are' : ' is'} free
//               </p>
//             </div>
//           </div>
//         )}

//         <div className="ct-grid">

//           {/* ── Items ── */}
//           <div className="ct-items">
//             {items.map((item, idx) => {
//               const freeUnits = bogoFreeMap.get(item.id) || 0
//               const allFree = freeUnits === item.quantity
//               const partialFree = freeUnits > 0 && !allFree

//               return (
//                 <div
//                   key={item.id}
//                   className={`ct-item${freeUnits > 0 ? ' bogo-item' : ''}`}
//                   style={{ animationDelay: `${idx * 0.07}s` }}
//                 >
//                   {/* Image */}
//                   <Link href={`/products/${item.product?.slug}`} className="ct-img-wrap">
//                     {item.product?.images?.[0] && (
//                       <Image
//                         src={getOptimizedUrl(item.product.images[0].public_id, { width: 120, height: 120 })}
//                         alt={item.product.name}
//                         fill
//                         className="object-contain mix-blend-multiply p-2"
//                         sizes="120px"
//                       />
//                     )}
//                     {freeUnits > 0 && (
//                       <span className="ct-free-badge">{allFree ? 'FREE' : `${freeUnits} FREE`}</span>
//                     )}
//                   </Link>

//                   {/* Body */}
//                   <div className="ct-item-body">
//                     <div>
//                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
//                         <div>
//                           <p className="ct-brand">{item.product?.brand}</p>
//                           <Link href={`/products/${item.product?.slug}`} className="ct-name">
//                             {item.product?.name}
//                           </Link>
//                           {freeUnits > 0 && (
//                             <span className="ct-bogo-tag">
//                               {allFree ? 'BOGO Free' : `${freeUnits} of ${item.quantity} free`}
//                             </span>
//                           )}
//                         </div>
//                         <button onClick={() => removeFromCart(item.id)} className="ct-delete" aria-label="Remove">
//                           <Trash2 size={15} strokeWidth={1.5} />
//                         </button>
//                       </div>
//                       {item.lens_power_type && (
//                         <div className="ct-lens-tags">
//                           <span className="ct-lens-tag">{item.lens_power_type.replace('_', ' ')}</span>
//                           {item.lens_package_code && (
//                             <span className="ct-lens-tag">{item.lens_package_code.replace('_', ' ')} Lenses</span>
//                           )}
//                         </div>
//                       )}
//                     </div>

//                     <div className="ct-item-footer">
//                       <div className="ct-qty">
//                         <button className="ct-qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
//                           <Minus size={11} />
//                         </button>
//                         <span className="ct-qty-num">{item.quantity}</span>
//                         <button className="ct-qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
//                           <Plus size={11} />
//                         </button>
//                       </div>
//                       <div className="ct-price">
//                         {allFree ? (
//                           <>
//                             <p className="ct-price-main">FREE</p>
//                             <p className="ct-price-strike">₹{(item.total_price || 0).toLocaleString('en-IN')}</p>
//                           </>
//                         ) : (
//                           <>
//                             <p className="ct-price-main">₹{(item.total_price || 0).toLocaleString('en-IN')}</p>
//                             {partialFree && <p className="ct-price-hint">{freeUnits} unit{freeUnits > 1 ? 's' : ''} free</p>}
//                             {(item.lens_price || 0) > 0 && <p className="ct-price-hint">Frame + Lens</p>}
//                           </>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )
//             })}
//           </div>

//           {/* ── Summary ── */}
//           <div className="ct-summary">
//             <div className="ct-summary-inner">
//               <h3 className="ct-summary-title">Order Summary</h3>

//               {/* Coupon */}
//               <p className="ct-eyebrow" style={{ marginBottom: 10 }}>Promo Code</p>
//               {coupon ? (
//                 <div className="ct-coupon-applied">
//                   <div>
//                     <p className="ct-coupon-code">{coupon.code}</p>
//                     <p className="ct-coupon-saved">
//                       {isBogo
//                         ? `${summary.bogo_free_item_count} item free`
//                         : `Saved ₹${summary.discount_amount.toLocaleString('en-IN')}`}
//                     </p>
//                   </div>
//                   <button className="ct-coupon-remove" onClick={removeCoupon}>Remove</button>
//                 </div>
//               ) : (
//                 <div className="ct-coupon-row">
//                   <input
//                     type="text"
//                     value={couponInput}
//                     onChange={e => setCouponInput(e.target.value.toUpperCase())}
//                     onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
//                     placeholder="ENTER CODE"
//                     className="ct-coupon-input"
//                   />
//                   <button
//                     onClick={handleApplyCoupon}
//                     disabled={applyingCoupon || !couponInput.trim()}
//                     className="ct-coupon-btn"
//                   >
//                     {applyingCoupon ? '...' : 'Apply'}
//                   </button>
//                 </div>
//               )}
//               {couponError && <p className="ct-coupon-error">{couponError}</p>}

//               {/* Line Items */}
//               <div className="ct-summary-rows">
//                 <div className="ct-row">
//                   <span className="ct-row-label">Subtotal</span>
//                   <span className="ct-row-val">₹{summary.subtotal.toLocaleString('en-IN')}</span>
//                 </div>
//                 {summary.discount_amount > 0 && (
//                   <div className="ct-row">
//                     <span className="ct-row-label">{isBogo ? 'BOGO Discount' : 'Coupon'}</span>
//                     <span className="ct-row-val discount">−₹{summary.discount_amount.toLocaleString('en-IN')}</span>
//                   </div>
//                 )}
//                 <div className="ct-row">
//                   <span className="ct-row-label">Delivery</span>
//                   <span className="ct-row-val free-label">Complimentary</span>
//                 </div>
//               </div>

//               {/* Total */}
//               <div className="ct-total-row">
//                 <span className="ct-total-label">Estimated Total</span>
//                 <span className="ct-total-val">₹{summary.total.toLocaleString('en-IN')}</span>
//               </div>

//               <Link href="/checkout" className="ct-checkout-btn">
//                 <span>Proceed to Checkout →</span>
//               </Link>

//               <p className="ct-secure">
//                 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                   <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
//                 </svg>
//                 Secure Encrypted Transaction
//               </p>
//             </div>
//           </div>

//         </div>
//       </div>
//     </main>
//   )
// }

// // ── Skeleton ──────────────────────────────────────────────────────────────────

// function CartSkeleton() {
//   return (
//     <main style={{ minHeight: '100vh', background: '#fff', padding: '3rem 24px' }}>
//       <div style={{ maxWidth: 1400, margin: '0 auto' }}>
//         <div style={{ paddingBottom: '1.75rem', borderBottom: '1px solid #e2e8f0', marginBottom: '2.5rem' }}>
//           <div style={{ width: 80, height: 10, background: '#f1f5f9', marginBottom: 10 }} />
//           <div style={{ width: 200, height: 40, background: '#e2e8f0' }} />
//         </div>
//         <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '3.5rem' }}>
//           <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
//             {[1, 2].map(i => (
//               <div key={i} style={{ display: 'flex', gap: 24, padding: 24, border: '1px solid #f1f5f9' }}>
//                 <div style={{ width: 120, height: 120, background: '#f8fafc', flexShrink: 0 }} />
//                 <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
//                   <div style={{ width: 60, height: 8, background: '#f1f5f9' }} />
//                   <div style={{ width: '70%', height: 24, background: '#e2e8f0' }} />
//                 </div>
//               </div>
//             ))}
//           </div>
//           <div style={{ border: '1px solid #e2e8f0', padding: 32, height: 380, background: '#fff' }}>
//             <div style={{ width: 160, height: 28, background: '#e2e8f0', marginBottom: 24 }} />
//             <div style={{ width: '100%', height: 44, background: '#f8fafc', marginBottom: 24 }} />
//             <div style={{ width: '100%', height: 44, background: '#0f172a', marginTop: 'auto' }} />
//           </div>
//         </div>
//       </div>
//     </main>
//   )
// }
// 'use client'

// export const dynamic = 'force-dynamic'

// import { useState, useEffect } from 'react'
// import Image from 'next/image'
// import Link from 'next/link'
// import { useRouter } from 'next/navigation'
// import { Trash2, Plus, Minus, Tag, ShoppingBag, ChevronRight, Gift } from 'lucide-react'
// import { createClient } from '@/lib/supabase'
// import { useCart } from '@/hooks/useCart'
// import { getOptimizedUrl } from '@/lib/cloudinary-url'
// import type { CartItemWithProduct } from '@/types'

// // ── BOGO helper ─────────────────────────────────────────────────────────────
// function getBogoFreeMap(
//   items: CartItemWithProduct[],
//   freeCount: number
// ): Map<string, number> {
//   if (freeCount <= 0) return new Map()

//   const expanded: { id: string; unitPrice: number }[] = []
//   for (const item of items) {
//     const qty = item.quantity || 1
//     const unitPrice = (item.total_price || 0) / qty
//     for (let i = 0; i < qty; i++) expanded.push({ id: item.id, unitPrice })
//   }

//   expanded.sort((a, b) => b.unitPrice - a.unitPrice)

//   const map = new Map<string, number>()
//   for (const entry of expanded.slice(expanded.length - freeCount)) {
//     map.set(entry.id, (map.get(entry.id) || 0) + 1)
//   }
//   return map
// }

// export default function CartPage() {
//   const [userId, setUserId] = useState<string | null>(null)
//   const [couponInput, setCouponInput] = useState('')
//   const [applyingCoupon, setApplyingCoupon] = useState(false)
//   const router = useRouter()

//   useEffect(() => {
//     createClient().auth.getUser().then(({ data }: UserResponse) => {
//       if (!data.user) router.push('/auth/login?redirect=/cart')
//       else setUserId(data.user.id)
//     })
//   }, [router])

//   const {
//     items, summary, loading,
//     coupon, couponError,
//     removeFromCart, updateQuantity,
//     applyCoupon, removeCoupon,
//   } = useCart(userId)

//   const handleApplyCoupon = async () => {
//     if (!couponInput.trim()) return
//     setApplyingCoupon(true)
//     await applyCoupon(couponInput.trim())
//     setApplyingCoupon(false)
//   }

//   const isBogo = coupon?.discount_type === 'bogo'
//   const bogoFreeMap = isBogo
//     ? getBogoFreeMap(items, summary.bogo_free_item_count)
//     : new Map<string, number>()

//   if (loading) return <CartSkeleton />

//   if (!loading && items.length === 0) {
//     return (
//       <main className="min-h-screen bg-white flex items-center justify-center relative">
//         {/* Brand Theme Styles for Buttons & Typography */}
//         <style>{`
//           .brand-btn-p {
//             display:inline-flex; align-items:center; gap:8px;
//             padding:.9rem 2rem; background:#0f172a; border:1px solid #0f172a;
//             color:#fff; font-size:9.5px; text-transform:uppercase;
//             letter-spacing:.18em; font-weight:500; text-decoration:none;
//             cursor:pointer; position:relative; overflow:hidden;
//             transition:transform .15s;
//           }
//           .brand-btn-p::before {
//             content:''; position:absolute; inset:0; background:#334155;
//             transform:translateX(-110%) skewX(-8deg);
//             transition:transform .45s cubic-bezier(.22,1,.36,1);
//           }
//           .brand-btn-p:hover::before { transform:translateX(110%) skewX(-8deg); }
//           .brand-btn-p span { position:relative; z-index:1; display:flex; align-items:center; gap:8px; }
//           .brand-btn-p:active { transform:scale(.97); }
          
//           .font-didot { font-family: var(--font-playfair), Georgia, serif; }
//         `}</style>
        
//         <div className="text-center py-16 px-4">
//           <p className="text-[9px] uppercase tracking-[0.26em] text-slate-400 mb-4">Cart is Empty</p>
//           <h2 className="font-didot text-4xl text-slate-900 mb-4">Awaiting Your Selection</h2>
//           <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">Explore our collection and add your favorite frames to begin checkout.</p>
//           <Link href="/products" className="brand-btn-p mx-auto">
//             <span>Continue Shopping</span>
//           </Link>
//         </div>
//       </main>
//     )
//   }

//   return (
//     <main className="min-h-screen bg-white py-12">
//       {/* Brand Theme Styles */}
//       <style>{`
//         .brand-btn-p {
//           display:flex; align-items:center; justify-content:center; gap:8px;
//           padding:1rem 2rem; background:#0f172a; border:1px solid #0f172a;
//           color:#fff; font-size:9.5px; text-transform:uppercase;
//           letter-spacing:.18em; font-weight:500; text-decoration:none;
//           cursor:pointer; position:relative; overflow:hidden;
//           transition:transform .15s; width: 100%;
//         }
//         .brand-btn-p::before {
//           content:''; position:absolute; inset:0; background:#334155;
//           transform:translateX(-110%) skewX(-8deg);
//           transition:transform .45s cubic-bezier(.22,1,.36,1);
//         }
//         .brand-btn-p:hover::before { transform:translateX(110%) skewX(-8deg); }
//         .brand-btn-p span { position:relative; z-index:1; display:flex; align-items:center; gap:8px; }
//         .brand-btn-p:active { transform:scale(.97); }

//         .brand-btn-g {
//           display:inline-flex; align-items:center; justify-content:center; gap:8px;
//           padding:1rem 2rem; background:transparent; border:1px solid #0f172a;
//           color:#0f172a; font-size:9.5px; text-transform:uppercase;
//           letter-spacing:.18em; font-weight:500; text-decoration:none; cursor:pointer;
//           transition:background .3s, color .3s, transform .15s;
//         }
//         .brand-btn-g:hover { background:#0f172a; color:#fff; }
//         .brand-btn-g:active { transform:scale(.97); }

//         .font-didot { font-family: var(--font-playfair), Georgia, serif; }
//         .eyebrow-text { font-size:8.5px; text-transform:uppercase; letter-spacing:.2em; color:#94a3b8; }
//       `}</style>

//       <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        
//         <header className="mb-10 pb-6 border-b border-slate-200 flex items-end justify-between">
//           <div>
//             <p className="eyebrow-text mb-2">Shopping Bag</p>
//             <h1 className="font-didot text-4xl text-slate-900">Your Cart</h1>
//           </div>
//           <p className="eyebrow-text text-slate-900">{summary.item_count} Item{summary.item_count !== 1 ? 's' : ''}</p>
//         </header>

//         {isBogo && summary.bogo_free_item_count > 0 && (
//           <div className="mb-8 flex items-center gap-4 bg-slate-50 border border-slate-200 px-6 py-5 rounded-sm">
//             <Gift size={20} className="text-slate-900 flex-shrink-0" />
//             <div>
//               <p className="font-didot text-lg text-slate-900 leading-tight">
//                 Buy 1 Get 1 Free Applied
//               </p>
//               <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
//                 {summary.bogo_free_item_count} cheapest item{summary.bogo_free_item_count > 1 ? 's are' : ' is'} free.
//               </p>
//             </div>
//           </div>
//         )}

//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
//           {/* ── LEFT: CART ITEMS ── */}
//           <div className="lg:col-span-8 space-y-6">
//             {items.map(item => {
//               const freeUnits = bogoFreeMap.get(item.id) || 0
//               const allFree = freeUnits === item.quantity
//               const partialFree = freeUnits > 0 && !allFree

//               return (
//                 <div
//                   key={item.id}
//                   className={`group relative flex gap-6 p-6 border transition-colors ${
//                     freeUnits > 0 ? 'border-slate-400 bg-slate-50/50' : 'border-slate-200 bg-white'
//                   }`}
//                 >
//                   {/* Image */}
//                   <Link href={`/products/${item.product?.slug}`} className="flex-shrink-0 relative">
//                     <div className="relative w-32 h-32 bg-slate-50 border border-slate-100 flex items-center justify-center p-2">
//                       {item.product?.images?.[0] && (
//                         <Image
//                           src={getOptimizedUrl(item.product.images[0].public_id, { width: 128, height: 128 })}
//                           alt={item.product.name}
//                           fill
//                           className="object-contain mix-blend-multiply p-2"
//                           sizes="128px"
//                         />
//                       )}
//                     </div>
//                     {freeUnits > 0 && (
//                       <span className="absolute -top-2 -right-2 bg-slate-900 text-white text-[8px] uppercase tracking-[0.2em] px-2 py-1 shadow-sm">
//                         {allFree ? 'FREE' : `${freeUnits} FREE`}
//                       </span>
//                     )}
//                   </Link>

//                   {/* Details */}
//                   <div className="flex-1 flex flex-col justify-between min-w-0 py-1">
                    
//                     <div className="flex items-start justify-between gap-4">
//                       <div>
//                         <p className="eyebrow-text mb-1 text-slate-500">{item.product?.brand}</p>
//                         <Link
//                           href={`/products/${item.product?.slug}`}
//                           className="font-didot text-xl text-slate-900 hover:text-slate-500 transition-colors line-clamp-1"
//                         >
//                           {item.product?.name}
//                         </Link>

//                         {freeUnits > 0 && (
//                           <div className="flex items-center gap-1.5 mt-2">
//                             <span className="text-[9px] font-medium text-slate-900 uppercase tracking-widest border border-slate-900 px-1.5 py-0.5">
//                               {allFree ? 'BOGO Free' : `${freeUnits} of ${item.quantity} units free`}
//                             </span>
//                           </div>
//                         )}
//                       </div>

//                       <button
//                         onClick={() => removeFromCart(item.id)}
//                         className="text-slate-300 hover:text-slate-900 transition-colors p-1"
//                         aria-label="Remove item"
//                       >
//                         <Trash2 size={16} strokeWidth={1.5} />
//                       </button>
//                     </div>

//                     {/* Lens Config */}
//                     {item.lens_power_type && (
//                       <div className="flex flex-wrap gap-2 mt-3">
//                         <span className="text-[9px] border border-slate-200 text-slate-600 px-2 py-1 uppercase tracking-wider bg-white">
//                           {item.lens_power_type.replace('_', ' ')}
//                         </span>
//                         {item.lens_package_code && (
//                           <span className="text-[9px] border border-slate-200 text-slate-600 px-2 py-1 uppercase tracking-wider bg-white">
//                             {item.lens_package_code.replace('_', ' ')} Lenses
//                           </span>
//                         )}
//                       </div>
//                     )}

//                     {/* Quantity & Price Footer */}
//                     <div className="flex items-end justify-between mt-4 border-t border-slate-100 pt-4">
                      
//                       {/* minimal quantity selector */}
//                       <div className="flex items-center border border-slate-200">
//                         <button
//                           onClick={() => updateQuantity(item.id, item.quantity - 1)}
//                           className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
//                         >
//                           <Minus size={12} />
//                         </button>
//                         <span className="w-8 text-center text-xs font-medium text-slate-900">
//                           {item.quantity}
//                         </span>
//                         <button
//                           onClick={() => updateQuantity(item.id, item.quantity + 1)}
//                           className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
//                         >
//                           <Plus size={12} />
//                         </button>
//                       </div>

//                       {/* Pricing */}
//                       <div className="text-right">
//                         {allFree ? (
//                           <>
//                             <p className="font-didot text-lg text-slate-900">FREE</p>
//                             <p className="text-[10px] text-slate-400 line-through tracking-wider">
//                               ₹{(item.total_price || 0).toLocaleString('en-IN')}
//                             </p>
//                           </>
//                         ) : partialFree ? (
//                           <>
//                             <p className="font-didot text-lg text-slate-900">
//                               ₹{(item.total_price || 0).toLocaleString('en-IN')}
//                             </p>
//                             <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">
//                               {freeUnits} unit{freeUnits > 1 ? 's' : ''} free
//                             </p>
//                           </>
//                         ) : (
//                           <p className="font-didot text-lg text-slate-900">
//                             ₹{(item.total_price || 0).toLocaleString('en-IN')}
//                           </p>
//                         )}
//                         {(item.lens_price || 0) > 0 && (
//                           <p className="text-[9px] uppercase tracking-widest text-slate-400 mt-1">Frame + Lens</p>
//                         )}
//                       </div>

//                     </div>
//                   </div>
//                 </div>
//               )
//             })}
//           </div>

//           {/* ── RIGHT: SUMMARY ── */}
//           <div className="lg:col-span-4">
//             <div className="sticky top-8 bg-slate-50 border border-slate-200 p-8">
              
//               <h3 className="font-didot text-2xl text-slate-900 mb-6 border-b border-slate-200 pb-4">Order Summary</h3>

//               {/* Coupon Form */}
//               <div className="mb-8">
//                 <p className="eyebrow-text mb-3">Promo Code</p>
//                 {coupon ? (
//                   <div className="flex items-center justify-between border border-slate-900 bg-white px-4 py-3">
//                     <div>
//                       <div className="flex items-center gap-2">
//                         {isBogo && <Gift size={12} className="text-slate-900" />}
//                         <p className="font-bold tracking-widest text-xs text-slate-900 uppercase">{coupon.code}</p>
//                       </div>
//                       <p className="text-[9px] uppercase tracking-widest text-slate-500 mt-1">
//                         {isBogo 
//                           ? `${summary.bogo_free_item_count} item free`
//                           : `Saved ₹${summary.discount_amount.toLocaleString('en-IN')}`}
//                       </p>
//                     </div>
//                     <button onClick={removeCoupon} className="text-[9px] uppercase tracking-widest text-slate-400 hover:text-slate-900 border-b border-transparent hover:border-slate-900 transition-colors">
//                       Remove
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="flex gap-0 border border-slate-200 bg-white">
//                     <input
//                       type="text"
//                       value={couponInput}
//                       onChange={e => setCouponInput(e.target.value.toUpperCase())}
//                       onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
//                       placeholder="ENTER CODE"
//                       className="flex-1 text-[10px] uppercase tracking-widest px-4 py-3 bg-transparent focus:outline-none placeholder:text-slate-300"
//                     />
//                     <button
//                       onClick={handleApplyCoupon}
//                       disabled={applyingCoupon || !couponInput.trim()}
//                       className="px-5 border-l border-slate-200 text-[9px] font-bold uppercase tracking-widest text-slate-900 hover:bg-slate-50 disabled:opacity-50 transition-colors"
//                     >
//                       {applyingCoupon ? '...' : 'Apply'}
//                     </button>
//                   </div>
//                 )}
//                 {couponError && (
//                   <p className="text-[9px] uppercase tracking-widest text-rose-500 mt-2">{couponError}</p>
//                 )}
//               </div>

//               {/* Line Items */}
//               <div className="space-y-4 text-sm mb-6 pb-6 border-b border-slate-200">
//                 <div className="flex justify-between text-slate-600">
//                   <span className="text-[11px] uppercase tracking-widest">Subtotal</span>
//                   <span className="font-medium text-slate-900">₹{summary.subtotal.toLocaleString('en-IN')}</span>
//                 </div>

//                 {summary.discount_amount > 0 && (
//                   <div className="flex justify-between">
//                     <span className="text-[11px] uppercase tracking-widest text-slate-900 flex items-center gap-1.5">
//                       {isBogo ? 'BOGO Discount' : 'Coupon Discount'}
//                     </span>
//                     <span className="font-medium text-slate-900">
//                       −₹{summary.discount_amount.toLocaleString('en-IN')}
//                     </span>
//                   </div>
//                 )}

//                 <div className="flex justify-between text-slate-600">
//                   <span className="text-[11px] uppercase tracking-widest">Delivery</span>
//                   <span className="text-[11px] uppercase tracking-widest text-slate-900">Complimentary</span>
//                 </div>
//               </div>

//               {/* Total */}
//               <div className="flex justify-between items-end mb-8">
//                 <span className="text-xs uppercase tracking-widest text-slate-500">Estimated Total</span>
//                 <span className="font-didot text-3xl text-slate-900">
//                   ₹{summary.total.toLocaleString('en-IN')}
//                 </span>
//               </div>

//               <Link href="/checkout" className="brand-btn-p">
//                 <span>Proceed to Checkout</span>
//               </Link>
              
//               <div className="mt-6 text-center">
//                  <p className="text-[8px] uppercase tracking-[0.25em] text-slate-400">Secure Encrypted Transaction</p>
//               </div>
//             </div>
//           </div>

//         </div>
//       </div>
//     </main>
//   )
// }

// function CartSkeleton() {
//   return (
//     <main className="min-h-screen bg-white py-12">
//       <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        
//         <header className="mb-10 pb-6 border-b border-slate-200">
//           <div className="w-24 h-3 bg-slate-100 mb-3 animate-pulse" />
//           <div className="w-48 h-10 bg-slate-200 animate-pulse" />
//         </header>

//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
//           {/* Items Skeleton */}
//           <div className="lg:col-span-8 space-y-6">
//             {[1, 2].map(i => (
//               <div key={i} className="flex gap-6 p-6 border border-slate-100 animate-pulse">
//                 <div className="w-32 h-32 bg-slate-100 flex-shrink-0" />
//                 <div className="flex-1 space-y-4 py-2">
//                   <div className="w-16 h-2 bg-slate-100" />
//                   <div className="w-3/4 h-6 bg-slate-200" />
//                   <div className="w-1/4 h-4 bg-slate-100 mt-6" />
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* Summary Skeleton */}
//           <div className="lg:col-span-4">
//             <div className="bg-slate-50 border border-slate-100 p-8 h-[400px] animate-pulse">
//               <div className="w-40 h-8 bg-slate-200 mb-8" />
//               <div className="space-y-4">
//                 <div className="w-full h-12 bg-white border border-slate-200" />
//                 <div className="flex justify-between mt-8"><div className="w-20 h-3 bg-slate-200"/><div className="w-16 h-3 bg-slate-200"/></div>
//                 <div className="flex justify-between"><div className="w-20 h-3 bg-slate-200"/><div className="w-16 h-3 bg-slate-200"/></div>
//               </div>
//               <div className="w-full h-12 bg-slate-200 mt-12" />
//             </div>
//           </div>
//         </div>
//       </div>
//     </main>
//   )
// }
'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, Minus, ShoppingBag, ChevronRight, Gift } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { UserResponse } from '@supabase/supabase-js'
import { useCart } from '@/hooks/useCart'
import { getOptimizedUrl } from '@/lib/cloudinary-url'
import type { CartItemWithProduct } from '@/types'

// ── BOGO helper ──────────────────────────────────────────────────────────────
function getBogoFreeMap(
  items: CartItemWithProduct[],
  freeCount: number
): Map<string, number> {
  if (freeCount <= 0) return new Map()
  const expanded: { id: string; unitPrice: number }[] = []
  for (const item of items) {
    const qty = item.quantity || 1
    const unitPrice = (item.total_price || 0) / qty
    for (let i = 0; i < qty; i++) expanded.push({ id: item.id, unitPrice })
  }
  expanded.sort((a, b) => b.unitPrice - a.unitPrice)
  const map = new Map<string, number>()
  for (const entry of expanded.slice(expanded.length - freeCount)) {
    map.set(entry.id, (map.get(entry.id) || 0) + 1)
  }
  return map
}

// ── Cart Styles ──────────────────────────────────────────────────────────────

const CART_CSS = `
  @keyframes cart-fade-up { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }

  .ct-root { min-height: 100vh; background: #fff; }
  .ct-wrap { max-width: 1400px; margin: 0 auto; padding: 3rem 24px 5rem; }
  @media (max-width: 640px) { .ct-wrap { padding: 2rem 16px 4rem; } }

  .ct-header {
    display: flex; align-items: flex-end; justify-content: space-between;
    padding-bottom: 1.75rem; border-bottom: 1px solid #e2e8f0; margin-bottom: 2.5rem;
    animation: cart-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both;
  }
  .ct-eyebrow { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.3em; color: #94a3b8; font-weight: 600; margin-bottom: 6px; }
  .ct-title { font-family: var(--font-playfair), Georgia, serif; font-size: clamp(2rem, 4vw, 3rem); color: #0f172a; font-weight: 400; letter-spacing: -0.02em; }
  .ct-count { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.28em; color: #94a3b8; font-weight: 600; }

  .ct-bogo {
    display: flex; align-items: center; gap: 1rem;
    background: #0f172a; padding: 1.25rem 1.5rem; margin-bottom: 2rem;
    animation: cart-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both;
  }
  .ct-bogo-title { font-family: var(--font-playfair), Georgia, serif; color: #fff; font-size: 1.05rem; }
  .ct-bogo-sub { font-size: 9px; text-transform: uppercase; letter-spacing: 0.22em; color: #64748b; margin-top: 2px; }

  .ct-grid { display: grid; grid-template-columns: 1fr 360px; gap: 3.5rem; align-items: start; }
  @media (max-width: 1024px) { .ct-grid { grid-template-columns: 1fr; gap: 2.5rem; } }

  .ct-items { display: flex; flex-direction: column; gap: 1rem; }
  .ct-item {
    display: flex; gap: 1.5rem; padding: 1.5rem;
    border: 1px solid #e2e8f0; background: #fff;
    transition: border-color .2s;
    animation: cart-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both;
  }
  .ct-item:hover { border-color: #cbd5e1; }
  .ct-item.bogo-item { border-color: #0f172a; background: #f8fafc; }

  .ct-img-wrap {
    flex-shrink: 0; width: 120px; height: 120px;
    background: #f8fafc; border: 1px solid #f1f5f9;
    display: flex; align-items: center; justify-content: center;
    position: relative; overflow: hidden; text-decoration: none;
  }
  .ct-free-badge {
    position: absolute; top: 0; right: 0;
    background: #0f172a; color: #fff;
    font-size: 8px; text-transform: uppercase; letter-spacing: 0.2em; padding: 3px 6px;
  }

  .ct-item-body { flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem; min-width: 0; }
  .ct-brand { font-size: 9px; text-transform: uppercase; letter-spacing: 0.22em; color: #94a3b8; }
  .ct-name {
    font-family: var(--font-playfair), Georgia, serif;
    font-size: 1.2rem; color: #0f172a; text-decoration: none; line-height: 1.2;
    transition: color .18s; display: block;
  }
  .ct-name:hover { color: #475569; }
  .ct-bogo-tag {
    display: inline-flex; align-items: center; margin-top: 8px;
    border: 1px solid #0f172a; font-size: 8.5px; text-transform: uppercase;
    letter-spacing: 0.18em; color: #0f172a; padding: 2px 8px;
  }
  .ct-lens-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .ct-lens-tag { font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; border: 1px solid #e2e8f0; color: #64748b; padding: 3px 8px; background: #fff; }

  .ct-item-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 0.75rem; border-top: 1px solid #f1f5f9; }
  .ct-qty { display: flex; align-items: center; border: 1px solid #e2e8f0; }
  .ct-qty-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; color: #64748b; transition: background .15s, color .15s; }
  .ct-qty-btn:hover { background: #f8fafc; color: #0f172a; }
  .ct-qty-num { width: 32px; text-align: center; font-size: 12px; font-weight: 600; color: #0f172a; }
  .ct-delete { background: none; border: none; cursor: pointer; color: #cbd5e1; padding: 4px; display: flex; align-items: center; transition: color .15s; }
  .ct-delete:hover { color: #0f172a; }

  .ct-price { text-align: right; }
  .ct-price-main { font-family: var(--font-playfair), Georgia, serif; font-size: 1.2rem; color: #0f172a; }
  .ct-price-strike { font-size: 10px; color: #cbd5e1; text-decoration: line-through; }
  .ct-price-hint { font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; margin-top: 2px; }

  /* Summary */
  .ct-summary { position: sticky; top: 5.5rem; }
  .ct-summary-inner { border: 1px solid #e2e8f0; background: #fff; padding: 2rem; }
  .ct-summary-title { font-family: var(--font-playfair), Georgia, serif; font-size: 1.5rem; color: #0f172a; padding-bottom: 1.25rem; border-bottom: 1px solid #f1f5f9; margin-bottom: 1.5rem; }

  .ct-coupon-applied { display: flex; align-items: center; justify-content: space-between; border: 1px solid #0f172a; padding: 0.875rem 1rem; background: #f8fafc; margin-bottom: 1.5rem; }
  .ct-coupon-code { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.22em; color: #0f172a; }
  .ct-coupon-saved { font-size: 9px; text-transform: uppercase; letter-spacing: 0.18em; color: #64748b; margin-top: 2px; }
  .ct-coupon-remove { font-size: 9px; text-transform: uppercase; letter-spacing: 0.18em; color: #94a3b8; background: none; border: none; cursor: pointer; transition: color .15s; }
  .ct-coupon-remove:hover { color: #0f172a; }
  .ct-coupon-row { display: flex; border: 1px solid #e2e8f0; margin-bottom: 1.5rem; }
  .ct-coupon-input { flex: 1; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; padding: 0.875rem 1rem; border: none; outline: none; color: #0f172a; background: transparent; font-family: 'Inter', sans-serif; }
  .ct-coupon-input::placeholder { color: #cbd5e1; }
  .ct-coupon-btn { padding: 0 1rem; border-left: 1px solid #e2e8f0; font-size: 9px; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 700; color: #0f172a; background: none; border-top: none; border-right: none; border-bottom: none; cursor: pointer; transition: background .15s; }
  .ct-coupon-btn:hover { background: #f8fafc; }
  .ct-coupon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .ct-coupon-error { font-size: 10px; color: #dc2626; margin-top: -1rem; margin-bottom: 1rem; }

  .ct-summary-rows { display: flex; flex-direction: column; gap: 0.875rem; padding-bottom: 1.25rem; border-bottom: 1px solid #f1f5f9; margin-bottom: 1.25rem; }
  .ct-row { display: flex; justify-content: space-between; align-items: baseline; }
  .ct-row-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8; }
  .ct-row-val { font-size: 13px; font-weight: 500; color: #0f172a; }
  .ct-row-val.discount { color: #059669; }
  .ct-row-val.free-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.2em; }

  .ct-total-row { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 1.75rem; }
  .ct-total-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.22em; color: #94a3b8; }
  .ct-total-val { font-family: var(--font-playfair), Georgia, serif; font-size: 2rem; color: #0f172a; letter-spacing: -0.02em; }

  .ct-checkout-btn {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 1.1rem; background: #0f172a; color: #fff;
    font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.22em; font-weight: 600;
    text-decoration: none; border: none; cursor: pointer; font-family: 'Inter', sans-serif;
    position: relative; overflow: hidden; transition: background .2s;
  }
  .ct-checkout-btn::before {
    content: ''; position: absolute; inset: 0; background: #1e293b;
    transform: translateX(-110%) skewX(-8deg);
    transition: transform .5s cubic-bezier(.22,1,.36,1);
  }
  .ct-checkout-btn:hover::before { transform: translateX(110%) skewX(-8deg); }
  .ct-checkout-btn span { position: relative; z-index: 1; }
  .ct-secure { font-size: 9px; text-transform: uppercase; letter-spacing: 0.22em; color: #cbd5e1; text-align: center; margin-top: 1rem; display: flex; align-items: center; justify-content: center; gap: 6px; }

  /* Empty state */
  .ct-empty { min-height: 100vh; background: #fff; display: flex; align-items: center; justify-content: center; }
  .ct-empty-inner { text-align: center; max-width: 400px; padding: 2rem; animation: cart-fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both; }
  .ct-empty-icon { width: 72px; height: 72px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem; color: #cbd5e1; }
  .ct-empty-title { font-family: var(--font-playfair), Georgia, serif; font-size: 2rem; color: #0f172a; margin-bottom: 0.75rem; font-weight: 400; }
  .ct-empty-desc { font-size: 13px; color: #64748b; line-height: 1.65; margin-bottom: 2rem; }
  .ct-shop-btn { display: inline-flex; align-items: center; gap: 8px; padding: 1rem 2rem; background: #0f172a; color: #fff; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.22em; font-weight: 600; text-decoration: none; font-family: 'Inter', sans-serif; transition: background .2s; }
  .ct-shop-btn:hover { background: #1e293b; }
`

// ── CartPage ─────────────────────────────────────────────────────────────────

export default function CartPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [couponInput, setCouponInput] = useState('')
  const [applyingCoupon, setApplyingCoupon] = useState(false)
  const router = useRouter()

  useEffect(() => {
    createClient().auth.getUser().then(({ data }: UserResponse) => {
      if (!data.user) router.push('/auth/login?redirect=/cart')
      else setUserId(data.user.id)
    })
  }, [router])

  const {
    items, summary, loading,
    coupon, couponError,
    removeFromCart, updateQuantity,
    applyCoupon, removeCoupon,
  } = useCart(userId)

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return
    setApplyingCoupon(true)
    await applyCoupon(couponInput.trim())
    setApplyingCoupon(false)
  }

  const isBogo = coupon?.discount_type === 'bogo'
  const bogoFreeMap = isBogo
    ? getBogoFreeMap(items, summary.bogo_free_item_count)
    : new Map<string, number>()

  if (loading) return <CartSkeleton />

  if (!loading && items.length === 0) {
    return (
      <div className="ct-empty">
        <style dangerouslySetInnerHTML={{ __html: CART_CSS }} />
        <div className="ct-empty-inner">
          <div className="ct-empty-icon">
            <ShoppingBag size={28} strokeWidth={1} />
          </div>
          <p className="ct-eyebrow">Shopping Bag</p>
          <h2 className="ct-empty-title">Your Cart is Empty</h2>
          <p className="ct-empty-desc">
            Explore our collection and add your favourite frames to begin your checkout experience.
          </p>
          <Link href="/products" className="ct-shop-btn">
            <span>Discover Frames</span>
            <ChevronRight size={14} strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <main className="ct-root">
      <style dangerouslySetInnerHTML={{ __html: CART_CSS }} />
      <div className="ct-wrap">

        {/* Header */}
        <header className="ct-header">
          <div>
            <p className="ct-eyebrow">Shopping Bag</p>
            <h1 className="ct-title">Your Cart</h1>
          </div>
          <p className="ct-count">{summary.item_count} Item{summary.item_count !== 1 ? 's' : ''}</p>
        </header>

        {/* BOGO Banner */}
        {isBogo && summary.bogo_free_item_count > 0 && (
          <div className="ct-bogo">
            <Gift size={18} strokeWidth={1.5} style={{ color: '#fff', flexShrink: 0 }} />
            <div>
              <p className="ct-bogo-title">Buy 1 Get 1 Free Applied</p>
              <p className="ct-bogo-sub">
                {summary.bogo_free_item_count} cheapest item{summary.bogo_free_item_count > 1 ? 's are' : ' is'} free
              </p>
            </div>
          </div>
        )}

        <div className="ct-grid">

          {/* ── Items ── */}
          <div className="ct-items">
            {items.map((item, idx) => {
              const freeUnits = bogoFreeMap.get(item.id) || 0
              const allFree = freeUnits === item.quantity
              const partialFree = freeUnits > 0 && !allFree

              return (
                <div
                  key={item.id}
                  className={`ct-item${freeUnits > 0 ? ' bogo-item' : ''}`}
                  style={{ animationDelay: `${idx * 0.07}s` }}
                >
                  {/* Image */}
                  <Link href={`/products/${item.product?.slug}`} className="ct-img-wrap">
                    {item.product?.images?.[0] && (
                      <Image
                        src={getOptimizedUrl(item.product.images[0].public_id, { width: 120, height: 120 })}
                        alt={item.product.name}
                        fill
                        className="object-contain mix-blend-multiply p-2"
                        sizes="120px"
                      />
                    )}
                    {freeUnits > 0 && (
                      <span className="ct-free-badge">{allFree ? 'FREE' : `${freeUnits} FREE`}</span>
                    )}
                  </Link>

                  {/* Body */}
                  <div className="ct-item-body">
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div>
                          <p className="ct-brand">{item.product?.brand}</p>
                          <Link href={`/products/${item.product?.slug}`} className="ct-name">
                            {item.product?.name}
                          </Link>
                          {freeUnits > 0 && (
                            <span className="ct-bogo-tag">
                              {allFree ? 'BOGO Free' : `${freeUnits} of ${item.quantity} free`}
                            </span>
                          )}
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="ct-delete" aria-label="Remove">
                          <Trash2 size={15} strokeWidth={1.5} />
                        </button>
                      </div>
                      {item.lens_power_type && (
                        <div className="ct-lens-tags">
                          <span className="ct-lens-tag">{item.lens_power_type.replace('_', ' ')}</span>
                          {item.lens_package_code && (
                            <span className="ct-lens-tag">{item.lens_package_code.replace('_', ' ')} Lenses</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="ct-item-footer">
                      <div className="ct-qty">
                        <button className="ct-qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Minus size={11} />
                        </button>
                        <span className="ct-qty-num">{item.quantity}</span>
                        <button className="ct-qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <Plus size={11} />
                        </button>
                      </div>
                      <div className="ct-price">
                        {allFree ? (
                          <>
                            <p className="ct-price-main">FREE</p>
                            <p className="ct-price-strike">₹{(item.total_price || 0).toLocaleString('en-IN')}</p>
                          </>
                        ) : (
                          <>
                            <p className="ct-price-main">₹{(item.total_price || 0).toLocaleString('en-IN')}</p>
                            {partialFree && <p className="ct-price-hint">{freeUnits} unit{freeUnits > 1 ? 's' : ''} free</p>}
                            {(item.lens_price || 0) > 0 && <p className="ct-price-hint">Frame + Lens</p>}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Summary ── */}
          <div className="ct-summary">
            <div className="ct-summary-inner">
              <h3 className="ct-summary-title">Order Summary</h3>

              {/* Coupon */}
              <p className="ct-eyebrow" style={{ marginBottom: 10 }}>Promo Code</p>
              {coupon ? (
                <div className="ct-coupon-applied">
                  <div>
                    <p className="ct-coupon-code">{coupon.code}</p>
                    <p className="ct-coupon-saved">
                      {isBogo
                        ? `${summary.bogo_free_item_count} item free`
                        : `Saved ₹${summary.discount_amount.toLocaleString('en-IN')}`}
                    </p>
                  </div>
                  <button className="ct-coupon-remove" onClick={removeCoupon}>Remove</button>
                </div>
              ) : (
                <div className="ct-coupon-row">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                    placeholder="ENTER CODE"
                    className="ct-coupon-input"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={applyingCoupon || !couponInput.trim()}
                    className="ct-coupon-btn"
                  >
                    {applyingCoupon ? '...' : 'Apply'}
                  </button>
                </div>
              )}
              {couponError && <p className="ct-coupon-error">{couponError}</p>}

              {/* Line Items */}
              <div className="ct-summary-rows">
                <div className="ct-row">
                  <span className="ct-row-label">Subtotal</span>
                  <span className="ct-row-val">₹{summary.subtotal.toLocaleString('en-IN')}</span>
                </div>
                {summary.discount_amount > 0 && (
                  <div className="ct-row">
                    <span className="ct-row-label">{isBogo ? 'BOGO Discount' : 'Coupon'}</span>
                    <span className="ct-row-val discount">−₹{summary.discount_amount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="ct-row">
                  <span className="ct-row-label">Delivery</span>
                  <span className="ct-row-val free-label">Complimentary</span>
                </div>
              </div>

              {/* Total */}
              <div className="ct-total-row">
                <span className="ct-total-label">Estimated Total</span>
                <span className="ct-total-val">₹{summary.total.toLocaleString('en-IN')}</span>
              </div>

              <Link href="/checkout" className="ct-checkout-btn">
                <span>Proceed to Checkout →</span>
              </Link>

              <p className="ct-secure">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Secure Encrypted Transaction
              </p>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CartSkeleton() {
  return (
    <main style={{ minHeight: '100vh', background: '#fff', padding: '3rem 24px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ paddingBottom: '1.75rem', borderBottom: '1px solid #e2e8f0', marginBottom: '2.5rem' }}>
          <div style={{ width: 80, height: 10, background: '#f1f5f9', marginBottom: 10 }} />
          <div style={{ width: 200, height: 40, background: '#e2e8f0' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '3.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2].map(i => (
              <div key={i} style={{ display: 'flex', gap: 24, padding: 24, border: '1px solid #f1f5f9' }}>
                <div style={{ width: 120, height: 120, background: '#f8fafc', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ width: 60, height: 8, background: '#f1f5f9' }} />
                  <div style={{ width: '70%', height: 24, background: '#e2e8f0' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ border: '1px solid #e2e8f0', padding: 32, height: 380, background: '#fff' }}>
            <div style={{ width: 160, height: 28, background: '#e2e8f0', marginBottom: 24 }} />
            <div style={{ width: '100%', height: 44, background: '#f8fafc', marginBottom: 24 }} />
            <div style={{ width: '100%', height: 44, background: '#0f172a', marginTop: 'auto' }} />
          </div>
        </div>
      </div>
    </main>
  )
}