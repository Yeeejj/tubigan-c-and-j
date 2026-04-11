-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==========================================
-- USERS table policies
-- ==========================================
-- Everyone can read users (for display names, etc.)
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
-- Owner can do everything
CREATE POLICY "users_owner_all" ON users FOR ALL USING (get_user_role() = 'owner');
-- Admin can update non-owner users
CREATE POLICY "users_admin_update" ON users FOR UPDATE USING (
  get_user_role() = 'admin' AND role != 'owner'
);

-- ==========================================
-- CUSTOMERS table policies
-- ==========================================
CREATE POLICY "customers_select" ON customers FOR SELECT USING (true);
CREATE POLICY "customers_insert" ON customers FOR INSERT WITH CHECK (
  get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);
CREATE POLICY "customers_update" ON customers FOR UPDATE USING (
  get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);

-- ==========================================
-- PRODUCTS table policies
-- ==========================================
CREATE POLICY "products_select" ON products FOR SELECT USING (true);
CREATE POLICY "products_modify" ON products FOR ALL USING (
  get_user_role() IN ('owner', 'admin')
);

-- ==========================================
-- ORDERS table policies
-- ==========================================
CREATE POLICY "orders_select" ON orders FOR SELECT USING (true);
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (
  get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);
CREATE POLICY "orders_update" ON orders FOR UPDATE USING (
  get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);
-- Delivery staff can only see their assigned orders (handled at query level, not RLS for simplicity)

-- ==========================================
-- ORDER_ITEMS table policies
-- ==========================================
CREATE POLICY "order_items_select" ON order_items FOR SELECT USING (true);
CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (
  get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);

-- ==========================================
-- ORDER_STATUS_HISTORY table policies
-- ==========================================
CREATE POLICY "order_status_history_select" ON order_status_history FOR SELECT USING (true);
CREATE POLICY "order_status_history_insert" ON order_status_history FOR INSERT WITH CHECK (true);

-- ==========================================
-- DELIVERIES table policies
-- ==========================================
CREATE POLICY "deliveries_select" ON deliveries FOR SELECT USING (true);
CREATE POLICY "deliveries_insert" ON deliveries FOR INSERT WITH CHECK (
  get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);
-- Delivery staff can update only their own deliveries
CREATE POLICY "deliveries_update_own" ON deliveries FOR UPDATE USING (
  assigned_to = auth.uid() OR get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);

-- ==========================================
-- PRODUCTION_BATCHES table policies
-- ==========================================
CREATE POLICY "batches_select" ON production_batches FOR SELECT USING (true);
CREATE POLICY "batches_modify" ON production_batches FOR ALL USING (
  get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);

-- ==========================================
-- PROCESS_STEPS table policies
-- ==========================================
CREATE POLICY "process_steps_select" ON process_steps FOR SELECT USING (true);
CREATE POLICY "process_steps_insert" ON process_steps FOR INSERT WITH CHECK (
  get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);

-- ==========================================
-- INVENTORY tables policies
-- ==========================================
CREATE POLICY "inventory_items_select" ON inventory_items FOR SELECT USING (true);
CREATE POLICY "inventory_items_modify" ON inventory_items FOR ALL USING (
  get_user_role() IN ('owner', 'admin')
);

CREATE POLICY "inventory_stock_select" ON inventory_stock FOR SELECT USING (true);
CREATE POLICY "inventory_stock_modify" ON inventory_stock FOR ALL USING (
  get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);

CREATE POLICY "inventory_tx_select" ON inventory_transactions FOR SELECT USING (true);
CREATE POLICY "inventory_tx_insert" ON inventory_transactions FOR INSERT WITH CHECK (
  get_user_role() IN ('owner', 'admin', 'in_shop_staff', 'delivery_staff')
);

-- ==========================================
-- SALES_RECORDS table policies
-- ==========================================
CREATE POLICY "sales_records_select" ON sales_records FOR SELECT USING (
  get_user_role() IN ('owner', 'admin')
);
CREATE POLICY "sales_records_insert" ON sales_records FOR INSERT WITH CHECK (true);

-- ==========================================
-- STAFF_ACTIVITY_LOGS table policies
-- ==========================================
CREATE POLICY "staff_logs_select" ON staff_activity_logs FOR SELECT USING (
  get_user_role() IN ('owner', 'admin') OR user_id = auth.uid()
);
CREATE POLICY "staff_logs_insert" ON staff_activity_logs FOR INSERT WITH CHECK (true);
