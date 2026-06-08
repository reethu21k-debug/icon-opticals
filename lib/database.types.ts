// Auto-generated Supabase database types
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts
// For now this is a permissive placeholder that works without generation

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          email_opt_in: boolean
          whatsapp_opt_in: boolean
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          email_opt_in?: boolean
          whatsapp_opt_in?: boolean
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          email_opt_in?: boolean
          whatsapp_opt_in?: boolean
          role?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          brand: string
          category: string
          gender: string
          frame_type: string | null
          frame_shape: string | null
          frame_color: string | null
          frame_material: string | null
          base_price: number
          discount_percent: number
          final_price: number
          images: Json
          stock: number
          is_active: boolean
          is_featured: boolean
          rating: number
          review_count: number
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          brand: string
          category: string
          gender?: string
          frame_type?: string | null
          frame_shape?: string | null
          frame_color?: string | null
          frame_material?: string | null
          base_price: number
          discount_percent?: number
          images?: Json
          stock?: number
          is_active?: boolean
          is_featured?: boolean
          tags?: string[]
        }
        Update: {
          name?: string
          slug?: string
          description?: string | null
          brand?: string
          category?: string
          gender?: string
          frame_type?: string | null
          frame_shape?: string | null
          frame_color?: string | null
          frame_material?: string | null
          base_price?: number
          discount_percent?: number
          images?: Json
          stock?: number
          is_active?: boolean
          is_featured?: boolean
          tags?: string[]
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          user_id: string
          status: string
          subtotal: number
          discount_amount: number
          coupon_code: string | null
          total_amount: number
          shipping_address: Json | null
          fulfillment_type: string
          store_id: string | null
          invoice_url: string | null
          invoice_cloudinary_id: string | null
          whatsapp_confirmed_sent: boolean
          whatsapp_ready_sent: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          status?: string
          subtotal: number
          discount_amount?: number
          coupon_code?: string | null
          total_amount: number
          shipping_address?: Json | null
          fulfillment_type?: string
          store_id?: string | null
          notes?: string | null
        }
        Update: {
          status?: string
          invoice_url?: string | null
          invoice_cloudinary_id?: string | null
          whatsapp_confirmed_sent?: boolean
          whatsapp_ready_sent?: boolean
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          product_snapshot: Json
          quantity: number
          lens_config: Json | null
          frame_price: number
          lens_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          order_id: string
          product_id: string
          product_snapshot: Json
          quantity?: number
          lens_config?: Json | null
          frame_price: number
          lens_price?: number
          total_price: number
        }
        Update: Record<string, never>
      }
      cart_items: {
        Row: {
          id: string
          user_id: string
          product_id: string
          quantity: number
          lens_power_type: string | null
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
        Insert: {
          user_id: string
          product_id: string
          quantity?: number
          lens_power_type?: string | null
          lens_package_code?: string | null
          left_eye_sph?: number | null
          left_eye_cyl?: number | null
          left_eye_axis?: number | null
          right_eye_sph?: number | null
          right_eye_cyl?: number | null
          right_eye_axis?: number | null
          pd?: number | null
          prescription_upload_url?: string | null
          prescription_upload_later?: boolean
          frame_price?: number | null
          lens_price?: number | null
          total_price?: number | null
        }
        Update: {
          quantity?: number
          total_price?: number | null
          updated_at?: string
        }
      }
      wishlist: {
        Row: { id: string; user_id: string; product_id: string; created_at: string }
        Insert: { user_id: string; product_id: string }
        Update: Record<string, never>
      }
      stores: {
        Row: {
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
          timings: Json
          is_active: boolean
          created_at: string
        }
        Insert: {
          name: string
          address: string
          city: string
          state: string
          pincode: string
          phone?: string | null
          email?: string | null
          latitude?: number | null
          longitude?: number | null
          timings?: Json
          is_active?: boolean
        }
        Update: {
          name?: string
          address?: string
          city?: string
          state?: string
          pincode?: string
          phone?: string | null
          email?: string | null
          latitude?: number | null
          longitude?: number | null
          timings?: Json
          is_active?: boolean
        }
      }
      bookings: {
        Row: {
          id: string
          booking_number: string
          user_id: string
          store_id: string
          booking_date: string
          time_slot: string
          purpose: string
          status: string
          notes: string | null
          confirmation_email_sent: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          store_id: string
          booking_date: string
          time_slot: string
          purpose?: string
          notes?: string | null
        }
        Update: { status?: string; confirmation_email_sent?: boolean }
      }
      reviews: {
        Row: {
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
        }
        Insert: {
          product_id: string
          user_id: string
          order_id?: string | null
          rating: number
          title?: string | null
          body?: string | null
          images?: string[]
        }
        Update: { is_approved?: boolean }
      }
      coupons: {
        Row: {
          id: string
          code: string
          description: string | null
          discount_type: string
          discount_value: number
          min_order_value: number
          max_discount: number | null
          usage_limit: number | null
          used_count: number
          valid_from: string
          valid_until: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          code: string
          discount_type: string
          discount_value: number
          min_order_value?: number
          max_discount?: number | null
          usage_limit?: number | null
          valid_until?: string | null
        }
        Update: { used_count?: number; is_active?: boolean }
      }
      lens_packages: {
        Row: {
          id: string
          name: string
          code: string
          description: string | null
          price_addon: number
          features: string[]
          is_active: boolean
        }
        Insert: { name: string; code: string; price_addon?: number; features?: string[] }
        Update: { is_active?: boolean }
      }
      marketing_campaigns: {
        Row: {
          id: string
          subject: string
          content: string
          sent_by: string | null
          status: string
          target_filter: Json | null
          total_recipients: number
          sent_count: number
          failed_count: number
          created_at: string
          sent_at: string | null
        }
        Insert: { subject: string; content: string; sent_by?: string | null; status?: string }
        Update: {
          status?: string
          total_recipients?: number
          sent_count?: number
          failed_count?: number
          sent_at?: string | null
        }
      }
      campaign_recipients: {
        Row: {
          id: string
          campaign_id: string
          user_id: string
          email: string
          status: string
          sent_at: string | null
        }
        Insert: { campaign_id: string; user_id: string; email: string; status?: string; sent_at?: string | null }
        Update: { status?: string; sent_at?: string | null }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
