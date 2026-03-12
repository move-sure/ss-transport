-- ============================================================
-- extended_ewb_validations
-- Stores each E-Way Bill extension result (with PDF link)
-- ============================================================

CREATE TABLE public.extended_ewb_validations (
  id                            BIGSERIAL                NOT NULL,
  extended_by                   UUID                     NOT NULL,
  challan_no                    CHARACTER VARYING(50)    NULL,
  ewb_number                    CHARACTER VARYING(20)    NOT NULL,
  is_success                    BOOLEAN                  NOT NULL DEFAULT FALSE,
  vehicle_number                CHARACTER VARYING(20)    NULL,
  mode_of_transport             CHARACTER VARYING(5)     NULL,
  transport_mode_label          CHARACTER VARYING(30)    NULL,
  place_of_consignor            CHARACTER VARYING(100)   NULL,
  state_of_consignor            CHARACTER VARYING(100)   NULL,
  remaining_distance            INTEGER                  NULL,
  from_pincode                  CHARACTER VARYING(10)    NULL,
  consignment_status            CHARACTER VARYING(5)     NULL,
  transit_type                  CHARACTER VARYING(5)     NULL,
  extend_validity_reason        CHARACTER VARYING(100)   NULL,
  extend_remarks                CHARACTER VARYING(100)   NULL,
  transporter_document_number   CHARACTER VARYING(100)   NULL,
  transporter_document_date     CHARACTER VARYING(20)    NULL,
  valid_upto                    CHARACTER VARYING(100)   NULL,
  updated_date                  CHARACTER VARYING(100)   NULL,
  pdf_url                       TEXT                     NULL,
  error_message                 TEXT                     NULL,
  raw_result_metadata           JSONB                    NULL,
  extended_at                   TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  created_at                    TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  updated_at                    TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT extended_ewb_validations_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_extended_ewb_validations_ewb_number
  ON public.extended_ewb_validations USING BTREE (ewb_number)
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_extended_ewb_validations_challan_no
  ON public.extended_ewb_validations USING BTREE (challan_no)
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_extended_ewb_validations_extended_by
  ON public.extended_ewb_validations USING BTREE (extended_by)
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_extended_ewb_validations_extended_at
  ON public.extended_ewb_validations USING BTREE (extended_at DESC)
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_extended_ewb_validations_is_success
  ON public.extended_ewb_validations USING BTREE (is_success)
  TABLESPACE pg_default;

-- Trigger: auto-update updated_at
CREATE TRIGGER update_extended_ewb_validations_updated_at
  BEFORE UPDATE ON extended_ewb_validations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
