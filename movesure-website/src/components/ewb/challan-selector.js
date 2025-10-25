import React, { useState, useEffect, useMemo } from 'react';
import supabase from '../../app/utils/supabase';

export default function ChallanSelector({ onChallanSelect, selectedChallan }) {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const metrics = useMemo(() => {
    const total = challans.length;
    const dispatched = challans.filter(c => c.is_dispatched).length;
    const pending = total - dispatched;
    const biltyTotal = challans.reduce((sum, c) => sum + (c.total_bilty_count || 0), 0);

    return { total, dispatched, pending, biltyTotal };
  }, [challans]);

  const filteredChallans = useMemo(() => {
    if (!searchTerm.trim()) {
      return challans;
    }

    const term = searchTerm.trim().toLowerCase();

    return challans.filter(challan => {
      const branchName = challan.branch?.branch_name || challan.branch?.name || challan.branch?.code || '';
      const truckNumber = challan.truck?.truck_number || '';
      const challanDate = challan.date ? new Date(challan.date).toLocaleDateString() : '';
      const dispatchDate = challan.dispatch_date ? new Date(challan.dispatch_date).toLocaleDateString() : '';

      return [
        challan.challan_no?.toString() || '',
        branchName,
        truckNumber,
        challanDate,
        dispatchDate
      ].some(value => value.toLowerCase().includes(term));
    });
  }, [challans, searchTerm]);

  const selectedChallanMeta = useMemo(
    () => challans.find(c => c.challan_no === selectedChallan) || null,
    [challans, selectedChallan]
  );

  const formatDate = (value) => {
    if (!value) return 'Not available';
    try {
      return new Date(value).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (err) {
      return 'Not available';
    }
  };

  const handleSelect = (challan) => {
    if (!challan) {
      onChallanSelect(null);
      return;
    }
    onChallanSelect(challan.challan_no);
  };

  if (loading) {
    return (
      <div className="bg-white/90 rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200/80 rounded w-1/4 mb-4"></div>
          <div className="h-12 bg-gray-200/60 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={fetchChallans}
          className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Select Challan</h2>
          <p className="text-sm text-slate-500">
            Filter by challan number, branch, truck or status to quickly jump into the correct movement
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedChallan && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Clear Selection
            </button>
          )}
          <button
            type="button"
            onClick={fetchChallans}
            disabled={loading}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              loading
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? 'Refreshing...' : 'Refresh List'}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
          <span className="h-2 w-2 rounded-full bg-slate-400"></span>
          Total: {metrics.total}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-green-600">
          <span className="h-2 w-2 rounded-full bg-green-500"></span>
          Dispatched: {metrics.dispatched}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-600">
          <span className="h-2 w-2 rounded-full bg-amber-500"></span>
          Pending: {metrics.pending}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-600">
          <span className="h-2 w-2 rounded-full bg-blue-500"></span>
          Total Bilties: {metrics.biltyTotal}
        </span>
      </div>

      <div className="mt-6">
        <div className="relative">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search challans..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              Clear
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Showing {filteredChallans.length} of {challans.length} active challan(s)
        </p>
      </div>

      {selectedChallanMeta && (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-900">
          <p className="font-semibold">Currently viewing challan #{selectedChallanMeta.challan_no}</p>
          <p className="mt-1 text-blue-800">
            {selectedChallanMeta.branch?.branch_name || selectedChallanMeta.branch?.name || selectedChallanMeta.branch?.code || 'Branch N/A'}
            {' • '}Truck {selectedChallanMeta.truck?.truck_number || 'not assigned'}
            {' • '}Total {selectedChallanMeta.total_bilty_count || 0} bilty entries
          </p>
        </div>
      )}

      <div className="mt-6 max-h-96 overflow-y-auto pr-1">
        {filteredChallans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
            No challans match your search. Try a different term or refresh the list.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredChallans.map((challan) => {
              const isSelected = challan.challan_no === selectedChallan;
              const branchName = challan.branch?.branch_name || challan.branch?.name || challan.branch?.code || 'Branch N/A';
              const truckNumber = challan.truck?.truck_number || 'Truck not assigned';

              return (
                <button
                  type="button"
                  key={challan.id}
                  onClick={() => handleSelect(challan)}
                  className={`w-full text-left transition-all duration-150 rounded-2xl border bg-white px-5 py-4 shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Challan Number</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">#{challan.challan_no}</p>
                      <p className="mt-1 text-sm text-slate-500">Created {formatDate(challan.date)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-sm text-slate-600">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                          challan.is_dispatched
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : 'border-amber-200 bg-amber-50 text-amber-600'
                        }`}
                      >
                        {challan.is_dispatched ? 'Dispatched' : 'Pending Dispatch'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {challan.is_dispatched && challan.dispatch_date
                          ? `Dispatched on ${formatDate(challan.dispatch_date)}`
                          : 'Awaiting dispatch confirmation'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-3">
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-400">Branch</p>
                      <p className="mt-1 font-medium text-slate-800">{branchName}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-400">Truck</p>
                      <p className="mt-1 font-medium text-slate-800">{truckNumber}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-400">Bilty Count</p>
                      <p className="mt-1 font-medium text-slate-800">{challan.total_bilty_count || 0}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
