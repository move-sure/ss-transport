'use client';

import { useState, useEffect } from 'react';
import supabase from '../../app/utils/supabase';

/**
 * Fallback rate source when NO consignor/consignee rate profile exists for a city:
 * look at this party's own last 10 bilties to that exact destination city and use
 * the most RECENT rate they were charged (rates get revised over time, so "most
 * common of last 10" can resurrect an old rate over the current one).
 *
 * role: 'consignor_name' | 'consignee_name' — queried separately (not via .or())
 * because party names routinely contain commas/periods which PostgREST's .or()
 * filter string would parse as extra filters.
 */
export const useHistoricalRate = (partyName, role, cityId, branchId) => {
  const [historicalRate, setHistoricalRate] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRate = async () => {
      if (!partyName || !role || !cityId || !branchId) {
        setHistoricalRate(null);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('bilty')
          .select('rate, gr_no, bilty_date, created_at')
          .eq(role, partyName)
          .eq('to_city_id', cityId)
          .eq('branch_id', branchId)
          .eq('is_active', true)
          .gt('rate', 0)
          .order('bilty_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        if (data && data.length > 0) {
          const mostRecentRate = parseFloat(data[0].rate);
          const matchCount = data.filter(b => parseFloat(b.rate) === mostRecentRate).length;

          setHistoricalRate({
            rate: mostRecentRate,
            count: matchCount,
            totalBilties: data.length,
            confidence: Math.round((matchCount / data.length) * 100),
            lastDate: data[0].bilty_date,
          });
        } else {
          setHistoricalRate(null);
        }
      } catch (err) {
        console.error('Error fetching historical rate:', err);
        setHistoricalRate(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, [partyName, role, cityId, branchId]);

  return { historicalRate, loading };
};
