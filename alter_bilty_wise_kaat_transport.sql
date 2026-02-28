-- Add transport_id column to bilty_wise_kaat table
-- This stores the user-chosen transport for each consignment's kaat entry
-- Overrides the original bilty/station transport for display purposes

ALTER TABLE public.bilty_wise_kaat
ADD COLUMN IF NOT EXISTS transport_id uuid NULL;

-- Add foreign key constraint
ALTER TABLE public.bilty_wise_kaat
ADD CONSTRAINT bilty_wise_kaat_transport_id_fkey 
FOREIGN KEY (transport_id) REFERENCES transports(id);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_bilty_wise_kaat_transport_id 
ON public.bilty_wise_kaat USING btree (transport_id) TABLESPACE pg_default;
