-- POD (Proof of Delivery) details table

-- Sequence for pod_no (KNP00001, KNP00002, ...)
CREATE SEQUENCE pod_no_seq START 1;

CREATE TABLE pod_details (
  id BIGSERIAL PRIMARY KEY,
  pod_no TEXT NOT NULL DEFAULT 'KNP' || LPAD(nextval('pod_no_seq')::TEXT, 5, '0'),
  gr_no TEXT NOT NULL,
  challan_no TEXT,
  payment_mode TEXT CHECK (payment_mode IN ('PAID', 'TO-PAY', 'PAID/DD', 'TO-PAY/DD')),
  delivered_at TIMESTAMPTZ,
  mobile_number_1 TEXT,
  mobile_number_2 TEXT,
  total_amount NUMERIC(12,2) DEFAULT 0,
  amount_given NUMERIC(12,2) DEFAULT 0,
  reminder TEXT,
  consignor_name TEXT,
  consignor_gst TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast GR lookup
CREATE INDEX idx_pod_details_gr_no ON pod_details(gr_no);
CREATE UNIQUE INDEX idx_pod_details_pod_no ON pod_details(pod_no);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_pod_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pod_updated_at
  BEFORE UPDATE ON pod_details
  FOR EACH ROW EXECUTE FUNCTION update_pod_updated_at();
