-- ============================================================
-- LENSKART-CLONE: COMPLETE SUPABASE SCHEMA
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for search

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  email_opt_in BOOLEAN DEFAULT false,
  whatsapp_opt_in BOOLEAN DEFAULT true,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  brand TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('eyeglasses', 'sunglasses', 'contact-lenses', 'accessories')),
  gender TEXT DEFAULT 'unisex' CHECK (gender IN ('men', 'women', 'kids', 'unisex')),
  frame_type TEXT CHECK (frame_type IN ('full-rim', 'half-rim', 'rimless')),
  frame_shape TEXT CHECK (frame_shape IN ('rectangle', 'round', 'square', 'oval', 'wayfarer', 'aviator', 'cat-eye', 'geometric')),
  frame_color TEXT,
  frame_material TEXT,
  base_price NUMERIC(10,2) NOT NULL,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  final_price NUMERIC(10,2) GENERATED ALWAYS AS (
    ROUND(base_price * (1 - discount_percent / 100), 2)
  ) STORED,
  images JSONB DEFAULT '[]'::jsonb, -- [{url, public_id, is_primary}]
  stock INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  rating NUMERIC(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for product queries
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_gender ON products(gender);
CREATE INDEX idx_products_frame_type ON products(frame_type);
CREATE INDEX idx_products_frame_shape ON products(frame_shape);
CREATE INDEX idx_products_final_price ON products(final_price);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_is_featured ON products(is_featured);
CREATE INDEX idx_products_slug ON products(slug);
-- Full-text search index
CREATE INDEX idx_products_search ON products USING GIN(to_tsvector('english', name || ' ' || COALESCE(brand, '') || ' ' || COALESCE(description, '')));

-- ============================================================
-- LENS PACKAGES (reference table)
-- ============================================================
CREATE TABLE lens_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  price_addon NUMERIC(10,2) DEFAULT 0,
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true
);

INSERT INTO lens_packages (name, code, description, price_addon, features) VALUES
('Basic Clear', 'basic', 'Standard clear lenses', 0, ARRAY['Anti-scratch coating', 'UV protection']),
('Anti-Glare', 'anti_glare', 'Reduce reflections and glare', 500, ARRAY['Anti-glare coating', 'UV protection', 'Easy-clean coating']),
('Blue Light Filter', 'blue_light', 'Protect eyes from digital screens', 800, ARRAY['Blue light filter', 'Anti-glare', 'UV protection']),
('Premium Plus', 'premium', 'Best in class protection', 1500, ARRAY['Advanced blue light filter', 'Anti-glare', 'UV400', 'Scratch resistant', 'Water repellent']);

-- ============================================================
-- COUPONS
-- ============================================================
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'flat')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_order_value NUMERIC(10,2) DEFAULT 0,
  max_discount NUMERIC(10,2), -- cap for percent discounts
  usage_limit INT,
  used_count INT DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code);

-- ============================================================
-- CART ITEMS
-- ============================================================
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1 CHECK (quantity > 0),
  -- Lens configuration
  lens_power_type TEXT CHECK (lens_power_type IN ('with_power', 'zero_power', 'progressive', 'frame_only')),
  lens_package_code TEXT REFERENCES lens_packages(code),
  left_eye_sph NUMERIC(4,2),
  left_eye_cyl NUMERIC(4,2),
  left_eye_axis INT,
  right_eye_sph NUMERIC(4,2),
  right_eye_cyl NUMERIC(4,2),
  right_eye_axis INT,
  pd NUMERIC(4,1), -- pupillary distance
  prescription_upload_url TEXT,
  prescription_upload_later BOOLEAN DEFAULT false,
  -- Pricing snapshot
  frame_price NUMERIC(10,2),
  lens_price NUMERIC(10,2),
  total_price NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id, lens_power_type, lens_package_code)
);

CREATE INDEX idx_cart_user_id ON cart_items(user_id);
CREATE INDEX idx_cart_product_id ON cart_items(product_id);

-- ============================================================
-- WISHLIST
-- ============================================================
CREATE TABLE wishlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX idx_wishlist_product_id ON wishlist(product_id);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL DEFAULT 'ORD-' || UPPER(SUBSTR(uuid_generate_v4()::TEXT, 1, 8)),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'ready_for_pickup', 'completed', 'cancelled')),
  -- Pricing
  subtotal NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  coupon_code TEXT,
  total_amount NUMERIC(10,2) NOT NULL,
  -- Address (for delivery orders)
  shipping_address JSONB,
  -- Fulfillment
  fulfillment_type TEXT DEFAULT 'pickup' CHECK (fulfillment_type IN ('pickup', 'delivery')),
  store_id UUID, -- if pickup
  -- Invoice
  invoice_url TEXT, -- Cloudinary PDF URL
  invoice_cloudinary_id TEXT,
  -- WhatsApp tracking (prevent duplicates)
  whatsapp_confirmed_sent BOOLEAN DEFAULT false,
  whatsapp_ready_sent BOOLEAN DEFAULT false,
  -- Notes
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_snapshot JSONB NOT NULL, -- name, image, brand at time of order
  quantity INT DEFAULT 1,
  -- Lens config snapshot
  lens_config JSONB,
  -- Pricing snapshot
  frame_price NUMERIC(10,2) NOT NULL,
  lens_price NUMERIC(10,2) DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- ============================================================
-- STORES
-- ============================================================
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  timings JSONB DEFAULT '{
    "mon": {"open": "10:00", "close": "21:00"},
    "tue": {"open": "10:00", "close": "21:00"},
    "wed": {"open": "10:00", "close": "21:00"},
    "thu": {"open": "10:00", "close": "21:00"},
    "fri": {"open": "10:00", "close": "21:00"},
    "sat": {"open": "10:00", "close": "21:00"},
    "sun": {"open": "11:00", "close": "20:00"}
  }'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BOOKINGS (Eye test / Store visit)
-- ============================================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number TEXT UNIQUE NOT NULL DEFAULT 'BKG-' || UPPER(SUBSTR(uuid_generate_v4()::TEXT, 1, 8)),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  booking_date DATE NOT NULL,
  time_slot TEXT NOT NULL, -- e.g., "10:00-10:30"
  purpose TEXT DEFAULT 'eye_test' CHECK (purpose IN ('eye_test', 'frame_trial', 'pickup', 'repair')),
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  confirmation_email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_store_id ON bookings(store_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  order_id UUID REFERENCES orders(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  images TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

CREATE INDEX idx_reviews_product_id ON reviews(product_id);

-- ============================================================
-- MARKETING EMAIL CAMPAIGNS
-- ============================================================
CREATE TABLE marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  content TEXT NOT NULL, -- HTML content
  sent_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  target_filter JSONB, -- {opted_in: true, ...}
  total_recipients INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE TABLE campaign_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  UNIQUE(campaign_id, user_id)
);

CREATE INDEX idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);

-- ============================================================
-- CLEANUP: Auto-delete abandoned carts after 7 days
-- Run this as a cron job or Supabase scheduled function
-- ============================================================
-- SELECT cron.schedule('cleanup-carts', '0 2 * * *',
--   'DELETE FROM cart_items WHERE updated_at < NOW() - INTERVAL ''7 days''');

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/edit own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Products: public read, admin write
CREATE POLICY "Public can view active products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage products" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Cart: users see/edit only own cart
CREATE POLICY "Users manage own cart" ON cart_items FOR ALL USING (user_id = auth.uid());

-- Wishlist: users see/edit own wishlist
CREATE POLICY "Users manage own wishlist" ON wishlist FOR ALL USING (user_id = auth.uid());

-- Orders: users see own orders, admins see all
CREATE POLICY "Users view own orders" ON orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins view all orders" ON orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Order items: users see own order items
CREATE POLICY "Users view own order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);

-- Bookings: users see own bookings
CREATE POLICY "Users view own bookings" ON bookings FOR ALL USING (user_id = auth.uid());

-- Reviews: public read, users write own
CREATE POLICY "Public can view approved reviews" ON reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can write own reviews" ON reviews FOR INSERT WITH CHECK (user_id = auth.uid());

-- Stores: public read
CREATE POLICY "Public can view active stores" ON stores FOR SELECT USING (is_active = true);

-- ============================================================
-- TRIGGER: Update product rating on review approval
-- ============================================================
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET
    rating = (SELECT AVG(rating) FROM reviews WHERE product_id = NEW.product_id AND is_approved = true),
    review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.product_id AND is_approved = true)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- ============================================================
-- TRIGGER: Update timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_cart_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
