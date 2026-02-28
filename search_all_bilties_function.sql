-- ============================================
-- Function: search_all_bilties
-- Description: Fast unified search across both bilty and station_bilty_summary tables
-- Searches ALL bilties system-wide (no branch filter)
-- Searches by: gr_no, pvt_marks, consignor, consignee, e_way_bill, transport_name
-- Includes challan details (dispatch_date) and destination via JOINs
-- Usage: SELECT * FROM search_all_bilties('GR001', 50, 0);
-- ============================================

DROP FUNCTION IF EXISTS search_all_bilties(TEXT, UUID, INT, INT);
DROP FUNCTION IF EXISTS search_all_bilties(TEXT, INT, INT);

CREATE OR REPLACE FUNCTION search_all_bilties(
  p_search_term TEXT,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  gr_no TEXT,
  source_type TEXT,
  consignor_name TEXT,
  consignee_name TEXT,
  bilty_date TIMESTAMPTZ,
  payment_mode TEXT,
  total NUMERIC,
  no_of_pkg INT,
  weight NUMERIC,
  pvt_marks TEXT,
  e_way_bill TEXT,
  saving_option TEXT,
  staff_id UUID,
  branch_id UUID,
  station TEXT,
  delivery_type TEXT,
  created_at TIMESTAMPTZ,
  consignor_gst TEXT,
  consignee_gst TEXT,
  consignor_number TEXT,
  consignee_number TEXT,
  transport_name TEXT,
  transport_gst TEXT,
  transport_number TEXT,
  transport_id UUID,
  invoice_no TEXT,
  invoice_value NUMERIC,
  invoice_date DATE,
  document_number TEXT,
  rate NUMERIC,
  contain TEXT,
  freight_amount NUMERIC,
  labour_charge NUMERIC,
  bill_charge NUMERIC,
  toll_charge NUMERIC,
  dd_charge NUMERIC,
  other_charge NUMERIC,
  pf_charge NUMERIC,
  labour_rate NUMERIC,
  remark TEXT,
  from_city_id UUID,
  to_city_id UUID,
  bilty_image TEXT,
  transit_bilty_image TEXT,
  w_name TEXT,
  destination TEXT,
  challan_no TEXT,
  dispatch_date TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_search TEXT;
BEGIN
  v_search := '%' || lower(p_search_term) || '%';

  RETURN QUERY
  SELECT
    combined.*,
    COUNT(*) OVER()::BIGINT AS total_count
  FROM (
    -- ========== BILTY TABLE ==========
    SELECT
      b.id,
      b.gr_no::TEXT                          AS gr_no,
      'REG'::TEXT                            AS source_type,
      b.consignor_name::TEXT                 AS consignor_name,
      b.consignee_name::TEXT                 AS consignee_name,
      b.bilty_date::TIMESTAMPTZ              AS bilty_date,
      b.payment_mode::TEXT                   AS payment_mode,
      b.total::NUMERIC                       AS total,
      b.no_of_pkg::INT                       AS no_of_pkg,
      b.wt::NUMERIC                          AS weight,
      b.pvt_marks::TEXT                      AS pvt_marks,
      b.e_way_bill::TEXT                     AS e_way_bill,
      b.saving_option::TEXT                  AS saving_option,
      b.staff_id                             AS staff_id,
      b.branch_id                            AS branch_id,
      NULL::TEXT                             AS station,
      b.delivery_type::TEXT                  AS delivery_type,
      b.created_at                           AS created_at,
      b.consignor_gst::TEXT                  AS consignor_gst,
      b.consignee_gst::TEXT                  AS consignee_gst,
      b.consignor_number::TEXT               AS consignor_number,
      b.consignee_number::TEXT               AS consignee_number,
      b.transport_name::TEXT                 AS transport_name,
      b.transport_gst::TEXT                  AS transport_gst,
      b.transport_number::TEXT               AS transport_number,
      b.transport_id                         AS transport_id,
      b.invoice_no::TEXT                     AS invoice_no,
      b.invoice_value::NUMERIC               AS invoice_value,
      b.invoice_date                         AS invoice_date,
      b.document_number::TEXT                AS document_number,
      b.rate::NUMERIC                        AS rate,
      b.contain::TEXT                        AS contain,
      b.freight_amount::NUMERIC              AS freight_amount,
      b.labour_charge::NUMERIC               AS labour_charge,
      b.bill_charge::NUMERIC                 AS bill_charge,
      b.toll_charge::NUMERIC                 AS toll_charge,
      b.dd_charge::NUMERIC                   AS dd_charge,
      b.other_charge::NUMERIC                AS other_charge,
      b.pf_charge::NUMERIC                   AS pf_charge,
      b.labour_rate::NUMERIC                 AS labour_rate,
      b.remark::TEXT                         AS remark,
      b.from_city_id                         AS from_city_id,
      b.to_city_id                           AS to_city_id,
      b.bilty_image::TEXT                    AS bilty_image,
      NULL::TEXT                             AS transit_bilty_image,
      NULL::TEXT                             AS w_name,
      COALESCE(ct.city_name::TEXT, '')       AS destination,
      td.challan_no::TEXT                    AS challan_no,
      cd.dispatch_date::TIMESTAMPTZ          AS dispatch_date
    FROM bilty b
    LEFT JOIN transit_details td ON td.gr_no = b.gr_no
    LEFT JOIN challan_details cd ON cd.challan_no = td.challan_no
    LEFT JOIN cities ct ON ct.id = b.to_city_id
    WHERE b.is_active = true
      AND b.deleted_at IS NULL
      AND (
        lower(b.gr_no::TEXT) LIKE v_search
        OR lower(COALESCE(b.pvt_marks, '')) LIKE v_search
        OR lower(b.consignor_name::TEXT) LIKE v_search
        OR lower(COALESCE(b.consignee_name, '')::TEXT) LIKE v_search
        OR lower(COALESCE(b.e_way_bill, '')::TEXT) LIKE v_search
        OR lower(COALESCE(b.transport_name, '')::TEXT) LIKE v_search
        OR lower(COALESCE(b.invoice_no, '')::TEXT) LIKE v_search
      )

    UNION ALL

    -- ========== STATION BILTY SUMMARY TABLE ==========
    SELECT
      s.id,
      s.gr_no::TEXT                          AS gr_no,
      'MNL'::TEXT                            AS source_type,
      s.consignor::TEXT                      AS consignor_name,
      s.consignee::TEXT                      AS consignee_name,
      s.created_at                           AS bilty_date,
      s.payment_status::TEXT                 AS payment_mode,
      s.amount::NUMERIC                      AS total,
      s.no_of_packets::INT                   AS no_of_pkg,
      s.weight::NUMERIC                      AS weight,
      s.pvt_marks::TEXT                      AS pvt_marks,
      s.e_way_bill::TEXT                     AS e_way_bill,
      'SAVE'::TEXT                           AS saving_option,
      s.staff_id                             AS staff_id,
      s.branch_id                            AS branch_id,
      s.station::TEXT                        AS station,
      s.delivery_type::TEXT                  AS delivery_type,
      s.created_at                           AS created_at,
      NULL::TEXT                             AS consignor_gst,
      NULL::TEXT                             AS consignee_gst,
      NULL::TEXT                             AS consignor_number,
      NULL::TEXT                             AS consignee_number,
      s.transport_name::TEXT                 AS transport_name,
      s.transport_gst::TEXT                  AS transport_gst,
      NULL::TEXT                             AS transport_number,
      s.transport_id                         AS transport_id,
      NULL::TEXT                             AS invoice_no,
      NULL::NUMERIC                          AS invoice_value,
      NULL::DATE                             AS invoice_date,
      NULL::TEXT                             AS document_number,
      NULL::NUMERIC                          AS rate,
      s.contents::TEXT                       AS contain,
      NULL::NUMERIC                          AS freight_amount,
      NULL::NUMERIC                          AS labour_charge,
      NULL::NUMERIC                          AS bill_charge,
      NULL::NUMERIC                          AS toll_charge,
      NULL::NUMERIC                          AS dd_charge,
      NULL::NUMERIC                          AS other_charge,
      NULL::NUMERIC                          AS pf_charge,
      NULL::NUMERIC                          AS labour_rate,
      NULL::TEXT                             AS remark,
      NULL::UUID                             AS from_city_id,
      NULL::UUID                             AS to_city_id,
      s.bilty_image::TEXT                    AS bilty_image,
      s.transit_bilty_image::TEXT            AS transit_bilty_image,
      s.w_name::TEXT                         AS w_name,
      COALESCE(sc.city_name::TEXT, s.station::TEXT, '')  AS destination,
      td2.challan_no::TEXT                   AS challan_no,
      cd2.dispatch_date::TIMESTAMPTZ         AS dispatch_date
    FROM station_bilty_summary s
    LEFT JOIN transit_details td2 ON td2.gr_no = s.gr_no
    LEFT JOIN challan_details cd2 ON cd2.challan_no = td2.challan_no
    LEFT JOIN cities sc ON lower(sc.city_code) = lower(s.station::TEXT)
    WHERE (
      lower(COALESCE(s.gr_no, '')::TEXT) LIKE v_search
      OR lower(COALESCE(s.pvt_marks, '')) LIKE v_search
      OR lower(COALESCE(s.consignor, '')::TEXT) LIKE v_search
      OR lower(COALESCE(s.consignee, '')::TEXT) LIKE v_search
      OR lower(COALESCE(s.e_way_bill, '')::TEXT) LIKE v_search
      OR lower(COALESCE(s.transport_name, '')::TEXT) LIKE v_search
      OR lower(COALESCE(s.station, '')::TEXT) LIKE v_search
      OR lower(COALESCE(sc.city_name, '')::TEXT) LIKE v_search
    )
  ) combined
  ORDER BY combined.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
