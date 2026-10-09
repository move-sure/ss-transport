'use client';

import { useState, useEffect } from 'react';
import supabase from '../../app/utils/supabase';

/**
 * Fetch the last 10 bilties for a party and tally the given column.
 * Looks at the consignor + consignee pair first (payment mode usually depends on the
 * receiver - one consignor can ship Paid to some consignees and To Pay to others),
 * and falls back to the consignor's overall history when the pair has none.
 * @returns {Promise<Object|null>} - { value, count, totalBilties, lastDate, allValues, matchedOn }
 */
const fetchPartyHistory = async (column, consignorName, consigneeName, branchId) => {
  const queryHistory = async (withConsignee) => {
    let query = supabase
      .from('bilty')
      .select(`${column}, bilty_date, gr_no`)
      .eq('consignor_name', consignorName)
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .not(column, 'is', null);
    if (withConsignee) query = query.eq('consignee_name', consigneeName);
    const { data, error } = await query
      .order('bilty_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    return data || [];
  };

  let matchedOn = 'consignee';
  let data = consigneeName ? await queryHistory(true) : [];
  if (data.length === 0) {
    matchedOn = 'consignor';
    data = await queryHistory(false);
  }
  if (data.length === 0) return null;

  // Count occurrences and pick the most common value
  const counts = {};
  data.forEach(bilty => {
    counts[bilty[column]] = (counts[bilty[column]] || 0) + 1;
  });
  let value = null;
  let maxCount = 0;
  Object.entries(counts).forEach(([v, count]) => {
    if (count > maxCount) {
      maxCount = count;
      value = v;
    }
  });

  return {
    value,
    count: maxCount,
    totalBilties: data.length,
    lastDate: data[0].bilty_date,
    allValues: counts,
    matchedOn
  };
};

/**
 * Shared hook state for consignor/consignee history lookups (debounced, ignores stale responses)
 */
const usePartyHistory = (column, consignorName, consigneeName, branchId) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const consignee = consigneeName?.trim() || '';

  useEffect(() => {
    // Reset state if no consignor name
    if (!consignorName || !branchId) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    // Debounce so typing a consignee name doesn't fire a query per keystroke
    const timer = setTimeout(async () => {
      try {
        const history = await fetchPartyHistory(column, consignorName, consignee, branchId);
        if (!cancelled) setResult(history);
      } catch (err) {
        console.error(`Error fetching ${column} history:`, err);
        if (!cancelled) {
          setError(err.message);
          setResult(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [column, consignorName, consignee, branchId]);

  return { result, loading, error };
};

/**
 * Hook to fetch the most common payment mode for a consignor + consignee based on last 10 bilties
 * @param {string} consignorName - Name of the consignor
 * @param {string} branchId - Branch ID
 * @param {string} consigneeName - Name of the consignee (optional; falls back to consignor-only history)
 * @returns {Object} - { paymentMode, loading, error, biltyCount }
 */
export const useConsignorPaymentMode = (consignorName, branchId, consigneeName) => {
  const { result, loading, error } = usePartyHistory('payment_mode', consignorName, consigneeName, branchId);
  const paymentMode = result && {
    mode: result.value,
    count: result.count,
    totalBilties: result.totalBilties,
    lastDate: result.lastDate,
    allModes: result.allValues,
    matchedOn: result.matchedOn
  };
  return { paymentMode, loading, error, biltyCount: result?.totalBilties || 0 };
};

/**
 * Hook to fetch the most common delivery type for a consignor + consignee based on last 10 bilties
 * @param {string} consignorName - Name of the consignor
 * @param {string} branchId - Branch ID
 * @param {string} consigneeName - Name of the consignee (optional; falls back to consignor-only history)
 * @returns {Object} - { deliveryType, loading, error, biltyCount }
 */
export const useConsignorDeliveryType = (consignorName, branchId, consigneeName) => {
  const { result, loading, error } = usePartyHistory('delivery_type', consignorName, consigneeName, branchId);
  const deliveryType = result && {
    type: result.value,
    count: result.count,
    totalBilties: result.totalBilties,
    lastDate: result.lastDate,
    allTypes: result.allValues,
    matchedOn: result.matchedOn
  };
  return { deliveryType, loading, error, biltyCount: result?.totalBilties || 0 };
};

/**
 * Component to display the payment mode AI status
 */
export const PaymentModeInfo = ({ consignorName, branchId, currentPaymentMode, isEditMode }) => {
  const { paymentMode, loading, biltyCount } = useConsignorPaymentMode(consignorName, branchId);

  // Don't show anything if no consignor selected
  if (!consignorName) {
    return null;
  }

  // Format payment mode for display
  const formatPaymentMode = (mode) => {
    const modes = {
      'to-pay': 'To Pay',
      'paid': 'Paid',
      'freeofcost': 'FOC'
    };
    return modes[mode] || mode;
  };

  // In edit mode, show the current database value and any modifications
  if (isEditMode && currentPaymentMode) {
    const isDifferent = currentPaymentMode !== paymentMode?.mode;
    return (
      <div className="text-[10px] font-medium mt-0.5">
        <span className="text-blue-600">📋 Original: {formatPaymentMode(currentPaymentMode)}</span>
        {isDifferent && paymentMode?.mode && (
          <span className="text-orange-600 ml-2">
            → Modified: {formatPaymentMode(paymentMode.mode)}
          </span>
        )}
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-xs font-medium animate-pulse mt-1">
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>🤖 MoveSure AI analyzing payment history...</span>
      </div>
    );
  }

  // No data found
  if (!paymentMode || biltyCount === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-50 to-slate-50 text-gray-600 rounded-lg border border-gray-300 text-xs font-medium mt-1">
        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>💼 Using Default (To Pay) - No payment history found</span>
      </div>
    );
  }

  // Calculate percentage
  const percentage = Math.round((paymentMode.count / paymentMode.totalBilties) * 100);

  return (
    <div className="text-[10px] text-green-600 font-medium mt-0.5">
      ✅ AI: {formatPaymentMode(paymentMode.mode)} ({percentage}%)
    </div>
  );
};

/**
 * Component to display the delivery type AI status
 */
export const DeliveryTypeInfo = ({ consignorName, branchId, currentDeliveryType, isEditMode }) => {
  const { deliveryType, loading, biltyCount } = useConsignorDeliveryType(consignorName, branchId);

  // Don't show anything if no consignor selected
  if (!consignorName) {
    return null;
  }

  // Format delivery type for display
  const formatDeliveryType = (type) => {
    const types = {
      'godown-delivery': 'Godown',
      'door-delivery': 'Door'
    };
    return types[type] || type;
  };

  // In edit mode, show the current database value and any modifications
  if (isEditMode && currentDeliveryType) {
    const isDifferent = currentDeliveryType !== deliveryType?.type;
    return (
      <div className="text-[10px] font-medium mt-0.5">
        <span className="text-blue-600">📋 Original: {formatDeliveryType(currentDeliveryType)} Delivery</span>
        {isDifferent && deliveryType?.type && (
          <span className="text-orange-600 ml-2">
            → Modified: {formatDeliveryType(deliveryType.type)} Delivery
          </span>
        )}
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-xs font-medium animate-pulse mt-1">
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>🤖 MoveSure AI analyzing delivery history...</span>
      </div>
    );
  }

  // No data found
  if (!deliveryType || biltyCount === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-50 to-slate-50 text-gray-600 rounded-lg border border-gray-300 text-xs font-medium mt-1">
        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>💼 Using Default (Godown) - No delivery history found</span>
      </div>
    );
  }

  // Calculate percentage
  const percentage = Math.round((deliveryType.count / deliveryType.totalBilties) * 100);

  return (
    <div className="text-[10px] text-green-600 font-medium mt-0.5">
      ✅ AI: {formatDeliveryType(deliveryType.type)} Delivery ({percentage}%)
    </div>
  );
};

/**
 * Fetch payment mode history for detailed analysis (optional)
 * @param {string} consignorName - Name of the consignor
 * @param {string} branchId - Branch ID
 * @param {number} limit - Number of records to fetch
 * @returns {Promise} - Array of payment mode records
 */
export const fetchPaymentModeHistory = async (consignorName, branchId, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('bilty')
      .select('payment_mode, bilty_date, gr_no, total')
      .eq('consignor_name', consignorName)
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .not('payment_mode', 'is', null)
      .order('bilty_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching payment mode history:', error);
    return [];
  }
};
