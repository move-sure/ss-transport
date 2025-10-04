'use client';

import { useState, useEffect } from 'react';
import supabase from '../../app/utils/supabase';

/**
 * Hook to fetch the most recent labour rate for a consignor
 * @param {string} consignorName - Name of the consignor
 * @param {string} branchId - Branch ID
 * @returns {Object} - { labourRate, loading, error }
 */
export const useConsignorLabourRate = (consignorName, branchId) => {
  const [labourRate, setLabourRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLabourRate = async () => {
      // Reset state if no consignor name
      if (!consignorName || !branchId) {
        setLabourRate(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch the most recent bilty with labour_rate for this consignor and branch
        const { data, error: fetchError } = await supabase
          .from('bilty')
          .select('labour_rate, bilty_date, gr_no')
          .eq('consignor_name', consignorName)
          .eq('branch_id', branchId)
          .eq('is_active', true)
          .not('labour_rate', 'is', null)
          .order('bilty_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // No records found - not an error, just no previous labour rate
            setLabourRate(null);
          } else {
            throw fetchError;
          }
        } else if (data && data.labour_rate) {
          setLabourRate({
            rate: data.labour_rate,
            date: data.bilty_date,
            grNo: data.gr_no
          });
        } else {
          setLabourRate(null);
        }
      } catch (err) {
        console.error('Error fetching labour rate:', err);
        setError(err.message);
        setLabourRate(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLabourRate();
  }, [consignorName, branchId]);

  return { labourRate, loading, error };
};

/**
 * Component to display the old labour rate info
 */
export const LabourRateInfo = ({ consignorName, branchId, currentLabourRate }) => {
  const { labourRate, loading, error } = useConsignorLabourRate(consignorName, branchId);

  // Don't show anything if loading or no data
  if (loading || !labourRate) {
    return null;
  }

  // Don't show if old rate is same as current rate
  if (currentLabourRate && parseFloat(currentLabourRate) === parseFloat(labourRate.rate)) {
    return null;
  }

  return (
    <div className="mt-1 text-xs">
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
        <svg 
          className="w-3 h-3" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <span className="font-semibold">OLD RATE: ₹{labourRate.rate}</span>
        <span className="text-blue-600">
          (from {new Date(labourRate.date).toLocaleDateString('en-IN')})
        </span>
      </span>
    </div>
  );
};

/**
 * Fetch labour rate history for a consignor (for detailed view)
 * @param {string} consignorName - Name of the consignor
 * @param {string} branchId - Branch ID
 * @param {number} limit - Number of records to fetch
 * @returns {Promise} - Array of labour rate records
 */
export const fetchLabourRateHistory = async (consignorName, branchId, limit = 5) => {
  try {
    const { data, error } = await supabase
      .from('bilty')
      .select('labour_rate, bilty_date, gr_no, no_of_pkg, labour_charge')
      .eq('consignor_name', consignorName)
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .not('labour_rate', 'is', null)
      .order('bilty_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching labour rate history:', error);
    return [];
  }
};
