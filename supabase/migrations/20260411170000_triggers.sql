-- Trigger: Auto-update order status when delivery is completed
CREATE OR REPLACE FUNCTION on_delivery_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    UPDATE orders
    SET order_status = 'delivered', updated_at = NOW()
    WHERE id = NEW.order_id;

    -- Log to status history
    INSERT INTO order_status_history (order_id, changed_by, old_status, new_status, note)
    SELECT NEW.order_id, NEW.assigned_to, order_status::text, 'delivered', 'Auto-updated from delivery completion'
    FROM orders WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_delivery_completed
  AFTER UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION on_delivery_completed();

-- Trigger: Record sale when order payment is completed
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

CREATE TRIGGER trigger_payment_completed
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION on_payment_completed();

-- Trigger: Auto-update updated_at on customers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
