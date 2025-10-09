import React, { useState, useEffect } from 'react';
import supabase from '../../app/utils/supabase';

export default function ChallanSelector({ onChallanSelect, selectedChallan }) {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchChallans();
  }, []);

  const fetchChallans = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all active challans from all branches
      const { data: challanData, error: challanError } = await supabase
        .from('challan_details')
        .select(`
          id,
          challan_no,
          date,
          total_bilty_count,
          is_dispatched,
          dispatch_date,
          branch_id,
          truck_id
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (challanError) throw challanError;

      // Fetch branch details separately
      const branchIds = [...new Set(challanData.map(c => c.branch_id).filter(Boolean))];
      let branchData = [];
      
      if (branchIds.length > 0) {
        const { data: branches, error: branchError } = await supabase
          .from('branches')
          .select('*')
          .in('id', branchIds);

        if (branchError) {
          console.error('Branch fetch error:', branchError);
        } else {
          branchData = branches || [];
        }
      }

      // Fetch truck details separately
      const truckIds = [...new Set(challanData.map(c => c.truck_id).filter(Boolean))];
      let truckData = [];
      if (truckIds.length > 0) {
        const { data: trucks, error: truckError } = await supabase
          .from('trucks')
          .select('id, truck_number')
          .in('id', truckIds);

        if (truckError) throw truckError;
        truckData = trucks || [];
      }

      // Map branches and trucks to challans
      const branchMap = Object.fromEntries((branchData || []).map(b => [b.id, b]));
      const truckMap = Object.fromEntries(truckData.map(t => [t.id, t]));

      const enrichedChallans = challanData.map(challan => ({
        ...challan,
        branch: branchMap[challan.branch_id] || null,
        truck: challan.truck_id ? truckMap[challan.truck_id] : null
      }));

      setChallans(enrichedChallans);
    } catch (err) {
      setError(err.message || 'Failed to fetch challans');
      console.error('Error fetching challans:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={fetchChallans}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Challan Number
      </label>
      <select
        value={selectedChallan || ''}
        onChange={(e) => onChallanSelect(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">-- Select a Challan --</option>
        {challans.map((challan) => (
          <option key={challan.id} value={challan.challan_no}>
            {challan.challan_no} | Branch: {challan.branch?.branch_name || challan.branch?.name || challan.branch?.code || 'N/A'} | 
            Truck: {challan.truck?.truck_number || 'No Truck'} | 
            ({challan.total_bilty_count} Bilties) | 
            {new Date(challan.date).toLocaleDateString()} | 
            {challan.is_dispatched ? '✓ Dispatched' : '⏳ Pending'}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-gray-500">
        Showing {challans.length} active challan(s) from all branches
      </p>
    </div>
  );
}
