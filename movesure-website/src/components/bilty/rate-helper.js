'use client';

import { useState, useEffect } from 'react';
import supabase from '../../app/utils/supabase';

/**
 * Hook to fetch historical rates from bilty table
 * Priority 1: consignor + consignee + city (most specific)
 * Priority 2: consignor + city (general)
 * Priority 3: Default city rate from rates table (fallback)
 * 
 * @param {string} consignorName - Name of the consignor
 * @param {string} consigneeName - Name of the consignee
 * @param {string} toCityId - Destination city ID
 * @param {string} branchId - Branch ID
 * @returns {Object} - { historicalRate, loading, error }
 */
export const useHistoricalRate = (consignorName, consigneeName, toCityId, branchId) => {
  const [historicalRate, setHistoricalRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistoricalRate = async () => {
      // Reset state if no required data
      if (!consignorName || !toCityId) {
        setHistoricalRate(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // PRIORITY 1: Most specific - consignor + consignee + city (NO branch filter)
        if (consigneeName && consigneeName.trim() !== '') {
          const { data: specificData, error: specificError } = await supabase
            .from('bilty')
            .select('rate, bilty_date, gr_no, consignor_name, consignee_name')
            .eq('consignor_name', consignorName)
            .eq('consignee_name', consigneeName)
            .eq('to_city_id', toCityId)
            .eq('is_active', true)
            .not('rate', 'is', null)
            .gt('rate', 0)
            .order('bilty_date', { ascending: false })
            .limit(50); // Increased limit to get more historical data

          if (specificError) {
            console.warn('Error fetching specific rate:', specificError);
          } else if (specificData && specificData.length > 0) {
            // Calculate most common rate from all bilties
            const rateCounts = {};
            specificData.forEach(bilty => {
              const rate = parseFloat(bilty.rate);
              rateCounts[rate] = (rateCounts[rate] || 0) + 1;
            });

            // Find most common rate
            let mostCommonRate = null;
            let maxCount = 0;
            Object.entries(rateCounts).forEach(([rate, count]) => {
              if (count > maxCount) {
                maxCount = count;
                mostCommonRate = parseFloat(rate);
              }
            });

            if (mostCommonRate) {
              console.log('✅ Found specific rate (consignor+consignee+city):', mostCommonRate);
              setHistoricalRate({
                rate: mostCommonRate,
                type: 'specific',
                count: maxCount,
                totalBilties: specificData.length,
                lastDate: specificData[0].bilty_date,
                source: 'bilty_history',
                confidence: Math.round((maxCount / specificData.length) * 100)
              });
              setLoading(false);
              return;
            }
          }
        }

        // PRIORITY 2: General - consignor + city (NO branch filter)
        const { data: generalData, error: generalError } = await supabase
          .from('bilty')
          .select('rate, bilty_date, gr_no, consignor_name')
          .eq('consignor_name', consignorName)
          .eq('to_city_id', toCityId)
          .eq('is_active', true)
          .not('rate', 'is', null)
          .gt('rate', 0)
          .order('bilty_date', { ascending: false })
          .limit(100); // Increased limit for better accuracy

        if (generalError) {
          console.warn('Error fetching general rate:', generalError);
        } else if (generalData && generalData.length > 0) {
          // Calculate most common rate
          const rateCounts = {};
          generalData.forEach(bilty => {
            const rate = parseFloat(bilty.rate);
            rateCounts[rate] = (rateCounts[rate] || 0) + 1;
          });

          // Find most common rate
          let mostCommonRate = null;
          let maxCount = 0;
          Object.entries(rateCounts).forEach(([rate, count]) => {
            if (count > maxCount) {
              maxCount = count;
              mostCommonRate = parseFloat(rate);
            }
          });

          if (mostCommonRate) {
            console.log('✅ Found general rate (consignor+city):', mostCommonRate);
            setHistoricalRate({
              rate: mostCommonRate,
              type: 'general',
              count: maxCount,
              totalBilties: generalData.length,
              lastDate: generalData[0].bilty_date,
              source: 'bilty_history',
              confidence: Math.round((maxCount / generalData.length) * 100)
            });
            setLoading(false);
            return;
          }
        }

        // PRIORITY 3: Default city rate from rates table (ONLY if no bilty history)
        console.log('🔍 No bilty history found, checking default city rate...');
        const { data: defaultRate, error: defaultError } = await supabase
          .from('rates')
          .select('rate')
          .eq('city_id', toCityId)
          .is('consignor_id', null)
          .single();

        if (defaultError) {
          console.warn('Error fetching default rate:', defaultError);
          setHistoricalRate(null);
        } else if (defaultRate && defaultRate.rate) {
          console.log('✅ Found default city rate:', defaultRate.rate);
          setHistoricalRate({
            rate: parseFloat(defaultRate.rate),
            type: 'default',
            count: 0,
            totalBilties: 0,
            source: 'rates_table',
            confidence: 100
          });
        } else {
          setHistoricalRate(null);
        }

      } catch (err) {
        console.error('Error fetching historical rate:', err);
        setError(err.message);
        setHistoricalRate(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalRate();
  }, [consignorName, consigneeName, toCityId, branchId]);

  return { historicalRate, loading, error };
};

/**
 * Component to display historical rate info
 */
export const HistoricalRateInfo = ({ 
  consignorName, 
  consigneeName, 
  toCityId, 
  branchId, 
  currentRate,
  onApplyRate 
}) => {
  const { historicalRate, loading } = useHistoricalRate(
    consignorName, 
    consigneeName, 
    toCityId, 
    branchId
  );

  // Don't show anything if no data
  if (!consignorName || !toCityId) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-2 border border-indigo-300 rounded-lg text-sm text-indigo-700 bg-indigo-50">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="font-semibold"> रेट खोज रहे हैं...</span>
      </div>
    );
  }

  // No historical data found
  if (!historicalRate) {
    return (
      <div className="mt-2 px-3 py-2 border-2 border-red-400 rounded-lg text-sm text-red-800 bg-red-50 font-semibold">
        ❌ कोई पुराना डेटा नहीं मिला • नई रेट डालें
      </div>
    );
  }

  // Show historical rate with apply button if different from current
  const isDifferent = currentRate && parseFloat(currentRate) !== parseFloat(historicalRate.rate);
  const isDefault = historicalRate.type === 'default';

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
      isDefault 
        ? 'bg-indigo-50/50 text-indigo-700 border-indigo-300' 
        : 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-300'
    }`}>
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      <span className="flex-1">
        {isDefault ? (
          <>📋 डिफॉल्ट रेट: ₹{historicalRate.rate}/kg • कोई पुरानी बिलटी नहीं</>
        ) : (
          <>🎯 पुरानी बिलटी: ₹{historicalRate.rate}/kg • {historicalRate.count}/{historicalRate.totalBilties} बिलटी ({historicalRate.confidence}% बार)</>
        )}
      </span>
      {isDifferent && onApplyRate && !isDefault && (
        <button
          onClick={() => onApplyRate(historicalRate.rate)}
          className="px-2 py-1 text-xs font-bold bg-green-600 text-white rounded hover:bg-green-700 transition-all flex-shrink-0"
        >
          लागू करें
        </button>
      )}
      {!isDifferent && currentRate && (
        <span className={`font-bold ${isDefault ? 'text-indigo-600' : 'text-green-600'} flex-shrink-0`}>✔️ लागू है</span>
      )}
    </div>
  );
};

/**
 * Fetch rate history details for a specific combination
 * @param {string} consignorName - Name of the consignor
 * @param {string} consigneeName - Name of the consignee (optional)
 * @param {string} toCityId - Destination city ID
 * @param {string} branchId - Branch ID
 * @param {number} limit - Number of records to fetch
 * @returns {Promise} - Array of rate records
 */
export const fetchRateHistory = async (consignorName, consigneeName, toCityId, branchId, limit = 20) => {
  try {
    let query = supabase
      .from('bilty')
      .select('rate, bilty_date, gr_no, consignor_name, consignee_name, wt, freight_amount')
      .eq('consignor_name', consignorName)
      .eq('to_city_id', toCityId)
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .not('rate', 'is', null)
      .gt('rate', 0);

    if (consigneeName && consigneeName.trim() !== '') {
      query = query.eq('consignee_name', consigneeName);
    }

    const { data, error } = await query
      .order('bilty_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching rate history:', error);
    return [];
  }
};
