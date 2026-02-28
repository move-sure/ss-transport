-- =====================================================
-- Function: search_station_bilty_with_transit
-- Description: Fast search for station_bilty_summary 
--   with transit_details + challan_details joined.
--   Shows challan_no or 'AVL', dispatch_date from challan_details
-- =====================================================

-- STEP 1: Drop the existing function first (fixes return type error)
DROP FUNCTION IF EXISTS search_station_bilty_with_transit(
  TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, INT, INT
);

-- STEP 2: Create the function fresh
CREATE OR REPLACE FUNCTION search_station_bilty_with_transit(
  p_search_term TEXT DEFAULT NULL,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL,
  p_gr_number TEXT DEFAULT NULL,
  p_consignor TEXT DEFAULT NULL,
  p_consignee TEXT DEFAULT NULL,
  p_pvt_marks TEXT DEFAULT NULL,
  p_payment_status TEXT DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL,
  p_station TEXT DEFAULT NULL,
  p_transit_status TEXT DEFAULT NULL, -- 'avl', 'in_transit', 'delivered', 'all'
  p_challan_no TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  station VARCHAR,
  gr_no VARCHAR,
  consignor VARCHAR,
  consignee VARCHAR,
  contents TEXT,
  no_of_packets INT,
  weight NUMERIC,
  payment_status VARCHAR,
  amount NUMERIC,
  pvt_marks TEXT,
  delivery_type VARCHAR,
  e_way_bill VARCHAR,
  staff_id UUID,
  branch_id UUID,
  transport_id UUID,
  transport_name VARCHAR,
  transport_gst VARCHAR,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  w_name VARCHAR,
  bilty_image TEXT,
  transit_bilty_image TEXT,
  -- Transit details
  transit_challan_no VARCHAR,
  transit_status TEXT,
  transit_dispatch_date TIMESTAMPTZ,
  -- Counts
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  -- First get total count
  SELECT COUNT(*)
  INTO v_total
  FROM station_bilty_summary sbs
  LEFT JOIN transit_details td ON LOWER(sbs.gr_no) = LOWER(td.gr_no)
  LEFT JOIN challan_details cd ON td.challan_no = cd.challan_no
  WHERE
    -- Quick search term (searches across multiple fields)
    (p_search_term IS NULL OR p_search_term = '' OR (
      sbs.station ILIKE '%' || p_search_term || '%' OR
      sbs.gr_no ILIKE '%' || p_search_term || '%' OR
      sbs.consignor ILIKE '%' || p_search_term || '%' OR
      sbs.consignee ILIKE '%' || p_search_term || '%' OR
      sbs.pvt_marks ILIKE '%' || p_search_term || '%' OR
      sbs.contents ILIKE '%' || p_search_term || '%' OR
      td.challan_no ILIKE '%' || p_search_term || '%'
    ))
    -- Date range
    AND (p_from_date IS NULL OR sbs.created_at >= p_from_date)
    AND (p_to_date IS NULL OR sbs.created_at < p_to_date)
    -- Specific field filters
    AND (p_gr_number IS NULL OR p_gr_number = '' OR sbs.gr_no ILIKE '%' || p_gr_number || '%')
    AND (p_consignor IS NULL OR p_consignor = '' OR sbs.consignor ILIKE '%' || p_consignor || '%')
    AND (p_consignee IS NULL OR p_consignee = '' OR sbs.consignee ILIKE '%' || p_consignee || '%')
    AND (p_pvt_marks IS NULL OR p_pvt_marks = '' OR sbs.pvt_marks ILIKE '%' || p_pvt_marks || '%')
    AND (p_payment_status IS NULL OR p_payment_status = '' OR sbs.payment_status = p_payment_status)
    AND (p_branch_id IS NULL OR sbs.branch_id = p_branch_id)
    AND (p_station IS NULL OR p_station = '' OR sbs.station ILIKE '%' || p_station || '%')
    AND (p_challan_no IS NULL OR p_challan_no = '' OR td.challan_no ILIKE '%' || p_challan_no || '%')
    -- Transit status filter
    AND (
      p_transit_status IS NULL OR p_transit_status = '' OR p_transit_status = 'all'
      OR (p_transit_status = 'avl' AND td.id IS NULL)
      OR (p_transit_status = 'in_transit' AND td.id IS NOT NULL AND td.is_delivered_at_destination = false)
      OR (p_transit_status = 'delivered' AND td.id IS NOT NULL AND td.is_delivered_at_destination = true)
      OR (p_transit_status = 'at_hub' AND td.id IS NOT NULL AND td.is_delivered_at_branch2 = true AND td.is_delivered_at_destination = false)
      OR (p_transit_status = 'out_for_delivery' AND td.id IS NOT NULL AND td.out_for_door_delivery = true AND td.is_delivered_at_destination = false)
    );

  -- Return results with transit info
  RETURN QUERY
  SELECT
    sbs.id,
    sbs.station,
    sbs.gr_no,
    sbs.consignor,
    sbs.consignee,
    sbs.contents,
    sbs.no_of_packets,
    sbs.weight,
    sbs.payment_status,
    sbs.amount,
    sbs.pvt_marks,
    sbs.delivery_type,
    sbs.e_way_bill,
    sbs.staff_id,
    sbs.branch_id,
    sbs.transport_id,
    sbs.transport_name,
    sbs.transport_gst,
    sbs.created_at,
    sbs.updated_at,
    sbs.updated_by,
    sbs.w_name,
    sbs.bilty_image,
    sbs.transit_bilty_image,
    -- Transit columns
    td.challan_no AS transit_challan_no,
    CASE
      WHEN td.id IS NULL THEN 'AVL'
      WHEN td.is_delivered_at_destination = true THEN 'DELIVERED'
      WHEN td.out_for_door_delivery = true THEN 'OUT_FOR_DELIVERY'
      WHEN td.is_out_of_delivery_from_branch2 = true THEN 'OUT_FROM_HUB'
      WHEN td.is_delivered_at_branch2 = true THEN 'AT_HUB'
      WHEN td.is_out_of_delivery_from_branch1 = true THEN 'DISPATCHED'
      ELSE 'IN_TRANSIT'
    END AS transit_status,
    -- dispatch_date comes from challan_details table, NOT transit_details
    cd.dispatch_date AS transit_dispatch_date,
    v_total AS total_count
  FROM station_bilty_summary sbs
  LEFT JOIN transit_details td ON LOWER(sbs.gr_no) = LOWER(td.gr_no)
  LEFT JOIN challan_details cd ON td.challan_no = cd.challan_no
  WHERE
    (p_search_term IS NULL OR p_search_term = '' OR (
      sbs.station ILIKE '%' || p_search_term || '%' OR
      sbs.gr_no ILIKE '%' || p_search_term || '%' OR
      sbs.consignor ILIKE '%' || p_search_term || '%' OR
      sbs.consignee ILIKE '%' || p_search_term || '%' OR
      sbs.pvt_marks ILIKE '%' || p_search_term || '%' OR
      sbs.contents ILIKE '%' || p_search_term || '%' OR
      td.challan_no ILIKE '%' || p_search_term || '%'
    ))
    AND (p_from_date IS NULL OR sbs.created_at >= p_from_date)
    AND (p_to_date IS NULL OR sbs.created_at < p_to_date)
    AND (p_gr_number IS NULL OR p_gr_number = '' OR sbs.gr_no ILIKE '%' || p_gr_number || '%')
    AND (p_consignor IS NULL OR p_consignor = '' OR sbs.consignor ILIKE '%' || p_consignor || '%')
    AND (p_consignee IS NULL OR p_consignee = '' OR sbs.consignee ILIKE '%' || p_consignee || '%')
    AND (p_pvt_marks IS NULL OR p_pvt_marks = '' OR sbs.pvt_marks ILIKE '%' || p_pvt_marks || '%')
    AND (p_payment_status IS NULL OR p_payment_status = '' OR sbs.payment_status = p_payment_status)
    AND (p_branch_id IS NULL OR sbs.branch_id = p_branch_id)
    AND (p_station IS NULL OR p_station = '' OR sbs.station ILIKE '%' || p_station || '%')
    AND (p_challan_no IS NULL OR p_challan_no = '' OR td.challan_no ILIKE '%' || p_challan_no || '%')
    AND (
      p_transit_status IS NULL OR p_transit_status = '' OR p_transit_status = 'all'
      OR (p_transit_status = 'avl' AND td.id IS NULL)
      OR (p_transit_status = 'in_transit' AND td.id IS NOT NULL AND td.is_delivered_at_destination = false)
      OR (p_transit_status = 'delivered' AND td.id IS NOT NULL AND td.is_delivered_at_destination = true)
      OR (p_transit_status = 'at_hub' AND td.id IS NOT NULL AND td.is_delivered_at_branch2 = true AND td.is_delivered_at_destination = false)
      OR (p_transit_status = 'out_for_delivery' AND td.id IS NOT NULL AND td.out_for_door_delivery = true AND td.is_delivered_at_destination = false)
    )
  ORDER BY sbs.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_station_bilty_with_transit TO authenticated;
GRANT EXECUTE ON FUNCTION search_station_bilty_with_transit TO anon;
GRANT EXECUTE ON FUNCTION search_station_bilty_with_transit TO service_role;
