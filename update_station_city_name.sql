-- UPDATE: Resolve Station City Code to City Name + Fix ALL Filter Combinations
-- This script updates the search functions to:
-- 1. JOIN with cities table so station bilties show city names instead of codes
-- 2. Fix city dropdown filter (p_to_city_id) to also filter station bilties
-- 3. Ensure ALL filter combinations work (pvt_marks + city, consignor + delivery_type, etc.)
-- 4. Fix duplicate challan rows when a GR has multiple transit_details entries
-- Run this in Supabase SQL Editor

-- 1. Drop ALL existing function signatures to avoid conflicts
DROP FUNCTION IF EXISTS search_bilties_with_filters(DATE, DATE, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS search_bilties_with_filters(UUID, DATE, DATE, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER);
DROP FUNCTION IF EXISTS search_bilties_with_filters(UUID, DATE, DATE, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_complete_search_results_with_challan(DATE, DATE, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_complete_search_results_with_challan(UUID, DATE, DATE, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_complete_search_results_with_challan(UUID, DATE, DATE, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS search_bilties_by_gr_number(TEXT, DATE, INTEGER);
DROP FUNCTION IF EXISTS search_bilties_by_gr_number(TEXT, UUID, DATE, INTEGER);
DROP FUNCTION IF EXISTS get_gr_search_results_with_challan_dates(TEXT, DATE, INTEGER);
DROP FUNCTION IF EXISTS get_gr_search_results_with_challan_dates(TEXT, UUID, DATE, INTEGER);

-- ============================================================================
-- 2. CORE SEARCH FUNCTION: search_bilties_with_filters
-- Searches both bilty + station_bilty_summary tables with ALL filter combos
-- Now returns 'destination' (resolved city name) for both regular & station bilties
-- FIXED: City dropdown filter (p_to_city_id) now also filters station bilties
-- ============================================================================
CREATE OR REPLACE FUNCTION search_bilties_with_filters(
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
  p_delivery_type TEXT DEFAULT NULL,
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
  delivery_type CHARACTER VARYING,
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
  branch_id UUID,
  destination TEXT
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
  
  -- ===== REGULAR BILTIES =====
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
    b.delivery_type,
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
    b.branch_id,
    COALESCE(rc.city_name::TEXT, '') as destination
  FROM bilty b
  LEFT JOIN cities rc ON rc.id = b.to_city_id
  WHERE 
    -- Active records only
    b.is_active = true
    AND b.deleted_at IS NULL
    -- Date range
    AND (p_date_from IS NULL OR b.bilty_date >= p_date_from)
    AND (p_date_to IS NULL OR b.bilty_date <= p_date_to)
    -- GR Number (partial match)
    AND (p_gr_number IS NULL OR p_gr_number = '' OR LOWER(b.gr_no) LIKE '%' || LOWER(TRIM(p_gr_number)) || '%')
    -- Consignor (partial match)
    AND (p_consignor_name IS NULL OR p_consignor_name = '' OR LOWER(b.consignor_name) LIKE '%' || LOWER(TRIM(p_consignor_name)) || '%')
    -- Consignee (partial match)
    AND (p_consignee_name IS NULL OR p_consignee_name = '' OR LOWER(b.consignee_name) LIKE '%' || LOWER(TRIM(p_consignee_name)) || '%')
    -- City filter (by UUID from dropdown)
    AND (p_to_city_id IS NULL OR b.to_city_id = p_to_city_id)
    -- Payment mode (exact match)
    AND (p_payment_mode IS NULL OR p_payment_mode = '' OR b.payment_mode = p_payment_mode)
    -- E-way bill filter
    AND (p_has_eway_bill IS NULL OR p_has_eway_bill = '' OR 
         (p_has_eway_bill = 'yes' AND b.e_way_bill IS NOT NULL AND TRIM(b.e_way_bill) != '') OR
         (p_has_eway_bill = 'no' AND (b.e_way_bill IS NULL OR TRIM(b.e_way_bill) = '')))
    -- Saving option (exact match)
    AND (p_saving_option IS NULL OR p_saving_option = '' OR b.saving_option = p_saving_option)
    -- Amount range
    AND (p_min_amount IS NULL OR b.total >= p_min_amount)
    AND (p_max_amount IS NULL OR b.total <= p_max_amount)
    -- Pvt marks (partial match)
    AND (p_pvt_marks IS NULL OR p_pvt_marks = '' OR LOWER(COALESCE(b.pvt_marks, '')) LIKE '%' || LOWER(TRIM(p_pvt_marks)) || '%')
    -- Delivery type (exact match)
    AND (p_delivery_type IS NULL OR p_delivery_type = '' OR b.delivery_type = p_delivery_type)
  
  UNION ALL
  
  -- ===== STATION BILTIES =====
  -- JOIN with cities table to resolve station code (e.g. "MNK") to city name (e.g. "MORADABAD")
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
    s.delivery_type,
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
    s.branch_id,
    COALESCE(sc.city_name::TEXT, s.station::TEXT, '') as destination
  FROM station_bilty_summary s
  LEFT JOIN cities sc ON lower(sc.city_code) = lower(s.station)
  WHERE 
    -- Date range (using created_at for station bilties)
    (p_date_from IS NULL OR s.created_at::DATE >= p_date_from)
    AND (p_date_to IS NULL OR s.created_at::DATE <= p_date_to)
    -- GR Number (partial match)
    AND (p_gr_number IS NULL OR p_gr_number = '' OR LOWER(COALESCE(s.gr_no, '')) LIKE '%' || LOWER(TRIM(p_gr_number)) || '%')
    -- Consignor (partial match)
    AND (p_consignor_name IS NULL OR p_consignor_name = '' OR LOWER(s.consignor) LIKE '%' || LOWER(TRIM(p_consignor_name)) || '%')
    -- Consignee (partial match)
    AND (p_consignee_name IS NULL OR p_consignee_name = '' OR LOWER(s.consignee) LIKE '%' || LOWER(TRIM(p_consignee_name)) || '%')
    -- FIXED: City filter - works with BOTH dropdown (p_to_city_id UUID) AND text search (p_city_code)
    -- When user selects city from dropdown, p_to_city_id is set → lookup city_code from cities table and match
    -- When user types city code manually, p_city_code is set → partial match against station
    AND (
      -- No city filter applied → pass through
      ((p_city_code IS NULL OR p_city_code = '') AND p_to_city_id IS NULL)
      OR
      -- Text-based city code search (partial match)
      (p_city_code IS NOT NULL AND p_city_code != '' AND LOWER(s.station) LIKE '%' || LOWER(TRIM(p_city_code)) || '%')
      OR
      -- Dropdown city selection (exact match via UUID → city_code lookup)
      (p_to_city_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM cities c WHERE c.id = p_to_city_id AND lower(c.city_code) = lower(s.station)
      ))
    )
    -- Payment status (mapped from payment_mode filter)
    AND (p_payment_mode IS NULL OR p_payment_mode = '' OR s.payment_status = p_payment_mode)
    -- E-way bill filter
    AND (p_has_eway_bill IS NULL OR p_has_eway_bill = '' OR 
         (p_has_eway_bill = 'yes' AND s.e_way_bill IS NOT NULL AND TRIM(s.e_way_bill) != '') OR
         (p_has_eway_bill = 'no' AND (s.e_way_bill IS NULL OR TRIM(s.e_way_bill) = '')))
    -- Amount range (using amount field for station bilties)
    AND (p_min_amount IS NULL OR s.amount >= p_min_amount)
    AND (p_max_amount IS NULL OR s.amount <= p_max_amount)
    -- Pvt marks (partial match)
    AND (p_pvt_marks IS NULL OR p_pvt_marks = '' OR LOWER(COALESCE(s.pvt_marks, '')) LIKE '%' || LOWER(TRIM(p_pvt_marks)) || '%')
    -- Delivery type (exact match)
    AND (p_delivery_type IS NULL OR p_delivery_type = '' OR s.delivery_type = p_delivery_type)
  
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. MAIN SEARCH WITH CHALLAN: get_complete_search_results_with_challan
-- Wraps search_bilties_with_filters + adds challan dispatch details
-- FIXED: Uses DISTINCT ON to avoid duplicate rows when GR has multiple transit entries
-- ============================================================================
CREATE OR REPLACE FUNCTION get_complete_search_results_with_challan(
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
  p_delivery_type TEXT DEFAULT NULL,
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
  delivery_type CHARACTER VARYING,
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
  branch_id UUID,
  destination TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Use DISTINCT ON to avoid duplicate rows when a GR has multiple transit_details entries
  SELECT DISTINCT ON (b.bilty_id)
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
    b.delivery_type,
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
    b.branch_id,
    b.destination
  FROM search_bilties_with_filters(
    p_date_from, p_date_to, p_gr_number, p_consignor_name, 
    p_consignee_name, p_to_city_id, p_payment_mode, p_has_eway_bill, 
    p_saving_option, p_min_amount, p_max_amount, p_pvt_marks, p_city_code, p_delivery_type, p_limit
  ) b
  LEFT JOIN transit_details td ON td.gr_no = b.gr_no
  LEFT JOIN challan_details cd ON cd.challan_no = td.challan_no AND cd.is_active = true
  ORDER BY b.bilty_id, cd.dispatch_date DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. GR-ONLY SEARCH (backward compatible)
-- ============================================================================
CREATE OR REPLACE FUNCTION search_bilties_by_gr_number(
  p_gr_number TEXT,
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
  delivery_type CHARACTER VARYING,
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
  branch_id UUID,
  destination TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM search_bilties_with_filters(
    p_date_from, NULL, p_gr_number, NULL, NULL, NULL, 
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, p_limit
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. GR-ONLY SEARCH WITH CHALLAN (backward compatible)
-- ============================================================================
DROP FUNCTION IF EXISTS get_gr_search_results_with_challan_dates(TEXT, DATE, INTEGER);

CREATE OR REPLACE FUNCTION get_gr_search_results_with_challan_dates(
  p_gr_number TEXT,
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
  delivery_type CHARACTER VARYING,
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
  branch_id UUID,
  destination TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM get_complete_search_results_with_challan(
    p_date_from, NULL, p_gr_number, NULL, NULL, NULL, 
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, p_limit
  );
END;
$$ LANGUAGE plpgsql;
