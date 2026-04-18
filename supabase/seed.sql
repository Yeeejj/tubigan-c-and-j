-- Default Products (safe to re-run)
INSERT INTO products (name, unit_price, is_active) VALUES
  ('Round Gallon', 25.00, true),
  ('Slim Gallon', 30.00, true),
  ('Container (5L)', 15.00, true),
  ('Container (10L)', 25.00, true),
  ('Container (20L)', 40.00, true)
ON CONFLICT DO NOTHING;

-- Default Inventory Items (safe to re-run)
INSERT INTO inventory_items (name, category, unit, reorder_threshold) VALUES
  ('Salt', 'consumable', 'kg', 10),
  ('Water Jug (Round)', 'container', 'pcs', 20),
  ('Water Jug (Slim)', 'container', 'pcs', 20),
  ('Plastic Seal (Round)', 'packaging', 'pcs', 50),
  ('Plastic Seal (Slim)', 'packaging', 'pcs', 50),
  ('Empty Containers (Returned)', 'container', 'pcs', 0),
  ('Filter Cartridge', 'equipment', 'pcs', 2),
  ('UV Lamp', 'equipment', 'pcs', 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- DEFAULT ADMIN ACCOUNT
-- ============================================
-- Username: Admin
-- Password: aryagel123
--
-- To create this account in Supabase:
-- 1. Go to Supabase Dashboard > Authentication > Users > Add User
-- 2. Email: admin@cjwater.local
-- 3. Password: aryagel123
-- 4. Check "Auto Confirm User"
--
-- The app maps username "Admin" to email "admin@cjwater.local" internally.
-- All usernames follow the pattern: username@cjwater.local
INSERT INTO users (id, full_name, role, phone, is_active)
VALUES ('f765388b-59bd-417a-ab72-4ab4ae525fe5', 'Admin', 'owner', '', true)
ON CONFLICT (id) DO NOTHING;
