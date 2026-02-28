-- =====================================================
-- BULK UPDATE TRANSIT STATUS - Supabase RPC Function
-- =====================================================
-- Run this in Supabase SQL Editor to create the function.
-- Usage from frontend: supabase.rpc('bulk_update_transit_status', { p_transit_ids: [...], p_action: 'branch'|'out'|'delivered', p_user_id: '...' })
-- =====================================================

CREATE OR REPLACE FUNCTION bulk_update_transit_status(
  p_transit_ids UUID[],
  p_action TEXT,       -- 'branch' | 'out' | 'delivered'
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_updated_count INT := 0;
BEGIN
  -- Validate action
  IF p_action NOT IN ('branch', 'out', 'delivered') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid action. Must be branch, out, or delivered.');
  END IF;

  -- ========================
  -- ACTION: Delivered at Branch (branch)
  -- Auto-fills: is_out_of_delivery_from_branch1
  -- ========================
  IF p_action = 'branch' THEN
    -- First auto-fill: is_out_of_delivery_from_branch1 where not already set
    UPDATE transit_details
    SET
      is_out_of_delivery_from_branch1 = TRUE,
      out_of_delivery_from_branch1_date = v_now,
      updated_by = p_user_id
    WHERE id = ANY(p_transit_ids)
      AND is_out_of_delivery_from_branch1 IS NOT TRUE;

    -- Then set: is_delivered_at_branch2
    UPDATE transit_details
    SET
      is_delivered_at_branch2 = TRUE,
      delivered_at_branch2_date = v_now,
      updated_by = p_user_id
    WHERE id = ANY(p_transit_ids)
      AND is_delivered_at_branch2 IS NOT TRUE;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- ========================
  -- ACTION: Out for Delivery (out)
  -- Auto-fills: is_out_of_delivery_from_branch1, is_delivered_at_branch2
  -- ========================
  ELSIF p_action = 'out' THEN
    -- Auto-fill: is_out_of_delivery_from_branch1
    UPDATE transit_details
    SET
      is_out_of_delivery_from_branch1 = TRUE,
      out_of_delivery_from_branch1_date = v_now,
      updated_by = p_user_id
    WHERE id = ANY(p_transit_ids)
      AND is_out_of_delivery_from_branch1 IS NOT TRUE;

    -- Auto-fill: is_delivered_at_branch2
    UPDATE transit_details
    SET
      is_delivered_at_branch2 = TRUE,
      delivered_at_branch2_date = v_now,
      updated_by = p_user_id
    WHERE id = ANY(p_transit_ids)
      AND is_delivered_at_branch2 IS NOT TRUE;

    -- Then set: is_out_of_delivery_from_branch2
    UPDATE transit_details
    SET
      is_out_of_delivery_from_branch2 = TRUE,
      out_of_delivery_from_branch2_date = v_now,
      updated_by = p_user_id
    WHERE id = ANY(p_transit_ids)
      AND is_out_of_delivery_from_branch2 IS NOT TRUE;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- ========================
  -- ACTION: Delivered at Destination (delivered)
  -- Auto-fills: ALL previous steps
  -- ========================
  ELSIF p_action = 'delivered' THEN
    -- Auto-fill: is_out_of_delivery_from_branch1
    UPDATE transit_details
    SET
      is_out_of_delivery_from_branch1 = TRUE,
      out_of_delivery_from_branch1_date = v_now,
      updated_by = p_user_id
    WHERE id = ANY(p_transit_ids)
      AND is_out_of_delivery_from_branch1 IS NOT TRUE;

    -- Auto-fill: is_delivered_at_branch2
    UPDATE transit_details
    SET
      is_delivered_at_branch2 = TRUE,
      delivered_at_branch2_date = v_now,
      updated_by = p_user_id
    WHERE id = ANY(p_transit_ids)
      AND is_delivered_at_branch2 IS NOT TRUE;

    -- Auto-fill: is_out_of_delivery_from_branch2
    UPDATE transit_details
    SET
      is_out_of_delivery_from_branch2 = TRUE,
      out_of_delivery_from_branch2_date = v_now,
      updated_by = p_user_id
    WHERE id = ANY(p_transit_ids)
      AND is_out_of_delivery_from_branch2 IS NOT TRUE;

    -- Then set: is_delivered_at_destination
    UPDATE transit_details
    SET
      is_delivered_at_destination = TRUE,
      delivered_at_destination_date = v_now,
      updated_by = p_user_id
    WHERE id = ANY(p_transit_ids)
      AND is_delivered_at_destination IS NOT TRUE;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  END IF;

  RETURN json_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'action', p_action,
    'timestamp', v_now
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
