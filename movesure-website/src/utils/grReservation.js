'use client';

/**
 * GR RESERVATION SYSTEM - Frontend Hook (v3 — Backend API)
 * 
 * All reservation logic now goes through the backend API:
 *   /api/bilty/gr/reserve, /complete, /release, /extend, /status, /validate, /next-available
 * 
 * Features:
 * - Upcoming 5 GR numbers shown via /next-available
 * - Auto-validate & fix current_number on page load via /validate
 * - Heartbeat via /extend
 * - Realtime via Supabase channel (for live panel updates)
 * - Release on cancel, complete on save
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import supabase from '../app/utils/supabase';

// ============================================================================
// CONSTANTS
// ============================================================================
const BILTY_API_URL = 'https://movesure-backend.onrender.com';
const HEARTBEAT_INTERVAL = 5 * 60 * 1000;  // 5 minutes
const REALTIME_CHANNEL_PREFIX = 'gr-reservations-';

// ============================================================================
// BACKEND API HELPERS
// ============================================================================

const FETCH_TIMEOUT = 15000; // 15s timeout for all API calls
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // exponential backoff: 1s, 2s, 4s

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryableError = (err, res) => {
  // Retry on network errors, timeouts, 502/503/504, and "resource temporarily unavailable"
  if (err?.name === 'AbortError') return true;
  if (err && !res) return true; // network failure
  if (res && [502, 503, 504, 429].includes(res.status)) return true;
  return false;
};

const fetchWithTimeout = (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeout));
};

const fetchWithRetry = async (url, options = {}) => {
  let lastErr = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, options);
      // Retry on server errors (502/503/504)
      if (isRetryableError(null, res) && attempt < MAX_RETRIES) {
        console.warn(`⚠️ Retry ${attempt + 1}/${MAX_RETRIES} (HTTP ${res.status}):`, url);
        await delay(RETRY_DELAYS[attempt] || 4000);
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        console.warn(`⚠️ Retry ${attempt + 1}/${MAX_RETRIES} (${err.name}):`, url);
        await delay(RETRY_DELAYS[attempt] || 4000);
      }
    }
  }
  throw lastErr;
};

const apiGet = async (path) => {
  try {
    const res = await fetchWithRetry(`${BILTY_API_URL}${path}`);
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('⏱️ API timeout after retries:', path);
      return { status: 'error', message: 'Request timed out after retries. Please check your connection.' };
    }
    console.error('🌐 Network error after retries:', path, err.message);
    return { status: 'error', message: 'Network error: ' + err.message };
  }
};

const apiPost = async (path, body = {}) => {
  try {
    const res = await fetchWithRetry(`${BILTY_API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('⏱️ API timeout after retries:', path);
      return { status: 'error', message: 'Request timed out after retries. Please check your connection.' };
    }
    console.error('🌐 Network error after retries:', path, err.message);
    return { status: 'error', message: 'Network error: ' + err.message };
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
  // Current active reservation
  const [reservation, setReservation] = useState(null);
  const [reserving, setReserving] = useState(false);
  const [reservationError, setReservationError] = useState(null);

  // Upcoming 5 available GR numbers (from /next-available)
  const [nextAvailable, setNextAvailable] = useState([]);

  // Branch-wide live status
  const [branchReservations, setBranchReservations] = useState([]);
  const [recentBilties, setRecentBilties] = useState([]);

  // Bill book validation state
  const [billBookValidation, setBillBookValidation] = useState(null);

  // Refs
  const heartbeatRef = useRef(null);
  const channelRef = useRef(null);
  const reservationRef = useRef(null);
  const releasingRef = useRef(false);

  useEffect(() => { reservationRef.current = reservation; }, [reservation]);

  // ========================================================================
  // DERIVED
  // ========================================================================
  const myPendingReservations = useMemo(() =>
    branchReservations
      .filter(r => r.user_id === userId && r.id !== reservation?.id)
      .sort((a, b) => a.gr_number - b.gr_number),
    [branchReservations, userId, reservation?.id]
  );

  const myAllReservations = useMemo(() =>
    branchReservations
      .filter(r => r.user_id === userId)
      .sort((a, b) => a.gr_number - b.gr_number),
    [branchReservations, userId]
  );

  // ========================================================================
  // FETCH NEXT 5 AVAILABLE GR NUMBERS
  // ========================================================================
  const refreshNextAvailable = useCallback(async () => {
    if (!branchId || !selectedBillBook?.id) { setNextAvailable([]); return; }
    try {
      const result = await apiGet(
        `/api/bilty/gr/next-available?bill_book_id=${selectedBillBook.id}&branch_id=${branchId}&count=5`
      );
      if (result.status === 'success') {
        setNextAvailable(result.data?.available || []);
        console.log('📋 Next 5 available GRs:', (result.data?.available || []).map(a => a.gr_no).join(', '));
      }
    } catch (err) {
      console.error('❌ Error fetching next available:', err);
    }
  }, [branchId, selectedBillBook?.id]);

  // ========================================================================
  // VALIDATE & AUTO-FIX BILL BOOK
  // ========================================================================
  const validateBillBook = useCallback(async () => {
    if (!selectedBillBook?.id) return null;
    try {
      const result = await apiGet(`/api/bilty/gr/validate/${selectedBillBook.id}`);
      if (result.status === 'success') {
        setBillBookValidation(result.data);
        if (result.data?.fixed) {
          console.log('🔧 Bill book auto-fixed: current_number', result.data.old_current_number, '→', result.data.new_current_number);
        }
        // Update next available from validation response
        if (result.data?.next_available) {
          setNextAvailable(result.data.next_available);
        }
        return result.data;
      }
    } catch (err) {
      console.error('❌ Error validating bill book:', err);
    }
    return null;
  }, [selectedBillBook?.id]);

  // ========================================================================
  // REFRESH BRANCH STATUS
  // ========================================================================
  const refreshStatus = useCallback(async () => {
    if (!branchId) return;
    try {
      const url = selectedBillBook?.id
        ? `/api/bilty/gr/status/${branchId}?bill_book_id=${selectedBillBook.id}`
        : `/api/bilty/gr/status/${branchId}`;
      const result = await apiGet(url);
      if (result.status === 'success') {
        setBranchReservations(result.data?.reservations || []);
        setRecentBilties(result.data?.recent_bilties || []);
      }
    } catch (err) {
      console.error('❌ Error getting branch status:', err);
    }
  }, [branchId, selectedBillBook?.id]);

  // ========================================================================
  // RESERVE NEXT AVAILABLE GR
  // ========================================================================
  const reservingRef = useRef(false); // Prevent double-reserve race condition

  const reserveNext = useCallback(async () => {
    if (!userId || !branchId || !selectedBillBook?.id || isEditMode || !enabled) return null;
    if (reservingRef.current) { console.log('⚠️ Reserve already in-flight, skipping'); return null; }
    reservingRef.current = true;

    setReserving(true);
    setReservationError(null);

    try {
      const result = await apiPost('/api/bilty/gr/reserve', {
        bill_book_id: selectedBillBook.id,
        branch_id: branchId,
        user_id: userId,
        user_name: userName || 'Unknown'
      });

      if (result.status === 'success') {
        const res = result.data?.reservation || result.data;
        const newReservation = {
          id: res.id || res.reservation_id,
          gr_no: result.data?.gr_no || res.gr_no,
          gr_number: result.data?.gr_number || res.gr_number,
          expires_at: result.data?.expires_at || res.expires_at
        };
        setReservation(newReservation);
        console.log('🎫 GR Reserved:', newReservation.gr_no);
        // Refresh available list since one is now reserved
        refreshNextAvailable();
        refreshStatus();
        return newReservation;
      } else {
        setReservationError(result.message || 'Reserve failed');
        console.error('❌ Failed to reserve GR:', result.message);
        return null;
      }
    } catch (err) {
      setReservationError(err.message);
      return null;
    } finally {
      setReserving(false);
      reservingRef.current = false;
    }
  }, [userId, userName, branchId, selectedBillBook?.id, isEditMode, enabled, refreshNextAvailable, refreshStatus]);

  // ========================================================================
  // RESERVE SPECIFIC GR NUMBER (user clicks one of the 5)
  // ========================================================================
  const reserveSpecific = useCallback(async (grNumber) => {
    if (!userId || !branchId || !selectedBillBook?.id) return null;

    setReserving(true);
    setReservationError(null);

    try {
      // Release current reservation first
      if (reservationRef.current?.id) {
        await apiPost(`/api/bilty/gr/release/${reservationRef.current.id}`, { user_id: userId });
      }

      const result = await apiPost('/api/bilty/gr/reserve', {
        bill_book_id: selectedBillBook.id,
        branch_id: branchId,
        user_id: userId,
        user_name: userName || 'Unknown',
        gr_number: grNumber
      });

      if (result.status === 'success') {
        const res = result.data?.reservation || result.data;
        const newReservation = {
          id: res.id || res.reservation_id,
          gr_no: result.data?.gr_no || res.gr_no,
          gr_number: result.data?.gr_number || res.gr_number,
          expires_at: result.data?.expires_at || res.expires_at
        };
        setReservation(newReservation);
        console.log('🎫 Specific GR Reserved:', newReservation.gr_no);
        refreshNextAvailable();
        refreshStatus();
        return newReservation;
      } else {
        setReservationError(result.message || 'Reserve failed');
        return null;
      }
    } catch (err) {
      setReservationError(err.message);
      return null;
    } finally {
      setReserving(false);
    }
  }, [userId, userName, branchId, selectedBillBook?.id, refreshNextAvailable, refreshStatus]);

  // ========================================================================
  // RELEASE CURRENT RESERVATION
  // ========================================================================
  const release = useCallback(async () => {
    const currentRes = reservationRef.current;
    if (!currentRes?.id || !userId) return;

    releasingRef.current = true;
    try {
      await apiPost(`/api/bilty/gr/release/${currentRes.id}`, { user_id: userId });
      setReservation(null);
      console.log('🔓 Released GR:', currentRes.gr_no);
      await refreshStatus();
      refreshNextAvailable();
    } catch (err) {
      console.error('Error releasing:', err);
    } finally {
      releasingRef.current = false;
    }
  }, [userId, refreshNextAvailable, refreshStatus]);

  // ========================================================================
  // RELEASE A SPECIFIC RESERVATION BY ID
  // ========================================================================
  const releaseById = useCallback(async (reservationId) => {
    if (!userId) return;
    releasingRef.current = true;
    try {
      await apiPost(`/api/bilty/gr/release/${reservationId}`, { user_id: userId });
      if (reservationRef.current?.id === reservationId) {
        setReservation(null);
      }
      console.log('🔓 Released reservation:', reservationId);
      await refreshStatus();
      refreshNextAvailable();
    } catch (err) {
      console.error('Error releasing by ID:', err);
    } finally {
      releasingRef.current = false;
    }
  }, [userId, refreshNextAvailable, refreshStatus]);

  // ========================================================================
  // SWITCH ACTIVE RESERVATION
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
      const result = await apiPost(`/api/bilty/gr/complete/${currentRes.id}`, { user_id: userId });
      setReservation(null);
      console.log('✅ Completed GR:', currentRes.gr_no, result.data?.current_number_advanced_to);
      refreshNextAvailable();
      refreshStatus();
    } catch (err) {
      console.error('Error completing:', err);
    }
  }, [userId, refreshNextAvailable, refreshStatus]);

  // ========================================================================
  // COMPLETE + USE NEXT PENDING
  // ========================================================================
  const completeAndReserveNext = useCallback(async () => {
    const currentRes = reservationRef.current;
    if (!currentRes?.id || !userId) return null;

    try {
      // 1. Complete current reservation via backend
      await apiPost(`/api/bilty/gr/complete/${currentRes.id}`, { user_id: userId });
      setReservation(null);
      console.log('✅ Completed GR:', currentRes.gr_no);

      // 2. Refresh status to find remaining pending reservations
      const statusUrl = selectedBillBook?.id
        ? `/api/bilty/gr/status/${branchId}?bill_book_id=${selectedBillBook.id}`
        : `/api/bilty/gr/status/${branchId}`;
      const statusResult = await apiGet(statusUrl);
      const freshReservations = statusResult.data?.reservations || [];
      const freshRecent = statusResult.data?.recent_bilties || [];

      setBranchReservations(freshReservations);
      setRecentBilties(freshRecent);

      // 3. Switch to next pending reservation if any
      const myPending = freshReservations
        .filter(r => r.user_id === userId)
        .sort((a, b) => a.gr_number - b.gr_number);

      if (myPending.length > 0) {
        const next = myPending[0];
        const newRes = {
          id: next.id,
          gr_no: next.gr_no,
          gr_number: next.gr_number,
          expires_at: next.expires_at
        };
        setReservation(newRes);
        console.log('🔄 Switched to next pending GR:', next.gr_no);
        refreshNextAvailable();
        return newRes;
      }

      // 4. No pending — auto-reserve next available GR for seamless flow
      await refreshNextAvailable();
      
      // Try to reserve the next GR automatically
      if (!reservingRef.current && userId && branchId && selectedBillBook?.id && !isEditMode && enabled) {
        try {
          const reserveResult = await apiPost('/api/bilty/gr/reserve', {
            bill_book_id: selectedBillBook.id,
            branch_id: branchId,
            user_id: userId,
            user_name: userName || 'Unknown'
          });
          if (reserveResult.status === 'success') {
            const res = reserveResult.data?.reservation || reserveResult.data;
            const autoReserved = {
              id: res.id || res.reservation_id,
              gr_no: reserveResult.data?.gr_no || res.gr_no,
              gr_number: reserveResult.data?.gr_number || res.gr_number,
              expires_at: reserveResult.data?.expires_at || res.expires_at
            };
            setReservation(autoReserved);
            console.log('🎫 Auto-reserved next GR after complete:', autoReserved.gr_no);
            refreshNextAvailable();
            return autoReserved;
          }
        } catch (autoErr) {
          console.warn('⚠️ Auto-reserve after complete failed:', autoErr);
        }
      }
      
      console.log('ℹ️ No pending reservations. User can pick from next 5 or click Reserve.');
      return null;
    } catch (err) {
      console.error('Error in completeAndReserveNext:', err);
      return null;
    }
  }, [userId, userName, branchId, selectedBillBook?.id, isEditMode, enabled, refreshNextAvailable]);

  // ========================================================================
  // RELEASE ALL USER RESERVATIONS
  // ========================================================================
  const releaseAll = useCallback(async () => {
    if (!userId || !branchId) return;
    releasingRef.current = true;
    try {
      await apiPost('/api/bilty/gr/release-all', { user_id: userId, branch_id: branchId });
      setReservation(null);
      await refreshStatus();
      refreshNextAvailable();
    } catch (err) {
      console.error('Error releasing all:', err);
    } finally {
      releasingRef.current = false;
    }
  }, [userId, branchId, refreshStatus, refreshNextAvailable]);

  // ========================================================================
  // FIX GR SEQUENCE via backend
  // ========================================================================
  const fixSequence = useCallback(async (correctNumber = null) => {
    if (!selectedBillBook?.id) return null;
    try {
      const body = { bill_book_id: selectedBillBook.id };
      if (correctNumber != null) body.correct_number = correctNumber;
      const result = await apiPost('/api/bilty/gr/fix-sequence', body);
      if (result.status === 'success') {
        console.log('🔧 Sequence fixed:', result.data);
        refreshNextAvailable();
        return result.data;
      }
      return null;
    } catch (err) {
      console.error('Error fixing sequence:', err);
      return null;
    }
  }, [selectedBillBook?.id, refreshNextAvailable]);

  // ========================================================================
  // ON LOAD: Validate bill book + fetch status + fetch next available
  // ========================================================================
  useEffect(() => {
    if (!enabled || !branchId || !selectedBillBook?.id) return;
    validateBillBook();
    refreshStatus();
    refreshNextAvailable();
  }, [selectedBillBook?.id, enabled, branchId]);

  // ========================================================================
  // AUTO-RESTORE existing reservation on page load/refresh
  // ========================================================================
  useEffect(() => {
    if (reservation?.id || !userId || isEditMode || !enabled || releasingRef.current) return;

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
  // HEARTBEAT — extend all user's reservations via backend
  // ========================================================================
  useEffect(() => {
    if (!reservation?.id || !userId) {
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      return;
    }

    heartbeatRef.current = setInterval(async () => {
      try {
        const result = await apiPost(`/api/bilty/gr/extend/${reservation.id}`, { user_id: userId });
        if (result.status === 'success') {
          console.log('💓 Heartbeat OK, new expiry:', result.data?.expires_at);
        } else {
          console.warn('⚠️ Heartbeat failed — reservation may have expired');
          setReservation(null);
        }
        // Extend pending reservations too
        for (const pending of myPendingReservations) {
          await apiPost(`/api/bilty/gr/extend/${pending.id}`, { user_id: userId }).catch(() => {});
        }
      } catch (err) {
        console.warn('⚠️ Heartbeat error:', err);
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    };
  }, [reservation?.id, userId, myPendingReservations]);

  // ========================================================================
  // REALTIME SUBSCRIPTION (for live panel updates)
  // ========================================================================
  useEffect(() => {
    if (!branchId || !enabled) return;

    const channelName = `${REALTIME_CHANNEL_PREFIX}${branchId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gr_reservations', filter: `branch_id=eq.${branchId}` },
        (payload) => {
          console.log('📡 Realtime GR change:', payload.eventType, payload.new?.gr_no || payload.old?.gr_no);
          refreshStatus();
          refreshNextAvailable();
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, [branchId, enabled, selectedBillBook?.id]);

  return {
    // Current active reservation
    reservation,
    reserving,
    reservationError,

    // Next 5 available GR numbers
    nextAvailable,
    refreshNextAvailable,

    // Bill book validation
    billBookValidation,
    validateBillBook,

    // Actions
    reserveNext,
    reserveSpecific,
    release,
    releaseById,
    releaseAll,
    complete,
    completeAndReserveNext,
    switchToReservation,
    fixSequence,
    refreshStatus,

    // Branch-wide status (live)
    branchReservations,
    recentBilties,

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
