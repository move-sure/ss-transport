'use client';

import { useState, useEffect } from 'react';
import supabase from '../../app/utils/supabase';

/**
 * Hook to fetch the most common payment mode for a consignor based on last 10 bilties
 * @param {string} consignorName - Name of the consignor
 * @param {string} branchId - Branch ID
 * @returns {Object} - { paymentMode, loading, error, biltyCount }
 */
export const useConsignorPaymentMode = (consignorName, branchId) => {
  const [paymentMode, setPaymentMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [biltyCount, setBiltyCount] = useState(0);

  useEffect(() => {
    const fetchPaymentMode = async () => {
      // Reset state if no consignor name
      if (!consignorName || !branchId) {
        setPaymentMode(null);
        setError(null);
        setBiltyCount(0);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch the last 10 bilties for this consignor and branch
        const { data, error: fetchError } = await supabase
          .from('bilty')
          .select('payment_mode, bilty_date, gr_no')
          .eq('consignor_name', consignorName)
          .eq('branch_id', branchId)
          .eq('is_active', true)
          .not('payment_mode', 'is', null)
          .order('bilty_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10);

        if (fetchError) throw fetchError;

        if (data && data.length > 0) {
          // Count occurrences of each payment mode
          const paymentModeCounts = {};
          data.forEach(bilty => {
            const mode = bilty.payment_mode;
            paymentModeCounts[mode] = (paymentModeCounts[mode] || 0) + 1;
          });

          // Find the most common payment mode
          let mostCommonMode = null;
          let maxCount = 0;
          
          Object.entries(paymentModeCounts).forEach(([mode, count]) => {
            if (count > maxCount) {
              maxCount = count;
              mostCommonMode = mode;
            }
          });

          setPaymentMode({
            mode: mostCommonMode,
            count: maxCount,
            totalBilties: data.length,
            lastDate: data[0].bilty_date,
            allModes: paymentModeCounts
          });
          setBiltyCount(data.length);
        } else {
          setPaymentMode(null);
          setBiltyCount(0);
        }
      } catch (err) {
        console.error('Error fetching payment mode:', err);
        setError(err.message);
        setPaymentMode(null);
        setBiltyCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentMode();
  }, [consignorName, branchId]);

  return { paymentMode, loading, error, biltyCount };
};

/**
 * Hook to fetch the most common delivery type for a consignor based on last 10 bilties
 * @param {string} consignorName - Name of the consignor
 * @param {string} branchId - Branch ID
 * @returns {Object} - { deliveryType, loading, error, biltyCount }
 */
export const useConsignorDeliveryType = (consignorName, branchId) => {
  const [deliveryType, setDeliveryType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [biltyCount, setBiltyCount] = useState(0);

  useEffect(() => {
    const fetchDeliveryType = async () => {
      // Reset state if no consignor name
      if (!consignorName || !branchId) {
        setDeliveryType(null);
        setError(null);
        setBiltyCount(0);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch the last 10 bilties for this consignor and branch
        const { data, error: fetchError } = await supabase
          .from('bilty')
          .select('delivery_type, bilty_date, gr_no')
          .eq('consignor_name', consignorName)
          .eq('branch_id', branchId)
          .eq('is_active', true)
          .not('delivery_type', 'is', null)
          .order('bilty_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10);

        if (fetchError) throw fetchError;

        if (data && data.length > 0) {
          // Count occurrences of each delivery type
          const deliveryTypeCounts = {};
          data.forEach(bilty => {
            const type = bilty.delivery_type;
            deliveryTypeCounts[type] = (deliveryTypeCounts[type] || 0) + 1;
          });

          // Find the most common delivery type
          let mostCommonType = null;
          let maxCount = 0;
          
          Object.entries(deliveryTypeCounts).forEach(([type, count]) => {
            if (count > maxCount) {
              maxCount = count;
              mostCommonType = type;
            }
          });

          setDeliveryType({
            type: mostCommonType,
            count: maxCount,
            totalBilties: data.length,
            lastDate: data[0].bilty_date,
            allTypes: deliveryTypeCounts
          });
          setBiltyCount(data.length);
        } else {
          setDeliveryType(null);
          setBiltyCount(0);
        }
      } catch (err) {
        console.error('Error fetching delivery type:', err);
        setError(err.message);
        setDeliveryType(null);
        setBiltyCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveryType();
  }, [consignorName, branchId]);

  return { deliveryType, loading, error, biltyCount };
};

/**
 * Component to display the payment mode AI status
 */
export const PaymentModeInfo = ({ consignorName, branchId, currentPaymentMode }) => {
  const { paymentMode, loading, biltyCount } = useConsignorPaymentMode(consignorName, branchId);

  // Don't show anything if no consignor selected
  if (!consignorName) {
    return null;
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

  // Format payment mode for display
  const formatPaymentMode = (mode) => {
    const modes = {
      'to-pay': 'To Pay',
      'paid': 'Paid',
      'freeofcost': 'FOC'
    };
    return modes[mode] || mode;
  };

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
export const DeliveryTypeInfo = ({ consignorName, branchId, currentDeliveryType }) => {
  const { deliveryType, loading, biltyCount } = useConsignorDeliveryType(consignorName, branchId);

  // Don't show anything if no consignor selected
  if (!consignorName) {
    return null;
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

  // Format delivery type for display
  const formatDeliveryType = (type) => {
    const types = {
      'godown-delivery': 'Godown',
      'door-delivery': 'Door'
    };
    return types[type] || type;
  };

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
