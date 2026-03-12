-- ============================================================
-- consolidated_ewb_validations
-- Stores each consolidated E-Way Bill validation result
-- ============================================================

CREATE TABLE public.consolidated_ewb_validations (
  id                      BIGSERIAL                NOT NULL,
  validated_by            UUID                     NOT NULL,
  challan_no              CHARACTER VARYING(50)    NULL,
  consolidated_ewb_number CHARACTER VARYING(20)    NOT NULL,
  total_ewb_count         INTEGER                  NULL DEFAULT 0,
  is_valid                BOOLEAN                  NOT NULL DEFAULT FALSE,
  validation_status       CHARACTER VARYING(50)    NULL,
  error_message           TEXT                     NULL,
  included_ewb_numbers    TEXT[]                   NULL,
  raw_result_metadata     JSONB                    NULL,
  validated_at            TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  created_at              TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT consolidated_ewb_validations_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consolidated_ewb_validations_cewb_number
  ON public.consolidated_ewb_validations USING BTREE (consolidated_ewb_number)
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_consolidated_ewb_validations_challan_no
  ON public.consolidated_ewb_validations USING BTREE (challan_no)
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_consolidated_ewb_validations_validated_by
  ON public.consolidated_ewb_validations USING BTREE (validated_by)
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_consolidated_ewb_validations_validated_at
  ON public.consolidated_ewb_validations USING BTREE (validated_at DESC)
  TABLESPACE pg_default;

-- Trigger: auto-update updated_at
CREATE TRIGGER update_consolidated_ewb_validations_updated_at
  BEFORE UPDATE ON consolidated_ewb_validations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
