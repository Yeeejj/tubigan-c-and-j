-- Transaction type enum
CREATE TYPE transaction_type AS ENUM ('restock', 'consumed', 'damaged', 'adjustment');

CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  transaction_type transaction_type NOT NULL,
  quantity_change NUMERIC NOT NULL,
  reference_id UUID,
  performed_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_tx_item ON inventory_transactions(item_id);
CREATE INDEX idx_inventory_tx_created ON inventory_transactions(created_at);
