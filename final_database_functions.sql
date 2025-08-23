-- FINAL Fixed Database Functions for GR Number Search Optimization
-- Run this script in your PostgreSQL database (Supabase SQL Editor)

-- 1. Drop existing functions first
DROP FUNCTION IF EXISTS get_gr_search_results_with_challan_dates(TEXT, UUID, DATE, INTEGER);
DROP FUNCTION IF EXISTS search_bilties_by_gr_number(TEXT, UUID, DATE, INTEGER);

-- 2. Create the main search function with corrected data types
CREATE OR REPLACE FUNCTION search_bilties_by_gr_number(
  p_gr_number TEXT,
  p_branch_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 500
)
RETURNS TABLE (
  bilty_id UUID,
  bilty_type TEXT,
  gr_no CHARACTER VARYING,
  bilty_date DATE,
  consignor_name CHARACTER VARYING,
  consignee_name CHARACTER VARYING,
  pvt_marks TEXT,
  content_field TEXT,
  to_city_id UUID,
  payment_mode CHARACTER VARYING,
  total NUMERIC,
  amount NUMERIC,
  created_at TIMESTAMPTZ,
  staff_id UUID,
  e_way_bill CHARACTER VARYING,
  invoice_no CHARACTER VARYING,
  saving_option CHARACTER VARYING,
  no_of_pkg INTEGER,
  wt NUMERIC,
  rate NUMERIC,
  transport_name CHARACTER VARYING,
  station CHARACTER VARYING,
  consignor CHARACTER VARYING,
  consignee CHARACTER VARYING,
  payment_status CHARACTER VARYING,
  no_of_packets INTEGER,
  weight NUMERIC,
  is_active BOOLEAN,
  branch_id UUID
) AS $$
BEGIN
  -- Set default date if not provided (1 year ago)
  IF p_date_from IS NULL THEN
    p_date_from := CURRENT_DATE - INTERVAL '1 year';
  END IF;

  RETURN QUERY
  -- Regular bilties
  SELECT 
    b.id as bilty_id,
    'regular'::TEXT as bilty_type,
    b.gr_no,
    b.bilty_date,
    b.consignor_name,
    b.consignee_name,
    COALESCE(b.pvt_marks, '') as pvt_marks, -- Private marks field
    COALESCE(b.contain, '') as content_field, -- Content field separately
    b.to_city_id,
    b.payment_mode,
    b.total,
    NULL::NUMERIC as amount,
    b.created_at,
    b.staff_id,
    b.e_way_bill,
    b.invoice_no,
    b.saving_option,
    b.no_of_pkg,
    b.wt,
    b.rate,
    b.transport_name,
    NULL::CHARACTER VARYING as station,
    NULL::CHARACTER VARYING as consignor,
    NULL::CHARACTER VARYING as consignee,
    NULL::CHARACTER VARYING as payment_status,
    NULL::INTEGER as no_of_packets,
    NULL::NUMERIC as weight,
    b.is_active,
    b.branch_id
  FROM bilty b
  WHERE 
    (p_branch_id IS NULL OR b.branch_id = p_branch_id)
    AND b.is_active = true
    AND (b.deleted_at IS NULL)  -- Only active records
    AND (p_date_from IS NULL OR b.bilty_date >= p_date_from)
    AND LOWER(b.gr_no) LIKE '%' || LOWER(p_gr_number) || '%'
  
  UNION ALL
  
  -- Station bilties
  SELECT 
    s.id as bilty_id,
    'station'::TEXT as bilty_type,
    s.gr_no,
    NULL::DATE as bilty_date,
    s.consignor as consignor_name,
    s.consignee as consignee_name,
    COALESCE(s.pvt_marks, '') as pvt_marks, -- Private marks field separately
    COALESCE(s.contents, '') as content_field, -- Contents field separately
    NULL::UUID as to_city_id,
    NULL::CHARACTER VARYING as payment_mode,
    NULL::NUMERIC as total,
    s.amount,
    s.created_at,
    s.staff_id,
    s.e_way_bill,
    NULL::CHARACTER VARYING as invoice_no,
    NULL::CHARACTER VARYING as saving_option,
    NULL::INTEGER as no_of_pkg,
    s.weight as wt,
    NULL::NUMERIC as rate,
    NULL::CHARACTER VARYING as transport_name,
    s.station,
    s.consignor,
    s.consignee,
    s.payment_status,
    s.no_of_packets,
    s.weight,
    NULL::BOOLEAN as is_active,
    s.branch_id
  FROM station_bilty_summary s
  WHERE 
    -- Station bilties are visible across all branches for search
    (p_date_from IS NULL OR s.created_at::DATE >= p_date_from)
    AND LOWER(COALESCE(s.gr_no, '')) LIKE '%' || LOWER(p_gr_number) || '%'
  
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the helper function that includes challan dispatch dates (FIXED dispatch_date type)
CREATE OR REPLACE FUNCTION get_gr_search_results_with_challan_dates(
  p_gr_number TEXT,
  p_branch_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 500
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  gr_no CHARACTER VARYING,
  bilty_date DATE,
  consignor_name CHARACTER VARYING,
  consignee_name CHARACTER VARYING,
  pvt_marks TEXT,
  content_field TEXT,
  to_city_id UUID,
  payment_mode CHARACTER VARYING,
  total NUMERIC,
  amount NUMERIC,
  created_at TIMESTAMPTZ,
  staff_id UUID,
  e_way_bill CHARACTER VARYING,
  invoice_no CHARACTER VARYING,
  saving_option CHARACTER VARYING,
  no_of_pkg INTEGER,
  wt NUMERIC,
  rate NUMERIC,
  transport_name CHARACTER VARYING,
  station CHARACTER VARYING,
  consignor CHARACTER VARYING,
  consignee CHARACTER VARYING,
  payment_status CHARACTER VARYING,
  no_of_packets INTEGER,
  weight NUMERIC,
  is_active BOOLEAN,
  challan_no CHARACTER VARYING,
  dispatch_date TIMESTAMPTZ,
  is_dispatched BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.bilty_id as id,
    b.bilty_type as type,
    b.gr_no,
    b.bilty_date,
    b.consignor_name,
    b.consignee_name,
    b.pvt_marks,
    b.content_field,
    b.to_city_id,
    b.payment_mode,
    b.total,
    b.amount,
    b.created_at,
    b.staff_id,
    b.e_way_bill,
    b.invoice_no,
    b.saving_option,
    b.no_of_pkg,
    b.wt,
    b.rate,
    b.transport_name,
    b.station,
    b.consignor,
    b.consignee,
    b.payment_status,
    b.no_of_packets,
    b.weight,
    b.is_active,
    COALESCE(td.challan_no::CHARACTER VARYING, ''::CHARACTER VARYING) as challan_no,
    cd.dispatch_date,
    COALESCE(cd.is_dispatched, false) as is_dispatched
  FROM search_bilties_by_gr_number(p_gr_number, p_branch_id, p_date_from, p_limit) b
  LEFT JOIN transit_details td ON td.gr_no = b.gr_no
  LEFT JOIN challan_details cd ON cd.challan_no = td.challan_no AND cd.is_active = true
  ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_bilty_gr_no_lower ON bilty (LOWER(gr_no));
CREATE INDEX IF NOT EXISTS idx_station_bilty_gr_no_lower ON station_bilty_summary (LOWER(COALESCE(gr_no, '')));
CREATE INDEX IF NOT EXISTS idx_bilty_branch_date_gr ON bilty (branch_id, bilty_date, LOWER(gr_no));
CREATE INDEX IF NOT EXISTS idx_station_bilty_date_gr ON station_bilty_summary (created_at, LOWER(COALESCE(gr_no, '')));

-- Additional useful indexes for join operations
CREATE INDEX IF NOT EXISTS idx_transit_details_gr_no ON transit_details (gr_no);
CREATE INDEX IF NOT EXISTS idx_challan_details_challan_no ON challan_details (challan_no);

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION search_bilties_by_gr_number TO authenticated;
GRANT EXECUTE ON FUNCTION get_gr_search_results_with_challan_dates TO authenticated;

-- 6. Test the functions
-- Test basic function:
-- SELECT * FROM search_bilties_by_gr_number('test', null, null, 5);

-- Test function with challan dates:
-- SELECT * FROM get_gr_search_results_with_challan_dates('test', null, null, 5);

-- Test with actual GR number (replace 'YOUR_GR' with real GR number):
-- SELECT * FROM get_gr_search_results_with_challan_dates('YOUR_GR', null, null, 10);

-- Test challan details accuracy (check if bilties show correct dispatch status):
-- SELECT 
--   b.gr_no,
--   b.type,
--   b.challan_no,
--   b.is_dispatched,
--   b.dispatch_date,
--   cd.is_dispatched as actual_dispatch_status,
--   cd.dispatch_date as actual_dispatch_date
-- FROM get_gr_search_results_with_challan_dates('A', null, null, 20) b
-- LEFT JOIN challan_details cd ON cd.challan_no = b.challan_no
-- WHERE b.challan_no IS NOT NULL AND b.challan_no != ''
-- ORDER BY b.challan_no;
