'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  const [stationBilties, setStationBilties] = useState([]);
  const [cities, setCities] = useState([]);
  const [transports, setTransports] = useState([]);
  const [consignors, setConsignors] = useState([]);
  const [consignees, setConsignees] = useState([]);
  const [userBranchId, setUserBranchId] = useState(null);
  const [userBranchName, setUserBranchName] = useState(null);
  const [error, setError] = useState(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // Show 50 items per page
  const [pageLoading, setPageLoading] = useState(false);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!requireAuth()) {
      router.push('/login');
    }
  }, [requireAuth, router]);

  // Load initial data
  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  // Load all required data
  const loadInitialData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get user's branch_id and branch info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('branch_id')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        throw new Error('Failed to fetch user branch information');
      }

      const userBranchId = userData?.branch_id;
      setUserBranchId(userBranchId);

      // Get branch name if branch_id exists
      let branchName = null;
      if (userBranchId) {
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('branch_name')
          .eq('id', userBranchId)
          .single();

        if (!branchError && branchData) {
          branchName = branchData.branch_name;
        }
      }
      setUserBranchName(branchName);

      const [biltiesData, stationBiltiesData, citiesData, transportsData, consignorsData, consigneesData] = await Promise.all([
        supabase.from('bilty').select('id, gr_no, pvt_marks, to_city_id, no_of_pkg, wt, consignor_name, consignee_name, created_at, payment_mode, delivery_type').order('created_at', { ascending: false }),
        // Filter station bilties by user's branch_id
        userBranchId 
          ? supabase.from('station_bilty_summary').select('id, gr_no, pvt_marks, station, no_of_packets, weight, consignor, consignee, created_at, branch_id, payment_status, delivery_type').eq('branch_id', userBranchId).order('created_at', { ascending: false })
          : supabase.from('station_bilty_summary').select('id, gr_no, pvt_marks, station, no_of_packets, weight, consignor, consignee, created_at, branch_id, payment_status, delivery_type').limit(0), // Return empty if no branch_id
        supabase.from('cities').select('id, city_name, city_code'),
        supabase.from('transports').select('id, transport_name, city_id, city_name, mob_number'),
        supabase.from('consignors').select('id, company_name, number'),
        supabase.from('consignees').select('id, company_name, number')
      ]);

      if (biltiesData.error) throw biltiesData.error;
      if (stationBiltiesData.error) throw stationBiltiesData.error;
      if (citiesData.error) throw citiesData.error;
      if (transportsData.error) throw transportsData.error;
      if (consignorsData.error) throw consignorsData.error;
      if (consigneesData.error) throw consigneesData.error;

      setBilties(biltiesData.data || []);
      setStationBilties(stationBiltiesData.data || []);
      setCities(citiesData.data || []);
      setTransports(transportsData.data || []);
      setConsignors(consignorsData.data || []);
      setConsignees(consigneesData.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load godown data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get city name and code by ID
  const getCityInfo = (cityId) => {
    const city = cities.find(c => c.id === cityId);
    return city ? { name: city.city_name, code: city.city_code } : { name: 'Unknown', code: 'N/A' };
  };

  // Helper function to get city info by city code (for station bilties)
  const getCityInfoByCode = (cityCode) => {
    if (!cityCode) return { name: 'Unknown', code: 'N/A' };
    const city = cities.find(c => c.city_code === cityCode);
    return city ? { name: city.city_name, code: city.city_code } : { name: cityCode, code: cityCode };
  };

  // Helper function to get transport names by city name
  const getTransportsByCity = (cityName) => {
    return transports.filter(t => t.city_name === cityName);
  };

  // Helper function to get consignor info by name
  const getConsignorInfo = (consignorName) => {
    if (!consignorName) return null;
    return consignors.find(c => c.company_name === consignorName);
  };

  // Helper function to get consignee info by name
  const getConsigneeInfo = (consigneeName) => {
    if (!consigneeName) return null;
    return consignees.find(c => c.company_name === consigneeName);
  };

  // Combined and filtered bilties
  const allFilteredBilties = useMemo(() => {
    // Combine bilties from both tables
    const combinedBilties = [
      ...bilties.map(bilty => {
        const cityInfo = getCityInfo(bilty.to_city_id);
        const cityTransports = getTransportsByCity(cityInfo.name);
        const consignorInfo = getConsignorInfo(bilty.consignor_name);
        const consigneeInfo = getConsigneeInfo(bilty.consignee_name);
        
        // Normalize delivery_type from bilty table: "door-delivery" -> "door", "godown-delivery" -> "godown"
        let normalizedDeliveryType = bilty.delivery_type;
        if (normalizedDeliveryType) {
          normalizedDeliveryType = normalizedDeliveryType.replace('-delivery', '').trim();
        }
        
        return {
          ...bilty,
          no_of_bags: bilty.no_of_pkg, // Standardize to no_of_bags
          weight: bilty.wt, // Map weight field
          source: 'regular', // Regular bilty table
          combinedColumn: `${bilty.pvt_marks || ''} - ${bilty.no_of_pkg || ''}`,
          destination: cityInfo.name,
          city_code: cityInfo.code,
          station_destination: `${cityInfo.name} (${cityInfo.code})`,
          transports: cityTransports, // Add transport info
          consignor_number: consignorInfo?.number || null,
          consignee_number: consigneeInfo?.number || null,
          payment_status: bilty.payment_mode, // Map to payment_status for consistency
          delivery_type: normalizedDeliveryType // Normalized from "door-delivery" to "door"
        };
      }),
      ...stationBilties.map(bilty => {
        // Convert city code to city name for station bilties
        const cityInfo = getCityInfoByCode(bilty.station);
        const cityTransports = getTransportsByCity(cityInfo.name);
        const consignorInfo = getConsignorInfo(bilty.consignor);
        const consigneeInfo = getConsigneeInfo(bilty.consignee);
        
        return {
          ...bilty,
          no_of_bags: bilty.no_of_packets, // Standardize to no_of_bags
          consignor_name: bilty.consignor, // Map consignor field
          consignee_name: bilty.consignee, // Map consignee field
          source: 'manual', // Station bilties are manual
          combinedColumn: `${bilty.pvt_marks || ''} - ${bilty.no_of_packets || ''}`,
          destination: cityInfo.name, // Convert code to name
          city_code: cityInfo.code,
          station_destination: `${cityInfo.name} (${cityInfo.code})`,
          transports: cityTransports, // Add transport info
          consignor_number: consignorInfo?.number || null,
          consignee_number: consigneeInfo?.number || null,
          payment_status: bilty.payment_status, // Already correct field name
          delivery_type: bilty.delivery_type // Already in correct format
        };
      })
    ];

    // Apply search filter
    let filtered = combinedBilties;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(bilty => 
        bilty.gr_no?.toLowerCase().includes(query) ||
        bilty.combinedColumn?.toLowerCase().includes(query) ||
        bilty.station_destination?.toLowerCase().includes(query) ||
        bilty.consignor_name?.toLowerCase().includes(query) ||
        bilty.consignee_name?.toLowerCase().includes(query)
      );
    }

    // Apply station filter
    if (selectedStation) {
      filtered = filtered.filter(bilty => 
        bilty.station_destination?.toLowerCase().includes(selectedStation.toLowerCase())
      );
    }

    // Sort by created_at (newest first)
    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [bilties, stationBilties, cities, transports, searchQuery, selectedStation]);

  // Paginated bilties
  const paginatedBilties = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return allFilteredBilties.slice(startIndex, endIndex);
  }, [allFilteredBilties, currentPage, itemsPerPage]);

  // Pagination info
  const totalPages = Math.ceil(allFilteredBilties.length / itemsPerPage);
  const startRecord = allFilteredBilties.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endRecord = Math.min(currentPage * itemsPerPage, allFilteredBilties.length);

  // Get unique stations for filter
  const uniqueStations = useMemo(() => {
    const stations = new Set();
    bilties.forEach(bilty => {
      const cityInfo = getCityInfo(bilty.to_city_id);
      if (cityInfo.name !== 'Unknown') stations.add(`${cityInfo.name} (${cityInfo.code})`);
    });
    stationBilties.forEach(bilty => {
      if (bilty.station) {
        const cityInfo = getCityInfoByCode(bilty.station);
        stations.add(`${cityInfo.name} (${cityInfo.code})`);
      }
    });
    return Array.from(stations).sort();
  }, [bilties, stationBilties, cities]);

  // Stats
  const stats = useMemo(() => {
    const totalBilties = bilties.length + stationBilties.length;
    const filteredCount = allFilteredBilties.length;
    const totalBags = allFilteredBilties.reduce((sum, bilty) => sum + (parseInt(bilty.no_of_bags) || 0), 0);
    const totalWeight = allFilteredBilties.reduce((sum, bilty) => sum + (parseFloat(bilty.weight) || 0), 0);
    
    return {
      totalBilties,
      filteredCount,
      totalBags,
      totalWeight,
      regularCount: bilties.length,
      stationCount: stationBilties.length
    };
  }, [bilties, stationBilties, allFilteredBilties]);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStation]);

  // Keyboard navigation for pagination
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only handle if not typing in an input
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
    setPageLoading(true);
    setCurrentPage(page);
    // Small delay to show loading state, then scroll
    setTimeout(() => {
      setPageLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    loadInitialData();
  };

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <GodownHeader 
          stats={stats}
          onRefresh={handleRefresh}
          loading={loading}
        />

        {/* Search and Filter */}
        <GodownSearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStation={selectedStation}
          onStationChange={setSelectedStation}
          stations={uniqueStations}
        />

        {/* Branch filter notification */}
        {userBranchId ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Showing station bilties for your branch only {userBranchName && `(${userBranchName})`}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-yellow-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>
                No branch assigned to your account. Station bilties are not available.
              </span>
            </div>
          </div>
        )}

        {/* Quick summary for filtered results */}
        {(searchQuery || selectedStation) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <div className="text-blue-700">
                <strong>{allFilteredBilties.length}</strong> records found
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
          bilties={paginatedBilties}
          loading={loading || pageLoading}
          error={error}
          onRefresh={handleRefresh}
          totalRecords={allFilteredBilties.length}
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
