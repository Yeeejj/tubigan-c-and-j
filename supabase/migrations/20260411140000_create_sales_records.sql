CREATE TABLE sales_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX idx_sales_records_date ON sales_records(recorded_date);
CREATE INDEX idx_sales_records_order ON sales_records(order_id);
