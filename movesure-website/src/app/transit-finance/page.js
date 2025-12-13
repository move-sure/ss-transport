'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import Navbar from '../../components/dashboard/navbar';
import ChallanCard from '../../components/transit-finance/challan-card';
import { DollarSign, Loader2, AlertCircle, List, Plus, Search, RefreshCw, ChevronDown, MapPin, Package } from 'lucide-react';
import KaatListModal from '../../components/transit-finance/kaat-list-modal';
import AddKaatModal from '../../components/transit-finance/add-kaat-modal';

export default function TransitFinancePage() {
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
      loadAllFinanceData();
    }
  }, [mounted, user]);

  const loadAllFinanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading initial finance data (20 challans)...');

      // Fetch cities, branches, and first batch of challans in parallel
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
        setChallans(prev => [...prev, ...moreChallans]);
        setHasMoreChallans(moreChallans.length >= challanBatchSize);
        console.log('✅ Loaded', moreChallans.length, 'more challans');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-blue-200">
            <div className="text-2xl font-bold text-indigo-800 flex items-center gap-3">
              <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
              Loading Transit Finance Data...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Navbar />
        <div className="container mx-auto px-6 py-16">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-red-200 max-w-md mx-auto">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Data</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadAllFinanceData}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Navbar />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-blue-600" />
              Transit Finance Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Select a challan to view bilty details and manage kaat
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKaatModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Kaat
            </button>
            <button
              onClick={() => setShowKaatList(true)}
              className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-5 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <List className="w-5 h-5" />
              Kaat Rate List
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div 
            className={`bg-white rounded-xl shadow-md p-4 border-2 cursor-pointer transition-all ${
              filterStatus === 'all' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-blue-300'
            }`}
            onClick={() => setFilterStatus('all')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Challans</p>
                <p className="text-2xl font-bold text-gray-900">{totalChallans}</p>
              </div>
              <Package className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <div 
            className={`bg-white rounded-xl shadow-md p-4 border-2 cursor-pointer transition-all ${
              filterStatus === 'dispatched' ? 'border-green-500 bg-green-50' : 'border-transparent hover:border-green-300'
            }`}
            onClick={() => setFilterStatus('dispatched')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Dispatched</p>
                <p className="text-2xl font-bold text-green-600">{dispatchedChallans}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">✓</span>
              </div>
            </div>
          </div>
          <div 
            className={`bg-white rounded-xl shadow-md p-4 border-2 cursor-pointer transition-all ${
              filterStatus === 'active' ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:border-orange-300'
            }`}
            onClick={() => setFilterStatus('active')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-orange-600">{activeChallans}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold">⏳</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by challan number, truck, driver..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Branch Filter */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white min-w-[180px]"
              >
                <option value="all">All Branches</option>
                {branches?.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Refresh Button */}
            <button
              onClick={loadAllFinanceData}
              className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Results Count */}
          <div className="mt-3 text-sm text-gray-600">
            Showing {sortedChallans.length} of {totalChallans} challans
            {hasMoreChallans && <span className="text-blue-600 ml-2">• More available</span>}
          </div>
        </div>

        {/* Challan Grid */}
        {sortedChallans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Challans Found</h3>
            <p className="text-gray-500">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedChallans.map(challan => (
                <ChallanCard 
                  key={challan.id} 
                  challan={challan} 
                  branches={branches}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMoreChallans && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMoreChallans}
                  disabled={loadingMore}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading More...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-5 h-5" />
                      Load More Challans
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
