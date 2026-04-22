'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../utils/auth';
import { AlertCircle, RefreshCw } from 'lucide-react';

const API_URL = 'http://xok5owjast5f4mxl1hu7ztq5.46.202.162.119.sslip.io';

// Transform flat API challan row to nested objects for component compatibility
const transformChallanRow = (row) => ({
  ...row,
  truck: row.truck_id ? { id: row.truck_id, truck_number: row.truck_number, truck_type: row.truck_type } : null,
  driver: row.driver_id ? { id: row.driver_id, name: row.driver_name, mobile_number: row.driver_mobile_number, license_number: row.driver_license_number } : null,
  owner: row.owner_id ? { id: row.owner_id, name: row.owner_name, mobile_number: row.owner_mobile_number } : null,
});

// Import components
import Navbar from '../../components/dashboard/navbar';
import TransitHeader from '../../components/transit/TransitHeader';
import ChallanSelector from '../../components/transit/ChallanSelector';
import BiltyList from '../../components/transit/BiltyList';
import SelectedBiltiesSummary from '../../components/transit/SelectedBiltiesSummary';
import ChallanPDFPreview from '../../components/transit/ChallanPDFPreview';

export default function TransitManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
    // Data states
  const [bilties, setBilties] = useState([]);
  const [stationBilties, setStationBilties] = useState([]);
  const [transitBilties, setTransitBilties] = useState([]);
  const [challans, setChallans] = useState([]);
  const [challanBooks, setChallanBooks] = useState([]);
  const [cities, setCities] = useState([]);
  const [userBranch, setUserBranch] = useState(null);
  const [branches, setBranches] = useState([]);
  const [permanentDetails, setPermanentDetails] = useState(null);
  const [permanentDetailsByBranchId, setPermanentDetailsByBranchId] = useState({});
  const [totalAvailableCount, setTotalAvailableCount] = useState(0);
  const [filteredAvailableCount, setFilteredAvailableCount] = useState(0);
    // Selection states
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [selectedChallanBook, setSelectedChallanBook] = useState(null);
  const [selectedBilties, setSelectedBilties] = useState([]);
  const [selectedTransitBilties, setSelectedTransitBilties] = useState([]);

  // PDF Preview states
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewType, setPdfPreviewType] = useState(null); // 'loading' or 'challan'
  // Sort function for GR numbers to handle alphanumeric sorting properly
  const sortByGRNumber = (a, b) => {
    const grA = a.gr_no || '';
    const grB = b.gr_no || '';
    
    // Extract alphabetic prefix and numeric part
    const matchA = grA.match(/^([A-Za-z]*)(\d+)(.*)$/);
    const matchB = grB.match(/^([A-Za-z]*)(\d+)(.*)$/);
    
    if (!matchA && !matchB) return grA.localeCompare(grB);
    if (!matchA) return 1;
    if (!matchB) return -1;
    
    const [, prefixA, numberA, suffixA] = matchA;
    const [, prefixB, numberB, suffixB] = matchB;
    
    // First compare prefixes
    const prefixCompare = prefixA.localeCompare(prefixB);
    if (prefixCompare !== 0) return prefixCompare;
    
    // Then compare numbers numerically
    const numCompare = parseInt(numberA) - parseInt(numberB);
    if (numCompare !== 0) return numCompare;
    
    // Finally compare suffixes
    return suffixA.localeCompare(suffixB);
  };

  // Sort function for destination city names alphabetically
  const sortByDestinationCity = (a, b) => {
    const cityA = (a.to_city_name || '').toUpperCase();
    const cityB = (b.to_city_name || '').toUpperCase();
    
    // First sort by destination city alphabetically
    const cityCompare = cityA.localeCompare(cityB);
    if (cityCompare !== 0) return cityCompare;
    
    // If same city, then sort by GR number
    const grA = a.gr_no || '';
    const grB = b.gr_no || '';
    
    // Extract alphabetic prefix and numeric part for GR number sorting
    const matchA = grA.match(/^([A-Za-z]*)(\d+)(.*)$/);
    const matchB = grB.match(/^([A-Za-z]*)(\d+)(.*)$/);
    
    if (!matchA && !matchB) return grA.localeCompare(grB);
    if (!matchA) return 1;
    if (!matchB) return -1;
    
    const [, prefixA, numberA, suffixA] = matchA;
    const [, prefixB, numberB, suffixB] = matchB;
    
    // First compare prefixes
    const prefixCompare = prefixA.localeCompare(prefixB);
    if (prefixCompare !== 0) return prefixCompare;
    
    // Then compare numbers numerically
    const numCompare = parseInt(numberA) - parseInt(numberB);
    if (numCompare !== 0) return numCompare;
    
    // Finally compare suffixes
    return suffixA.localeCompare(suffixB);
  };

  // Load initial data
  useEffect(() => {
    if (user?.branch_id) {
      loadInitialData();
    }
  }, [user]);

  // Track whether initial load has happened to avoid double-firing transit load
  const initialLoadDone = React.useRef(false);

  // Load transit bilties when challan is selected (skip during initial load — handled there)
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (selectedChallan) {
      loadTransitBilties(selectedChallan.challan_no);
    } else {
      setTransitBilties([]);
    }
  }, [selectedChallan]);

  // Process init data into state — used by both loadInitialData and refreshData
  const processInitData = (initData) => {
    setUserBranch(initData.user_branch || null);
    setBranches(initData.branches || []);
    setCities(initData.cities || []);
    // permanent_details — use branch-specific lookup for correct PDF headers
    // Backend returns permanent_details_by_branch_id map and user_permanent_details
    const pdByBranch = initData.permanent_details_by_branch_id || {};
    
    // If backend provides the lookup map, use it directly
    if (Object.keys(pdByBranch).length > 0) {
      setPermanentDetailsByBranchId(pdByBranch);
    } else {
      // Fallback: build lookup from permanent_details array
      const pd = initData.permanent_details;
      const pdArr = Array.isArray(pd) ? pd : (pd ? [pd] : []);
      const lookup = {};
      pdArr.forEach(entry => {
        if (entry.branch_id) lookup[entry.branch_id] = entry;
      });
      setPermanentDetailsByBranchId(lookup);
    }
    
    // User's own branch details (for TransitHeader and default fallback)
    const userPd = initData.user_permanent_details 
      || pdByBranch[initData.user_branch?.id] 
      || (Array.isArray(initData.permanent_details) ? initData.permanent_details[0] : initData.permanent_details) 
      || null;
    setPermanentDetails(userPd);
    setChallanBooks(initData.challan_books || []);

    // ALL challans — already sorted non-dispatched first by RPC
    const challansData = (initData.challans || []).map(transformChallanRow);
    setChallans(challansData);

    // Available bilties — API returns combined array, split by bilty_type
    const allAvailable = initData.available_bilties || [];
    const regBilties = allAvailable
      .filter(b => b.bilty_type === 'reg')
      .map(b => ({ ...b, source: 'bilty', source_table: 'bilty' }))
      .sort(sortByGRNumber);
    const stnBilties = allAvailable
      .filter(b => b.bilty_type === 'mnl')
      .map(b => ({ ...b, bilty_date: b.bilty_date || b.created_at, contain: b.contain || b.contents, source: 'station_bilty_summary', source_table: 'station_bilty_summary' }))
      .sort(sortByGRNumber);

    setBilties(regBilties);
    setStationBilties(stnBilties);
    setTotalAvailableCount(regBilties.length + stnBilties.length);

    return { challansData, challanBooksData: initData.challan_books || [] };
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      initialLoadDone.current = false;

      // Single init call — returns ALL reference data + ALL challans + available bilties
      const initRes = await fetch(`${API_URL}/api/challan/init?branch_id=${user.branch_id}`);
      const initResult = await initRes.json();

      if (initResult.status !== 'success') throw new Error(initResult.message || 'Failed to load initial data');

      const { challansData, challanBooksData } = processInitData(initResult.data);

      // Auto-select the most recent active (non-dispatched) challan first, fallback to dispatched
      const activeChallans = challansData.filter(c => !c.is_dispatched);
      let autoSelectedChallan = activeChallans[0] || challansData.find(c => c.is_dispatched) || null;

      // Load transit bilties for auto-selected challan
      if (autoSelectedChallan) {
        setSelectedChallan(autoSelectedChallan);
        await loadTransitBilties(autoSelectedChallan.challan_no);
      }

      // Auto-select first available challan book
      if (challanBooksData.length > 0) {
        setSelectedChallanBook(challanBooksData[0]);
      }

      initialLoadDone.current = true;

    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadTransitBilties = async (challanNo) => {
    try {
      console.log('🔄 Loading transit bilties for challan:', challanNo);
      
      const res = await fetch(`${API_URL}/api/challan/transit/bilties/${encodeURIComponent(challanNo)}`);
      const result = await res.json();
      
      if (result.status !== 'success') {
        console.error('❌ Error loading transit bilties:', result.message);
        setTransitBilties([]);
        return;
      }
      
      const rows = result.data?.rows || [];
      
      if (rows.length === 0) {
        console.log('📝 No transit records found for challan:', challanNo);
        setTransitBilties([]);
        return;
      }
      
      // Check if this challan is dispatched
      const challan = challans.find(c => c.challan_no === challanNo);
      const isFromDispatchedChallan = challan?.is_dispatched || false;
      
      // Process transit bilties - API returns enriched data with bilty details + bilty_type
      // Map row.id → transit_id (used by remove/bulk-remove handlers)
      const processedTransitBilties = rows.map(row => ({
        ...row,
        transit_id: row.id,
        in_transit: true,
        is_dispatched: isFromDispatchedChallan,
        source: row.source_table || 'bilty',
      }));
      
      // Sort by destination city alphabetically
      const sortedTransitBilties = processedTransitBilties.sort(sortByDestinationCity);
      
      setTransitBilties(sortedTransitBilties);
      console.log('✅ Transit bilties loaded successfully:', sortedTransitBilties.length, `(Dispatched: ${isFromDispatchedChallan})`);
      
    } catch (error) {
      console.error('❌ Error loading transit bilties:', error);
      setTransitBilties([]);
    }
  };

  const refreshData = useCallback(async (refreshType = 'all') => {
    try {
      if (refreshType === 'transit') {
        // Transit-only refresh — just reload transit bilties for selected challan
        if (selectedChallan) {
          await loadTransitBilties(selectedChallan.challan_no);
        }
        return;
      }

      // For 'all', 'bilties', or 'challans' — re-call init (single request refreshes everything)
      const initRes = await fetch(`${API_URL}/api/challan/init?branch_id=${user.branch_id}`);
      const initResult = await initRes.json();
      if (initResult.status !== 'success') throw new Error(initResult.message || 'Failed to refresh data');

      const { challansData } = processInitData(initResult.data);

      // Keep selected challan in sync
      if (selectedChallan) {
        const updatedChallan = challansData.find(c => c.id === selectedChallan.id);
        if (updatedChallan) setSelectedChallan(updatedChallan);
      }

      // Also refresh transit if doing 'all'
      if (refreshType === 'all' && selectedChallan) {
        await loadTransitBilties(selectedChallan.challan_no);
      }
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
      setError(error.message || 'Failed to refresh data');
    }
  }, [user.branch_id, selectedChallan]);

  const handleAddBiltyToTransit = async (biltyOrBilties) => {
    if (!selectedChallan || !selectedChallanBook) {
      alert('Please select a challan and challan book');
      return;
    }

    if (selectedChallan.is_dispatched) {
      alert('Cannot add bilties to a dispatched challan');
      return;
    }

    // Handle both single bilty and array of bilties
    const biltiesArray = Array.isArray(biltyOrBilties) ? biltyOrBilties : [biltyOrBilties];
    
    if (biltiesArray.length === 0) {
      alert('No bilties to add');
      return;
    }

    try {
      setSaving(true);

      // Prepare bilties payload for API (server handles deduplication + duplicate checking)
      const bilties = biltiesArray.map(bilty => ({
        gr_no: bilty.gr_no,
        bilty_id: bilty.source === 'bilty' ? bilty.id : null,
        source_table: bilty.source || 'bilty',
      }));

      const res = await fetch(`${API_URL}/api/challan/transit/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challan_id: selectedChallan.id,
          challan_book_id: selectedChallanBook.id,
          user_id: user.id,
          bilties,
        }),
      });

      const result = await res.json();

      if (result.status !== 'success') {
        alert(result.message || 'Error adding bilties to transit');
        return;
      }

      const { added, skipped } = result.data || {};
      const msg = `Successfully added ${added} bilty(s) to challan ${selectedChallan.challan_no}` +
        (skipped?.length > 0 ? ` (${skipped.length} already in transit, skipped)` : '');
      alert(msg);
      
      // Clear selections and refresh all data
      setSelectedBilties([]);
      setSelectedTransitBilties([]);
      
      await refreshData('all');

    } catch (error) {
      console.error('Error adding to transit:', error);
      alert('Error adding bilties to transit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBiltyFromTransit = async (bilty) => {
    if (!bilty.transit_id) return;

    if (selectedChallan?.is_dispatched) {
      alert('Cannot remove bilties from a dispatched challan');
      return;
    }

    try {
      const confirmRemove = window.confirm(`Remove ${bilty.gr_no} from challan ${bilty.challan_no}?`);
      if (!confirmRemove) return;

      setSaving(true);

      console.log(`🗑️ Removing bilty ${bilty.gr_no} from transit:`, {
        transitId: bilty.transit_id,
        challanNo: bilty.challan_no,
      });

      const res = await fetch(`${API_URL}/api/challan/transit/remove/${bilty.transit_id}`, {
        method: 'POST',
      });

      const result = await res.json();

      if (result.status !== 'success') {
        alert(result.message || 'Error removing bilty from transit');
        return;
      }

      console.log(`✅ Successfully removed ${bilty.gr_no} from transit`);
      alert(`Successfully removed ${bilty.gr_no} from challan`);
      
      await refreshData('all');

    } catch (error) {
      console.error('Error removing bilty from transit:', error);
      alert('Error removing bilty from transit');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkRemoveFromTransit = async () => {
    if (selectedTransitBilties.length === 0) {
      alert('No transit bilties selected for removal');
      return;
    }

    if (selectedChallan?.is_dispatched) {
      alert('Cannot remove bilties from a dispatched challan');
      return;
    }

    try {
      const confirmRemove = window.confirm(
        `Remove ${selectedTransitBilties.length} selected bilty(s) from challan ${selectedChallan?.challan_no}?`
      );
      if (!confirmRemove) return;

      setSaving(true);

      const transitIds = selectedTransitBilties.map(b => b.transit_id).filter(Boolean);
      
      if (transitIds.length === 0) {
        alert('No valid transit IDs found');
        return;
      }

      console.log(`🗑️ Bulk removing ${transitIds.length} bilties from transit`);

      const res = await fetch(`${API_URL}/api/challan/transit/bulk-remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transit_ids: transitIds }),
      });

      const result = await res.json();

      if (result.status !== 'success') {
        alert(result.message || 'Error removing bilties from transit');
        return;
      }

      console.log(`✅ Successfully bulk removed ${result.data?.removed || transitIds.length} bilties from transit`);
      alert(`Successfully removed ${result.data?.removed || selectedTransitBilties.length} bilty(s) from challan`);
      
      // Clear selections and refresh all data
      setSelectedTransitBilties([]);
      
      await refreshData('all');

    } catch (error) {
      console.error('Error removing bilty from transit:', error);
      alert('Error removing bilty from transit');
    } finally {
      setSaving(false);
    }
  };

  // PDF Preview Handlers
  const handlePreviewLoadingChallan = () => {
    if (!selectedChallan) {
      alert('Please select a challan first');
      return;
    }
    setPdfPreviewType('loading');
    setPdfPreviewOpen(true);
  };

  const handlePreviewChallanBilties = () => {
    if (!selectedChallan) {
      alert('Please select a challan first');
      return;
    }
    
    if (transitBilties.length === 0) {
      alert('No bilties in selected challan');
      return;
    }
    
    setPdfPreviewType('challan');
    setPdfPreviewOpen(true);
  };
  const closePdfPreview = () => {
    setPdfPreviewOpen(false);
    setPdfPreviewType(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-blue-200">
          <div className="text-2xl font-bold text-indigo-800 flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            Loading Transit Management...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-red-200 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Data</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadInitialData}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      <div className="p-4 space-y-6">
        {/* Header with PDF preview buttons */}
        <TransitHeader 
          userBranch={userBranch}
          user={user}
          bilties={[...bilties, ...stationBilties]}
          transitBilties={transitBilties}
          selectedBilties={selectedBilties}
          selectedChallan={selectedChallan}
          totalAvailableCount={totalAvailableCount}
          availableCount={filteredAvailableCount}
          onRefresh={() => refreshData('all')}
          onPreviewLoadingChallan={handlePreviewLoadingChallan}
          onPreviewChallanBilties={handlePreviewChallanBilties}
          permanentDetails={permanentDetails}
        />
        {/* Main Content */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-3 xl:grid-cols-[230px_minmax(0,1fr)] xl:gap-4 2xl:grid-cols-[250px_minmax(0,1fr)] 2xl:gap-5">
          {/* Left Panel - Challan Selection - Smaller width */}
          <div className="space-y-4 lg:space-y-4 lg:pr-0 xl:space-y-5">
            <ChallanSelector 
              challans={challans}
              challanBooks={challanBooks}
              selectedChallan={selectedChallan}
              setSelectedChallan={setSelectedChallan}
              selectedChallanBook={selectedChallanBook}
              setSelectedChallanBook={setSelectedChallanBook}
              onAddToTransit={() => handleAddBiltyToTransit(selectedBilties)}
              saving={saving}
              selectedBiltiesCount={selectedBilties.length}
              branches={branches}
              transitBilties={transitBilties}
            />
          </div>
          {/* Right Panel - Bilty Lists with Table Structure - Larger width */}
          <div className="lg:pl-0 xl:pl-1 2xl:pl-2">
            <BiltyList 
              bilties={bilties}
              stationBilties={stationBilties}
              transitBilties={transitBilties}
              selectedBilties={selectedBilties}
              setSelectedBilties={setSelectedBilties}
              selectedTransitBilties={selectedTransitBilties}
              setSelectedTransitBilties={setSelectedTransitBilties}
              selectedChallan={selectedChallan}
              onAddBiltyToTransit={handleAddBiltyToTransit}
              onRemoveBiltyFromTransit={handleRemoveBiltyFromTransit}
              onBulkRemoveFromTransit={handleBulkRemoveFromTransit}
              onRefresh={refreshData}
              saving={saving}
              totalAvailableCount={totalAvailableCount}
              onFilteredCountChange={setFilteredAvailableCount}
              cities={cities}
              branches={branches}
            />
          </div>
        </div>

        {/* Selected Bilties Summary */}
        <SelectedBiltiesSummary 
          selectedBilties={selectedBilties}
          onClearAll={() => setSelectedBilties([])}
        />

        {/* PDF Preview Modal */}
        <ChallanPDFPreview
          isOpen={pdfPreviewOpen}
          onClose={closePdfPreview}
          type={pdfPreviewType}
          bilties={[...bilties, ...stationBilties]}
          transitBilties={transitBilties}
          selectedChallan={selectedChallan}
          selectedChallanBook={selectedChallanBook}
          userBranch={userBranch}
          permanentDetails={permanentDetails}
          permanentDetailsByBranchId={permanentDetailsByBranchId}
          branches={branches}
          cities={cities}
        />
      </div>
    </div>
  );
}
