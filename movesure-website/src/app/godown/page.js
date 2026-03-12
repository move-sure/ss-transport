'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import { useRouter } from 'next/navigation';
import GodownHeader from '../../components/godown/godown-header';
import GodownBiltyList from '../../components/godown/godown-bilty-list';
import GodownSearchFilter from '../../components/godown/godown-search-filter';

export default function GodownPage() {
  const { user, requireAuth } = useAuth();
  const router = useRouter();
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [bilties, setBilties] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [branches, setBranches] = useState([]);
  const [stations, setStations] = useState([]);
  const [userBranchId, setUserBranchId] = useState(null);
  const [userBranchName, setUserBranchName] = useState(null);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [error, setError] = useState(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  
  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [pageLoading, setPageLoading] = useState(false);
  
  // Track if initial user data loaded
  const [userDataLoaded, setUserDataLoaded] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!requireAuth()) {
      router.push('/login');
    }
  }, [requireAuth, router]);

  // Debounce search input - wait 400ms after user stops typing
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  // Reset page when station filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStation]);

  // Load user data and branches on mount
  useEffect(() => {
    if (user) {
      loadUserAndBranches();
    }
  }, [user]);

  // Load bilties when filters/pagination change
  useEffect(() => {
    if (userDataLoaded) {
      loadBilties();
    }
  }, [userDataLoaded, selectedBranchId, debouncedSearch, selectedStation, currentPage]);

  // Load user branch info + branches list (one-time)
  const loadUserAndBranches = async () => {
    try {
      const [userData, branchesData] = await Promise.all([
        supabase.from('users').select('branch_id').eq('id', user.id).single(),
        supabase.from('branches').select('id, branch_name').order('branch_name')
      ]);

      if (userData.error) throw userData.error;
      if (branchesData.error) throw branchesData.error;

      const uBranchId = userData.data?.branch_id;
      setUserBranchId(uBranchId);
      setBranches(branchesData.data || []);

      // Get branch name
      if (uBranchId) {
        const branch = (branchesData.data || []).find(b => b.id === uBranchId);
        setUserBranchName(branch?.branch_name || null);
        if (selectedBranchId === null) {
          setSelectedBranchId(uBranchId);
        }
      }

      // Load station list for filter dropdown
      loadStations(uBranchId);

      setUserDataLoaded(true);
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load user data. Please try again.');
      setLoading(false);
    }
  };

  // Load unique stations for the filter dropdown
  const loadStations = async (branchId) => {
    try {
      // Get stations from both tables
      const [biltyStations, stationBiltyStations] = await Promise.all([
        supabase.from('bilty').select('to_city_id').not('to_city_id', 'is', null),
        supabase.from('station_bilty_summary').select('station').not('station', 'is', null)
      ]);

      // Get unique city ids from bilty table
      const cityIds = [...new Set((biltyStations.data || []).map(b => b.to_city_id).filter(Boolean))];
      
      // Fetch city details for those ids
      let citiesMap = {};
      if (cityIds.length > 0) {
        const { data: citiesData } = await supabase.from('cities').select('id, city_name, city_code').in('id', cityIds);
        (citiesData || []).forEach(c => { citiesMap[c.id] = c; });
      }

      // Also get city details by city_code for station bilties
      const stationCodes = [...new Set((stationBiltyStations.data || []).map(s => s.station).filter(Boolean))];
      if (stationCodes.length > 0) {
        const { data: stationCities } = await supabase.from('cities').select('id, city_name, city_code').in('city_code', stationCodes);
        (stationCities || []).forEach(c => { citiesMap[c.id] = c; });
      }

      const stationSet = new Set();
      // From bilty table
      cityIds.forEach(cid => {
        const c = citiesMap[cid];
        if (c) stationSet.add(`${c.city_name} (${c.city_code})`);
      });
      // From station_bilty_summary
      stationCodes.forEach(code => {
        const c = Object.values(citiesMap).find(ci => ci.city_code === code);
        if (c) stationSet.add(`${c.city_name} (${c.city_code})`);
        else stationSet.add(`${code} (${code})`);
      });

      setStations(Array.from(stationSet).sort());
    } catch (err) {
      console.error('Error loading stations:', err);
    }
  };

  // Load bilties via RPC function - fast single query, with fallback to direct queries
  const loadBilties = async () => {
    setPageLoading(true);
    if (bilties.length === 0) setLoading(true);
    setError(null);

    try {
      const filterBranchId = selectedBranchId || userBranchId;

      // Try RPC first (fast, server-side search/filter/pagination)
      const { data, error: rpcError } = await supabase.rpc('search_godown_bilties', {
        p_branch_id: filterBranchId || null,
        p_search_query: debouncedSearch || '',
        p_station_filter: selectedStation || '',
        p_page_number: currentPage,
        p_page_size: itemsPerPage
      });

      if (rpcError) {
        console.warn('RPC search_godown_bilties not available, using fallback:', rpcError.message || rpcError);
        // Fallback to direct queries
        await loadBiltiesFallback(filterBranchId);
        return;
      }

      // Map the RPC result to the format expected by components
      const mapped = (data || []).map(row => ({
        ...row,
        transports: row.transports_json || [],
        combinedColumn: `${row.pvt_marks || ''} - ${row.no_of_bags || ''}`
      }));

      setBilties(mapped);
      setTotalCount(data && data.length > 0 ? Number(data[0].total_count) : 0);
    } catch (err) {
      console.error('Error loading bilties:', err?.message || err);
      setError('Failed to load godown data. Please try again.');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  // Fallback: direct table queries (works without RPC function deployed)
  const loadBiltiesFallback = async (filterBranchId) => {
    try {
      // Fetch all needed data in parallel
      const [biltiesRes, stationRes, citiesRes, transportsRes, consignorsRes, consigneesRes, transitRes] = await Promise.all([
        filterBranchId
          ? supabase.from('bilty').select('id, gr_no, pvt_marks, to_city_id, no_of_pkg, wt, consignor_name, consignee_name, created_at, payment_mode, delivery_type, branch_id, bilty_image').eq('branch_id', filterBranchId).order('created_at', { ascending: false })
          : supabase.from('bilty').select('id, gr_no, pvt_marks, to_city_id, no_of_pkg, wt, consignor_name, consignee_name, created_at, payment_mode, delivery_type, branch_id, bilty_image').order('created_at', { ascending: false }),
        filterBranchId
          ? supabase.from('station_bilty_summary').select('id, gr_no, pvt_marks, station, no_of_packets, weight, consignor, consignee, created_at, branch_id, payment_status, delivery_type, w_name, is_in_head_branch, bilty_image').eq('branch_id', filterBranchId).order('created_at', { ascending: false })
          : supabase.from('station_bilty_summary').select('id, gr_no, pvt_marks, station, no_of_packets, weight, consignor, consignee, created_at, branch_id, payment_status, delivery_type, w_name, is_in_head_branch, bilty_image').order('created_at', { ascending: false }),
        supabase.from('cities').select('id, city_name, city_code'),
        supabase.from('transports').select('id, transport_name, city_id, city_name, mob_number'),
        supabase.from('consignors').select('id, company_name, number'),
        supabase.from('consignees').select('id, company_name, number'),
        supabase.from('transit_details').select('gr_no, challan_no')
      ]);

      if (biltiesRes.error) throw biltiesRes.error;
      if (stationRes.error) throw stationRes.error;

      const citiesList = citiesRes.data || [];
      const transportsList = transportsRes.data || [];
      const consignorsList = consignorsRes.data || [];
      const consigneesList = consigneesRes.data || [];
      const transitList = transitRes.data || [];

      // Helper lookups
      const getCityInfo = (cityId) => {
        const city = citiesList.find(c => c.id === cityId);
        return city ? { name: city.city_name, code: city.city_code } : { name: 'Unknown', code: 'N/A' };
      };
      const getCityByCode = (code) => {
        if (!code) return { name: 'Unknown', code: 'N/A' };
        const city = citiesList.find(c => c.city_code === code);
        return city ? { name: city.city_name, code: city.city_code } : { name: code, code };
      };
      const getTransports = (cityName) => transportsList.filter(t => t.city_name === cityName);
      const getConsignorNum = (name) => name ? consignorsList.find(c => c.company_name === name)?.number || null : null;
      const getConsigneeNum = (name) => name ? consigneesList.find(c => c.company_name === name)?.number || null : null;
      const getChallan = (grNo) => grNo ? transitList.find(t => t.gr_no === grNo)?.challan_no || null : null;

      // Combine both tables
      const combined = [
        ...(biltiesRes.data || []).map(b => {
          const ci = getCityInfo(b.to_city_id);
          let dt = b.delivery_type;
          if (dt) dt = dt.replace('-delivery', '').trim();
          return {
            ...b,
            no_of_bags: b.no_of_pkg,
            weight: b.wt,
            source: 'regular',
            combinedColumn: `${b.pvt_marks || ''} - ${b.no_of_pkg || ''}`,
            destination: ci.name,
            city_code: ci.code,
            station_destination: `${ci.name} (${ci.code})`,
            transports: getTransports(ci.name),
            consignor_number: getConsignorNum(b.consignor_name),
            consignee_number: getConsigneeNum(b.consignee_name),
            payment_status: b.payment_mode,
            delivery_type: dt,
            challan_no: getChallan(b.gr_no)
          };
        }),
        ...(stationRes.data || []).map(s => {
          const ci = getCityByCode(s.station);
          return {
            ...s,
            no_of_bags: s.no_of_packets,
            consignor_name: s.consignor,
            consignee_name: s.consignee,
            source: 'manual',
            combinedColumn: `${s.pvt_marks || ''} - ${s.no_of_packets || ''}`,
            destination: ci.name,
            city_code: ci.code,
            station_destination: `${ci.name} (${ci.code})`,
            transports: getTransports(ci.name),
            consignor_number: getConsignorNum(s.consignor),
            consignee_number: getConsigneeNum(s.consignee),
            payment_status: s.payment_status,
            delivery_type: s.delivery_type,
            challan_no: getChallan(s.gr_no)
          };
        })
      ];

      // Client-side search filter
      let filtered = combined;
      const q = (debouncedSearch || '').toLowerCase().trim();
      if (q) {
        filtered = filtered.filter(b =>
          b.gr_no?.toLowerCase().includes(q) ||
          b.pvt_marks?.toLowerCase().includes(q) ||
          b.station_destination?.toLowerCase().includes(q) ||
          b.consignor_name?.toLowerCase().includes(q) ||
          b.consignee_name?.toLowerCase().includes(q) ||
          b.challan_no?.toLowerCase().includes(q)
        );
      }
      if (selectedStation) {
        const sf = selectedStation.toLowerCase();
        filtered = filtered.filter(b => b.station_destination?.toLowerCase().includes(sf));
      }

      // Sort newest first
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Client-side pagination
      const total = filtered.length;
      const offset = (currentPage - 1) * itemsPerPage;
      const page = filtered.slice(offset, offset + itemsPerPage);

      setBilties(page);
      setTotalCount(total);
    } catch (err) {
      console.error('Fallback load error:', err?.message || err);
      setError('Failed to load godown data. Please try again.');
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  // Pagination derived values
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startRecord = totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endRecord = Math.min(currentPage * itemsPerPage, totalCount);

  // Keyboard navigation for pagination
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        e.preventDefault();
        handlePreviousPage();
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        e.preventDefault();
        handleNextPage();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, totalPages]);

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) handlePageChange(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) handlePageChange(currentPage + 1);
  };

  // Handle refresh
  const handleRefresh = () => {
    loadBilties();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <GodownHeader 
          onRefresh={handleRefresh}
          loading={loading}
        />

        {/* Search and Filter */}
        <GodownSearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStation={selectedStation}
          onStationChange={setSelectedStation}
          stations={stations}
        />

        {/* Branch Selector - Mobile Optimized */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <label className="text-sm font-semibold text-slate-700 sm:whitespace-nowrap">
              Select Branch:
            </label>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:flex-1">
              <select
                value={selectedBranchId || ''}
                onChange={(e) => setSelectedBranchId(e.target.value || null)}
                className="w-full sm:flex-1 px-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
              >
                <option value="">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name} {branch.id === userBranchId ? '(Your Branch)' : ''}
                  </option>
                ))}
              </select>
              {selectedBranchId && selectedBranchId !== userBranchId && (
                <button
                  onClick={() => setSelectedBranchId(userBranchId)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors shadow-sm"
                >
                  Reset to My Branch
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Branch filter notification */}
        {selectedBranchId ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {selectedBranchId === userBranchId 
                  ? `Showing all bilties for your branch ${userBranchName ? `(${userBranchName})` : ''}` 
                  : `Showing all bilties for: ${branches.find(b => b.id === selectedBranchId)?.branch_name || 'Selected Branch'}`}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Showing all bilties from all branches
              </span>
            </div>
          </div>
        )}

        {/* Branch assignment warning - only show if user has no branch */}
        {!userBranchId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-yellow-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>
                No branch assigned to your account. Select a branch from the dropdown above.
              </span>
            </div>
          </div>
        )}

        {/* Quick summary for filtered results */}
        {(searchQuery || selectedStation) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <div className="text-blue-700">
                <strong>{totalCount}</strong> records found
                {searchQuery && <span> matching {searchQuery}</span>}
                {selectedStation && <span> in {selectedStation}</span>}
              </div>
              {totalPages > 1 && (
                <div className="text-blue-600">
                  Page {currentPage} of {totalPages}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bilty List */}
        <GodownBiltyList
          bilties={bilties}
          loading={loading || pageLoading}
          error={error}
          onRefresh={handleRefresh}
          totalRecords={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          startRecord={startRecord}
          endRecord={endRecord}
          onPageChange={handlePageChange}
          onPreviousPage={handlePreviousPage}
          onNextPage={handleNextPage}
        />
      </div>
    </div>
  );
}
