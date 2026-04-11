-- Inventory category enum
CREATE TYPE inventory_category AS ENUM ('consumable', 'container', 'packaging', 'equipment');

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category inventory_category NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  reorder_threshold INTEGER NOT NULL DEFAULT 10
);
