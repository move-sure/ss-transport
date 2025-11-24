'use client';

import { useState, useEffect } from 'react';
import supabase from '../../app/utils/supabase';

const RecentBiltiesByCity = ({ consignorName, cityId, cityName }) => {
  const [bilties, setBilties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded && consignorName && cityId) {
      fetchRecentBilties();
    }
  }, [expanded, consignorName, cityId]);

  const fetchRecentBilties = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('bilty')
        .select('gr_no, bilty_date, rate, freight_amount, no_of_pkg, wt, to_city_id')
        .ilike('consignor_name', `%${consignorName}%`)
        .eq('to_city_id', cityId)
        .eq('is_active', true)
        .order('bilty_date', { ascending: false })
        .order('gr_no', { ascending: false })
        .limit(8);

      if (error) throw error;
      setBilties(data || []);
    } catch (error) {
      console.error('Error fetching recent bilties:', error);
      setBilties([]);
    } finally {
      setLoading(false);
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-blue-600 hover:text-blue-800 text-xs underline"
      >
        View Recent Bilties
      </button>
    );
  }

  return (
    <div className="mt-2 bg-gray-50 p-3 rounded border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-gray-700">
          Last 8 Bilties to {cityName}
        </h4>
        <button
          onClick={() => setExpanded(false)}
          className="text-gray-500 hover:text-gray-700 text-xs"
        >
          ✕
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : bilties.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1 text-left font-semibold text-gray-700">GR No</th>
                <th className="px-2 py-1 text-left font-semibold text-gray-700">Date</th>
                <th className="px-2 py-1 text-right font-semibold text-gray-700">Rate</th>
                <th className="px-2 py-1 text-right font-semibold text-gray-700">Pkgs</th>
                <th className="px-2 py-1 text-right font-semibold text-gray-700">Wt</th>
                <th className="px-2 py-1 text-right font-semibold text-gray-700">Freight</th>
              </tr>
            </thead>
            <tbody>
              {bilties.map((bilty, index) => (
                <tr key={index} className="border-t border-gray-200">
                  <td className="px-2 py-1 text-gray-900">{bilty.gr_no}</td>
                  <td className="px-2 py-1 text-gray-700">
                    {new Date(bilty.bilty_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: '2-digit'
                    })}
                  </td>
                  <td className="px-2 py-1 text-right font-semibold text-green-600">
                    ₹{bilty.rate ? parseFloat(bilty.rate).toFixed(2) : '0.00'}
                  </td>
                  <td className="px-2 py-1 text-right text-gray-700">
                    {bilty.no_of_pkg || 0}
                  </td>
                  <td className="px-2 py-1 text-right text-gray-700">
                    {bilty.wt ? parseFloat(bilty.wt).toFixed(2) : '0.00'}
                  </td>
                  <td className="px-2 py-1 text-right font-semibold text-blue-600">
                    ₹{bilty.freight_amount ? parseFloat(bilty.freight_amount).toFixed(2) : '0.00'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-gray-500 text-center py-3">No bilties found</p>
      )}
    </div>
  );
};

export default RecentBiltiesByCity;
