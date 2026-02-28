-- ============================================
-- Table 1: search_tracking_master
-- One unique GR No entry. Tracks complaint status.
-- ============================================

CREATE TABLE IF NOT EXISTS public.search_tracking_master (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  gr_no VARCHAR(50) NOT NULL,
  source_type VARCHAR(10) NOT NULL DEFAULT 'REG',
  first_searched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_searched_by UUID NULL,
  last_searched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_searched_by UUID NULL,
  search_count INT NOT NULL DEFAULT 1,
  -- Complaint fields
  is_complaint BOOLEAN NOT NULL DEFAULT false,
  complaint_registered_at TIMESTAMPTZ NULL,
  complaint_registered_by UUID NULL,
  complaint_remark TEXT NULL,
  in_investigation BOOLEAN NOT NULL DEFAULT false,
  investigation_started_at TIMESTAMPTZ NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ NULL,
  resolved_by UUID NULL,
  resolution_remark TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT search_tracking_master_pkey PRIMARY KEY (id),
  CONSTRAINT search_tracking_master_gr_no_unique UNIQUE (gr_no)
);

CREATE INDEX IF NOT EXISTS idx_stm_gr_no ON public.search_tracking_master(gr_no);
CREATE INDEX IF NOT EXISTS idx_stm_first_searched_by ON public.search_tracking_master(first_searched_by);
CREATE INDEX IF NOT EXISTS idx_stm_is_complaint ON public.search_tracking_master(is_complaint);
CREATE INDEX IF NOT EXISTS idx_stm_last_searched_at ON public.search_tracking_master(last_searched_at);

CREATE TRIGGER update_search_tracking_master_updated_at
  BEFORE UPDATE ON search_tracking_master
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Table 2: search_tracking_log
-- N entries per GR No. Every search is logged.
-- ============================================

CREATE TABLE IF NOT EXISTS public.search_tracking_log (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  gr_no VARCHAR(50) NOT NULL,
  searched_by UUID NULL,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_type VARCHAR(10) NULL DEFAULT 'REG',
  CONSTRAINT search_tracking_log_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_stl_gr_no ON public.search_tracking_log(gr_no);
CREATE INDEX IF NOT EXISTS idx_stl_searched_by ON public.search_tracking_log(searched_by);
CREATE INDEX IF NOT EXISTS idx_stl_searched_at ON public.search_tracking_log(searched_at);

-- ============================================
-- Function: upsert_search_tracking
-- Called when user selects a bilty.
-- Upserts master (unique gr_no), always inserts log.
-- Returns: the master record + whether it was already searched.
-- ============================================

CREATE OR REPLACE FUNCTION upsert_search_tracking(
  p_gr_no TEXT,
  p_user_id UUID,
  p_source_type TEXT DEFAULT 'REG'
)
RETURNS TABLE (
  id UUID,
  gr_no TEXT,
  source_type TEXT,
  first_searched_at TIMESTAMPTZ,
  first_searched_by UUID,
  last_searched_at TIMESTAMPTZ,
  last_searched_by UUID,
  search_count INT,
  is_complaint BOOLEAN,
  complaint_registered_at TIMESTAMPTZ,
  complaint_registered_by UUID,
  complaint_remark TEXT,
  in_investigation BOOLEAN,
  investigation_started_at TIMESTAMPTZ,
  is_resolved BOOLEAN,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_remark TEXT,
  was_previously_searched BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_id UUID;
  v_was_prev BOOLEAN := false;
BEGIN
  -- Check if master record exists
  SELECT m.id INTO v_existing_id
  FROM search_tracking_master m
  WHERE m.gr_no = p_gr_no;

  IF v_existing_id IS NOT NULL THEN
    -- Already exists: update search count & last searched
    v_was_prev := true;
    UPDATE search_tracking_master m
    SET search_count = m.search_count + 1,
        last_searched_at = CURRENT_TIMESTAMP,
        last_searched_by = p_user_id
    WHERE m.id = v_existing_id;
  ELSE
    -- First time: insert
    INSERT INTO search_tracking_master (gr_no, source_type, first_searched_by, last_searched_by)
    VALUES (p_gr_no, p_source_type, p_user_id, p_user_id)
    RETURNING search_tracking_master.id INTO v_existing_id;
  END IF;

  -- Always insert search log
  INSERT INTO search_tracking_log (gr_no, searched_by, source_type)
  VALUES (p_gr_no, p_user_id, p_source_type);

  -- Return the master record with was_previously_searched flag
  RETURN QUERY
  SELECT
    m.id,
    m.gr_no::TEXT,
    m.source_type::TEXT,
    m.first_searched_at,
    m.first_searched_by,
    m.last_searched_at,
    m.last_searched_by,
    m.search_count,
    m.is_complaint,
    m.complaint_registered_at,
    m.complaint_registered_by,
    m.complaint_remark,
    m.in_investigation,
    m.investigation_started_at,
    m.is_resolved,
    m.resolved_at,
    m.resolved_by,
    m.resolution_remark,
    v_was_prev AS was_previously_searched
  FROM search_tracking_master m
  WHERE m.id = v_existing_id;
END;
$$;
