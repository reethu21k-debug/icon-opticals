// ============================================================
// LENSKART-CLONE: COMPLETE TYPE DEFINITIONS
// ============================================================

// ── Database Types ──────────────────────────────────────────

export type UserRole = 'customer' | 'admin'

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  email_opt_in: boolean
  whatsapp_opt_in: boolean
  role: UserRole
  created_at: string
  updated_at: string
}

export interface ProductImage {
  url: string
  public_id: string
  is_primary: boolean
}

export type Category = 'eyeglasses' | 'sunglasses' | 'contact-lenses' | 'accessories'
export type Gender = 'men' | 'women' | 'kids' | 'unisex'
export type FrameType = 'full-rim' | 'half-rim' | 'rimless'
export type FrameShape = 'rectangle' | 'round' | 'square' | 'oval' | 'wayfarer' | 'aviator' | 'cat-eye' | 'geometric'

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  brand: string
  category: Category
  gender: Gender
  frame_type: FrameType | null
  frame_shape: FrameShape | null
  frame_color: string | null
  frame_material: string | null
  base_price: number
  discount_percent: number
  final_price: number
  images: ProductImage[]
  stock: number
  is_active: boolean
  is_featured: boolean
  rating: number
  review_count: number
  tags: string[]
  created_at: string
  updated_at: string

  // ── Virtual Try-On Dimensions (in millimetres) ─────────────
  frame_width_mm: number | null      // total width temple-to-temple
  lens_width_mm: number | null       // single lens width
  bridge_width_mm: number | null     // nose bridge width
  temple_length_mm: number | null    // arm / temple length
  frame_height_mm: number | null     // vertical lens height

  // ── Virtual Try-On Image ───────────────────────────────────
  try_on_image_url: string | null        // transparent PNG for overlay
  try_on_image_public_id: string | null  // Cloudinary public_id
}

export interface LensPackage {
  id: string
  name: string
  code: string
  description: string | null
  price_addon: number
  features: string[]
  is_active: boolean
}

export interface Coupon {
  id: string
  code: string
  description: string | null
  /** 'bogo' = buy 1 get 1 free; cheapest item(s) in cart are free */
  discount_type: 'percent' | 'flat' | 'bogo'
  discount_value: number
  min_order_value: number
  max_discount: number | null
  usage_limit: number | null
  used_count: number
  valid_from: string
  valid_until: string | null
  is_active: boolean
}

// ── Lens Configuration ──────────────────────────────────────

export type LensPowerType = 'with_power' | 'zero_power' | 'progressive' | 'frame_only'

export interface EyePower {
  sph: number
  cyl: number
  axis: number
}

export interface LensConfig {
  power_type: LensPowerType
  package_code: string | null
  left_eye?: EyePower
  right_eye?: EyePower
  pd?: number
  prescription_url?: string
  upload_later?: boolean
}

// ── Cart ────────────────────────────────────────────────────

export interface CartItem {
  id: string
  user_id: string
  product_id: string
  product?: Product
  quantity: number
  lens_power_type: LensPowerType | null
  lens_package_code: string | null
  left_eye_sph: number | null
  left_eye_cyl: number | null
  left_eye_axis: number | null
  right_eye_sph: number | null
  right_eye_cyl: number | null
  right_eye_axis: number | null
  pd: number | null
  prescription_upload_url: string | null
  prescription_upload_later: boolean
  frame_price: number | null
  lens_price: number | null
  total_price: number | null
  created_at: string
  updated_at: string
}

export interface CartItemWithProduct extends CartItem {
  product: Product
  lens_package?: LensPackage
}

// ── Orders ──────────────────────────────────────────────────

export type OrderStatus =
  | 'pending_admin_approval'
  | 'confirmed'
  | 'rejected'
  | 'pending'
  | 'processing'
  | 'ready_for_pickup'
  | 'completed'
  | 'cancelled'

export type PaymentStatus = 'pending_verification' | 'paid' | 'failed'

export interface Order {
  id: string
  order_number: string
  user_id: string
  status: OrderStatus
  payment_status: PaymentStatus
  approved_at: string | null
  approved_by: string | null
  rejected_at: string | null
  rejected_by: string | null
  rejection_reason: string | null
  payment_reference: string | null
  payment_screenshot_url: string | null
  subtotal: number
  discount_amount: number
  coupon_code: string | null
  total_amount: number
  shipping_address: ShippingAddress | null
  fulfillment_type: 'pickup' | 'delivery'
  store_id: string | null
  invoice_url: string | null
  invoice_cloudinary_id: string | null
  whatsapp_confirmed_sent: boolean
  whatsapp_ready_sent: boolean
  notes: string | null
  created_at: string
  updated_at: string
  order_items?: OrderItem[]
  profile?: Profile
}

export interface ProductSnapshot {
  name: string
  brand: string
  image_url: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_snapshot: ProductSnapshot
  quantity: number
  lens_config: LensConfig | null
  frame_price: number
  lens_price: number
  total_price: number
  created_at: string
}

export interface ShippingAddress {
  name: string
  phone: string
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
}

// ── Stores & Bookings ────────────────────────────────────────

export interface DayTiming {
  open: string
  close: string
}

export interface StoreTimings {
  mon: DayTiming
  tue: DayTiming
  wed: DayTiming
  thu: DayTiming
  fri: DayTiming
  sat: DayTiming
  sun: DayTiming
}

export interface Store {
  id: string
  name: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string | null
  email: string | null
  latitude: number | null
  longitude: number | null
  timings: StoreTimings
  is_active: boolean
  created_at: string
  isOpen?: boolean
}

export type BookingPurpose = 'eye_test' | 'frame_trial' | 'pickup' | 'repair'
export type BookingStatus = 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export interface Booking {
  id: string
  booking_number: string
  user_id: string
  store_id: string
  booking_date: string
  time_slot: string
  purpose: BookingPurpose
  status: BookingStatus
  notes: string | null
  confirmation_email_sent: boolean
  created_at: string
  store?: Store
  profile?: Profile
}

// ── Reviews ──────────────────────────────────────────────────

export interface Review {
  id: string
  product_id: string
  user_id: string
  order_id: string | null
  rating: number
  title: string | null
  body: string | null
  images: string[]
  is_verified: boolean
  is_approved: boolean
  created_at: string
  profile?: Pick<Profile, 'full_name' | 'avatar_url'>
}

// ── Marketing ────────────────────────────────────────────────

export interface MarketingCampaign {
  id: string
  subject: string
  content: string
  sent_by: string | null
  status: 'draft' | 'sending' | 'sent' | 'failed'
  target_filter: Record<string, unknown> | null
  total_recipients: number
  sent_count: number
  failed_count: number
  created_at: string
  sent_at: string | null
}

// ── UI / Frontend Types ──────────────────────────────────────

export interface ProductFilters {
  category?: Category
  gender?: Gender
  brand?: string
  frame_type?: FrameType
  frame_shape?: FrameShape
  frame_color?: string
  min_price?: number
  max_price?: number
  search?: string
  sort?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'featured'
  page?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface CartSummary {
  items: CartItemWithProduct[]
  subtotal: number
  discount_amount: number
  bogo_free_item_count: number
  coupon?: Coupon
  total: number
  item_count: number
}

export interface LensFlowState {
  step: 1 | 2 | 3
  power_type: LensPowerType | null
  package_code: string | null
  prescription: {
    left_eye: EyePower
    right_eye: EyePower
    pd: number
  } | null
  upload_later: boolean
  prescription_url: string | null
}

// ── API Payloads ─────────────────────────────────────────────

export interface PlaceOrderPayload {
  cart_items: CartItemWithProduct[]
  coupon_code?: string
  fulfillment_type: 'pickup' | 'delivery'
  store_id?: string
  shipping_address?: ShippingAddress
  notes?: string
  phone?: string
}

export interface PlaceOrderResponse {
  success: boolean
  order_id: string
  order_number: string
  invoice_url?: string
}

export interface SendEmailPayload {
  to: string
  type: 'order_confirmation' | 'order_rejection' | 'invoice' | 'booking_confirmation'
  data: Record<string, unknown>
}

export interface SendWhatsAppPayload {
  phone: string
  type: 'order_confirmed' | 'order_rejected' | 'ready_for_pickup'
  order_id: string
  data: Record<string, unknown>
}

export interface MarketingEmailPayload {
  campaign_id: string
  subject: string
  content: string
  recipient_ids: string[]
}
