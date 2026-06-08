'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Heart, ShoppingBag } from 'lucide-react'
import { getOptimizedUrl } from '@/lib/cloudinary-url'
import type { Product } from '@/types'

interface WishlistItem {
  id: string
  product: Product
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login?redirect=/wishlist'); return }

      const { data } = await supabase
        .from('wishlist')
        .select(`
          id,
          product:products(
            id, name, slug, brand, images, final_price, base_price,
            discount_percent, rating, review_count, is_active
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(0, 19)

      setItems(((data || []) as unknown) as WishlistItem[])
      setLoading(false)
    }
    init()
  }, [router])

  const removeFromWishlist = async (wishlistId: string) => {
    const supabase = createClient()
    await supabase.from('wishlist').delete().eq('id', wishlistId)
    setItems(prev => prev.filter(i => i.id !== wishlistId))
  }

  if (loading) return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-8 bg-gray-200 rounded w-40 mb-6 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-5 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Heart size={22} className="text-rose-500 fill-rose-500" />
            My Wishlist
            {items.length > 0 && (
              <span className="text-base font-normal text-gray-400">({items.length})</span>
            )}
          </h1>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-7xl mb-4">💔</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-6">Save products you love and come back later</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-8 rounded-2xl transition-colors"
            >
              <ShoppingBag size={18} /> Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map(({ id, product }) => {
              const discount = Math.round(product.discount_percent)
              const primaryImage = product.images?.[0]

              return (
                <div key={id} className="relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-cyan-200 hover:shadow-lg transition-all">
                  {/* Remove button */}
                  <button
                    onClick={() => removeFromWishlist(id)}
                    className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:scale-110 transition-transform"
                  >
                    <Heart size={16} className="fill-rose-500 stroke-rose-500" />
                  </button>

                  {/* Discount badge */}
                  {discount > 0 && (
                    <div className="absolute top-3 left-3 z-10 bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                      {discount}% OFF
                    </div>
                  )}

                  {/* Image */}
                  <Link href={`/products/${product.slug}`}>
                    <div className="relative aspect-square bg-gray-50">
                      {primaryImage ? (
                        <Image
                          src={getOptimizedUrl(primaryImage.public_id, { width: 400, height: 400 })}
                          alt={product.name}
                          fill
                          className="object-contain p-4"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-5xl">🕶️</div>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="p-4">
                    <p className="text-xs font-semibold text-cyan-600 uppercase tracking-wide mb-1">{product.brand}</p>
                    <Link href={`/products/${product.slug}`}>
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 hover:text-cyan-600 mb-2">
                        {product.name}
                      </h3>
                    </Link>

                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="font-bold text-gray-900">₹{product.final_price.toLocaleString('en-IN')}</span>
                      {discount > 0 && (
                        <span className="text-xs text-gray-400 line-through">₹{product.base_price.toLocaleString('en-IN')}</span>
                      )}
                    </div>

                    <Link
                      href={`/products/${product.slug}`}
                      className="flex items-center justify-center gap-1.5 w-full py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      <ShoppingBag size={13} /> Add to Cart
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
