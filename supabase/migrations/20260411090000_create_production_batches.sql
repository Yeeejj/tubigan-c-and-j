-- Batch status enum
CREATE TYPE batch_status AS ENUM ('raw_water_in', 'filtering', 'purifying', 'filling', 'quality_check', 'ready', 'dispatched');

CREATE TABLE production_batches (
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

CREATE INDEX idx_batches_status ON production_batches(status);
