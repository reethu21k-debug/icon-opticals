-- ============================================================
-- MIGRATION: Virtual Try-On Dimensions
-- Adds frame measurement columns + try-on image fields to products
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Frame physical dimensions (in millimetres)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS frame_width_mm      NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS lens_width_mm       NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS bridge_width_mm     NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS temple_length_mm    NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS frame_height_mm     NUMERIC(6,1);

-- 2. Try-on image (transparent PNG, background-removed)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS try_on_image_url        TEXT,
  ADD COLUMN IF NOT EXISTS try_on_image_public_id  TEXT;

-- Column documentation
COMMENT ON COLUMN products.frame_width_mm
  IS 'Total frame width in mm — measured temple-hinge to temple-hinge';
COMMENT ON COLUMN products.lens_width_mm
  IS 'Individual lens width in mm (one eye)';
COMMENT ON COLUMN products.bridge_width_mm
  IS 'Bridge/nose-piece width in mm';
COMMENT ON COLUMN products.temple_length_mm
  IS 'Temple arm length in mm (ear-side piece)';
COMMENT ON COLUMN products.frame_height_mm
  IS 'Lens/frame height in mm (vertical measurement)';
COMMENT ON COLUMN products.try_on_image_url
  IS 'Cloudinary URL for transparent PNG used in Virtual Try-On overlay';
COMMENT ON COLUMN products.try_on_image_public_id
  IS 'Cloudinary public_id for the try-on transparent PNG';

-- Optional: back-fill sensible defaults for eyeglasses/sunglasses
-- These are average industry measurements — update per product as needed
UPDATE products
SET
  frame_width_mm   = CASE
    WHEN frame_shape IN ('rectangle','square','wayfarer') THEN 140
    WHEN frame_shape IN ('round','oval')                  THEN 135
    WHEN frame_shape IN ('aviator','cat-eye','geometric') THEN 142
    ELSE 138
  END,
  lens_width_mm    = CASE
    WHEN frame_shape IN ('rectangle','square')  THEN 52
    WHEN frame_shape IN ('round','oval')        THEN 48
    ELSE 50
  END,
  bridge_width_mm  = 18,
  temple_length_mm = 145,
  frame_height_mm  = CASE
    WHEN frame_shape IN ('round','oval')     THEN 46
    WHEN frame_shape = 'aviator'             THEN 50
    ELSE 38
  END
WHERE
  category IN ('eyeglasses','sunglasses')
  AND frame_width_mm IS NULL;

-- Index for fast lookup (products with try-on enabled)
CREATE INDEX IF NOT EXISTS idx_products_tryon
  ON products (id)
  WHERE try_on_image_url IS NOT NULL;
