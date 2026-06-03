-- ============================================================
-- Truck Trips Migration
-- Run once in Supabase SQL editor
-- ============================================================

-- 1. Create truck_trips table
CREATE TABLE IF NOT EXISTS truck_trips (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_no          varchar NOT NULL UNIQUE,
  truck_id         uuid REFERENCES trucks(id),
  driver_id        uuid REFERENCES staff(id),
  owner_id         uuid REFERENCES staff(id),
  branch_id        uuid REFERENCES branches(id),
  remarks          text,
  dispatch_date    timestamptz,
  received_date    timestamptz,
  status           varchar NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'dispatched', 'received')),
  total_challan_count int NOT NULL DEFAULT 0,
  created_by       uuid,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  is_active        boolean DEFAULT true
);

-- 2. Add truck_trip_id FK to challan_details (nullable, backward-compatible)
ALTER TABLE challan_details
  ADD COLUMN IF NOT EXISTS truck_trip_id uuid REFERENCES truck_trips(id);

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_truck_trips_status     ON truck_trips(status);
CREATE INDEX IF NOT EXISTS idx_truck_trips_truck_id   ON truck_trips(truck_id);
CREATE INDEX IF NOT EXISTS idx_truck_trips_is_active  ON truck_trips(is_active);
CREATE INDEX IF NOT EXISTS idx_challan_trip_id        ON challan_details(truck_trip_id);
