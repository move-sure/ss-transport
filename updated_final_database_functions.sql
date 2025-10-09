-- UPDATED FINAL Database Functions for Complete Search Optimization with Challan Details
-- This version supports ALL search filters (not just GR number) and includes challan details
-- Run this script in your PostgreSQL database (Supabase SQL Editor)

-- 1. Drop existing functions first
DROP FUNCTION IF EXISTS get_gr_search_results_with_challan_dates(TEXT, UUID, DATE, INTEGER);
DROP FUNCTION IF EXISTS search_bilties_by_gr_number(TEXT, UUID, DATE, INTEGER);
DROP FUNCTION IF EXISTS search_bilties_with_filters(UUID, DATE, DATE, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER);
DROP FUNCTION IF EXISTS search_bilties_with_filters(UUID, DATE, DATE, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_complete_search_results_with_challan(UUID, DATE, DATE, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_complete_search_results_with_challan(UUID, DATE, DATE, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, INTEGER);

-- 2. Create the main comprehensive search function
CREATE OR REPLACE FUNCTION search_bilties_with_filters(
  p_branch_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_gr_number TEXT DEFAULT NULL,
  p_consignor_name TEXT DEFAULT NULL,
  p_consignee_name TEXT DEFAULT NULL,
  p_to_city_id UUID DEFAULT NULL,
  p_payment_mode TEXT DEFAULT NULL,
  p_has_eway_bill TEXT DEFAULT NULL,
  p_saving_option TEXT DEFAULT NULL,
  p_min_amount NUMERIC DEFAULT NULL,
  p_max_amount NUMERIC DEFAULT NULL,
  p_pvt_marks TEXT DEFAULT NULL,
  p_city_code TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 1000
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
  -- Set default dates if not provided
  IF p_date_from IS NULL THEN
    p_date_from := CURRENT_DATE - INTERVAL '1 year';
  END IF;
  
  IF p_date_to IS NULL THEN
    p_date_to := CURRENT_DATE + INTERVAL '1 day';
  END IF;

  RETURN QUERY
  -- Regular bilties with comprehensive filtering (no city name search)
  SELECT 
    b.id as bilty_id,
    'regular'::TEXT as bilty_type,
    b.gr_no,
    b.bilty_date,
    b.consignor_name,
    b.consignee_name,
    COALESCE(b.pvt_marks, '') as pvt_marks,
    COALESCE(b.contain, '') as content_field,
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
    -- Active records only
    b.is_active = true
    AND (b.deleted_at IS NULL)
    -- Date range filter
    AND (p_date_from IS NULL OR b.bilty_date >= p_date_from)
    AND (p_date_to IS NULL OR b.bilty_date <= p_date_to)
    -- GR Number filter
    AND (p_gr_number IS NULL OR p_gr_number = '' OR LOWER(b.gr_no) LIKE '%' || LOWER(p_gr_number) || '%')
    -- Consignor filter
    AND (p_consignor_name IS NULL OR p_consignor_name = '' OR LOWER(b.consignor_name) LIKE '%' || LOWER(p_consignor_name) || '%')
    -- Consignee filter
    AND (p_consignee_name IS NULL OR p_consignee_name = '' OR LOWER(b.consignee_name) LIKE '%' || LOWER(p_consignee_name) || '%')
    -- City filter (only by ID)
    AND (p_to_city_id IS NULL OR b.to_city_id = p_to_city_id)
    -- Payment mode filter
    AND (p_payment_mode IS NULL OR p_payment_mode = '' OR b.payment_mode = p_payment_mode)
    -- E-way bill filter
    AND (p_has_eway_bill IS NULL OR p_has_eway_bill = '' OR 
         (p_has_eway_bill = 'yes' AND b.e_way_bill IS NOT NULL AND b.e_way_bill != '') OR
         (p_has_eway_bill = 'no' AND (b.e_way_bill IS NULL OR b.e_way_bill = '')))
    -- Saving option filter
    AND (p_saving_option IS NULL OR p_saving_option = '' OR b.saving_option = p_saving_option)
    -- Amount range filter
    AND (p_min_amount IS NULL OR b.total >= p_min_amount)
    AND (p_max_amount IS NULL OR b.total <= p_max_amount)
    -- Private marks filter
    AND (p_pvt_marks IS NULL OR p_pvt_marks = '' OR LOWER(COALESCE(b.pvt_marks, '')) LIKE '%' || LOWER(p_pvt_marks) || '%')
  
  UNION ALL
  
  -- Station bilties with comprehensive filtering and city search by city_code
  SELECT 
    s.id as bilty_id,
    'station'::TEXT as bilty_type,
    s.gr_no,
    NULL::DATE as bilty_date,
    s.consignor as consignor_name,
    s.consignee as consignee_name,
    COALESCE(s.pvt_marks, '') as pvt_marks,
    COALESCE(s.contents, '') as content_field,
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
    -- Date range filter (using created_at for station bilties)
    (p_date_from IS NULL OR s.created_at::DATE >= p_date_from)
    AND (p_date_to IS NULL OR s.created_at::DATE <= p_date_to)
    -- GR Number filter
    AND (p_gr_number IS NULL OR p_gr_number = '' OR LOWER(COALESCE(s.gr_no, '')) LIKE '%' || LOWER(p_gr_number) || '%')
    -- Consignor filter
    AND (p_consignor_name IS NULL OR p_consignor_name = '' OR LOWER(s.consignor) LIKE '%' || LOWER(p_consignor_name) || '%')
    -- Consignee filter
    AND (p_consignee_name IS NULL OR p_consignee_name = '' OR LOWER(s.consignee) LIKE '%' || LOWER(p_consignee_name) || '%')
    -- City filter: search by city_code directly in station field
    AND (p_city_code IS NULL OR p_city_code = '' OR LOWER(s.station) LIKE '%' || LOWER(p_city_code) || '%')
    -- Payment status filter (mapped to payment_mode for station bilties)
    AND (p_payment_mode IS NULL OR p_payment_mode = '' OR s.payment_status = p_payment_mode)
    -- E-way bill filter
    AND (p_has_eway_bill IS NULL OR p_has_eway_bill = '' OR 
         (p_has_eway_bill = 'yes' AND s.e_way_bill IS NOT NULL AND s.e_way_bill != '') OR
         (p_has_eway_bill = 'no' AND (s.e_way_bill IS NULL OR s.e_way_bill = '')))
    -- Amount range filter
    AND (p_min_amount IS NULL OR s.amount >= p_min_amount)
    AND (p_max_amount IS NULL OR s.amount <= p_max_amount)
    -- Private marks filter
    AND (p_pvt_marks IS NULL OR p_pvt_marks = '' OR LOWER(COALESCE(s.pvt_marks, '')) LIKE '%' || LOWER(p_pvt_marks) || '%')
  
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the comprehensive function that includes challan dispatch dates for ALL searches
CREATE OR REPLACE FUNCTION get_complete_search_results_with_challan(
  p_branch_id UUID,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_gr_number TEXT DEFAULT NULL,
  p_consignor_name TEXT DEFAULT NULL,
  p_consignee_name TEXT DEFAULT NULL,
  p_to_city_id UUID DEFAULT NULL,
  p_payment_mode TEXT DEFAULT NULL,
  p_has_eway_bill TEXT DEFAULT NULL,
  p_saving_option TEXT DEFAULT NULL,
  p_min_amount NUMERIC DEFAULT NULL,
  p_max_amount NUMERIC DEFAULT NULL,
  p_pvt_marks TEXT DEFAULT NULL,
  p_city_code TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 1000
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
  is_dispatched BOOLEAN,
  branch_id UUID
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
    COALESCE(cd.is_dispatched, false) as is_dispatched,
    b.branch_id
  FROM search_bilties_with_filters(
    p_branch_id, p_date_from, p_date_to, p_gr_number, p_consignor_name, 
    p_consignee_name, p_to_city_id, p_payment_mode, p_has_eway_bill, 
    p_saving_option, p_min_amount, p_max_amount, p_pvt_marks, p_city_code, p_limit
  ) b
  LEFT JOIN transit_details td ON td.gr_no = b.gr_no
  LEFT JOIN challan_details cd ON cd.challan_no = td.challan_no AND cd.is_active = true
  ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. Keep the original GR-specific functions for backward compatibility
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
  RETURN QUERY
  SELECT * FROM search_bilties_with_filters(
    p_branch_id, p_date_from, NULL, p_gr_number, NULL, NULL, NULL, 
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, p_limit
  );
END;
$$ LANGUAGE plpgsql;

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
    c.id, c.type, c.gr_no, c.bilty_date, c.consignor_name, c.consignee_name,
    c.pvt_marks, c.content_field, c.to_city_id, c.payment_mode, c.total, c.amount,
    c.created_at, c.staff_id, c.e_way_bill, c.invoice_no, c.saving_option,
    c.no_of_pkg, c.wt, c.rate, c.transport_name, c.station, c.consignor,
    c.consignee, c.payment_status, c.no_of_packets, c.weight, c.is_active,
    c.challan_no, c.dispatch_date, c.is_dispatched
  FROM get_complete_search_results_with_challan(
    p_branch_id, p_date_from, NULL, p_gr_number, NULL, NULL, NULL, 
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, p_limit
  ) c;
END;
$$ LANGUAGE plpgsql;

-- 5. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_bilty_gr_no_lower ON bilty (LOWER(gr_no));
CREATE INDEX IF NOT EXISTS idx_station_bilty_gr_no_lower ON station_bilty_summary (LOWER(COALESCE(gr_no, '')));
CREATE INDEX IF NOT EXISTS idx_bilty_branch_date_gr ON bilty (branch_id, bilty_date, LOWER(gr_no));
CREATE INDEX IF NOT EXISTS idx_station_bilty_date_gr ON station_bilty_summary (created_at, LOWER(COALESCE(gr_no, '')));

-- Additional comprehensive indexes for all search scenarios
CREATE INDEX IF NOT EXISTS idx_bilty_consignor_lower ON bilty (LOWER(consignor_name));
CREATE INDEX IF NOT EXISTS idx_bilty_consignee_lower ON bilty (LOWER(consignee_name));
CREATE INDEX IF NOT EXISTS idx_bilty_pvt_marks_lower ON bilty (LOWER(COALESCE(pvt_marks, '')));
CREATE INDEX IF NOT EXISTS idx_bilty_payment_mode ON bilty (payment_mode);
CREATE INDEX IF NOT EXISTS idx_bilty_saving_option ON bilty (saving_option);
CREATE INDEX IF NOT EXISTS idx_bilty_total_amount ON bilty (total);
CREATE INDEX IF NOT EXISTS idx_bilty_to_city_id ON bilty (to_city_id);

CREATE INDEX IF NOT EXISTS idx_station_consignor_lower ON station_bilty_summary (LOWER(consignor));
CREATE INDEX IF NOT EXISTS idx_station_consignee_lower ON station_bilty_summary (LOWER(consignee));
CREATE INDEX IF NOT EXISTS idx_station_pvt_marks_lower ON station_bilty_summary (LOWER(COALESCE(pvt_marks, '')));
CREATE INDEX IF NOT EXISTS idx_station_payment_status ON station_bilty_summary (payment_status);
CREATE INDEX IF NOT EXISTS idx_station_amount ON station_bilty_summary (amount);

-- Indexes for join operations
CREATE INDEX IF NOT EXISTS idx_transit_details_gr_no ON transit_details (gr_no);
CREATE INDEX IF NOT EXISTS idx_challan_details_challan_no ON challan_details (challan_no);
CREATE INDEX IF NOT EXISTS idx_challan_details_active ON challan_details (is_active);

-- Composite indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bilty_branch_active_date ON bilty (branch_id, is_active, bilty_date);
CREATE INDEX IF NOT EXISTS idx_station_bilty_date_branch ON station_bilty_summary (created_at, branch_id);

-- Enhanced city search indexes
CREATE INDEX IF NOT EXISTS idx_cities_city_name_lower ON cities (LOWER(city_name));
CREATE INDEX IF NOT EXISTS idx_cities_city_code ON cities (city_code);
CREATE INDEX IF NOT EXISTS idx_cities_city_code_lower ON cities (LOWER(city_code));
CREATE INDEX IF NOT EXISTS idx_station_bilty_station_lower ON station_bilty_summary (LOWER(station));

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION search_bilties_with_filters TO authenticated;
GRANT EXECUTE ON FUNCTION get_complete_search_results_with_challan TO authenticated;
GRANT EXECUTE ON FUNCTION search_bilties_by_gr_number TO authenticated;
GRANT EXECUTE ON FUNCTION get_gr_search_results_with_challan_dates TO authenticated;

-- 7. Test the functions
-- Test comprehensive search function:
-- SELECT * FROM search_bilties_with_filters(null, null, null, null, null, null, null, null, null, null, null, null, null, 5);

-- Test comprehensive search with challan details:
-- SELECT * FROM get_complete_search_results_with_challan(null, null, null, null, null, null, null, null, null, null, null, null, null, 5);

-- Test with date range filter:
-- SELECT * FROM get_complete_search_results_with_challan(null, '2024-01-01', '2024-12-31', null, null, null, null, null, null, null, null, null, null, 10);

-- Test with consignor filter:
-- SELECT * FROM get_complete_search_results_with_challan(null, null, null, null, 'test_consignor', null, null, null, null, null, null, null, null, 10);

-- Test with city_code that should match station bilties directly:
-- SELECT * FROM get_complete_search_results_with_challan(null, null, null, null, null, null, null, null, null, null, null, null, null, 'MAI', 10);

-- Test station bilty city search specifically - this should show direct city_code match:
-- SELECT s.gr_no, s.station, s.consignor, s.consignee
-- FROM station_bilty_summary s
-- WHERE LOWER(s.station) LIKE '%mai%'
-- LIMIT 10;

-- Test both regular and station bilties with city filter:
-- SELECT type, gr_no, consignor_name, station, to_city_id 
-- FROM get_complete_search_results_with_challan(null, null, null, null, null, null, null, null, null, null, null, null, null, 'MAI', 20);

-- Test challan details accuracy with any filter:
-- SELECT 
--   b.gr_no,
--   b.type,
--   b.consignor_name,
--   b.challan_no,
--   b.is_dispatched,
--   b.dispatch_date
-- FROM get_complete_search_results_with_challan(null, '2024-01-01', null, null, null, null, null, null, null, null, null, null, null, 20) b
-- WHERE b.challan_no IS NOT NULL AND b.challan_no != ''
-- ORDER BY b.challan_no;