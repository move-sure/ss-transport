'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, DollarSign, Package, TrendingUp, Loader2, Save, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import BiltyKaatCell from './bilty-kaat-cell';
import TransportFilter from './transport-filter';
import StationTransportCell from './station-transport-cell';
import supabase from '../../app/utils/supabase';
import { generateFinanceBiltyPDF } from './finance-bilty-pdf-generator';
import {
  getCityNameById,
  getCityNameByCode,
  getCityIdByCode,
  calculateFinancialSummary,
  getUniqueCities,
  applyPaymentModeFilter,
  applyTransportFilter,
  applyCityFilter,
  calculateOtherCharges,
  getPaymentModeBadgeClass,
  formatCurrency,
  formatWeight
} from './finance-bilty-helpers';
import {
  loadHubRatesForCity,
  applyHubRateToMultipleBilties,
  calculateTotalKaatAmount,
  getTransportDetailsFromBilties,
  saveKaatBillToDatabase,
  getCurrentUser
} from './kaat-bill-service';

export default function FinanceBiltyTable({ 
  transitDetails, 
  selectedChallan,
  cities,
  editMode = false,
  editingBillId = null,
  editingBillGrNumbers = [],
  onKaatBillSaved = null,
  onCancelEdit = null,
  onViewKaatBills = null
}) {
  const [filterPaymentMode, setFilterPaymentMode] = useState('all');
  const [filterCity, setFilterCity] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedTransports, setSelectedTransports] = useState([]);
  const [availableTransports, setAvailableTransports] = useState([]);
  const [hubRates, setHubRates] = useState([]);
  const [selectedHubRate, setSelectedHubRate] = useState('');
  const [loadingRates, setLoadingRates] = useState(false);
  const [applyingRates, setApplyingRates] = useState(false);
  const [savingKaatBill, setSavingKaatBill] = useState(false);
  const [selectedBiltiesForSave, setSelectedBiltiesForSave] = useState([]);
  const [showBiltySelector, setShowBiltySelector] = useState(false);
  const [kaatDetails, setKaatDetails] = useState([]);
  const [alreadySavedGrNos, setAlreadySavedGrNos] = useState([]);
  
  // NEW: Batch loaded data to avoid per-cell requests
  const [allKaatData, setAllKaatData] = useState({});
  const [transportsByCity, setTransportsByCity] = useState({});
  const [loadingBatchData, setLoadingBatchData] = useState(false);

  // Initialize selected bilties from edit mode
  useEffect(() => {
    if (editMode && editingBillGrNumbers.length > 0) {
      const normalized = editingBillGrNumbers.map(gr => String(gr).trim().toUpperCase());
      setSelectedBiltiesForSave(normalized);
    } else if (!editMode) {
      setSelectedBiltiesForSave([]);
    }
  }, [editMode, editingBillGrNumbers]);

  // Filter transit details for selected challan - DEFINE BEFORE USE
  const challanTransits = useMemo(() => {
    if (!transitDetails || !selectedChallan) return [];
    const filtered = transitDetails.filter(t => t.challan_no === selectedChallan.challan_no);
    console.log('🔍 Challan transits for', selectedChallan.challan_no, ':', filtered.length);
    if (filtered.length > 0) {
      console.log('📊 Sample transit data:', filtered[0]);
    }
    return filtered;
  }, [transitDetails, selectedChallan]);

  // NEW: Batch load all kaat data for the challan
  useEffect(() => {
    if (challanTransits.length > 0) {
      loadAllKaatData();
      loadAllTransportData();
    }
  }, [challanTransits]);

  const loadAllKaatData = async () => {
    try {
      setLoadingBatchData(true);
      
      // Get all unique GR numbers
      const grNumbers = [...new Set(challanTransits.map(t => t.gr_no).filter(Boolean))];
      
      if (grNumbers.length === 0) {
        setAllKaatData({});
        return;
      }
      
      console.log('📦 Batch loading kaat data for', grNumbers.length, 'GR numbers');
      
      // Fetch all kaat data in one query using .in() filter
      const { data, error } = await supabase
        .from('bilty_wise_kaat')
        .select('*')
        .in('gr_no', grNumbers);

      if (error) throw error;

      // Create a map of GR number -> kaat data
      const kaatMap = {};
      (data || []).forEach(kaat => {
        kaatMap[kaat.gr_no] = kaat;
      });

      console.log('✅ Loaded', Object.keys(kaatMap).length, 'kaat records in one request');
      setAllKaatData(kaatMap);
    } catch (err) {
      console.error('❌ Error batch loading kaat data:', err);
      setAllKaatData({});
    } finally {
      setLoadingBatchData(false);
    }
  };

  const loadAllTransportData = async () => {
    try {
      // Get unique city IDs from station bilties
      const stationCodes = [...new Set(
        challanTransits
          .filter(t => t.station?.station)
          .map(t => t.station.station)
      )];
      
      if (stationCodes.length === 0) {
        setTransportsByCity({});
        return;
      }

      // Find cities by station codes
      const cityIds = stationCodes
        .map(code => cities?.find(c => c.city_code === code)?.id)
        .filter(Boolean);

      if (cityIds.length === 0) {
        setTransportsByCity({});
        return;
      }

      console.log('📦 Batch loading transports for', cityIds.length, 'cities');

      // Fetch all transports for these cities in one query
      const { data, error } = await supabase
        .from('transports')
        .select('id, transport_name, gst_number, city_id')
        .in('city_id', cityIds);

      if (error) throw error;

      // Group transports by city_id
      const transportMap = {};
      (data || []).forEach(transport => {
        if (!transportMap[transport.city_id]) {
          transportMap[transport.city_id] = [];
        }
        transportMap[transport.city_id].push(transport);
      });

      console.log('✅ Loaded transports for', Object.keys(transportMap).length, 'cities in one request');
      setTransportsByCity(transportMap);
    } catch (err) {
      console.error('❌ Error batch loading transport data:', err);
      setTransportsByCity({});
    }
  };

  // City helper functions
  const getCityName = (cityId) => getCityNameById(cityId, cities);
  const getCityByCode = (code) => getCityNameByCode(code, cities);

  // Fetch already saved GR numbers from kaat_bill_master for this challan
  useEffect(() => {
    const fetchAlreadySavedBilties = async () => {
      if (!selectedChallan?.challan_no) {
        setAlreadySavedGrNos([]);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('kaat_bill_master')
          .select('gr_numbers')
          .eq('challan_no', selectedChallan.challan_no);
        
        if (!error && data) {
          console.log('📋 Kaat bill master data for challan', selectedChallan.challan_no, ':', data);
          
          // Flatten all GR numbers from all bills for this challan and normalize
          const allSavedGrNos = data.reduce((acc, bill) => {
            const grNumbers = bill.gr_numbers || [];
            // Normalize GR numbers to strings and trim
            const normalized = grNumbers.map(gr => String(gr).trim().toUpperCase());
            return [...acc, ...normalized];
          }, []);
          
          const uniqueSavedGrNos = [...new Set(allSavedGrNos)];
          console.log('✅ Already saved GR numbers for this challan:', uniqueSavedGrNos);
          console.log('📊 Sample transit GR numbers:', challanTransits.slice(0, 5).map(t => String(t.gr_no).trim().toUpperCase()));
          setAlreadySavedGrNos(uniqueSavedGrNos);
        }
      } catch (err) {
        console.error('Error fetching saved bilties:', err);
      }
    };
    
    fetchAlreadySavedBilties();
  }, [selectedChallan?.challan_no, challanTransits]);

  // Load hub rates when city is selected
  useEffect(() => {
    if (selectedCityId) {
      loadHubRates();
    } else {
      setHubRates([]);
      setSelectedHubRate('');
    }
  }, [selectedCityId]);

  const loadHubRates = async () => {
    setLoadingRates(true);
    const { rates, error } = await loadHubRatesForCity(selectedCityId);
    if (!error) {
      setHubRates(rates);
    }
    setLoadingRates(false);
  };

  // NEW: Handler for kaat updates to refresh batch data
  const handleKaatUpdated = async (grNo, newKaatData) => {
    setAllKaatData(prev => ({
      ...prev,
      [grNo]: newKaatData
    }));
  };

  const handleKaatDeleted = async (grNo) => {
    setAllKaatData(prev => {
      const updated = { ...prev };
      delete updated[grNo];
      return updated;
    });
  };

  // Apply selected hub rate to all filtered bilties
  const applyHubRateToAll = async () => {
    if (!selectedHubRate || filteredTransits.length === 0) return;

    const confirmed = window.confirm(
      `Apply selected hub rate to ${filteredTransits.length} filtered bilties?`
    );
    if (!confirmed) return;

    setApplyingRates(true);
    const { success, count, error } = await applyHubRateToMultipleBilties(
      filteredTransits,
      selectedChallan,
      selectedCityId,
      selectedHubRate,
      hubRates
    );
    
    if (success) {
      alert(`Successfully applied hub rate to ${count} bilties!`);
    } else {
      alert('Failed to apply hub rates: ' + error.message);
    }
    setApplyingRates(false);
  };

  // Get unique city list from filtered transits
  const uniqueCities = useMemo(() => {
    return getUniqueCities(challanTransits, cities);
  }, [challanTransits, cities]);

  // Apply filters
  const filteredTransits = useMemo(() => {
    let filtered = challanTransits;

    // Apply payment mode filter
    filtered = applyPaymentModeFilter(filtered, filterPaymentMode);

    // Apply transport filter
    filtered = applyTransportFilter(filtered, selectedTransports, availableTransports, cities);

    // Apply city filter
    filtered = applyCityFilter(filtered, selectedCityId);

    return filtered;
  }, [challanTransits, filterPaymentMode, selectedTransports, selectedCityId, availableTransports, cities]);

  // Calculate financial summary
  const financialSummary = useMemo(() => {
    return calculateFinancialSummary(filteredTransits);
  }, [filteredTransits]);



  // Download PDF
  const handleDownloadPDF = async () => {
    await generateFinanceBiltyPDF(filteredTransits, selectedChallan, cities, getCityName);
  };

  // Save Kaat Bill
  const handleSaveKaatBill = async () => {
    if (selectedBiltiesForSave.length === 0) {
      alert('Please select bilties from the table first!');
      return;
    }

    // Show bilty selector modal with current selection
    setShowBiltySelector(true);
  };

  const confirmSaveKaatBill = async () => {
    if (selectedBiltiesForSave.length === 0) {
      alert('Please select at least one bilty!');
      return;
    }

    try {
      setSavingKaatBill(true);

      // Get bilties with kaat data
      const biltiesWithKaat = filteredTransits.filter(t => 
        selectedBiltiesForSave.includes(String(t.gr_no).trim().toUpperCase())
      );

      // Calculate total kaat amount
      const { totalKaatAmount, kaatDetails: details, error: calcError } = await calculateTotalKaatAmount(biltiesWithKaat);
      if (calcError) throw calcError;
      
      setKaatDetails(details);

      // Get transport details
      const { transportName, transportGst } = getTransportDetailsFromBilties(biltiesWithKaat);

      // Get current user
      const currentUser = getCurrentUser();

      if (editMode && editingBillId) {
        // Update existing bill
        const { error } = await supabase
          .from('kaat_bill_master')
          .update({
            gr_numbers: selectedBiltiesForSave,
            total_bilty_count: selectedBiltiesForSave.length,
            total_kaat_amount: totalKaatAmount,
            updated_by: currentUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBillId);

        if (error) throw error;
        alert(`✅ Kaat Bill updated successfully!\n\nBilties: ${selectedBiltiesForSave.length}\nTotal Kaat Amount: ₹${totalKaatAmount.toFixed(2)}`);
      } else {
        // Create new bill
        const kaatBillData = {
          challan_no: selectedChallan.challan_no,
          transport_name: transportName,
          transport_gst: transportGst,
          gr_numbers: selectedBiltiesForSave,
          total_bilty_count: selectedBiltiesForSave.length,
          total_kaat_amount: totalKaatAmount,
          created_by: currentUser.id,
          updated_by: currentUser.id,
          printed_yet: false
        };

        const { success, error } = await saveKaatBillToDatabase(kaatBillData);
        if (!success) throw error;

        alert(`✅ Kaat Bill saved successfully!\n\nBilties: ${selectedBiltiesForSave.length}\nTotal Kaat Amount: ₹${totalKaatAmount.toFixed(2)}`);
      }
      
      // Refresh already saved list for this challan
      const { data: updatedData } = await supabase
        .from('kaat_bill_master')
        .select('gr_numbers')
        .eq('challan_no', selectedChallan.challan_no);
      if (updatedData) {
        const allSavedGrNos = updatedData.reduce((acc, bill) => {
          const grNumbers = bill.gr_numbers || [];
          const normalized = grNumbers.map(gr => String(gr).trim().toUpperCase());
          return [...acc, ...normalized];
        }, []);
        setAlreadySavedGrNos([...new Set(allSavedGrNos)]);
      }
      
      setShowBiltySelector(false);
      setSelectedBiltiesForSave([]);
      
      // Notify parent component
      if (onKaatBillSaved) {
        onKaatBillSaved();
      }

    } catch (err) {
      console.error('❌ Error saving kaat bill:', err);
      alert('Failed to save kaat bill: ' + err.message);
    } finally {
      setSavingKaatBill(false);
    }
  };

  if (!selectedChallan) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">Please select a challan to view bilty details</p>
      </div>
    );
  }

  if (challanTransits.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">No bilties found for this challan</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full">
      {/* Header - Compact */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              {selectedChallan.challan_no}
              {editMode && <span className="ml-3 text-xs bg-orange-500 px-3 py-1.5 rounded-full font-semibold animate-pulse">✏️ EDIT MODE</span>}
            </h2>
            <p className="text-sm text-white/90 mt-1">
              {filteredTransits.length} {filteredTransits.length === 1 ? 'bilty' : 'bilties'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {onViewKaatBills && !editMode && (
              <button
                onClick={onViewKaatBills}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 px-4 py-2.5 rounded-lg transition-all hover:scale-105 flex items-center gap-2 text-sm font-semibold shadow-lg border border-white/20"
                title="View saved kaat bills for this challan"
              >
                <FileText className="w-4 h-4" />
                View Kaat Bills
              </button>
            )}
            {editMode && onCancelEdit && (
              <button
                onClick={onCancelEdit}
                className="bg-red-500 hover:bg-red-600 px-4 py-2.5 rounded-lg transition-all hover:scale-105 flex items-center gap-2 text-sm font-semibold shadow-lg"
              >
                <XCircle className="w-4 h-4" />
                Cancel Edit
              </button>
            )}
            <button
              onClick={handleSaveKaatBill}
              disabled={selectedBiltiesForSave.length === 0 || savingKaatBill}
              className="bg-green-600 hover:bg-green-700 px-5 py-2.5 rounded-lg transition-all hover:scale-105 flex items-center gap-2 text-sm font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              title={selectedBiltiesForSave.length === 0 ? 'Select bilties from the table below' : `${editMode ? 'Update' : 'Save'} ${selectedBiltiesForSave.length} selected bilties`}
            >
              <Save className="w-4 h-4" />
              {editMode ? 'Update' : 'Save'} Kaat Bill {selectedBiltiesForSave.length > 0 && `(${selectedBiltiesForSave.length})`}
            </button>
            {!editMode && (
              <button
                onClick={handleDownloadPDF}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 px-4 py-2.5 rounded-lg transition-all hover:scale-105 flex items-center gap-2 text-sm font-semibold shadow-lg border border-white/20"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            )}
          </div>
        </div>

        {/* Financial Summary Cards - Compact */}
        <div className="grid grid-cols-5 gap-2">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <div className="text-[10px] font-semibold opacity-90">Total</div>
            <div className="text-sm font-bold">₹{(financialSummary.totalAmount / 1000).toFixed(0)}K</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <div className="text-[10px] font-semibold opacity-90">Paid</div>
            <div className="text-sm font-bold">{financialSummary.paidCount}</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <div className="text-[10px] font-semibold opacity-90">To Pay</div>
            <div className="text-sm font-bold">{financialSummary.toBillCount}</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <div className="text-[10px] font-semibold opacity-90">Pkgs</div>
            <div className="text-sm font-bold">{financialSummary.totalPackages}</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <div className="text-[10px] font-semibold opacity-90">Weight</div>
            <div className="text-sm font-bold">{(financialSummary.totalWeight / 1000).toFixed(1)}T</div>
          </div>
        </div>
      </div>

      {/* Filters - Compact */}
      <div className="p-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex gap-2 items-center justify-between mb-2">
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span className="text-gray-700">Selected ({selectedBiltiesForSave.length})</span>
            </div>
            {!editMode && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span className="text-gray-700">Already Saved ({filteredTransits.filter(t => alreadySavedGrNos.includes(String(t.gr_no).trim().toUpperCase())).length})</span>
              </div>
            )}
            {editMode && (
              <div className="flex items-center gap-1">
                <span className="text-orange-700 font-semibold">✏️ Editing Kaat Bill - Click rows to add/remove bilties</span>
              </div>
            )}
          </div>
          {selectedBiltiesForSave.length > 0 && (
            <button
              onClick={() => setSelectedBiltiesForSave([])}
              className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1 rounded hover:bg-red-50"
            >
              Clear Selection
            </button>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {/* Transport Filter */}
          <div className="flex-1">
            <TransportFilter
              challanTransits={challanTransits}
              selectedTransports={selectedTransports}
              onTransportSelect={setSelectedTransports}
              onTransportClear={() => setSelectedTransports([])}
              cities={cities}
              onAvailableTransportsUpdate={setAvailableTransports}
            />
          </div>
          {/* Payment Mode */}
          <div className="w-32 flex-shrink-0">
            <select
              value={filterPaymentMode}
              onChange={(e) => setFilterPaymentMode(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="to-pay">To Pay</option>
              <option value="foc">FOC</option>
            </select>
          </div>

          {/* City Filter */}
          <div className="flex-1">
            <select
              value={selectedCityId}
              onChange={(e) => {
                setSelectedCityId(e.target.value);
                setSelectedHubRate('');
              }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-semibold"
            >
              <option value="">-- Select Destination City --</option>
              {uniqueCities.map(city => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
          </div>

          {/* Hub Rate Selector - Only show when city selected */}
          {selectedCityId && (
            <>
              <div className="flex-1">
                <select
                  value={selectedHubRate}
                  onChange={(e) => setSelectedHubRate(e.target.value)}
                  disabled={loadingRates}
                  className="w-full px-2 py-1.5 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-blue-50"
                >
                <option value="">-- Select Hub Rate --</option>
                {hubRates.map(rate => {
                  const transportName = rate.transport_name || rate.transport?.transport_name || 'Unknown';
                  const cityName = rate.transport?.city_name || '';
                  const rateKg = rate.rate_per_kg ? `₹${parseFloat(rate.rate_per_kg).toFixed(2)}/kg` : '';
                  const ratePkg = rate.rate_per_pkg ? `₹${parseFloat(rate.rate_per_pkg).toFixed(2)}/pkg` : '';
                  const rateDisplay = [rateKg, ratePkg].filter(Boolean).join(' + ');
                  const minCharge = rate.min_charge > 0 ? ` (Min: ₹${parseFloat(rate.min_charge).toFixed(0)})` : '';
                  
                  return (
                    <option key={rate.id} value={rate.id}>
                      {transportName} {cityName ? `(${cityName})` : ''} → {rateDisplay}{minCharge}
                    </option>
                  );
                })}
                </select>
              </div>

              <button
                onClick={applyHubRateToAll}
                disabled={!selectedHubRate || applyingRates || filteredTransits.length === 0}
                className="px-4 py-1.5 bg-green-600 text-white rounded-lg font-semibold text-xs hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1 flex-shrink-0"
              >
                {applyingRates ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-3 h-3" />
                    Apply to {filteredTransits.length}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table - Scrollable */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs">
          <thead className="bg-gray-200 sticky top-0 z-10">
            <tr>
              <th className="px-1.5 py-1.5 text-center font-semibold text-gray-900 text-[10px] w-8">#</th>
              <th className="px-1.5 py-1.5 text-center font-semibold text-gray-900 text-[10px] w-8">
                <input
                  type="checkbox"
                  checked={selectedBiltiesForSave.length === filteredTransits.filter(t => !alreadySavedGrNos.includes(String(t.gr_no).trim().toUpperCase())).length && filteredTransits.filter(t => !alreadySavedGrNos.includes(String(t.gr_no).trim().toUpperCase())).length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const unsavedGrNos = filteredTransits
                        .filter(t => !alreadySavedGrNos.includes(String(t.gr_no).trim().toUpperCase()))
                        .map(t => String(t.gr_no).trim().toUpperCase());
                      setSelectedBiltiesForSave(unsavedGrNos);
                    } else {
                      setSelectedBiltiesForSave([]);
                    }
                  }}
                  className="cursor-pointer w-4 h-4"
                />
              </th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-900 text-[10px]">GR No</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-900 text-[10px]">Date</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-900 text-[10px]">Consignor</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-900 text-[10px]">Consignee</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-900 text-[10px]">Transport</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-900 text-[10px] w-16">Dest</th>
              <th className="px-1.5 py-1.5 text-left font-semibold text-gray-900 text-[10px]">Contents</th>
              <th className="px-1.5 py-1.5 text-right font-semibold text-gray-900 text-[10px]">Pkg</th>
              <th className="px-1.5 py-1.5 text-right font-semibold text-gray-900 text-[10px]">Wt(KG)</th>
              <th className="px-1.5 py-1.5 text-right font-semibold text-gray-900 text-[10px] w-16">Total</th>
              <th className="px-1.5 py-1.5 text-center font-semibold text-gray-900 text-[10px]">Pay</th>
              <th className="px-1.5 py-1.5 text-center font-semibold text-gray-900 text-[10px] w-28">Kaat</th>
              <th className="px-1.5 py-1.5 text-right font-semibold text-gray-900 text-[10px] w-16">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTransits.map((transit, index) => {
              const bilty = transit.bilty;
              const station = transit.station;
              const data = bilty || station;
              const otherCharges = calculateOtherCharges(bilty);
              
              // Normalize GR number for comparison - uppercase for case-insensitive matching
              const normalizedGrNo = String(transit.gr_no).trim().toUpperCase();
              const isSelected = selectedBiltiesForSave.includes(normalizedGrNo);
              const isAlreadySaved = !editMode && alreadySavedGrNos.includes(normalizedGrNo);
              const isClickable = editMode || !isAlreadySaved;

              const handleRowClick = (e) => {
                // Don't toggle if clicking on interactive elements
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                  return;
                }
                
                if (!isClickable) return;
                
                if (isSelected) {
                  setSelectedBiltiesForSave(prev => prev.filter(gr => gr !== normalizedGrNo));
                } else {
                  setSelectedBiltiesForSave(prev => [...prev, normalizedGrNo]);
                }
              };

              return (
                <tr 
                  key={transit.id}
                  onClick={handleRowClick}
                  className={`transition-colors ${
                    isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                  } ${
                    isAlreadySaved 
                      ? 'bg-yellow-100 hover:bg-yellow-200' 
                      : isSelected 
                      ? 'bg-green-100 hover:bg-green-200' 
                      : 'hover:bg-blue-50'
                  }`}
                  title={isClickable ? 'Click to select/deselect' : 'Already saved in another kaat bill'}
                >
                  <td className="px-1.5 py-1.5 text-center font-semibold text-gray-700 text-[10px]">{index + 1}</td>
                  <td className="px-1.5 py-1.5 text-center">
                    {isAlreadySaved ? (
                      <span className="text-yellow-600 font-bold text-xs" title="Already saved in a kaat bill">🔒</span>
                    ) : (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const grNo = String(transit.gr_no).trim().toUpperCase();
                          if (e.target.checked) {
                            setSelectedBiltiesForSave(prev => [...prev, grNo]);
                          } else {
                            setSelectedBiltiesForSave(prev => prev.filter(gr => gr !== grNo));
                          }
                        }}
                        className="cursor-pointer w-4 h-4"
                        title="Select this bilty"
                      />
                    )}
                  </td>
                  <td className="px-1.5 py-1.5">
                    <span className={`font-bold text-[10px] ${isAlreadySaved ? 'text-orange-700' : 'text-blue-700'}`}>
                      {transit.gr_no}
                      {isAlreadySaved && <span className="ml-1 text-[9px] text-orange-600">✓</span>}
                    </span>
                  </td>
                  <td className="px-1.5 py-1.5 text-gray-600 text-[10px]">
                    {data?.bilty_date || data?.created_at 
                      ? format(new Date(data.bilty_date || data.created_at), 'dd/MM')
                      : '-'}
                  </td>
                  <td className="px-1.5 py-1.5 text-gray-800 truncate max-w-[80px] text-[10px]" title={bilty?.consignor_name || station?.consignor || 'N/A'}>
                    {bilty?.consignor_name || station?.consignor || 'N/A'}
                  </td>
                  <td className="px-1.5 py-1.5 text-gray-800 truncate max-w-[80px] text-[10px]" title={bilty?.consignee_name || station?.consignee || 'N/A'}>
                    {bilty?.consignee_name || station?.consignee || 'N/A'}
                  </td>
                  <td className="px-1.5 py-1.5">
                    {bilty?.transport_name ? (
                      <div className="max-w-[120px]" title={bilty.transport_name}>
                        <div className="font-semibold text-indigo-700 text-[10px] break-words leading-tight">{bilty.transport_name}</div>
                        {bilty.transport_gst && (
                          <div className="text-[8px] text-gray-500 truncate mt-0.5">{bilty.transport_gst}</div>
                        )}
                      </div>
                    ) : station?.station ? (
                      <StationTransportCell 
                        stationCode={station.station} 
                        cities={cities}
                        transportsByCity={transportsByCity}
                      />
                    ) : (
                      <span className="text-gray-400 text-[10px]">-</span>
                    )}
                  </td>
                  <td className="px-1.5 py-1.5">
                    <span className="font-semibold text-purple-700 text-[10px]">
                      {bilty ? getCityName(bilty.to_city_id) : getCityByCode(station?.station)}
                    </span>
                  </td>
                  <td className="px-1.5 py-1.5 text-gray-600 truncate max-w-[70px] text-[10px]" title={bilty?.contain || station?.contents || 'N/A'}>
                    {bilty?.contain || station?.contents || 'N/A'}
                  </td>
                  <td className="px-1.5 py-1.5 text-right text-gray-800 text-[10px]">
                    {bilty?.no_of_pkg || station?.no_of_packets || 0}
                  </td>
                  <td className="px-1.5 py-1.5 text-right">
                    <span className="font-semibold text-gray-900 text-[10px]">
                      {formatWeight(bilty?.wt || station?.weight || 0)}
                    </span>
                  </td>
                  <td className="px-1.5 py-1.5 text-right font-semibold text-gray-900 text-[10px]">
                    {formatCurrency(bilty?.total || station?.amount || 0)}
                  </td>
                  <td className="px-1.5 py-1.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${
                      getPaymentModeBadgeClass(bilty?.payment_mode || station?.payment_status)
                    }`}>
                      {(() => {
                        const paymentMode = bilty?.payment_mode || station?.payment_status;
                        const deliveryType = bilty?.delivery_type || station?.delivery_type || '';
                        const payment = paymentMode?.toUpperCase().replace('-', ' ') || 'N/A';
                        const delivery = deliveryType.toLowerCase().includes('door') ? '/DD' : '';
                        return payment + delivery;
                      })()}
                    </span>
                  </td>
                  <td className="px-1.5 py-1.5">
                    <BiltyKaatCell
                      grNo={transit.gr_no}
                      challanNo={selectedChallan.challan_no}
                      destinationCityId={bilty?.to_city_id || getCityIdByCode(station?.station, cities)}
                      biltyWeight={bilty?.wt || station?.weight || 0}
                      biltyPackages={bilty?.no_of_pkg || station?.no_of_packets || 0}
                      biltyTransportGst={bilty?.transport_gst || null}
                      kaatData={allKaatData[transit.gr_no] || null}
                      onKaatUpdate={(newData) => handleKaatUpdated(transit.gr_no, newData)}
                      onKaatDelete={() => handleKaatDeleted(transit.gr_no)}
                    />
                  </td>
                  <td className="px-1.5 py-1.5 text-right">
                    {(() => {
                      const kaatData = allKaatData[transit.gr_no];
                      if (!kaatData) return <span className="text-gray-400 text-[10px]">-</span>;
                      
                      const total = parseFloat(bilty?.total || station?.amount || 0);
                      
                      // Calculate kaat amount using same logic as BiltyKaatCell
                      const weight = parseFloat(bilty?.wt || station?.weight || 0);
                      const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
                      const rateKg = parseFloat(kaatData.rate_per_kg) || 0;
                      const ratePkg = parseFloat(kaatData.rate_per_pkg) || 0;
                      
                      let kaatAmount = 0;
                      if (kaatData.rate_type === 'per_kg') {
                        kaatAmount = weight * rateKg;
                      } else if (kaatData.rate_type === 'per_pkg') {
                        kaatAmount = packages * ratePkg;
                      } else if (kaatData.rate_type === 'hybrid') {
                        kaatAmount = (weight * rateKg) + (packages * ratePkg);
                      }
                      
                      const profit = total - kaatAmount;
                      
                      return (
                        <span className={`font-bold text-[10px] ${
                          profit > 0 ? 'text-green-700' : profit < 0 ? 'text-red-700' : 'text-gray-700'
                        }`}>
                          ₹{profit.toFixed(2)}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer - Sticky at bottom */}
      <div className="bg-gray-200 border-t-2 border-gray-300 flex-shrink-0">
        <table className="w-full text-xs">
          <tfoot>
            <tr className="font-bold">
              <td colSpan="9" className="px-2 py-1.5 text-right">Total:</td>
              <td className="px-2 py-1.5 text-right">{financialSummary.totalPackages}</td>
              <td className="px-2 py-1.5 text-right">{financialSummary.totalWeight.toFixed(2)} KG</td>
              <td className="px-2 py-1.5 text-right text-gray-900">
                {financialSummary.totalAmount.toLocaleString()}
              </td>
              <td colSpan="3" className="px-2 py-1.5"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Bilty Selection Modal */}
      {showBiltySelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-4 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Select Bilties for Kaat Bill
              </h3>
              <p className="text-sm text-white/80 mt-1">
                Choose which bilties to include in the kaat bill report
              </p>
            </div>

            {/* Bilty List */}
            <div className="flex-1 overflow-auto p-4">
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => setSelectedBiltiesForSave(filteredTransits.map(t => t.gr_no))}
                  className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Select All ({filteredTransits.length})
                </button>
                <button
                  onClick={() => setSelectedBiltiesForSave([])}
                  className="text-sm text-red-600 hover:text-red-800 font-semibold"
                >
                  Deselect All
                </button>
              </div>

              <div className="space-y-2">
                {filteredTransits.map(transit => {
                  const bilty = transit.bilty;
                  const station = transit.station;
                  const data = bilty || station;
                  const isSelected = selectedBiltiesForSave.includes(transit.gr_no);
                  
                  // Find kaat details for this GR number
                  const kaatDetail = kaatDetails.find(k => k.gr_no === transit.gr_no);

                  return (
                    <div
                      key={transit.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedBiltiesForSave(prev => prev.filter(gr => gr !== transit.gr_no));
                        } else {
                          setSelectedBiltiesForSave(prev => [...prev, transit.gr_no]);
                        }
                      }}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="font-bold text-gray-900 text-lg">{transit.gr_no}</div>
                            {isSelected && (
                              <span className="text-green-600 text-xs font-semibold bg-green-100 px-2 py-0.5 rounded-full">✓ Selected</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            <span className="font-semibold">{bilty?.consignor_name || station?.consignor || 'N/A'}</span> → <span className="font-semibold">{bilty?.consignee_name || station?.consignee || 'N/A'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                            <div>
                              <span className="text-gray-500">Transport:</span> <span className="font-medium">{bilty?.transport_name || 'Station Bilty'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Packages:</span> <span className="font-medium">{bilty?.no_of_pkg || station?.no_of_packets || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Weight:</span> <span className="font-medium">{formatWeight(bilty?.wt || station?.weight || 0)} KG</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Freight:</span> <span className="font-medium">₹{formatCurrency(bilty?.total || station?.amount || 0)}</span>
                            </div>
                          </div>
                          
                          {/* Kaat Details */}
                          {kaatDetail && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="text-xs font-semibold text-indigo-700 mb-2">💰 Kaat Details:</div>
                              <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                                <div>
                                  <span className="text-gray-500">Rate/KG:</span> <span className="font-semibold text-indigo-600">₹{kaatDetail.rateKg.toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Rate/PKG:</span> <span className="font-semibold text-indigo-600">₹{kaatDetail.ratePkg.toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Min Charge:</span> <span className="font-semibold text-indigo-600">₹{kaatDetail.minCharge.toFixed(0)}</span>
                                </div>
                                <div className="col-span-3 mt-1">
                                  <span className="text-gray-500">Kaat Amount:</span> <span className="font-bold text-green-700 text-sm">₹{kaatDetail.kaatAmount.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {!kaatDetail && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="text-xs text-orange-600 font-semibold">⚠️ No kaat rate assigned</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{selectedBiltiesForSave.length}</span> of {filteredTransits.length} bilties selected
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowBiltySelector(false);
                    setSelectedBiltiesForSave([]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSaveKaatBill}
                  disabled={selectedBiltiesForSave.length === 0 || savingKaatBill}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingKaatBill ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Kaat Bill
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
