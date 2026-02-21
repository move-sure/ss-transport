'use client';

/**
 * GR RESERVATION SYSTEM - Frontend Hook (v2)
 * 
 * Manages GR number reservations with:
 * - Atomic reservation via Supabase RPC (DB functions)
 * - Real-time updates via Supabase Realtime channels
 * - Heartbeat to keep reservations alive
 * - Auto-release on unmount / page close
 * - Live status of all branch reservations
 * - Range reservation (batch reserve multiple GRs)
 * - Pending reservations management (switch, release individual)
 * - completeAndReserveNext for seamless save flow
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import supabase from '../app/utils/supabase';

// ============================================================================
// CONSTANTS
// ============================================================================
const HEARTBEAT_INTERVAL = 5 * 60 * 1000;  // 5 minutes
const REALTIME_CHANNEL_PREFIX = 'gr-reservations-';

// ============================================================================
// CORE API FUNCTIONS (call Supabase RPC)
// ============================================================================

/**
 * Reserve the next available GR number from a bill book.
 */
export const reserveNextGR = async (billBookId, userId, branchId) => {
  try {
    const { data, error } = await supabase.rpc('reserve_next_gr', {
      p_bill_book_id: billBookId,
      p_user_id: userId,
      p_branch_id: branchId
    });

    if (error) {
      console.error('❌ Error reserving GR:', error);
      return { success: false, error: error.message };
    }

    console.log('🎫 Reserve GR result:', data);
    return data;
  } catch (err) {
    console.error('❌ Exception reserving GR:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Reserve a specific GR number (manual pick).
 */
export const reserveSpecificGR = async (billBookId, userId, branchId, grNumber) => {
  try {
    const { data, error } = await supabase.rpc('reserve_specific_gr', {
      p_bill_book_id: billBookId,
      p_user_id: userId,
      p_branch_id: branchId,
      p_gr_number: grNumber
    });

    if (error) {
      console.error('❌ Error reserving specific GR:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (err) {
    console.error('❌ Exception reserving specific GR:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Reserve a range of GR numbers (batch).
 */
export const reserveGRRange = async (billBookId, userId, branchId, fromNumber, toNumber) => {
  try {
    const { data, error } = await supabase.rpc('reserve_gr_range', {
      p_bill_book_id: billBookId,
      p_user_id: userId,
      p_branch_id: branchId,
      p_from_number: fromNumber,
      p_to_number: toNumber
    });

    if (error) {
      console.error('❌ Error reserving GR range:', error);
      return { success: false, error: error.message };
    }

    console.log('🎫 Reserve range result:', data);
    return data;
  } catch (err) {
    console.error('❌ Exception reserving GR range:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Release a reservation (user cancels / resets form).
 */
export const releaseReservation = async (reservationId, userId) => {
  try {
    const { data, error } = await supabase.rpc('release_gr_reservation', {
      p_reservation_id: reservationId,
      p_user_id: userId
    });

    if (error) {
      console.error('❌ Error releasing reservation:', error);
      return { success: false, error: error.message };
    }

    console.log('🔓 Reservation released:', data);
    return data;
  } catch (err) {
    console.error('❌ Exception releasing reservation:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Complete a reservation when bilty is saved.
 */
export const completeReservation = async (reservationId, userId) => {
  try {
    const { data, error } = await supabase.rpc('complete_gr_reservation', {
      p_reservation_id: reservationId,
      p_user_id: userId
    });

    if (error) {
      console.error('❌ Error completing reservation:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Reservation completed:', data);
    return data;
  } catch (err) {
    console.error('❌ Exception completing reservation:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Extend reservation expiry (heartbeat).
 */
export const extendReservation = async (reservationId, userId) => {
  try {
    const { data, error } = await supabase.rpc('extend_gr_reservation', {
      p_reservation_id: reservationId,
      p_user_id: userId
    });

    if (error) {
      console.error('❌ Heartbeat error:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (err) {
    console.error('❌ Heartbeat exception:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Get live branch GR status (reservations + recent bilties).
 */
export const getBranchGRStatus = async (branchId, billBookId = null) => {
  try {
    const params = { p_branch_id: branchId };
    if (billBookId) params.p_bill_book_id = billBookId;

    const { data, error } = await supabase.rpc('get_branch_gr_status', params);

    if (error) {
      console.error('❌ Error getting branch status:', error);
      return { reservations: [], recent_bilties: [] };
    }

    return data;
  } catch (err) {
    console.error('❌ Exception getting branch status:', err);
    return { reservations: [], recent_bilties: [] };
  }
};

/**
 * Release ALL reservations for a user (on logout / cleanup).
 */
export const releaseAllUserReservations = async (userId) => {
  try {
    const { data, error } = await supabase.rpc('release_all_user_reservations', {
      p_user_id: userId
    });

    if (error) {
      console.error('❌ Error releasing all reservations:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (err) {
    console.error('❌ Exception releasing all:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Find unused GR numbers (gaps) between from_number and current_number.
 * These are numbers that were skipped/released and never saved as a bilty.
 */
export const findUnusedGRNumbers = async (billBookId, branchId, limit = 10) => {
  try {
    const { data, error } = await supabase.rpc('find_unused_gr_numbers', {
      p_bill_book_id: billBookId,
      p_branch_id: branchId,
      p_limit: limit
    });

    if (error) {
      console.error('❌ Error finding unused GR numbers:', error);
      return { success: false, unused: [], unused_count: 0 };
    }

    return data;
  } catch (err) {
    console.error('❌ Exception finding unused GR numbers:', err);
    return { success: false, unused: [], unused_count: 0 };
  }
};


// ============================================================================
// MAIN HOOK: useGRReservation
// ============================================================================

export const useGRReservation = ({
  userId,
  userName,
  branchId,
  selectedBillBook,
  isEditMode = false,
  enabled = true
}) => {
  // Current active reservation (the GR in the form right now)
  const [reservation, setReservation] = useState(null);
  const [reserving, setReserving] = useState(false);
  const [reservationError, setReservationError] = useState(null);
  
  // Branch-wide live status
  const [branchReservations, setBranchReservations] = useState([]);
  const [recentBilties, setRecentBilties] = useState([]);
  const [unusedGRNumbers, setUnusedGRNumbers] = useState([]);

  // Refs for cleanup
  const heartbeatRef = useRef(null);
  const channelRef = useRef(null);
  const reservationRef = useRef(null);

  // Keep ref in sync
  useEffect(() => {
    reservationRef.current = reservation;
  }, [reservation]);

  // ========================================================================
  // DERIVED: My pending reservations (all my reservations EXCEPT active one)
  // ========================================================================
  const myPendingReservations = useMemo(() =>
    branchReservations
      .filter(r => r.user_id === userId && r.id !== reservation?.id)
      .sort((a, b) => a.gr_number - b.gr_number),
    [branchReservations, userId, reservation?.id]
  );

  // All my reservations (including active)
  const myAllReservations = useMemo(() =>
    branchReservations
      .filter(r => r.user_id === userId)
      .sort((a, b) => a.gr_number - b.gr_number),
    [branchReservations, userId]
  );

  // ========================================================================
  // REFRESH BRANCH STATUS (moved up so other functions can call it)
  // ========================================================================
  const refreshStatus = useCallback(async () => {
    if (!branchId) return;

    const status = await getBranchGRStatus(branchId, selectedBillBook?.id);
    setBranchReservations(status.reservations || []);
    setRecentBilties(status.recent_bilties || []);
  }, [branchId, selectedBillBook?.id]);

  // ========================================================================
  // FETCH UNUSED GR NUMBERS - gaps in sequence (moved up so other functions can call it)
  // ========================================================================
  const refreshUnusedGRs = useCallback(async () => {
    if (!branchId || !selectedBillBook?.id) {
      setUnusedGRNumbers([]);
      return;
    }

    const result = await findUnusedGRNumbers(selectedBillBook.id, branchId, 10);
    if (result.success) {
      setUnusedGRNumbers(result.unused || []);
      if (result.unused_count > 0) {
        console.log(`⚠️ Found ${result.unused_count} unused GR numbers:`, result.unused.map(u => u.gr_no).join(', '));
      }
    } else {
      setUnusedGRNumbers([]);
    }
  }, [branchId, selectedBillBook?.id]);

  // ========================================================================
  // RESERVE NEXT GR NUMBER
  // ========================================================================
  const reserveNext = useCallback(async () => {
    if (!userId || !branchId || !selectedBillBook?.id || isEditMode || !enabled) {
      return null;
    }

    setReserving(true);
    setReservationError(null);

    try {
      const result = await reserveNextGR(selectedBillBook.id, userId, branchId);
      
      if (result.success) {
        const newReservation = {
          id: result.reservation_id,
          gr_no: result.gr_no,
          gr_number: result.gr_number,
          already_reserved: result.already_reserved,
          expires_at: result.expires_at
        };
        
        setReservation(newReservation);
        console.log('🎫 GR Reserved:', newReservation.gr_no, result.already_reserved ? '(existing)' : '(new)');
        return newReservation;
      } else {
        setReservationError(result.error);
        console.error('❌ Failed to reserve GR:', result.error);
        return null;
      }
    } catch (err) {
      setReservationError(err.message);
      return null;
    } finally {
      setReserving(false);
    }
  }, [userId, branchId, selectedBillBook?.id, isEditMode, enabled]);

  // ========================================================================
  // RESERVE SPECIFIC GR NUMBER
  // ========================================================================
  const reserveSpecific = useCallback(async (grNumber) => {
    if (!userId || !branchId || !selectedBillBook?.id) return null;

    setReserving(true);
    setReservationError(null);

    try {
      // Release current reservation first
      if (reservationRef.current?.id) {
        await releaseReservation(reservationRef.current.id, userId);
      }

      const result = await reserveSpecificGR(selectedBillBook.id, userId, branchId, grNumber);
      
      if (result.success) {
        const newReservation = {
          id: result.reservation_id,
          gr_no: result.gr_no,
          gr_number: result.gr_number,
          expires_at: result.expires_at
        };
        setReservation(newReservation);
        // Refresh unused list since this number is now reserved
        refreshUnusedGRs();
        return newReservation;
      } else {
        setReservationError(result.error);
        return null;
      }
    } catch (err) {
      setReservationError(err.message);
      return null;
    } finally {
      setReserving(false);
    }
  }, [userId, branchId, selectedBillBook?.id]);

  // ========================================================================
  // RESERVE RANGE (batch)
  // ========================================================================
  const reserveRange = useCallback(async (fromNum, toNum) => {
    if (!userId || !branchId || !selectedBillBook?.id) return null;

    setReserving(true);
    setReservationError(null);

    try {
      const result = await reserveGRRange(selectedBillBook.id, userId, branchId, fromNum, toNum);

      if (result.success && result.reserved?.length > 0) {
        // Set the first reserved number as active if no current reservation
        if (!reservationRef.current) {
          const first = result.reserved[0];
          setReservation({
            id: first.reservation_id,
            gr_no: first.gr_no,
            gr_number: first.gr_number,
            expires_at: null
          });
        }
        // Refresh status to show all new reservations in live panel
        refreshStatus();
      }

      return result;
    } catch (err) {
      setReservationError(err.message);
      return { success: false, error: err.message };
    } finally {
      setReserving(false);
    }
  }, [userId, branchId, selectedBillBook?.id]);

  // ========================================================================
  // RELEASE CURRENT RESERVATION
  // ========================================================================
  const release = useCallback(async () => {
    const currentRes = reservationRef.current;
    if (!currentRes?.id || !userId) return;

    try {
      await releaseReservation(currentRes.id, userId);
      setReservation(null);
      console.log('🔓 Released GR:', currentRes.gr_no);
      refreshStatus();
    } catch (err) {
      console.error('Error releasing:', err);
    }
  }, [userId]);

  // ========================================================================
  // RELEASE A SPECIFIC RESERVATION BY ID
  // ========================================================================
  const releaseById = useCallback(async (reservationId) => {
    if (!userId) return;

    try {
      await releaseReservation(reservationId, userId);
      
      // If releasing the active reservation, clear it
      if (reservationRef.current?.id === reservationId) {
        setReservation(null);
      }

      console.log('🔓 Released reservation:', reservationId);
      refreshStatus();
    } catch (err) {
      console.error('Error releasing by ID:', err);
    }
  }, [userId]);

  // ========================================================================
  // SWITCH ACTIVE RESERVATION (use a different pending GR)
  // ========================================================================
  const switchToReservation = useCallback((resData) => {
    setReservation({
      id: resData.id,
      gr_no: resData.gr_no,
      gr_number: resData.gr_number,
      expires_at: resData.expires_at
    });
    console.log('🔄 Switched active GR to:', resData.gr_no);
  }, []);

  // ========================================================================
  // COMPLETE RESERVATION (bilty saved)
  // ========================================================================
  const complete = useCallback(async () => {
    const currentRes = reservationRef.current;
    if (!currentRes?.id || !userId) return;

    try {
      await completeReservation(currentRes.id, userId);
      setReservation(null);
      console.log('✅ Completed GR:', currentRes.gr_no);
    } catch (err) {
      console.error('Error completing:', err);
    }
  }, [userId]);

  // ========================================================================
  // COMPLETE + USE NEXT PENDING
  // After saving a bilty, complete the reservation and switch to next
  // pending reservation if any. Does NOT auto-reserve new numbers.
  // ========================================================================
  const completeAndReserveNext = useCallback(async () => {
    const currentRes = reservationRef.current;
    if (!currentRes?.id || !userId) return null;

    try {
      // 1. Complete current reservation
      await completeReservation(currentRes.id, userId);
      setReservation(null);
      console.log('✅ Completed GR:', currentRes.gr_no);

      // 2. Fetch FRESH status to find user's remaining pending reservations
      const status = await getBranchGRStatus(branchId, selectedBillBook?.id);
      const freshReservations = status.reservations || [];
      const freshRecent = status.recent_bilties || [];
      
      setBranchReservations(freshReservations);
      setRecentBilties(freshRecent);

      // 3. Check if user has other pending reservations
      const myPending = freshReservations
        .filter(r => r.user_id === userId)
        .sort((a, b) => a.gr_number - b.gr_number);

      if (myPending.length > 0) {
        // Switch to next pending reservation (lowest number)
        const next = myPending[0];
        const newRes = {
          id: next.id,
          gr_no: next.gr_no,
          gr_number: next.gr_number,
          expires_at: next.expires_at
        };
        setReservation(newRes);
        console.log('🔄 Switched to next pending GR:', next.gr_no);
        return newRes;
      }

      // 4. No pending reservations — user must click Reserve for next one
      // Refresh unused GRs since current_number may have advanced
      refreshUnusedGRs();
      console.log('ℹ️ No pending reservations. User can click Reserve for next GR.');
      return null;
    } catch (err) {
      console.error('Error in completeAndReserveNext:', err);
      return null;
    }
  }, [userId, branchId, selectedBillBook?.id]);

  // ========================================================================
  // NO AUTO-RESERVE: Users must click "Reserve" button manually.
  // This prevents accidental reservations when users just browse the page.
  // On page load, we only fetch branch status for the live panel.
  // ========================================================================
  useEffect(() => {
    if (!enabled || !branchId) return;
    refreshStatus();
    refreshUnusedGRs();
  }, [selectedBillBook?.id, enabled, branchId]);

  // ========================================================================
  // AUTO-RESTORE: If user has existing reservations (from before page refresh
  // or range reserve), automatically set the first one as the active reservation.
  // This ensures the user sees their already-reserved GR, not a calculated one.
  // ========================================================================
  useEffect(() => {
    // Only auto-restore if we have NO active reservation yet
    if (reservation?.id || !userId || isEditMode || !enabled) return;
    
    // Find user's existing reservations in branchReservations
    const myExisting = branchReservations
      .filter(r => r.user_id === userId)
      .sort((a, b) => a.gr_number - b.gr_number);
    
    if (myExisting.length > 0) {
      const first = myExisting[0];
      console.log('🔄 Auto-restoring existing reservation:', first.gr_no, `(+${myExisting.length - 1} pending)`);
      setReservation({
        id: first.id,
        gr_no: first.gr_no,
        gr_number: first.gr_number,
        expires_at: first.expires_at
      });
    }
  }, [branchReservations, userId, reservation?.id, isEditMode, enabled]);

  // ========================================================================
  // HEARTBEAT - Keep ALL user's reservations alive
  // ========================================================================
  useEffect(() => {
    if (!reservation?.id || !userId) {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return;
    }

    heartbeatRef.current = setInterval(async () => {
      // Extend active reservation
      const result = await extendReservation(reservation.id, userId);
      if (!result.success) {
        console.warn('⚠️ Heartbeat failed - reservation may have expired');
        setReservation(null);
      } else {
        console.log('💓 Heartbeat OK, new expiry:', result.new_expires_at);
      }

      // Also extend any pending reservations
      for (const pending of myPendingReservations) {
        await extendReservation(pending.id, userId).catch(() => {});
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [reservation?.id, userId, myPendingReservations]);

  // ========================================================================
  // REALTIME SUBSCRIPTION
  // ========================================================================
  useEffect(() => {
    if (!branchId || !enabled) return;

    const channelName = `${REALTIME_CHANNEL_PREFIX}${branchId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gr_reservations',
          filter: `branch_id=eq.${branchId}`
        },
        (payload) => {
          console.log('📡 Realtime GR change:', payload.eventType, payload.new?.gr_no || payload.old?.gr_no);
          refreshStatus();
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
      });

    channelRef.current = channel;
    refreshStatus();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [branchId, enabled, selectedBillBook?.id]);

  // ========================================================================
  // NOTE: We intentionally do NOT release reservations on page refresh/close.
  // ========================================================================
  // Reservations have a 30-minute TTL and are extended by heartbeat while
  // the user is active on the bilty page. This design prevents the critical
  // bug where refreshing the page would release all reservations, allowing
  // other users to grab them instantly.
  //
  // On page refresh:
  //   1. Reservations persist in DB (status='reserved', expires_at is still valid)
  //   2. Auto-reserve useEffect fires → calls reserve_next_gr()
  //   3. SQL function finds existing reservation → returns it (already_reserved=true)
  //   4. User gets their same GR number back — no duplication, no loss
  //
  // On actual tab close:
  //   - Reservations expire naturally after 30 minutes
  //   - cleanup_expired_reservations() marks them expired on next call
  // ========================================================================

  return {
    // Current active reservation
    reservation,
    reserving,
    reservationError,
    
    // Actions
    reserveNext,
    reserveSpecific,
    reserveRange,
    release,
    releaseById,
    complete,
    completeAndReserveNext,
    switchToReservation,
    refreshStatus,
    refreshUnusedGRs,
    
    // Branch-wide status (live)
    branchReservations,
    recentBilties,
    
    // Unused GR numbers (gaps in sequence)
    unusedGRNumbers,
    
    // User's reservations
    myPendingReservations,
    myAllReservations,
    
    // Derived
    hasReservation: !!reservation?.id,
    reservedGRNo: reservation?.gr_no || null,
    reservedGRNumber: reservation?.gr_number || null
  };
};

export default useGRReservation;
