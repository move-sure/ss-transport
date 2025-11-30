import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '../../app/utils/supabase';

export default function ChallanSelector() {
  const router = useRouter();
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
    if (!challan) return;
    // Navigate to the challan-specific page
    router.push(`/ewb/${challan.challan_no}`);
  };

  if (loading) {
    return (
      <div className="bg-white/90 shadow-sm border-y border-slate-100 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200/80 rounded w-1/4 mb-4"></div>
          <div className="h-12 bg-gray-200/60 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-y border-red-200 p-5">
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
    <div className="bg-white/90 backdrop-blur shadow-sm border-y border-slate-100 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Select Challan</h2>
          <p className="text-sm text-slate-500">
            Filter by challan number, branch, truck or status to quickly jump into the correct movement
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      <div className="mt-4 max-h-96 overflow-y-auto pr-1">
        {filteredChallans.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No challans match your search. Try a different term or refresh the list.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {filteredChallans.map((challan) => {
              const branchName = challan.branch?.branch_name || challan.branch?.name || challan.branch?.code || 'N/A';
              const truckNumber = challan.truck?.truck_number || 'Not assigned';

              return (
                <Link
                  href={`/ewb/${challan.challan_no}`}
                  key={challan.id}
                  className="w-full text-left transition-all duration-150 rounded-lg border bg-white px-4 py-3 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 border-slate-200 hover:border-blue-500 hover:bg-blue-50/50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <p className="text-xs text-slate-400 uppercase">Challan</p>
                        <p className="text-base font-bold text-slate-900">#{challan.challan_no}</p>
                      </div>
                      
                      <div className="h-8 w-px bg-slate-200"></div>
                      
                      <div className="flex-1 min-w-0 grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <p className="text-slate-400 mb-0.5">Branch</p>
                          <p className="font-medium text-slate-800 truncate">{branchName}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 mb-0.5">Truck</p>
                          <p className="font-medium text-slate-800 truncate">{truckNumber}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 mb-0.5">Bilties</p>
                          <p className="font-medium text-slate-800">{challan.total_bilty_count || 0}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-3">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          challan.is_dispatched
                            ? 'border-green-300 bg-green-100 text-green-700'
                            : 'border-amber-300 bg-amber-100 text-amber-700'
                        }`}
                      >
                        {challan.is_dispatched ? 'Dispatched' : 'Pending'}
                      </span>
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
