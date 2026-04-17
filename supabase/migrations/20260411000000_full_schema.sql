-- ============================================================
-- CJ Water Management - Full Database Schema
-- Run this once in the Supabase SQL Editor to set up everything.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================

-- 0. Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enums (wrapped in DO blocks so they don't error if they already exist)
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('owner', 'admin', 'in_shop_staff', 'delivery_staff'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('pending', 'processing', 'out_for_delivery', 'delivered', 'completed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('unpaid', 'partial', 'paid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('cash', 'gcash', 'bank_transfer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE delivery_status AS ENUM ('assigned', 'picked_up', 'en_route', 'arrived', 'delivered', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE batch_status AS ENUM ('raw_water_in', 'filtering', 'purifying', 'filling', 'quality_check', 'ready', 'dispatched'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE inventory_category AS ENUM ('consumable', 'container', 'packaging', 'equipment'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE transaction_type AS ENUM ('restock', 'consumed', 'damaged', 'adjustment'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Tables
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'in_shop_staff',
  phone TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  advance_pay_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_delivery_staff UUID REFERENCES users(id),
  order_status order_status NOT NULL DEFAULT 'pending',
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  payment_method payment_method NOT NULL DEFAULT 'cash',
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  delivery_address TEXT NOT NULL DEFAULT '',
  delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES users(id),
  old_status TEXT NOT NULL DEFAULT '',
  new_status TEXT NOT NULL,
  note TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);

CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id),
  assigned_to UUID NOT NULL REFERENCES users(id),
  status delivery_status NOT NULL DEFAULT 'assigned',
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  delivery_photo_url TEXT,
  failure_reason TEXT,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_assigned_to ON deliveries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(order_id);

CREATE TABLE IF NOT EXISTS production_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL UNIQUE,
  started_by UUID NOT NULL REFERENCES users(id),
  status batch_status NOT NULL DEFAULT 'raw_water_in',
  linked_orders UUID[] NOT NULL DEFAULT '{}',
  water_volume_liters NUMERIC NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_batches_status ON production_batches(status);

CREATE TABLE IF NOT EXISTS process_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES users(id),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result TEXT
);
CREATE INDEX IF NOT EXISTS idx_process_steps_batch ON process_steps(batch_id);

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category inventory_category NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  reorder_threshold INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS inventory_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL UNIQUE REFERENCES inventory_items(id),
  current_quantity NUMERIC NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_item ON inventory_stock(item_id);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  transaction_type transaction_type NOT NULL,
  quantity_change NUMERIC NOT NULL,
  reference_id UUID,
  performed_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_item ON inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_created ON inventory_transactions(created_at);

CREATE TABLE IF NOT EXISTS sales_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE
);
CREATE INDEX IF NOT EXISTS idx_sales_records_date ON sales_records(recorded_date);
CREATE INDEX IF NOT EXISTS idx_sales_records_order ON sales_records(order_id);

CREATE TABLE IF NOT EXISTS staff_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  reference_table TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_logs_user ON staff_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_logs_created ON staff_activity_logs(created_at);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('on_duty', 'absent')),
  logged_by UUID NOT NULL REFERENCES users(id),
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  is_admin_override BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_id ON attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_date ON attendance_logs(date);

CREATE TABLE IF NOT EXISTS advance_pay_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES users(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  running_balance NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_advance_pay_user_id ON advance_pay_transactions(user_id);

-- ============================================================
-- 3. Row Level Security
-- ============================================================
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
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_pay_transactions ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop existing policies first (safe if they don't exist)
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- USERS
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_owner_all" ON users FOR ALL USING (get_user_role() = 'owner');
CREATE POLICY "users_admin_update" ON users FOR UPDATE USING (
  get_user_role() = 'admin' AND role != 'owner'
);

-- CUSTOMERS
CREATE POLICY "customers_select" ON customers FOR SELECT USING (true);
CREATE POLICY "customers_insert" ON customers FOR INSERT WITH CHECK (
  get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);
CREATE POLICY "customers_update" ON customers FOR UPDATE USING (
  get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);

-- PRODUCTS
CREATE POLICY "products_select" ON products FOR SELECT USING (true);
CREATE POLICY "products_modify" ON products FOR ALL USING (
  get_user_role() IN ('owner', 'admin')
);

-- ORDERS
CREATE POLICY "orders_select" ON orders FOR SELECT USING (true);
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (
  get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);
CREATE POLICY "orders_update" ON orders FOR UPDATE USING (
  get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);

-- ORDER_ITEMS
CREATE POLICY "order_items_select" ON order_items FOR SELECT USING (true);
CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (
  get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);

-- ORDER_STATUS_HISTORY
CREATE POLICY "order_status_history_select" ON order_status_history FOR SELECT USING (true);
CREATE POLICY "order_status_history_insert" ON order_status_history FOR INSERT WITH CHECK (true);

-- DELIVERIES
CREATE POLICY "deliveries_select" ON deliveries FOR SELECT USING (true);
CREATE POLICY "deliveries_insert" ON deliveries FOR INSERT WITH CHECK (
  get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);
CREATE POLICY "deliveries_update_own" ON deliveries FOR UPDATE USING (
  assigned_to = auth.uid() OR get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);

-- PRODUCTION_BATCHES
CREATE POLICY "batches_select" ON production_batches FOR SELECT USING (true);
CREATE POLICY "batches_modify" ON production_batches FOR ALL USING (
  get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);

-- PROCESS_STEPS
CREATE POLICY "process_steps_select" ON process_steps FOR SELECT USING (true);
CREATE POLICY "process_steps_insert" ON process_steps FOR INSERT WITH CHECK (
  get_user_role() IN ('owner', 'admin', 'in_shop_staff')
);

-- INVENTORY
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

-- SALES_RECORDS
CREATE POLICY "sales_records_select" ON sales_records FOR SELECT USING (
  get_user_role() IN ('owner', 'admin')
);
CREATE POLICY "sales_records_insert" ON sales_records FOR INSERT WITH CHECK (true);

-- STAFF_ACTIVITY_LOGS
CREATE POLICY "staff_logs_select" ON staff_activity_logs FOR SELECT USING (
  get_user_role() IN ('owner', 'admin') OR user_id = auth.uid()
);
CREATE POLICY "staff_logs_insert" ON staff_activity_logs FOR INSERT WITH CHECK (true);

-- ATTENDANCE_LOGS
CREATE POLICY "attendance_admin_all" ON attendance_logs FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "attendance_staff_insert" ON attendance_logs FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND logged_by = auth.uid() AND status = 'on_duty'
  AND date = CURRENT_DATE AND is_admin_override = false
);
CREATE POLICY "attendance_staff_select" ON attendance_logs FOR SELECT TO authenticated USING (
  user_id = auth.uid()
);

-- ADVANCE_PAY_TRANSACTIONS
CREATE POLICY "advance_pay_admin_all" ON advance_pay_transactions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "advance_pay_staff_select" ON advance_pay_transactions FOR SELECT TO authenticated USING (
  user_id = auth.uid()
);

-- ============================================================
-- 4. Triggers
-- ============================================================
CREATE OR REPLACE FUNCTION on_delivery_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    UPDATE orders SET order_status = 'delivered', updated_at = NOW() WHERE id = NEW.order_id;
    INSERT INTO order_status_history (order_id, changed_by, old_status, new_status, note)
    SELECT NEW.order_id, NEW.assigned_to, order_status::text, 'delivered', 'Auto-updated from delivery completion'
    FROM orders WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_delivery_completed ON deliveries;
CREATE TRIGGER trigger_delivery_completed AFTER UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION on_delivery_completed();

CREATE OR REPLACE FUNCTION on_payment_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    INSERT INTO sales_records (order_id, total_amount, amount_paid, payment_method, recorded_date)
    VALUES (NEW.id, NEW.total_amount, NEW.amount_paid, NEW.payment_method::text, CURRENT_DATE)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_payment_completed ON orders;
CREATE TRIGGER trigger_payment_completed AFTER UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION on_payment_completed();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_customers_updated_at ON customers;
CREATE TRIGGER trigger_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION update_advance_pay_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET advance_pay_balance = advance_pay_balance + NEW.amount WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_advance_pay_insert ON advance_pay_transactions;
CREATE TRIGGER on_advance_pay_insert AFTER INSERT ON advance_pay_transactions FOR EACH ROW EXECUTE FUNCTION update_advance_pay_balance();

-- ============================================================
-- 5. RPC Functions (SECURITY DEFINER - bypass RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION delete_order(p_order_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM sales_records WHERE order_id = p_order_id;
  DELETE FROM deliveries WHERE order_id = p_order_id;
  DELETE FROM order_status_history WHERE order_id = p_order_id;
  DELETE FROM order_items WHERE order_id = p_order_id;
  DELETE FROM orders WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION create_staff_profile(
  p_user_id UUID, p_full_name TEXT, p_phone TEXT, p_role user_role, p_is_active BOOLEAN DEFAULT true
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO users (id, full_name, phone, role, is_active, advance_pay_balance)
  VALUES (p_user_id, p_full_name, p_phone, p_role, p_is_active, 0);
END;
$$;

CREATE OR REPLACE FUNCTION delete_staff(p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM advance_pay_transactions WHERE user_id = p_user_id;
  DELETE FROM attendance_logs WHERE user_id = p_user_id;
  DELETE FROM staff_activity_logs WHERE user_id = p_user_id;
  UPDATE orders SET assigned_delivery_staff = NULL WHERE assigned_delivery_staff = p_user_id;
  UPDATE deliveries SET assigned_to = NULL WHERE assigned_to = p_user_id;
  DELETE FROM users WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_staff_profile(
  p_user_id UUID, p_full_name TEXT, p_phone TEXT, p_role user_role, p_is_active BOOLEAN
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE users SET full_name = p_full_name, phone = p_phone, role = p_role, is_active = p_is_active
  WHERE id = p_user_id;
END;
$$;
