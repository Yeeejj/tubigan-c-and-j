-- Delivery status enum
CREATE TYPE delivery_status AS ENUM ('assigned', 'picked_up', 'en_route', 'arrived', 'delivered', 'failed');

CREATE TABLE deliveries (
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

CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_assigned_to ON deliveries(assigned_to);
CREATE INDEX idx_deliveries_order ON deliveries(order_id);
