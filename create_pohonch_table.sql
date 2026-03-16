-- ============================================
-- POHONCH TABLE — stores saved pohonch records
-- ============================================

CREATE TABLE public.pohonch (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  pohonch_number VARCHAR(20) NOT NULL,          -- e.g. JMS0001, auto-generated from transport name initials
  transport_name VARCHAR(255) NOT NULL,
  transport_gstin VARCHAR(20) NULL,
  admin_transport_id UUID NULL DEFAULT NULL,     -- optional link to admin transports table
  
  -- Challan metadata — JSON array of challan numbers included
  challan_metadata JSONB NOT NULL DEFAULT '[]'::jsonb,   -- e.g. ["0219", "0220"]
  
  -- Bilty metadata — JSON array of GR nos and details
  bilty_metadata JSONB NOT NULL DEFAULT '[]'::jsonb,     -- e.g. [{"gr_no":"21509","challan_no":"0219","amount":1275,"kaat":140,"pf":1135}, ...]
  
  total_bilties INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_kaat NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_pf NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_dd NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_packages NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_weight NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Signing
  is_signed BOOLEAN NOT NULL DEFAULT FALSE,
  signed_at TIMESTAMP WITH TIME ZONE NULL,
  signed_by UUID NULL,
  
  -- Audit
  created_by UUID NOT NULL,
  updated_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  CONSTRAINT pohonch_pkey PRIMARY KEY (id),
  CONSTRAINT pohonch_number_unique UNIQUE (pohonch_number),
  CONSTRAINT pohonch_created_by_fkey FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT pohonch_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT pohonch_signed_by_fkey FOREIGN KEY (signed_by) REFERENCES users (id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pohonch_number ON public.pohonch USING btree (pohonch_number) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_pohonch_transport_name ON public.pohonch USING btree (transport_name) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_pohonch_transport_gstin ON public.pohonch USING btree (transport_gstin) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_pohonch_is_signed ON public.pohonch USING btree (is_signed) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_pohonch_created_at ON public.pohonch USING btree (created_at DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_pohonch_created_by ON public.pohonch USING btree (created_by) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_pohonch_is_active ON public.pohonch USING btree (is_active) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_pohonch_challan_metadata ON public.pohonch USING gin (challan_metadata) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_pohonch_bilty_metadata ON public.pohonch USING gin (bilty_metadata) TABLESPACE pg_default;

-- Auto-update updated_at trigger
CREATE TRIGGER update_pohonch_updated_at
  BEFORE UPDATE ON pohonch
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
