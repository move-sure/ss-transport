-- ============================================================
-- GODOWN SEARCH FUNCTION - search_godown_bilties
-- Combines bilty + station_bilty_summary with all joins
-- in a single optimized query with search, filter & pagination
-- ============================================================
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION search_godown_bilties(
  p_branch_id UUID DEFAULT NULL,
  p_search_query TEXT DEFAULT '',
  p_station_filter TEXT DEFAULT '',
  p_page_number INT DEFAULT 1,
  p_page_size INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  gr_no TEXT,
  pvt_marks TEXT,
  consignor_name TEXT,
  consignee_name TEXT,
  consignor_number TEXT,
  consignee_number TEXT,
  no_of_bags INT,
  weight NUMERIC,
  payment_status TEXT,
  delivery_type TEXT,
  source TEXT,
  created_at TIMESTAMPTZ,
  destination TEXT,
  city_code TEXT,
  station_destination TEXT,
  challan_no TEXT,
  bilty_image TEXT,
  w_name TEXT,
  is_in_head_branch BOOLEAN,
  station TEXT,
  to_city_id UUID,
  branch_id UUID,
  transports_json JSONB,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INT;
  v_search TEXT;
  v_station TEXT;
BEGIN
  v_offset := (p_page_number - 1) * p_page_size;
  v_search := LOWER(TRIM(COALESCE(p_search_query, '')));
  v_station := LOWER(TRIM(COALESCE(p_station_filter, '')));

  RETURN QUERY
  WITH combined AS (
    -- ========== REGULAR BILTIES ==========
    SELECT
      b.id,
      b.gr_no::TEXT,
      b.pvt_marks::TEXT,
      b.consignor_name::TEXT,
      b.consignee_name::TEXT,
      cr.number::TEXT AS consignor_number,
      ce.number::TEXT AS consignee_number,
      b.no_of_pkg AS no_of_bags,
      b.wt AS weight,
      b.payment_mode::TEXT AS payment_status,
      REPLACE(COALESCE(b.delivery_type, ''), '-delivery', '')::TEXT AS delivery_type,
      'regular'::TEXT AS source,
      b.created_at,
      c.city_name::TEXT AS destination,
      c.city_code::TEXT AS city_code,
      (COALESCE(c.city_name, 'Unknown') || ' (' || COALESCE(c.city_code, 'N/A') || ')')::TEXT AS station_destination,
      td.challan_no::TEXT,
      b.bilty_image::TEXT,
      NULL::TEXT AS w_name,
      NULL::BOOLEAN AS is_in_head_branch,
      NULL::TEXT AS station,
      b.to_city_id,
      b.branch_id,
      -- Transports JSON aggregation by destination city name
      (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', t.id,
            'transport_name', t.transport_name,
            'city_name', t.city_name,
            'mob_number', t.mob_number
          )
        ), '[]'::JSONB)
        FROM transports t
        WHERE t.city_name = c.city_name
      ) AS transports_json
    FROM bilty b
    LEFT JOIN cities c ON c.id = b.to_city_id
    LEFT JOIN LATERAL (
      SELECT cr2.number FROM consignors cr2 WHERE cr2.company_name = b.consignor_name LIMIT 1
    ) cr ON TRUE
    LEFT JOIN LATERAL (
      SELECT ce2.number FROM consignees ce2 WHERE ce2.company_name = b.consignee_name LIMIT 1
    ) ce ON TRUE
    LEFT JOIN LATERAL (
      SELECT td2.challan_no FROM transit_details td2 WHERE td2.gr_no = b.gr_no LIMIT 1
    ) td ON TRUE
    WHERE (p_branch_id IS NULL OR b.branch_id = p_branch_id)

    UNION ALL

    -- ========== STATION BILTIES ==========
    SELECT
      s.id,
      s.gr_no::TEXT,
      s.pvt_marks::TEXT,
      s.consignor::TEXT AS consignor_name,
      s.consignee::TEXT AS consignee_name,
      cr.number::TEXT AS consignor_number,
      ce.number::TEXT AS consignee_number,
      s.no_of_packets AS no_of_bags,
      s.weight,
      s.payment_status::TEXT,
      s.delivery_type::TEXT,
      'manual'::TEXT AS source,
      s.created_at,
      COALESCE(c.city_name, s.station)::TEXT AS destination,
      COALESCE(c.city_code, s.station)::TEXT AS city_code,
      (COALESCE(c.city_name, s.station) || ' (' || COALESCE(c.city_code, s.station) || ')')::TEXT AS station_destination,
      td.challan_no::TEXT,
      s.bilty_image::TEXT,
      s.w_name::TEXT,
      s.is_in_head_branch,
      s.station::TEXT,
      NULL::UUID AS to_city_id,
      s.branch_id,
      -- Transports JSON aggregation by destination city name
      (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', t.id,
            'transport_name', t.transport_name,
            'city_name', t.city_name,
            'mob_number', t.mob_number
          )
        ), '[]'::JSONB)
        FROM transports t
        WHERE t.city_name = COALESCE(c.city_name, s.station)
      ) AS transports_json
    FROM station_bilty_summary s
    LEFT JOIN cities c ON c.city_code = s.station
    LEFT JOIN LATERAL (
      SELECT cr2.number FROM consignors cr2 WHERE cr2.company_name = s.consignor LIMIT 1
    ) cr ON TRUE
    LEFT JOIN LATERAL (
      SELECT ce2.number FROM consignees ce2 WHERE ce2.company_name = s.consignee LIMIT 1
    ) ce ON TRUE
    LEFT JOIN LATERAL (
      SELECT td2.challan_no FROM transit_details td2 WHERE td2.gr_no = s.gr_no LIMIT 1
    ) td ON TRUE
    WHERE (p_branch_id IS NULL OR s.branch_id = p_branch_id)
  ),
  -- Apply search + station filter
  filtered AS (
    SELECT *
    FROM combined cb
    WHERE (
      v_search = '' OR
      LOWER(cb.gr_no) LIKE '%' || v_search || '%' OR
      LOWER(COALESCE(cb.pvt_marks, '')) LIKE '%' || v_search || '%' OR
      LOWER(COALESCE(cb.station_destination, '')) LIKE '%' || v_search || '%' OR
      LOWER(COALESCE(cb.consignor_name, '')) LIKE '%' || v_search || '%' OR
      LOWER(COALESCE(cb.consignee_name, '')) LIKE '%' || v_search || '%' OR
      LOWER(COALESCE(cb.challan_no, '')) LIKE '%' || v_search || '%'
    )
    AND (
      v_station = '' OR
      LOWER(COALESCE(cb.station_destination, '')) LIKE '%' || v_station || '%'
    )
  )
  SELECT
    f.id,
    f.gr_no,
    f.pvt_marks,
    f.consignor_name,
    f.consignee_name,
    f.consignor_number,
    f.consignee_number,
    f.no_of_bags,
    f.weight,
    f.payment_status,
    f.delivery_type,
    f.source,
    f.created_at,
    f.destination,
    f.city_code,
    f.station_destination,
    f.challan_no,
    f.bilty_image,
    f.w_name,
    f.is_in_head_branch,
    f.station,
    f.to_city_id,
    f.branch_id,
    f.transports_json,
    COUNT(*) OVER() AS total_count
  FROM filtered f
  ORDER BY f.created_at DESC
  OFFSET v_offset
  LIMIT p_page_size;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_godown_bilties TO anon, authenticated;
