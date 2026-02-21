-- ============================================================================
-- GR NUMBER RESERVATION SYSTEM - Multi-User Concurrent Bilty Creation
-- ============================================================================
-- This system allows multiple users from the same branch to simultaneously
-- create bilties by reserving GR numbers atomically. Real-time updates
-- via Supabase Realtime show which numbers are taken.
-- ============================================================================

-- ============================================================================
-- 1. CREATE gr_reservations TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.gr_reservations (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  bill_book_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  gr_no character varying(50) NOT NULL,
  gr_number integer NOT NULL,           -- The raw numeric part (for easy comparison)
  user_id uuid NOT NULL,
  user_name character varying(100),      -- Cached for display without joins
  status character varying(20) NOT NULL DEFAULT 'reserved',  -- 'reserved', 'used', 'released', 'expired'
  reserved_at timestamp with time zone NOT NULL DEFAULT NOW(),
  expires_at timestamp with time zone NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  used_at timestamp with time zone,     -- When bilty was actually saved
  released_at timestamp with time zone, -- When reservation was cancelled
  CONSTRAINT gr_reservations_pkey PRIMARY KEY (id),
  CONSTRAINT gr_reservations_bill_book_fkey FOREIGN KEY (bill_book_id) REFERENCES bill_books(id) ON DELETE CASCADE,
  CONSTRAINT gr_reservations_branch_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT gr_reservations_user_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT gr_reservations_status_check CHECK (status IN ('reserved', 'used', 'released', 'expired'))
) TABLESPACE pg_default;

-- Partial unique index: Only one active reservation per GR number per branch
CREATE UNIQUE INDEX IF NOT EXISTS idx_gr_reservations_active_unique 
  ON public.gr_reservations (gr_no, branch_id) 
  WHERE status = 'reserved';

-- Index for branch + status lookups (for live display)
CREATE INDEX IF NOT EXISTS idx_gr_reservations_branch_status 
  ON public.gr_reservations (branch_id, status) 
  WHERE status = 'reserved';

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_gr_reservations_user 
  ON public.gr_reservations (user_id, status);

-- Index for expiry cleanup
CREATE INDEX IF NOT EXISTS idx_gr_reservations_expires 
  ON public.gr_reservations (expires_at) 
  WHERE status = 'reserved';

-- Index for bill_book lookups
CREATE INDEX IF NOT EXISTS idx_gr_reservations_bill_book 
  ON public.gr_reservations (bill_book_id, status, gr_number);

-- ============================================================================
-- 2. ENABLE REALTIME for gr_reservations
-- ============================================================================
-- NOTE: Run this in Supabase Dashboard > Database > Replication
-- or via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE gr_reservations;

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.gr_reservations ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated operations (since we use anon key with app-level auth)
CREATE POLICY "Allow all operations on gr_reservations" ON public.gr_reservations
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 4. FUNCTION: cleanup_expired_reservations
--    Marks expired reservations and returns count of cleaned up entries
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn_cleanup$
DECLARE
  cleaned_count integer;
  deleted_count integer;
BEGIN
  -- Step 1: Mark expired reservations
  UPDATE public.gr_reservations
  SET 
    status = 'expired',
    released_at = NOW()
  WHERE 
    status = 'reserved' 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;

  -- Step 2: Delete old historical rows to prevent table bloat
  -- Rows in 'released' or 'expired' status older than 24 hours are no longer needed.
  -- This prevents the "multiple rows for same user + same GR" problem.
  DELETE FROM public.gr_reservations
  WHERE status IN ('released', 'expired')
    AND reserved_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN cleaned_count + deleted_count;
END;
$fn_cleanup$;

-- ============================================================================
-- 5. FUNCTION: reserve_next_gr
--    Atomically reserves the next available GR number from a bill book.
--    Handles race conditions via row-level locking.
--    Returns the reservation record or error.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reserve_next_gr(
  p_bill_book_id uuid,
  p_user_id uuid,
  p_branch_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn_reserve_next$
DECLARE
  v_bill_book RECORD;
  v_user_name text;
  v_next_number integer;
  v_gr_no text;
  v_reservation_id uuid;
  v_existing_reservation RECORD;
BEGIN
  -- Step 0: Cleanup expired reservations first
  PERFORM public.cleanup_expired_reservations();

  -- Step 1: Lock the bill book row to prevent race conditions
  SELECT * INTO v_bill_book
  FROM public.bill_books
  WHERE id = p_bill_book_id
    AND is_active = true
    AND is_completed = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bill book not found, inactive, or completed'
    );
  END IF;

  -- Step 1b: Check if this user already has an active reservation for this bill book
  -- ORDER BY gr_number ASC ensures we consistently return the lowest numbered
  -- reservation when the user has multiple (e.g. from range reservation)
  SELECT * INTO v_existing_reservation
  FROM public.gr_reservations
  WHERE user_id = p_user_id
    AND bill_book_id = p_bill_book_id
    AND branch_id = p_branch_id
    AND status = 'reserved'
    AND expires_at > NOW()
  ORDER BY gr_number ASC
  LIMIT 1;

  IF FOUND THEN
    -- User already has a reservation - return it instead of creating a new one
    RETURN jsonb_build_object(
      'success', true,
      'reservation_id', v_existing_reservation.id,
      'gr_no', v_existing_reservation.gr_no,
      'gr_number', v_existing_reservation.gr_number,
      'already_reserved', true,
      'expires_at', v_existing_reservation.expires_at
    );
  END IF;

  -- Step 2: Get user name for display
  SELECT name INTO v_user_name
  FROM public.users
  WHERE id = p_user_id;

  v_user_name := COALESCE(v_user_name, 'Unknown User');

  -- Step 3: Find next available number starting from current_number
  -- Skip numbers that are already used in bilty table or actively reserved
  v_next_number := v_bill_book.current_number;

  LOOP
    -- Check if number exceeds bill book range
    IF v_next_number > v_bill_book.to_number THEN
      IF v_bill_book.auto_continue THEN
        v_next_number := v_bill_book.from_number;
      ELSE
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Bill book exhausted - no more numbers available'
        );
      END IF;
    END IF;

    -- Generate the GR number string
    v_gr_no := COALESCE(v_bill_book.prefix, '') 
              || LPAD(v_next_number::text, v_bill_book.digits, '0') 
              || COALESCE(v_bill_book.postfix, '');

    -- Check if this GR number is already used in bilty table
    IF NOT EXISTS (
      SELECT 1 FROM public.bilty 
      WHERE gr_no = v_gr_no 
        AND branch_id = p_branch_id 
        AND is_active = true
    ) 
    -- AND not actively reserved by someone else
    AND NOT EXISTS (
      SELECT 1 FROM public.gr_reservations 
      WHERE gr_no = v_gr_no 
        AND branch_id = p_branch_id 
        AND status = 'reserved'
        AND expires_at > NOW()
    ) THEN
      -- Found an available number!
      EXIT;
    END IF;

    -- Try next number
    v_next_number := v_next_number + 1;

    -- Safety: prevent infinite loop (checked full range)
    IF v_next_number > v_bill_book.to_number AND NOT v_bill_book.auto_continue THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'No available GR numbers in this bill book range'
      );
    END IF;
  END LOOP;

  -- Step 4: Create the reservation
  INSERT INTO public.gr_reservations (
    bill_book_id, branch_id, gr_no, gr_number, 
    user_id, user_name, status, reserved_at, expires_at
  ) VALUES (
    p_bill_book_id, p_branch_id, v_gr_no, v_next_number,
    p_user_id, v_user_name, 'reserved', NOW(), NOW() + INTERVAL '30 minutes'
  )
  RETURNING id INTO v_reservation_id;

  -- NOTE: We do NOT update bill_books.current_number here.
  -- current_number is only advanced when the bilty is actually saved (complete_gr_reservation).
  -- This prevents wasting GR numbers when reservations are released without saving.

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'gr_no', v_gr_no,
    'gr_number', v_next_number,
    'already_reserved', false,
    'expires_at', (NOW() + INTERVAL '30 minutes')
  );
END;
$fn_reserve_next$;

-- ============================================================================
-- 6. FUNCTION: reserve_specific_gr
--    Reserve a specific GR number (when user manually picks one)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reserve_specific_gr(
  p_bill_book_id uuid,
  p_user_id uuid,
  p_branch_id uuid,
  p_gr_number integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn_reserve_specific$
DECLARE
  v_bill_book RECORD;
  v_user_name text;
  v_gr_no text;
  v_reservation_id uuid;
BEGIN
  -- Cleanup expired reservations first
  PERFORM public.cleanup_expired_reservations();

  -- Lock the bill book
  SELECT * INTO v_bill_book
  FROM public.bill_books
  WHERE id = p_bill_book_id
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bill book not found or inactive');
  END IF;

  -- Validate number is in range
  IF p_gr_number < v_bill_book.from_number OR p_gr_number > v_bill_book.to_number THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('Number %s is out of range (%s - %s)', p_gr_number, v_bill_book.from_number, v_bill_book.to_number)
    );
  END IF;

  -- Generate GR string
  v_gr_no := COALESCE(v_bill_book.prefix, '') 
            || LPAD(p_gr_number::text, v_bill_book.digits, '0') 
            || COALESCE(v_bill_book.postfix, '');

  -- Get user name
  SELECT name INTO v_user_name FROM public.users WHERE id = p_user_id;

  -- Check if already used in bilty
  IF EXISTS (
    SELECT 1 FROM public.bilty 
    WHERE gr_no = v_gr_no AND branch_id = p_branch_id AND is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', format('GR %s is already used in a bilty', v_gr_no));
  END IF;

  -- Check if already reserved
  IF EXISTS (
    SELECT 1 FROM public.gr_reservations 
    WHERE gr_no = v_gr_no AND branch_id = p_branch_id AND status = 'reserved' AND expires_at > NOW()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', format('GR %s is already reserved by another user', v_gr_no));
  END IF;

  -- Create reservation
  INSERT INTO public.gr_reservations (
    bill_book_id, branch_id, gr_no, gr_number, 
    user_id, user_name, status, reserved_at, expires_at
  ) VALUES (
    p_bill_book_id, p_branch_id, v_gr_no, p_gr_number,
    p_user_id, COALESCE(v_user_name, 'Unknown'), 'reserved', NOW(), NOW() + INTERVAL '30 minutes'
  )
  RETURNING id INTO v_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'gr_no', v_gr_no,
    'gr_number', p_gr_number,
    'expires_at', (NOW() + INTERVAL '30 minutes')
  );
END;
$fn_reserve_specific$;

-- ============================================================================
-- 6b. FUNCTION: reserve_gr_range
--     Batch reserve a range of consecutive GR numbers for a user.
--     Skips numbers already used in bilty or reserved by others.
--     Returns list of reserved + skipped numbers.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reserve_gr_range(
  p_bill_book_id uuid,
  p_user_id uuid,
  p_branch_id uuid,
  p_from_number integer,
  p_to_number integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn_reserve_range$
DECLARE
  v_bill_book RECORD;
  v_user_name text;
  v_gr_no text;
  v_reservation_id uuid;
  v_current integer;
  v_reserved jsonb := '[]'::jsonb;
  v_skipped jsonb := '[]'::jsonb;
  v_count integer := 0;
BEGIN
  -- Cleanup expired first
  PERFORM public.cleanup_expired_reservations();

  -- Lock bill book
  SELECT * INTO v_bill_book
  FROM public.bill_books
  WHERE id = p_bill_book_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bill book not found or inactive');
  END IF;

  -- Validate range
  IF p_from_number > p_to_number THEN
    RETURN jsonb_build_object('success', false, 'error', 'from_number must be <= to_number');
  END IF;

  IF p_from_number < v_bill_book.from_number OR p_to_number > v_bill_book.to_number THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Range %s-%s is outside bill book range %s-%s', p_from_number, p_to_number, v_bill_book.from_number, v_bill_book.to_number)
    );
  END IF;

  -- Get user name
  SELECT name INTO v_user_name FROM public.users WHERE id = p_user_id;
  v_user_name := COALESCE(v_user_name, 'Unknown User');

  -- Loop through requested range
  FOR v_current IN p_from_number..p_to_number LOOP
    v_gr_no := COALESCE(v_bill_book.prefix, '')
              || LPAD(v_current::text, v_bill_book.digits, '0')
              || COALESCE(v_bill_book.postfix, '');

    -- Check if used in bilty
    IF EXISTS (
      SELECT 1 FROM public.bilty
      WHERE gr_no = v_gr_no AND branch_id = p_branch_id AND is_active = true
    ) THEN
      v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('gr_no', v_gr_no, 'gr_number', v_current, 'reason', 'already used in bilty'));
      CONTINUE;
    END IF;

    -- Check if reserved by another user
    IF EXISTS (
      SELECT 1 FROM public.gr_reservations
      WHERE gr_no = v_gr_no AND branch_id = p_branch_id AND status = 'reserved' AND expires_at > NOW() AND user_id != p_user_id
    ) THEN
      v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('gr_no', v_gr_no, 'gr_number', v_current, 'reason', 'reserved by another user'));
      CONTINUE;
    END IF;

    -- Check if already reserved by this user (skip, don't duplicate)
    IF EXISTS (
      SELECT 1 FROM public.gr_reservations
      WHERE gr_no = v_gr_no AND branch_id = p_branch_id AND status = 'reserved' AND expires_at > NOW() AND user_id = p_user_id
    ) THEN
      v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('gr_no', v_gr_no, 'gr_number', v_current, 'reason', 'already reserved by you'));
      CONTINUE;
    END IF;

    -- Reserve it
    INSERT INTO public.gr_reservations (
      bill_book_id, branch_id, gr_no, gr_number,
      user_id, user_name, status, reserved_at, expires_at
    ) VALUES (
      p_bill_book_id, p_branch_id, v_gr_no, v_current,
      p_user_id, v_user_name, 'reserved', NOW(), NOW() + INTERVAL '30 minutes'
    ) RETURNING id INTO v_reservation_id;

    v_reserved := v_reserved || jsonb_build_array(jsonb_build_object(
      'reservation_id', v_reservation_id,
      'gr_no', v_gr_no,
      'gr_number', v_current
    ));
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'reserved_count', v_count,
    'reserved', v_reserved,
    'skipped', v_skipped
  );
END;
$fn_reserve_range$;

-- ============================================================================
-- 7. FUNCTION: release_gr_reservation
--    Release a reservation (user cancelled / navigated away)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.release_gr_reservation(
  p_reservation_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn_release$
DECLARE
  v_reservation RECORD;
BEGIN
  -- Get and lock the reservation
  SELECT * INTO v_reservation
  FROM public.gr_reservations
  WHERE id = p_reservation_id
    AND user_id = p_user_id
    AND status = 'reserved'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found or already released');
  END IF;

  -- Release it
  UPDATE public.gr_reservations
  SET 
    status = 'released',
    released_at = NOW()
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'gr_no', v_reservation.gr_no,
    'message', 'Reservation released successfully'
  );
END;
$fn_release$;

-- ============================================================================
-- 8. FUNCTION: complete_gr_reservation
--    Mark reservation as 'used' when bilty is actually saved.
--    This also handles bill book current_number update atomically.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_gr_reservation(
  p_reservation_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn_complete$
DECLARE
  v_reservation RECORD;
BEGIN
  -- Get and lock the reservation
  SELECT * INTO v_reservation
  FROM public.gr_reservations
  WHERE id = p_reservation_id
    AND user_id = p_user_id
    AND status = 'reserved'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found or not in reserved status');
  END IF;

  -- Mark as used
  UPDATE public.gr_reservations
  SET 
    status = 'used',
    used_at = NOW()
  WHERE id = p_reservation_id;

  -- NOW advance bill_books.current_number since the bilty is actually saved.
  -- Use GREATEST to ensure we only move forward, never backward.
  UPDATE public.bill_books
  SET current_number = GREATEST(current_number, v_reservation.gr_number + 1)
  WHERE id = v_reservation.bill_book_id;

  RETURN jsonb_build_object(
    'success', true,
    'gr_no', v_reservation.gr_no,
    'gr_number', v_reservation.gr_number,
    'message', 'Reservation completed - bilty saved'
  );
END;
$fn_complete$;

-- ============================================================================
-- 9. FUNCTION: extend_gr_reservation
--    Heartbeat - extend the expiry of an active reservation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.extend_gr_reservation(
  p_reservation_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn_extend$
DECLARE
  v_new_expiry timestamp with time zone;
BEGIN
  v_new_expiry := NOW() + INTERVAL '30 minutes';

  UPDATE public.gr_reservations
  SET expires_at = v_new_expiry
  WHERE id = p_reservation_id
    AND user_id = p_user_id
    AND status = 'reserved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found or expired');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'new_expires_at', v_new_expiry
  );
END;
$fn_extend$;

-- ============================================================================
-- 10. FUNCTION: get_branch_gr_status
--     Returns all active reservations + recent used GR numbers for a branch.
--     Used for the live status display.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_branch_gr_status(
  p_branch_id uuid,
  p_bill_book_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn_status$
DECLARE
  v_reservations jsonb;
  v_recent_used jsonb;
BEGIN
  -- Cleanup expired first
  PERFORM public.cleanup_expired_reservations();

  -- Get active reservations
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'gr_no', r.gr_no,
      'gr_number', r.gr_number,
      'user_id', r.user_id,
      'user_name', r.user_name,
      'bill_book_id', r.bill_book_id,
      'reserved_at', r.reserved_at,
      'expires_at', r.expires_at
    ) ORDER BY r.gr_number
  ), '[]'::jsonb) INTO v_reservations
  FROM public.gr_reservations r
  WHERE r.branch_id = p_branch_id
    AND r.status = 'reserved'
    AND r.expires_at > NOW()
    AND (p_bill_book_id IS NULL OR r.bill_book_id = p_bill_book_id);

  -- Get recently used (last 10 bilties created in last 1 hour)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'gr_no', b.gr_no,
      'consignor_name', b.consignor_name,
      'consignee_name', b.consignee_name,
      'created_at', b.created_at,
      'saving_option', b.saving_option
    ) ORDER BY b.created_at DESC
  ), '[]'::jsonb) INTO v_recent_used
  FROM (
    SELECT gr_no, consignor_name, consignee_name, created_at, saving_option
    FROM public.bilty
    WHERE branch_id = p_branch_id
      AND is_active = true
      AND created_at > NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC
    LIMIT 10
  ) b;

  RETURN jsonb_build_object(
    'reservations', v_reservations,
    'recent_bilties', v_recent_used
  );
END;
$fn_status$;

-- ============================================================================
-- 11. FUNCTION: release_all_user_reservations
--     Release ALL active reservations for a user (cleanup on logout/disconnect)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.release_all_user_reservations(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn_release_all$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.gr_reservations
  SET 
    status = 'released',
    released_at = NOW()
  WHERE user_id = p_user_id
    AND status = 'reserved';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'released_count', v_count
  );
END;
$fn_release_all$;

-- ============================================================================
-- 12. TRIGGER: Auto-update updated_at (if you have the function)
-- ============================================================================
-- CREATE TRIGGER update_gr_reservations_updated_at 
--   BEFORE UPDATE ON gr_reservations 
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 13. FUNCTION: find_unused_gr_numbers
--     Scans from bill_book.from_number to current_number-1 and finds GR numbers
--     that were never used (no bilty exists) and are not currently reserved.
--     These are "gaps" — numbers that were skipped, reserved-then-released, etc.
--     Returns up to p_limit unused numbers so the user can be warned.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.find_unused_gr_numbers(
  p_bill_book_id uuid,
  p_branch_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn_find_unused$
DECLARE
  v_bill_book RECORD;
  v_gr_no text;
  v_unused jsonb := '[]'::jsonb;
  v_count integer := 0;
  v_num integer;
BEGIN
  -- Get bill book info
  SELECT * INTO v_bill_book
  FROM public.bill_books
  WHERE id = p_bill_book_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bill book not found');
  END IF;

  -- Nothing to scan if current_number is at the start
  IF v_bill_book.current_number <= v_bill_book.from_number THEN
    RETURN jsonb_build_object(
      'success', true,
      'unused_count', 0,
      'unused', '[]'::jsonb
    );
  END IF;

  -- Scan from from_number to current_number - 1 looking for gaps
  -- Use a simple loop with early exit at limit for efficiency
  FOR v_num IN v_bill_book.from_number..(v_bill_book.current_number - 1) LOOP
    -- Construct the GR string
    v_gr_no := COALESCE(v_bill_book.prefix, '')
              || LPAD(v_num::text, v_bill_book.digits, '0')
              || COALESCE(v_bill_book.postfix, '');

    -- Check: NOT used in bilty AND NOT currently reserved
    IF NOT EXISTS (
      SELECT 1 FROM public.bilty
      WHERE gr_no = v_gr_no AND branch_id = p_branch_id AND is_active = true
    ) AND NOT EXISTS (
      SELECT 1 FROM public.gr_reservations
      WHERE gr_no = v_gr_no AND branch_id = p_branch_id
        AND status = 'reserved' AND expires_at > NOW()
    ) THEN
      v_unused := v_unused || jsonb_build_array(jsonb_build_object(
        'gr_no', v_gr_no,
        'gr_number', v_num
      ));
      v_count := v_count + 1;

      -- Stop early once we have enough
      IF v_count >= p_limit THEN
        EXIT;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'unused_count', v_count,
    'unused', v_unused,
    'total_scanned', GREATEST(v_bill_book.current_number - v_bill_book.from_number, 0)
  );
END;
$fn_find_unused$;

-- ============================================================================
-- USAGE EXAMPLES:
-- ============================================================================
-- Reserve next GR:
--   SELECT reserve_next_gr('bill-book-uuid', 'user-uuid', 'branch-uuid');
--
-- Reserve specific number:
--   SELECT reserve_specific_gr('bill-book-uuid', 'user-uuid', 'branch-uuid', 105);
--
-- Release reservation:
--   SELECT release_gr_reservation('reservation-uuid', 'user-uuid');
--
-- Complete reservation (bilty saved):
--   SELECT complete_gr_reservation('reservation-uuid', 'user-uuid');
--
-- Extend heartbeat:
--   SELECT extend_gr_reservation('reservation-uuid', 'user-uuid');
--
-- Get live status:
--   SELECT get_branch_gr_status('branch-uuid');
--   SELECT get_branch_gr_status('branch-uuid', 'bill-book-uuid');
--
-- Cleanup on logout:
--   SELECT release_all_user_reservations('user-uuid');
-- ============================================================================
