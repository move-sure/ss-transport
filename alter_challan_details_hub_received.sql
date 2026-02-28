-- Add hub received columns to challan_details table
ALTER TABLE public.challan_details
  ADD COLUMN IF NOT EXISTS is_received_at_hub boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS received_at_hub_timing timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS received_by_user uuid DEFAULT NULL;

-- Add foreign key constraint for received_by_user
ALTER TABLE public.challan_details
  ADD CONSTRAINT challan_details_received_by_user_fkey
  FOREIGN KEY (received_by_user) REFERENCES users (id) ON DELETE SET NULL;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_challan_details_is_received_at_hub
  ON public.challan_details USING btree (is_received_at_hub) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_challan_details_received_by_user
  ON public.challan_details USING btree (received_by_user) TABLESPACE pg_default;
