'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import Navbar from '../../components/dashboard/navbar';
import ChallanCard from '../../components/transit-finance/challan-card';
import { DollarSign, Loader2, AlertCircle, List, Plus, Search, RefreshCw, ChevronDown, MapPin, Package, FileText, Printer } from 'lucide-react';
import KaatListModal from '../../components/transit-finance/kaat-list-modal';
import AddKaatModal from '../../components/transit-finance/add-kaat-modal';

export default function TransitFinancePage() {
  const router = useRouter();
  const { user, requireAuth } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [challans, setChallans] = useState([]);
  const [branches, setBranches] = useState([]);
  const [cities, setCities] = useState([]);
  const [showKaatList, setShowKaatList] = useState(false);
  const [showKaatModal, setShowKaatModal] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterStatus, setFilterStatus] = useState('dispatched'); // 'all', 'dispatched', 'active'
  
  // Pagination states
  const [challanBatchSize] = useState(20);
  const [hasMoreChallans, setHasMoreChallans] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user) {
      // Try to load from cache first
      const cachedData = sessionStorage.getItem('transitFinanceData');
      if (cachedData) {
        try {
          const { challans: cachedChallans, branches: cachedBranches, cities: cachedCities, timestamp } = JSON.parse(cachedData);
          // Use cache if less than 5 minutes old
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            console.log('📦 Using cached transit finance data');
            setChallans(cachedChallans || []);
            setBranches(cachedBranches || []);
            setCities(cachedCities || []);
            setHasMoreChallans((cachedChallans?.length || 0) >= 20);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Failed to parse cache:', e);
        }
      }
      loadAllFinanceData();
    }
  }, [mounted, user]);

  const loadAllFinanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading initial finance data (20 challans from ALL branches)...');

      // Fetch cities, branches, and first batch of challans in parallel
      // NOTE: No branch filtering - users can see challans from ALL branches
      const [citiesRes, branchesRes, challansRes] = await Promise.all([
        supabase
          .from('cities')
          .select('*')
          .order('city_name'),
        supabase
          .from('branches')
          .select('*')
          .eq('is_active', true)
          .order('branch_name'),
        supabase
          .from('challan_details')
          .select(`
            id, challan_no, branch_id, truck_id, owner_id, driver_id, date,
            total_bilty_count, remarks, is_active, is_dispatched, dispatch_date,
            created_by, created_at, updated_at,
            truck:trucks(id, truck_number, truck_type),
            owner:staff!challan_details_owner_id_fkey(id, name, mobile_number),
            driver:staff!challan_details_driver_id_fkey(id, name, mobile_number, license_number)
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      if (citiesRes.error) throw citiesRes.error;
      if (branchesRes.error) throw branchesRes.error;
      if (challansRes.error) throw challansRes.error;

      console.log('✅ Initial data loaded:', {
        challans: challansRes.data?.length || 0,
        cities: citiesRes.data?.length || 0,
        branches: branchesRes.data?.length || 0
      });

      setCities(citiesRes.data || []);
      setBranches(branchesRes.data || []);
      setChallans(challansRes.data || []);
      setHasMoreChallans((challansRes.data?.length || 0) >= 20);

      // Cache the data in sessionStorage
      sessionStorage.setItem('transitFinanceData', JSON.stringify({
        challans: challansRes.data || [],
        branches: branchesRes.data || [],
        cities: citiesRes.data || [],
        timestamp: Date.now()
      }));

    } catch (error) {
      console.error('❌ Error loading finance data:', error);
      setError(error.message || 'Failed to load finance data');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreChallans = async () => {
    if (!hasMoreChallans || loadingMore) return;

    try {
      setLoadingMore(true);
      console.log('🔄 Loading more challans... Current count:', challans.length);

      const { data: moreChallans, error } = await supabase
        .from('challan_details')
        .select(`
          id, challan_no, branch_id, truck_id, owner_id, driver_id, date,
          total_bilty_count, remarks, is_active, is_dispatched, dispatch_date,
          created_by, created_at, updated_at,
          truck:trucks(id, truck_number, truck_type),
          owner:staff!challan_details_owner_id_fkey(id, name, mobile_number),
          driver:staff!challan_details_driver_id_fkey(id, name, mobile_number, license_number)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(challans.length, challans.length + challanBatchSize - 1);

      if (error) throw error;

      if (moreChallans && moreChallans.length > 0) {
        const updatedChallans = [...challans, ...moreChallans];
        setChallans(prev => [...prev, ...moreChallans]);
        setHasMoreChallans(moreChallans.length >= challanBatchSize);
        console.log('✅ Loaded', moreChallans.length, 'more challans');
        
        // Update cache with new challans
        const cachedData = sessionStorage.getItem('transitFinanceData');
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            sessionStorage.setItem('transitFinanceData', JSON.stringify({
              ...parsed,
              challans: updatedChallans,
              timestamp: Date.now()
            }));
          } catch (e) {
            console.warn('Failed to update cache:', e);
          }
        }
      } else {
        setHasMoreChallans(false);
        console.log('✅ No more challans to load');
      }

    } catch (error) {
      console.error('❌ Error loading more challans:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Filter challans based on search, branch, and status
  const filteredChallans = challans.filter(challan => {
    // Status filter
    if (filterStatus === 'dispatched' && !challan.is_dispatched) return false;
    if (filterStatus === 'active' && challan.is_dispatched) return false;

    // Branch filter
    if (filterBranch !== 'all' && challan.branch_id !== filterBranch) return false;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const branchName = branches.find(b => b.id === challan.branch_id)?.branch_name || '';
      return (
        challan.challan_no?.toLowerCase().includes(query) ||
        challan.truck?.truck_number?.toLowerCase().includes(query) ||
        challan.driver?.name?.toLowerCase().includes(query) ||
        branchName.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Sort by date (most recent first)
  const sortedChallans = [...filteredChallans].sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );

  // Stats
  const totalChallans = challans.length;
  const dispatchedChallans = challans.filter(c => c.is_dispatched).length;
  const activeChallans = challans.filter(c => !c.is_dispatched).length;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl"></div>
          </div>
          <p className="mt-6 text-gray-600 font-semibold text-lg">Initializing...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-12 border border-white/50 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                <Loader2 className="relative animate-spin h-16 w-16 text-blue-600 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-indigo-800 bg-clip-text text-transparent mb-2">
                Loading Finance Data
              </h3>
              <p className="text-gray-600">Please wait while we fetch the latest information...</p>
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="container mx-auto px-6 py-16">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-10 border border-red-200 max-w-lg mx-auto">
            <div className="text-center">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-red-500 rounded-full blur-2xl opacity-20"></div>
                <div className="relative bg-gradient-to-br from-red-500 to-rose-600 p-5 rounded-2xl">
                  <AlertCircle className="w-12 h-12 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Unable to Load Data</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
              <button
                onClick={loadAllFinanceData}
                className="group relative bg-gradient-to-r from-red-600 to-rose-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-3 mx-auto overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <RefreshCw className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Try Again</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 max-w-[1600px]">
        {/* Modern Header with Glass Effect */}
        <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3 rounded-xl shadow-lg">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-900 via-indigo-800 to-purple-800 bg-clip-text text-transparent">
                    Transit Finance Dashboard
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      <MapPin className="w-3 h-3" />
                      All Branches Access
                    </span>
                    <span className="text-gray-500 text-sm">View and manage challans across all locations</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/transit-finance/transit-bill')}
                className="group relative bg-gradient-to-r from-orange-500 to-amber-600 text-white px-5 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 overflow-hidden"
                title="Generate consolidated kaat bill PDF"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Printer className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Transit Bill</span>
              </button>
              <button
                onClick={() => router.push('/transit-finance/kaat-rate')}
                className="group relative bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 overflow-hidden"
                title="View detailed kaat rate management"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <List className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Detailed Kaat</span>
              </button>
              <button
                onClick={() => setShowKaatModal(true)}
                className="group relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Plus className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Add Kaat Rate</span>
              </button>
              <button
                onClick={() => setShowKaatList(true)}
                className="group relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <List className="w-5 h-5 relative z-10" />
                <span className="relative z-10">View All Rates</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards with Modern Design */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <div 
            className={`group relative bg-white rounded-2xl shadow-md hover:shadow-2xl p-6 border-2 cursor-pointer transition-all duration-300 overflow-hidden ${
              filterStatus === 'all' 
                ? 'border-blue-500 shadow-blue-200/50 scale-[1.02]' 
                : 'border-gray-100 hover:border-blue-300 hover:scale-[1.01]'
            }`}
            onClick={() => setFilterStatus('all')}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full -mr-16 -mt-16 transition-transform duration-300 group-hover:scale-150"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {totalChallans}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span className="font-medium">All Challans</span>
                {filterStatus === 'all' && <span className="text-blue-600 font-semibold">● Active</span>}
              </div>
            </div>
          </div>

          <div 
            className={`group relative bg-white rounded-2xl shadow-md hover:shadow-2xl p-6 border-2 cursor-pointer transition-all duration-300 overflow-hidden ${
              filterStatus === 'dispatched' 
                ? 'border-emerald-500 shadow-emerald-200/50 scale-[1.02]' 
                : 'border-gray-100 hover:border-emerald-300 hover:scale-[1.01]'
            }`}
            onClick={() => setFilterStatus('dispatched')}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full -mr-16 -mt-16 transition-transform duration-300 group-hover:scale-150"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-xl shadow-lg">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Dispatched</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {dispatchedChallans}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span className="font-medium">In Transit</span>
                {filterStatus === 'dispatched' && <span className="text-emerald-600 font-semibold">● Active</span>}
              </div>
            </div>
          </div>

          <div 
            className={`group relative bg-white rounded-2xl shadow-md hover:shadow-2xl p-6 border-2 cursor-pointer transition-all duration-300 overflow-hidden ${
              filterStatus === 'active' 
                ? 'border-amber-500 shadow-amber-200/50 scale-[1.02]' 
                : 'border-gray-100 hover:border-amber-300 hover:scale-[1.01]'
            }`}
            onClick={() => setFilterStatus('active')}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full -mr-16 -mt-16 transition-transform duration-300 group-hover:scale-150"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-xl shadow-lg">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Pending</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    {activeChallans}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span className="font-medium">Not Dispatched</span>
                {filterStatus === 'active' && <span className="text-amber-600 font-semibold">● Active</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Modern Filters Section with Glass Morphism */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-5 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Enhanced Search */}
            <div className="relative flex-1 min-w-[300px]">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search challan, truck, driver, branch..."
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all duration-200 text-sm font-medium placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Enhanced Branch Filter */}
            <div className="relative min-w-[220px]">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
                <MapPin className="w-4 h-4 text-gray-500" />
              </div>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="w-full pl-11 pr-10 py-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-semibold text-gray-700 text-sm cursor-pointer hover:border-blue-300 transition-all duration-200"
              >
                <option value="all">🌐 All Branches</option>
                {branches?.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    📍 {branch.branch_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-600 pointer-events-none" />
            </div>

            {/* Enhanced Refresh Button */}
            <button
              onClick={loadAllFinanceData}
              className="group relative p-3.5 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 hover:shadow-lg"
              title="Refresh data"
            >
              <RefreshCw className="w-5 h-5 text-gray-600 group-hover:text-blue-600 group-hover:rotate-180 transition-all duration-500" />
            </button>
          </div>

          {/* Enhanced Results Count */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">
                  Showing <span className="text-blue-600">{sortedChallans.length}</span> of <span className="text-blue-600">{totalChallans}</span> challans
                </span>
                {filterBranch === 'all' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-xs font-bold border border-blue-200 shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                    </svg>
                    All Branches
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200 shadow-sm">
                    <MapPin className="w-3.5 h-3.5" />
                    {branches.find(b => b.id === filterBranch)?.branch_name || 'Filtered'}
                  </span>
                )}
              </div>
              {hasMoreChallans && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  More Available
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Challan Grid with Better Spacing */}
        {sortedChallans.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">No Challans Found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your filters or search criteria to find what you're looking for</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterBranch('all');
                  setFilterStatus('dispatched');
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Filters
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
              {sortedChallans.map(challan => (
                <ChallanCard 
                  key={challan.id} 
                  challan={challan} 
                  branches={branches}
                />
              ))}
            </div>

            {/* Enhanced Load More Button */}
            {hasMoreChallans && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={loadMoreChallans}
                  disabled={loadingMore}
                  className="group relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-10 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin relative z-10" />
                      <span className="relative z-10 text-lg">Loading More Challans...</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-6 h-6 relative z-10 group-hover:animate-bounce" />
                      <span className="relative z-10 text-lg">Load More Challans</span>
                      <div className="relative z-10 px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                        {totalChallans - sortedChallans.length} More
                      </div>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Kaat Modal */}
      <AddKaatModal
        isOpen={showKaatModal}
        onClose={() => setShowKaatModal(false)}
        cities={cities}
        onSuccess={(data) => {
          console.log('✅ Kaat rate added:', data);
          setShowKaatModal(false);
        }}
      />

      {/* Kaat List Modal */}
      <KaatListModal
        isOpen={showKaatList}
        onClose={() => setShowKaatList(false)}
        cities={cities}
      />
    </div>
  );
}
