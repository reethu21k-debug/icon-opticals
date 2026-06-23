-- ============================================================
-- MIGRATION: Optional Product Variant Linking (color switching)
-- Adds two small relationship tables. Existing `products` rows
-- are NEVER modified, duplicated, or required to change.
-- Run this in Supabase SQL Editor (after 001_add_tryon_dimensions.sql)
-- ============================================================

-- 1. A "variant group" is just an id + timestamp. The real data
--    (images, price, stock, SKU, description...) always stays on
--    the product row itself.
CREATE TABLE IF NOT EXISTS product_variant_groups (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Membership table: one row per product that belongs to a group.
--    UNIQUE(product_id) enforces "a product can only belong to ONE
--    variant group at a time" at the database level.
--    ON DELETE CASCADE on both FKs means:
--      - deleting a group removes its membership rows
--      - deleting a product automatically removes it from its group
CREATE TABLE IF NOT EXISTS product_variant_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_group_id UUID NOT NULL REFERENCES product_variant_groups(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variant_items_group   ON product_variant_items(variant_group_id);
CREATE INDEX IF NOT EXISTS idx_variant_items_product ON product_variant_items(product_id);

-- ============================================================
-- RLS — public can read (needed to render the color selector on
-- the storefront for anonymous shoppers), only admins can write.
-- ============================================================
ALTER TABLE product_variant_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_items  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view variant groups" ON product_variant_groups
  FOR SELECT USING (true);
CREATE POLICY "Admins manage variant groups" ON product_variant_groups
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public can view variant items" ON product_variant_items
  FOR SELECT USING (true);
CREATE POLICY "Admins manage variant items" ON product_variant_items
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- TRIGGER: auto-delete a group once it drops below 2 members.
-- Fires whenever a membership row is removed for ANY reason —
-- explicit admin unlink, or the ON DELETE CASCADE from a product
-- being deleted outright.
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_orphan_variant_group()
RETURNS TRIGGER AS $$
DECLARE
  remaining INT;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM product_variant_items
  WHERE variant_group_id = OLD.variant_group_id;

  IF remaining < 2 THEN
    DELETE FROM product_variant_groups WHERE id = OLD.variant_group_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanup_orphan_variant_group ON product_variant_items;
CREATE TRIGGER trigger_cleanup_orphan_variant_group
  AFTER DELETE ON product_variant_items
  FOR EACH ROW EXECUTE FUNCTION cleanup_orphan_variant_group();

-- ============================================================
-- FUNCTION: set_product_variant_group(product_id, variant_ids[])
--
-- Used by the admin "Save" action. Does the entire link/relink/
-- unlink operation as ONE atomic statement so a half-finished
-- save can never leave the group table in a broken state (e.g.
-- briefly dropping below 2 members mid-update and getting wiped
-- by the cleanup trigger before the new members are inserted).
--
-- Behaviour:
--  - Resolves (or creates) the target group.
--  - Moves every selected product into that group, detaching
--    them from any group they previously belonged to (this is
--    the "intentional reassignment" allowed by the validation
--    rules in the brief).
--  - Removes anyone previously in the group who is no longer
--    selected.
--  - Runs the <2-members cleanup pass once, at the end.
-- ============================================================
CREATE OR REPLACE FUNCTION set_product_variant_group(
  p_product_id UUID,
  p_variant_ids UUID[]
) RETURNS UUID AS $$
DECLARE
  v_group_id UUID;
  v_all_ids  UUID[];
BEGIN
  IF p_product_id = ANY(p_variant_ids) THEN
    RAISE EXCEPTION 'A product cannot be linked to itself';
  END IF;

  v_all_ids := ARRAY(SELECT DISTINCT unnest(array_append(p_variant_ids, p_product_id)));

  -- Reuse the current product's existing group if it has one...
  SELECT variant_group_id INTO v_group_id
  FROM product_variant_items WHERE product_id = p_product_id;

  -- ...otherwise reuse a group already held by one of the selected variants...
  IF v_group_id IS NULL THEN
    SELECT variant_group_id INTO v_group_id
    FROM product_variant_items
    WHERE product_id = ANY(p_variant_ids)
    LIMIT 1;
  END IF;

  -- ...otherwise create a brand new group.
  IF v_group_id IS NULL THEN
    INSERT INTO product_variant_groups DEFAULT VALUES RETURNING id INTO v_group_id;
  END IF;

  -- Suspend the per-row cleanup trigger for the duration of this function so
  -- intermediate states (a group briefly below 2 members while we move rows
  -- around) never get prematurely deleted before the final INSERT lands.
  ALTER TABLE product_variant_items DISABLE TRIGGER trigger_cleanup_orphan_variant_group;

  -- Detach any selected member that currently belongs to a DIFFERENT group.
  DELETE FROM product_variant_items
  WHERE product_id = ANY(v_all_ids) AND variant_group_id <> v_group_id;

  -- Remove anyone currently in this group who is no longer selected.
  DELETE FROM product_variant_items
  WHERE variant_group_id = v_group_id AND NOT (product_id = ANY(v_all_ids));

  -- Add/keep every selected member pointing at the target group.
  INSERT INTO product_variant_items (variant_group_id, product_id)
  SELECT v_group_id, x FROM unnest(v_all_ids) AS x
  ON CONFLICT (product_id) DO UPDATE SET variant_group_id = EXCLUDED.variant_group_id;

  ALTER TABLE product_variant_items ENABLE TRIGGER trigger_cleanup_orphan_variant_group;

  -- Final cleanup pass: remove this (or any other) group left with < 2 members,
  -- e.g. a group a variant just got moved away from.
  DELETE FROM product_variant_groups g
  WHERE (SELECT COUNT(*) FROM product_variant_items WHERE variant_group_id = g.id) < 2;

  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql;