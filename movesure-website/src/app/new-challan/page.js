'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import { format } from 'date-fns';
import { Package, Truck, Plus, Minus, RefreshCw, Eye, Search } from 'lucide-react';

export default function NewChallanPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
    // Data states
  const [challans, setChallans] = useState([]);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [transitBilties, setTransitBilties] = useState([]);
  const [availableBilties, setAvailableBilties] = useState([]);
  const [cities, setCities] = useState([]);
  const [challanBooks, setChallanBooks] = useState([]);
  const [selectedChallanBook, setSelectedChallanBook] = useState(null);
  
  // Selection states
  const [selectedAvailable, setSelectedAvailable] = useState([]);
  const [selectedTransit, setSelectedTransit] = useState([]);
  
  // Filter states
  const [searchGR, setSearchGR] = useState('');

  // Load initial data
  useEffect(() => {
    if (user?.branch_id) {
      loadInitialData();
    }
  }, [user]);
  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load challans, cities, and challan books
      const [challansRes, citiesRes, challanBooksRes] = await Promise.all([
        supabase
          .from('challan_details')
          .select(`
            id, challan_no, date, total_bilty_count, is_dispatched,
            truck:trucks(truck_number),
            driver:staff!challan_details_driver_id_fkey(name)
          `)
          .eq('branch_id', user.branch_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase.from('cities').select('*').order('city_name'),
        supabase
          .from('challan_books')
          .select(`
            id, prefix, postfix, from_branch_id, to_branch_id,
            from_branch:branches!challan_books_from_branch_id_fkey(branch_name),
            to_branch:branches!challan_books_to_branch_id_fkey(branch_name)
          `)
          .eq('from_branch_id', user.branch_id)
          .eq('is_active', true)
          .eq('is_completed', false)
      ]);

      if (challansRes.error) throw challansRes.error;
      if (citiesRes.error) throw citiesRes.error;
      if (challanBooksRes.error) throw challanBooksRes.error;

      setChallans(challansRes.data || []);
      setCities(citiesRes.data || []);
      setChallanBooks(challanBooksRes.data || []);
      
      // Auto-select first challan book
      if (challanBooksRes.data?.length > 0) {
        setSelectedChallanBook(challanBooksRes.data[0]);
      }
      
      // Auto-select first challan
      if (challansRes.data?.length > 0) {
        handleChallanSelect(challansRes.data[0]);
      }

    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle challan selection
  const handleChallanSelect = async (challan) => {
    setSelectedChallan(challan);
    setSelectedAvailable([]);
    setSelectedTransit([]);
    
    if (challan) {
      await Promise.all([
        loadTransitBilties(challan.challan_no),
        loadAvailableBilties()
      ]);
    } else {
      setTransitBilties([]);
      setAvailableBilties([]);
    }
  };  // Load bilties in transit for selected challan
  const loadTransitBilties = async (challanNo) => {
    try {
      // Get transit details
      const { data: transitData, error: transitError } = await supabase
        .from('transit_details')
        .select('id, gr_no, challan_no, bilty_id')
        .eq('challan_no', challanNo);

      if (transitError) throw transitError;

      if (!transitData || transitData.length === 0) {
        setTransitBilties([]);
        return;
      }

      // Get GR numbers and bilty IDs
      const grNumbers = transitData.map(t => t.gr_no);
      const biltyIds = transitData.filter(t => t.bilty_id).map(t => t.bilty_id);

      // Get regular bilties
      const regularBiltiesPromise = biltyIds.length > 0 
        ? supabase
            .from('bilty')
            .select('id, gr_no, consignor_name, consignee_name, payment_mode, no_of_pkg, total, wt, to_city_id, created_at')
            .in('id', biltyIds)
        : Promise.resolve({ data: [] });

      // Get station bilties by GR numbers
      const stationBiltiesPromise = supabase
        .from('station_bilty_summary')
        .select('id, gr_no, consignor, consignee, payment_status, no_of_packets, amount, weight, station, created_at')
        .in('gr_no', grNumbers);

      const [regularRes, stationRes] = await Promise.all([regularBiltiesPromise, stationBiltiesPromise]);

      if (regularRes.error) throw regularRes.error;
      if (stationRes.error) throw stationRes.error;

      // Process bilties
      const processed = [];

      // Add regular bilties
      (regularRes.data || []).forEach(bilty => {
        const transit = transitData.find(t => t.bilty_id === bilty.id);
        if (transit) {
          const city = cities.find(c => c.id === bilty.to_city_id);
          processed.push({
            ...bilty,
            transit_id: transit.id,
            challan_no: transit.challan_no,
            to_city_name: city?.city_name || 'Unknown',
            bilty_type: 'regular',
            bilty_date: bilty.created_at
          });
        }
      });

      // Add station bilties (those not matched by regular bilties)
      const matchedGRs = new Set((regularRes.data || []).map(b => b.gr_no));
      (stationRes.data || []).forEach(bilty => {
        if (!matchedGRs.has(bilty.gr_no)) {
          const transit = transitData.find(t => t.gr_no === bilty.gr_no);
          if (transit) {
            processed.push({
              ...bilty,
              transit_id: transit.id,
              challan_no: transit.challan_no,
              consignor_name: bilty.consignor,
              consignee_name: bilty.consignee,
              payment_mode: bilty.payment_status,
              no_of_pkg: bilty.no_of_packets,
              total: bilty.amount,
              wt: bilty.weight,
              to_city_name: bilty.station,
              bilty_type: 'station',
              bilty_date: bilty.created_at
            });
          }
        }
      });

      setTransitBilties(processed);
    } catch (error) {
      console.error('Error loading transit bilties:', error);
      setTransitBilties([]);
    }
  };

 const loadAvailableBilties = async () => {
  try {
    console.log('🔍 STEP 1: Getting ALL transit records...');
    
    // Get ALL transit records with both GR numbers AND bilty IDs
    const { data: transitRecords, error: transitError } = await supabase
      .from('transit_details')
      .select('gr_no, bilty_id')
      .not('gr_no', 'is', null);

    if (transitError) throw transitError;

    console.log('📊 Raw transit records:', transitRecords);
    
    // Create sets for BOTH GR numbers and bilty IDs
    const transitGRNumbers = new Set();
    const transitBiltyIds = new Set();
    
    (transitRecords || []).forEach(record => {
      if (record.gr_no) {
        const cleanGR = record.gr_no.toString().trim().toUpperCase();
        transitGRNumbers.add(cleanGR);
      }
      if (record.bilty_id) {
        transitBiltyIds.add(record.bilty_id);
      }
    });

    console.log('🚫 Transit GR Numbers:', Array.from(transitGRNumbers));
    console.log('🚫 Transit Bilty IDs:', Array.from(transitBiltyIds).slice(0, 10));

    // Get regular bilties
    const { data: regularBilties, error: regularError } = await supabase
      .from('bilty')
      .select(`
        id, gr_no, consignor_name, consignee_name, payment_mode,
        no_of_pkg, total, wt, to_city_id, bilty_date
      `)
      .eq('branch_id', user.branch_id)
      .eq('is_active', true)
      .eq('saving_option', 'SAVE')
      .not('gr_no', 'is', null);

    if (regularError) throw regularError;

    // ENHANCED filtering for regular bilties - check BOTH GR and bilty ID
    const availableRegular = (regularBilties || []).filter(bilty => {
      if (!bilty.gr_no || !bilty.id) {
        console.warn('⚠️ Regular bilty missing GR or ID:', bilty);
        return false;
      }
      
      const cleanGR = bilty.gr_no.toString().trim().toUpperCase();
      
      // Check if THIS SPECIFIC BILTY is in transit (by bilty_id)
      const biltyIsInTransit = transitBiltyIds.has(bilty.id);
      
      // Check if ANY bilty with this GR number is in transit
      const grIsInTransit = transitGRNumbers.has(cleanGR);
      
      if (biltyIsInTransit) {
        console.log(`🚫 EXCLUDING regular bilty: ${cleanGR} (ID: ${bilty.id}) - THIS bilty is in transit`);
        return false;
      }
      
      if (grIsInTransit) {
        console.log(`⚠️ WARNING: GR ${cleanGR} exists in transit but different bilty. Regular bilty ID: ${bilty.id}`);
        // You might want to exclude this too, or investigate why there are duplicate GR numbers
        // For now, let's exclude it for safety:
        console.log(`🚫 EXCLUDING regular bilty: ${cleanGR} (ID: ${bilty.id}) - GR number exists in transit`);
        return false;
      }
      
      console.log(`✅ Including regular bilty: ${cleanGR} (ID: ${bilty.id})`);
      return true;
    }).map(bilty => {
      const city = cities.find(c => c.id === bilty.to_city_id);
      return {
        ...bilty,
        to_city_name: city?.city_name || 'Unknown',
        bilty_type: 'regular'
      };
    });

    // Get station bilties (unchanged - they use GR number only)
    const { data: stationBilties, error: stationError } = await supabase
      .from('station_bilty_summary')
      .select(`
        id, gr_no, consignor, consignee, payment_status,
        no_of_packets, amount, weight, station, created_at
      `)
      .not('gr_no', 'is', null);

    if (stationError) throw stationError;

    const availableStation = (stationBilties || []).filter(bilty => {
      if (!bilty.gr_no) {
        console.warn('⚠️ Station bilty without GR number:', bilty.id);
        return false;
      }
      
      const cleanGR = bilty.gr_no.toString().trim().toUpperCase();
      const isInTransit = transitGRNumbers.has(cleanGR);
      
      if (isInTransit) {
        console.log(`🚫 EXCLUDING station bilty: ${cleanGR} - found in transit`);
        return false;
      }
      
      console.log(`✅ Including station bilty: ${cleanGR}`);
      return true;
    }).map(bilty => ({
      ...bilty,
      consignor_name: bilty.consignor,
      consignee_name: bilty.consignee,
      payment_mode: bilty.payment_status,
      no_of_pkg: bilty.no_of_packets,
      total: bilty.amount,
      wt: bilty.weight,
      to_city_name: bilty.station,
      bilty_type: 'station',
      bilty_date: bilty.created_at
    }));

    const allAvailable = [...availableRegular, ...availableStation]
      .sort((a, b) => a.gr_no.localeCompare(b.gr_no, undefined, { numeric: true }));

    console.log('✅ FINAL RESULT:');
    console.log('📊 Available regular bilties:', availableRegular.length);
    console.log('📊 Available station bilties:', availableStation.length);
    console.log('📊 Total available bilties:', allAvailable.length);

    setAvailableBilties(allAvailable);
  } catch (error) {
    console.error('❌ Error loading available bilties:', error);
    setAvailableBilties([]);
  }
};
  // Add bilties to transit
  const handleAddToTransit = async () => {
    if (!selectedChallan || selectedAvailable.length === 0 || !selectedChallanBook) {
      alert('Please select a challan, challan book, and at least one bilty');
      return;
    }

    try {
      setSaving(true);      const transitData = selectedAvailable.map(bilty => ({
        challan_no: selectedChallan.challan_no,
        gr_no: bilty.gr_no,
        bilty_id: bilty.bilty_type === 'regular' ? bilty.id : null,
        challan_book_id: selectedChallanBook.id,
        from_branch_id: selectedChallanBook.from_branch_id,
        to_branch_id: selectedChallanBook.to_branch_id,
        created_by: user.id
      }));

      const { error } = await supabase
        .from('transit_details')
        .insert(transitData);

      if (error) throw error;

      // Update challan bilty count
      const newCount = selectedChallan.total_bilty_count + selectedAvailable.length;
      await supabase
        .from('challan_details')
        .update({ total_bilty_count: newCount })
        .eq('id', selectedChallan.id);

      alert(`Added ${selectedAvailable.length} bilty(s) to challan ${selectedChallan.challan_no}`);
      
      // Refresh data
      setSelectedAvailable([]);
      await Promise.all([
        loadTransitBilties(selectedChallan.challan_no),
        loadAvailableBilties()
      ]);

    } catch (error) {
      console.error('Error adding to transit:', error);
      alert('Error adding bilties to transit: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Remove bilties from transit
  const handleRemoveFromTransit = async () => {
    if (!selectedChallan || selectedTransit.length === 0) return;

    try {
      setSaving(true);

      const transitIds = selectedTransit.map(b => b.transit_id);
      
      const { error } = await supabase
        .from('transit_details')
        .delete()
        .in('id', transitIds);

      if (error) throw error;

      // Update challan bilty count
      const newCount = Math.max(0, selectedChallan.total_bilty_count - selectedTransit.length);
      await supabase
        .from('challan_details')
        .update({ total_bilty_count: newCount })
        .eq('id', selectedChallan.id);

      alert(`Removed ${selectedTransit.length} bilty(s) from challan ${selectedChallan.challan_no}`);
      
      // Refresh data
      setSelectedTransit([]);
      await Promise.all([
        loadTransitBilties(selectedChallan.challan_no),
        loadAvailableBilties()
      ]);

    } catch (error) {
      console.error('Error removing from transit:', error);
      alert('Error removing bilties from transit');
    } finally {
      setSaving(false);
    }
  };

  // Filter bilties by GR number
  const getFilteredBilties = (bilties) => {
    if (!searchGR.trim()) return bilties;
    return bilties.filter(b => 
      b.gr_no.toLowerCase().includes(searchGR.toLowerCase())
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading challan management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Truck className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Challan Bilty Management</h1>
                <p className="text-gray-600">Add or remove bilties from challans</p>
              </div>
            </div>
            <button
              onClick={() => handleChallanSelect(selectedChallan)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Challan Selection */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-bold text-gray-800 mb-4">Select Challan</h3>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {challans.map(challan => (
                  <button
                    key={challan.id}
                    onClick={() => handleChallanSelect(challan)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedChallan?.id === challan.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-800">{challan.challan_no}</div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(challan.date), 'dd/MM/yyyy')}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>{challan.total_bilty_count} bilties</span>
                      <span className={`px-2 py-1 rounded-full ${
                        challan.is_dispatched 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {challan.is_dispatched ? 'DISPATCHED' : 'ACTIVE'}
                      </span>
                    </div>
                    {challan.truck?.truck_number && (
                      <div className="text-xs text-gray-500 mt-1">
                        🚛 {challan.truck.truck_number}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Bilty Management */}
          <div className="lg:col-span-9">
            {selectedChallan ? (
              <div className="space-y-6">                {/* Challan Info & Challan Book Selection */}
                <div className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        Challan: {selectedChallan.challan_no}
                      </h2>
                      <p className="text-gray-600">
                        Date: {format(new Date(selectedChallan.date), 'dd/MM/yyyy')} • 
                        Bilties: {selectedChallan.total_bilty_count}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleAddToTransit}
                        disabled={selectedAvailable.length === 0 || saving || selectedChallan.is_dispatched || !selectedChallanBook}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                        Add Selected ({selectedAvailable.length})
                      </button>
                      <button
                        onClick={handleRemoveFromTransit}
                        disabled={selectedTransit.length === 0 || saving || selectedChallan.is_dispatched}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4" />
                        Remove Selected ({selectedTransit.length})
                      </button>
                    </div>
                  </div>
                  
                  {/* Challan Book Selection */}
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Challan Book (Required for adding bilties)
                    </label>
                    <select
                      value={selectedChallanBook?.id || ''}
                      onChange={(e) => {
                        const book = challanBooks.find(b => b.id === e.target.value);
                        setSelectedChallanBook(book || null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Challan Book...</option>
                      {challanBooks.map(book => (
                        <option key={book.id} value={book.id}>
                          {book.prefix} → {book.to_branch?.branch_name || 'Unknown Destination'}
                        </option>
                      ))}
                    </select>
                    {selectedChallanBook && (
                      <p className="text-sm text-gray-600 mt-1">
                        Route: {selectedChallanBook.from_branch?.branch_name} → {selectedChallanBook.to_branch?.branch_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Search */}
                <div className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex items-center gap-4">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by GR Number..."
                      value={searchGR}
                      onChange={(e) => setSearchGR(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">                  {/* Available Bilties */}
                  <div className="bg-white rounded-lg shadow-md">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <Package className="w-5 h-5 text-green-600" />
                          Available Bilties ({getFilteredBilties(availableBilties).length})
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const filtered = getFilteredBilties(availableBilties);
                              setSelectedAvailable(filtered);
                            }}
                            disabled={getFilteredBilties(availableBilties).length === 0}
                            className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50"
                          >
                            Select All
                          </button>
                          <button
                            onClick={() => setSelectedAvailable([])}
                            disabled={selectedAvailable.length === 0}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 disabled:opacity-50"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div><div className="p-4">
                      <div className="max-h-96 overflow-y-auto space-y-2">
                        {getFilteredBilties(availableBilties).length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            {searchGR ? 'No bilties found matching search' : 'No available bilties'}
                          </div>
                        ) : (
                          getFilteredBilties(availableBilties).map(bilty => (
                            <div
                              key={`${bilty.bilty_type}-${bilty.id}`}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedAvailable.some(s => s.id === bilty.id && s.bilty_type === bilty.bilty_type)
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                              onClick={() => {
                                const isSelected = selectedAvailable.some(s => s.id === bilty.id && s.bilty_type === bilty.bilty_type);
                                if (isSelected) {
                                  setSelectedAvailable(prev => prev.filter(s => !(s.id === bilty.id && s.bilty_type === bilty.bilty_type)));
                                } else {
                                  setSelectedAvailable(prev => [...prev, bilty]);
                                }
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-800">{bilty.gr_no}</div>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  bilty.bilty_type === 'regular' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {bilty.bilty_type === 'regular' ? 'REG' : 'STN'}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                <div>{bilty.consignor_name} → {bilty.consignee_name}</div>
                                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                                  <span>{bilty.to_city_name}</span>
                                  <span>{bilty.no_of_pkg} pkg • ₹{bilty.total}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>                  {/* Transit Bilties */}
                  <div className="bg-white rounded-lg shadow-md">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <Truck className="w-5 h-5 text-blue-600" />
                          In Transit ({getFilteredBilties(transitBilties).length})
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const filtered = getFilteredBilties(transitBilties);
                              setSelectedTransit(filtered);
                            }}
                            disabled={getFilteredBilties(transitBilties).length === 0}
                            className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:opacity-50"
                          >
                            Select All
                          </button>
                          <button
                            onClick={() => setSelectedTransit([])}
                            disabled={selectedTransit.length === 0}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 disabled:opacity-50"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div><div className="p-4">
                      <div className="max-h-96 overflow-y-auto space-y-2">
                        {getFilteredBilties(transitBilties).length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Truck className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            {searchGR ? 'No transit bilties found matching search' : 'No bilties in transit for this challan'}
                          </div>
                        ) : (
                          getFilteredBilties(transitBilties).map(bilty => (
                            <div
                              key={`transit-${bilty.transit_id}`}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedTransit.some(s => s.transit_id === bilty.transit_id)
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                              onClick={() => {
                                const isSelected = selectedTransit.some(s => s.transit_id === bilty.transit_id);
                                if (isSelected) {
                                  setSelectedTransit(prev => prev.filter(s => s.transit_id !== bilty.transit_id));
                                } else {
                                  setSelectedTransit(prev => [...prev, bilty]);
                                }
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-800">{bilty.gr_no}</div>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  bilty.bilty_type === 'regular' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {bilty.bilty_type === 'regular' ? 'REG' : 'STN'}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                <div>{bilty.consignor_name} → {bilty.consignee_name}</div>
                                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                                  <span>{bilty.to_city_name}</span>
                                  <span>{bilty.no_of_pkg} pkg • ₹{bilty.total}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-600 mb-2">Select a Challan</h3>
                <p className="text-gray-500">Choose a challan from the left panel to manage its bilties</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}