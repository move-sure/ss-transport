'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FileText, DollarSign, Package, TrendingUp, Loader2, Save, XCircle, Zap, Search, Building2, Layers, CheckSquare, Square } from 'lucide-react';
import { format } from 'date-fns';
import BiltyKaatCell from './bilty-kaat-cell';
import TransportFilter from './transport-filter';
import StationTransportCell from './station-transport-cell';
import supabase from '../../app/utils/supabase';
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
  getCurrentUser,
  autoApplyKaatToAllBilties
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
  const [selectedTransportForBill, setSelectedTransportForBill] = useState(null);
  const [kaatDetails, setKaatDetails] = useState([]);
  const [alreadySavedGrNos, setAlreadySavedGrNos] = useState([]);
  const [autoApplyingKaat, setAutoApplyingKaat] = useState(false);
  const [modalUniqueTransports, setModalUniqueTransports] = useState([]);
  const [loadingModalTransports, setLoadingModalTransports] = useState(false);
  
  // NEW: Batch loaded data to avoid per-cell requests
  const [allKaatData, setAllKaatData] = useState({});
  const [transportsByCity, setTransportsByCity] = useState({});
  const [loadingBatchData, setLoadingBatchData] = useState(false);

  // Transport Admin states
  const [transportAdmins, setTransportAdmins] = useState([]);
  const [selectedTransportAdmin, setSelectedTransportAdmin] = useState('');
  const [transportAdminSearch, setTransportAdminSearch] = useState('');
  const [loadingTransportAdmins, setLoadingTransportAdmins] = useState(false);
  const [transportAdminSubTransports, setTransportAdminSubTransports] = useState({}); // admin_id -> [sub-transports]

  // Bulk create states
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [bulkSelectedAdmins, setBulkSelectedAdmins] = useState([]);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, results: [] });
  const [bulkAdminSearch, setBulkAdminSearch] = useState('');

  // Helper function to get transport for a bilty (handles both types)
  const getTransportForBilty = async (transit) => {
    const bilty = transit.bilty;
    const station = transit.station;
    
    // If bilty has transport_name directly, use it
    if (bilty?.transport_name) {
      return {
        name: bilty.transport_name,
        gst: bilty.transport_gst || null
      };
    }
    
    // If station bilty, lookup transport via city
    if (station?.station) {
      try {
        // Get city_id from city_code
        const { data: cityData } = await supabase
          .from('cities')
          .select('id, city_name')
          .eq('city_code', station.station)
          .single();
        
        if (cityData) {
          // Get transport for this city
          const { data: transportData } = await supabase
            .from('transports')
            .select('transport_name, gst_number')
            .eq('city_id', cityData.id)
            .limit(1)
            .single();
          
          if (transportData) {
            return {
              name: transportData.transport_name,
              gst: transportData.gst_number || null
            };
          }
        }
      } catch (err) {
        console.error('Error fetching transport for station bilty:', err);
      }
    }
    
    return {
      name: 'Unknown Transport',
      gst: null
    };
  };

  // Initialize selected bilties from edit mode
  useEffect(() => {
    if (editMode && editingBillGrNumbers.length > 0) {
      const normalized = editingBillGrNumbers.map(gr => String(gr).trim().toUpperCase());
      setSelectedBiltiesForSave(normalized);
    } else if (!editMode) {
      setSelectedBiltiesForSave([]);
    }
  }, [editMode, editingBillGrNumbers]);

  // Load unique transports when modal opens
  useEffect(() => {
    if (showBiltySelector && selectedBiltiesForSave.length > 0) {
      loadModalTransports();
    } else {
      setModalUniqueTransports([]);
      setSelectedTransportForBill(null);
    }
  }, [showBiltySelector, selectedBiltiesForSave]);

  const loadModalTransports = async () => {
    try {
      setLoadingModalTransports(true);
      
      const selectedBilties = filteredTransits.filter(t => 
        selectedBiltiesForSave.includes(String(t.gr_no).trim().toUpperCase())
      );
      
      console.log('🔍 Loading transports for', selectedBilties.length, 'selected bilties');
      
      // Load transports for all selected bilties
      const transportPromises = selectedBilties.map(async (t, idx) => {
        const transportDetails = await getTransportForBilty(t);
        
        // Debug first few items
        if (idx < 3) {
          console.log(`Transport ${idx + 1}:`, { 
            gr_no: t.gr_no,
            biltyType: t.bilty ? 'bilty' : 'station',
            station_code: t.station?.station,
            transport_name: transportDetails.name,
            transport_gst: transportDetails.gst
          });
        }
        
        return transportDetails;
      });
      
      const transportResults = await Promise.all(transportPromises);
      
      // Build unique transports list
      const uniqueTransports = [];
      const transportMap = new Map();
      
      transportResults.forEach(({ name, gst }) => {
        // Skip if no transport name
        if (!name || name === 'Unknown' || name === 'N/A' || name === 'Unknown Transport') return;
        
        const key = `${name}_${gst || 'NO_GST'}`;
        
        if (!transportMap.has(key)) {
          transportMap.set(key, { name, gst });
          uniqueTransports.push({ name, gst: gst || null, count: 1 });
        } else {
          const existing = uniqueTransports.find(u => `${u.name}_${u.gst || 'NO_GST'}` === key);
          if (existing) existing.count++;
        }
      });
      
      console.log('✅ Unique transports found:', uniqueTransports);
      setModalUniqueTransports(uniqueTransports);
      
      // Auto-select first transport if not already selected
      if (!selectedTransportForBill && uniqueTransports.length > 0) {
        setSelectedTransportForBill(uniqueTransports[0]);
      }
    } catch (err) {
      console.error('Error loading modal transports:', err);
      setModalUniqueTransports([]);
    } finally {
      setLoadingModalTransports(false);
    }
  };

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

  // Load transport admins on mount
  useEffect(() => {
    loadTransportAdmins();
  }, []);

  const loadTransportAdmins = async () => {
    try {
      setLoadingTransportAdmins(true);
      
      // Fetch all transport admins
      const { data: admins, error: adminError } = await supabase
        .from('transport_admin')
        .select('transport_id, transport_name, gstin, hub_mobile_number, owner_name')
        .order('transport_name');

      if (adminError) throw adminError;

      setTransportAdmins(admins || []);

      // Fetch all sub-transports with their admin IDs
      const { data: subTransports, error: subError } = await supabase
        .from('transports')
        .select('id, transport_name, gst_number, city_id, city_name, transport_admin_id')
        .not('transport_admin_id', 'is', null);

      if (subError) throw subError;

      // Group sub-transports by transport_admin_id
      const adminMap = {};
      (subTransports || []).forEach(t => {
        if (!adminMap[t.transport_admin_id]) {
          adminMap[t.transport_admin_id] = [];
        }
        adminMap[t.transport_admin_id].push(t);
      });

      setTransportAdminSubTransports(adminMap);
      console.log('✅ Loaded', admins?.length || 0, 'transport admins,', subTransports?.length || 0, 'sub-transports');
    } catch (err) {
      console.error('❌ Error loading transport admins:', err);
    } finally {
      setLoadingTransportAdmins(false);
    }
  };

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
      // Reload kaat data
      loadAllKaatData();
    } else {
      alert('Failed to apply hub rates: ' + error.message);
    }
    setApplyingRates(false);
  };

  // Auto apply kaat to all bilties based on their destination city
  const handleAutoApplyKaat = async () => {
    if (challanTransits.length === 0) {
      alert('No bilties to apply kaat to!');
      return;
    }

    const confirmed = window.confirm(
      `🚀 Auto Apply Kaat\n\nThis will automatically apply kaat rates to ${challanTransits.length} bilties based on their destination city.\n\nBilties with existing kaat will be updated.\n\nContinue?`
    );
    if (!confirmed) return;

    setAutoApplyingKaat(true);
    try {
      const { success, applied, skipped, error } = await autoApplyKaatToAllBilties(
        challanTransits,
        selectedChallan,
        cities
      );

      if (success) {
        alert(`✅ Auto Apply Kaat Completed!\n\n✓ Applied: ${applied} bilties\n✗ Skipped: ${skipped} bilties (no matching rate found)`);
        // Reload kaat data to refresh the table
        loadAllKaatData();
      } else {
        alert('❌ Failed to auto-apply kaat:\n\n' + (error?.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error in auto-apply kaat:', err);
      alert('❌ Error: ' + err.message);
    } finally {
      setAutoApplyingKaat(false);
    }
  };

  // Auto apply kaat to selected bilties only
  const handleAutoApplyKaatForSelected = async () => {
    if (selectedBiltiesForSave.length === 0) {
      alert('Please select bilties first!');
      return;
    }

    // Filter challanTransits to get only selected ones
    const selectedTransits = challanTransits.filter(t => 
      selectedBiltiesForSave.includes(String(t.gr_no).trim().toUpperCase())
    );

    if (selectedTransits.length === 0) {
      alert('No valid bilties selected!');
      return;
    }

    const confirmed = window.confirm(
      `🚀 Auto Apply Kaat for Selected\n\nThis will automatically apply kaat rates to ${selectedTransits.length} selected bilties based on their destination city.\n\nBilties with existing kaat will be updated.\n\nContinue?`
    );
    if (!confirmed) return;

    setAutoApplyingKaat(true);
    try {
      const { success, applied, skipped, error } = await autoApplyKaatToAllBilties(
        selectedTransits,
        selectedChallan,
        cities
      );

      if (success) {
        alert(`✅ Auto Apply Kaat for Selected Completed!\n\n✓ Applied: ${applied} bilties\n✗ Skipped: ${skipped} bilties (no matching rate found)`);
        // Reload kaat data to refresh the table
        loadAllKaatData();
      } else {
        alert('❌ Failed to auto-apply kaat:\n\n' + (error?.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error in auto-apply kaat for selected:', err);
      alert('❌ Error: ' + err.message);
    } finally {
      setAutoApplyingKaat(false);
    }
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

    // Apply transport admin filter
    if (selectedTransportAdmin) {
      const subTransports = transportAdminSubTransports[selectedTransportAdmin] || [];
      const subTransportGsts = subTransports.map(t => t.gst_number?.trim()).filter(Boolean);
      const subTransportNames = subTransports.map(t => t.transport_name?.toLowerCase().trim()).filter(Boolean);
      const subTransportCityIds = subTransports.map(t => t.city_id).filter(Boolean);

      filtered = filtered.filter(t => {
        const biltyGst = t.bilty?.transport_gst?.trim();
        const biltyTransportName = t.bilty?.transport_name?.toLowerCase().trim();
        const stationCode = t.station?.station;
        const stationCityId = stationCode ? cities?.find(c => c.city_code === stationCode)?.id : null;

        // Match by GST
        if (biltyGst && subTransportGsts.includes(biltyGst)) return true;
        // Match by transport name
        if (biltyTransportName && subTransportNames.includes(biltyTransportName)) return true;
        // Match by destination city (station bilties)
        if (stationCityId && subTransportCityIds.includes(stationCityId)) return true;
        // Match by bilty destination city
        if (t.bilty?.to_city_id && subTransportCityIds.includes(t.bilty.to_city_id)) return true;

        return false;
      });
    }

    return filtered;
  }, [challanTransits, filterPaymentMode, selectedTransports, selectedCityId, availableTransports, cities, selectedTransportAdmin, transportAdminSubTransports]);

  // Calculate financial summary
  const financialSummary = useMemo(() => {
    return calculateFinancialSummary(filteredTransits);
  }, [filteredTransits]);



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

      if (biltiesWithKaat.length === 0) {
        throw new Error('No bilty data found for selected GR numbers');
      }

      // Calculate total kaat amount
      const { totalKaatAmount, kaatDetails: details, error: calcError } = await calculateTotalKaatAmount(biltiesWithKaat);
      if (calcError) throw calcError;
      
      setKaatDetails(details);

      // Use selected transport OR get from first bilty (with proper lookup for station bilties)
      let transportName = selectedTransportForBill?.name;
      let transportGst = selectedTransportForBill?.gst;

      // If no transport selected, get from first bilty
      if (!transportName) {
        const firstBilty = biltiesWithKaat[0];
        const transportDetails = await getTransportForBilty(firstBilty);
        transportName = transportDetails.name;
        transportGst = transportDetails.gst;
        console.log('📦 Using transport from first bilty:', { transportName, transportGst, biltyType: firstBilty.bilty ? 'bilty' : 'station' });
      } else {
        console.log('📦 Using selected transport:', { transportName, transportGst });
      }

      // Get current user
      const currentUser = getCurrentUser();

      // Lookup transport_admin_id from transports table
      let transportAdminId = null;
      try {
        let lookupQuery = null;
        if (transportGst) {
          // Try matching by GST first
          lookupQuery = await supabase
            .from('transports')
            .select('transport_admin_id')
            .eq('gst_number', transportGst)
            .not('transport_admin_id', 'is', null)
            .limit(1)
            .single();
        }
        if (!lookupQuery?.data && transportName) {
          // Fallback: match by transport name
          lookupQuery = await supabase
            .from('transports')
            .select('transport_admin_id')
            .ilike('transport_name', transportName)
            .not('transport_admin_id', 'is', null)
            .limit(1)
            .single();
        }
        if (lookupQuery?.data?.transport_admin_id) {
          transportAdminId = lookupQuery.data.transport_admin_id;
          console.log('✅ Found transport_admin_id:', transportAdminId);
        } else {
          console.log('⚠️ No transport_admin_id found for:', { transportName, transportGst });
        }
      } catch (err) {
        console.warn('⚠️ Error looking up transport_admin_id:', err);
      }

      // If selectedTransportAdmin is set, use it directly
      if (selectedTransportAdmin) {
        transportAdminId = selectedTransportAdmin;
      }

      if (editMode && editingBillId) {
        // Update existing bill
        const { error } = await supabase
          .from('kaat_bill_master')
          .update({
            gr_numbers: selectedBiltiesForSave,
            total_bilty_count: selectedBiltiesForSave.length,
            total_kaat_amount: totalKaatAmount,
            transport_name: transportName,
            transport_gst: transportGst,
            transport_admin_id: transportAdminId,
            updated_by: currentUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBillId);

        if (error) throw error;
        const adminName = transportAdmins.find(a => a.transport_id === transportAdminId)?.transport_name || '';
        alert(`✅ Kaat Bill updated successfully!\n\nTransport: ${transportName}${adminName ? `\nAdmin: ${adminName}` : ''}\nBilties: ${selectedBiltiesForSave.length}\nTotal Kaat Amount: ₹${totalKaatAmount.toFixed(2)}`);
      } else {
        // Create new bill
        const kaatBillData = {
          challan_no: selectedChallan.challan_no,
          transport_name: transportName,
          transport_gst: transportGst,
          transport_admin_id: transportAdminId,
          gr_numbers: selectedBiltiesForSave,
          total_bilty_count: selectedBiltiesForSave.length,
          total_kaat_amount: totalKaatAmount,
          created_by: currentUser.id,
          updated_by: currentUser.id,
          printed_yet: false
        };

        const { success, error } = await saveKaatBillToDatabase(kaatBillData);
        if (!success) throw error;

        const adminName = transportAdmins.find(a => a.transport_id === transportAdminId)?.transport_name || '';
        alert(`✅ Kaat Bill saved successfully!\n\nTransport: ${transportName}${adminName ? `\nAdmin: ${adminName}` : ''}\nBilties: ${selectedBiltiesForSave.length}\nTotal Kaat Amount: ₹${totalKaatAmount.toFixed(2)}`);
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
      setSelectedTransportForBill(null);
      
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

  // ========== BULK CREATE KAAT BILLS ==========
  // Group bilties by transport admin and create individual bills
  const getBulkAdminBiltyGroups = () => {
    // For each selected admin, find all unsaved bilties belonging to their sub-transports
    const groups = [];

    for (const adminId of bulkSelectedAdmins) {
      const admin = transportAdmins.find(a => a.transport_id === adminId);
      const subTransports = transportAdminSubTransports[adminId] || [];
      if (!admin || subTransports.length === 0) continue;

      const subGsts = subTransports.map(t => t.gst_number?.trim()).filter(Boolean);
      const subNames = subTransports.map(t => t.transport_name?.toLowerCase().trim()).filter(Boolean);
      const subCityIds = subTransports.map(t => t.city_id).filter(Boolean);

      // Find matching bilties from challanTransits that are NOT already saved
      const matchingBilties = challanTransits.filter(t => {
        const normalizedGrNo = String(t.gr_no).trim().toUpperCase();
        if (alreadySavedGrNos.includes(normalizedGrNo)) return false;

        const biltyGst = t.bilty?.transport_gst?.trim();
        const biltyName = t.bilty?.transport_name?.toLowerCase().trim();
        const stationCode = t.station?.station;
        const stationCityId = stationCode ? cities?.find(c => c.city_code === stationCode)?.id : null;

        if (biltyGst && subGsts.includes(biltyGst)) return true;
        if (biltyName && subNames.includes(biltyName)) return true;
        if (stationCityId && subCityIds.includes(stationCityId)) return true;
        if (t.bilty?.to_city_id && subCityIds.includes(t.bilty.to_city_id)) return true;

        return false;
      });

      if (matchingBilties.length > 0) {
        // Group by unique transport (name + gst)
        const transportMap = {};
        matchingBilties.forEach(t => {
          const tName = t.bilty?.transport_name || 'Station Bilty';
          const tGst = t.bilty?.transport_gst || '';
          const key = `${tName}|||${tGst}`;
          if (!transportMap[key]) {
            transportMap[key] = { name: tName, gst: tGst || null, bilties: [] };
          }
          transportMap[key].bilties.push(t);
        });

        groups.push({
          adminId,
          adminName: admin.transport_name,
          adminGstin: admin.gstin,
          transports: Object.values(transportMap),
          totalBilties: matchingBilties.length
        });
      }
    }

    return groups;
  };

  const handleBulkCreateKaatBills = async () => {
    const groups = getBulkAdminBiltyGroups();
    if (groups.length === 0) {
      alert('No bilties found for selected transport admins (all may already be saved).');
      return;
    }

    // Count total bills to create (one per transport per admin)
    const totalBills = groups.reduce((sum, g) => sum + g.transports.length, 0);

    if (!window.confirm(
      `This will create ${totalBills} kaat bill(s) for ${groups.length} transport admin(s).\n\n` +
      groups.map(g => `🏢 ${g.adminName}: ${g.transports.length} bill(s), ${g.totalBilties} bilties`).join('\n') +
      '\n\nContinue?'
    )) return;

    setBulkCreating(true);
    setBulkProgress({ current: 0, total: totalBills, results: [] });
    const currentUser = getCurrentUser();
    const results = [];
    let processed = 0;

    for (const group of groups) {
      for (const transport of group.transports) {
        processed++;
        setBulkProgress(prev => ({ ...prev, current: processed }));

        try {
          const grNumbers = transport.bilties.map(t => String(t.gr_no).trim().toUpperCase());

          // Calculate kaat amount
          const { totalKaatAmount, error: calcError } = await calculateTotalKaatAmount(transport.bilties);
          if (calcError) throw calcError;

          const kaatBillData = {
            challan_no: selectedChallan.challan_no,
            transport_name: transport.name,
            transport_gst: transport.gst,
            transport_admin_id: group.adminId,
            gr_numbers: grNumbers,
            total_bilty_count: grNumbers.length,
            total_kaat_amount: totalKaatAmount,
            created_by: currentUser.id,
            updated_by: currentUser.id,
            printed_yet: false
          };

          const { success, error } = await saveKaatBillToDatabase(kaatBillData);
          if (!success) throw error;

          results.push({
            admin: group.adminName,
            transport: transport.name,
            bilties: grNumbers.length,
            amount: totalKaatAmount,
            status: 'success'
          });
        } catch (err) {
          console.error(`❌ Error creating bill for ${transport.name}:`, err);
          results.push({
            admin: group.adminName,
            transport: transport.name,
            bilties: transport.bilties.length,
            amount: 0,
            status: 'error',
            error: err.message
          });
        }
      }
    }

    setBulkProgress(prev => ({ ...prev, results }));

    // Refresh saved GR numbers
    const { data: updatedData } = await supabase
      .from('kaat_bill_master')
      .select('gr_numbers')
      .eq('challan_no', selectedChallan.challan_no);
    if (updatedData) {
      const allSavedGrNos = updatedData.reduce((acc, bill) => {
        const grNumbers = bill.gr_numbers || [];
        return [...acc, ...grNumbers.map(gr => String(gr).trim().toUpperCase())];
      }, []);
      setAlreadySavedGrNos([...new Set(allSavedGrNos)]);
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failCount = results.filter(r => r.status === 'error').length;

    setBulkCreating(false);

    if (failCount === 0) {
      alert(`✅ All ${successCount} kaat bill(s) created successfully!`);
      setShowBulkCreateModal(false);
      setBulkSelectedAdmins([]);
      setBulkProgress({ current: 0, total: 0, results: [] });
      if (onKaatBillSaved) onKaatBillSaved();
    } else {
      alert(`⚠️ ${successCount} bill(s) created, ${failCount} failed. Check the results below.`);
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
            {!editMode && (
              <>
                <button
                  onClick={handleAutoApplyKaat}
                  disabled={autoApplyingKaat || challanTransits.length === 0}
                  className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2.5 rounded-lg transition-all hover:scale-105 flex items-center gap-2 text-sm font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  title="Automatically apply kaat rates to all bilties based on destination city"
                >
                  {autoApplyingKaat ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {autoApplyingKaat ? 'Applying...' : 'Auto Kaat All'}
                </button>
                {selectedBiltiesForSave.length > 0 && (
                  <button
                    onClick={handleAutoApplyKaatForSelected}
                    disabled={autoApplyingKaat}
                    className="bg-orange-500 hover:bg-orange-600 px-4 py-2.5 rounded-lg transition-all hover:scale-105 flex items-center gap-2 text-sm font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    title="Automatically apply kaat rates to selected bilties only"
                  >
                    {autoApplyingKaat ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    {autoApplyingKaat ? 'Applying...' : `Auto Kaat Selected (${selectedBiltiesForSave.length})`}
                  </button>
                )}
              </>
            )}
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
                onClick={() => setShowBulkCreateModal(true)}
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 px-4 py-2.5 rounded-lg transition-all hover:scale-105 flex items-center gap-2 text-sm font-bold shadow-lg"
                title="Bulk create kaat bills for multiple transport admins at once"
              >
                <Layers className="w-4 h-4" />
                Bulk Create
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
        <div className="flex gap-2 items-center flex-wrap">
          {/* Transport Admin Filter */}
          <div className="w-56 flex-shrink-0">
            <div className="relative">
              <Building2 className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-teal-600" />
              <select
                value={selectedTransportAdmin}
                onChange={(e) => setSelectedTransportAdmin(e.target.value)}
                className={`w-full pl-7 pr-2 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-semibold ${
                  selectedTransportAdmin 
                    ? 'border-teal-500 bg-teal-50 text-teal-800' 
                    : 'border-gray-300 text-gray-700'
                }`}
                disabled={loadingTransportAdmins}
              >
                <option value="">-- All Transport Admins --</option>
                {transportAdmins
                  .filter(admin => {
                    if (!transportAdminSearch) return true;
                    const q = transportAdminSearch.toLowerCase();
                    return admin.transport_name?.toLowerCase().includes(q) || 
                           admin.gstin?.toLowerCase().includes(q);
                  })
                  .map(admin => {
                    const subCount = transportAdminSubTransports[admin.transport_id]?.length || 0;
                    return (
                      <option key={admin.transport_id} value={admin.transport_id}>
                        {admin.transport_name} {admin.gstin ? `(${admin.gstin})` : ''} [{subCount} sub]
                      </option>
                    );
                  })
                }
              </select>
            </div>
            {selectedTransportAdmin && (
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="text-[9px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded-full font-semibold">
                  🏢 {transportAdmins.find(a => a.transport_id === selectedTransportAdmin)?.transport_name}
                </span>
                <span className="text-[9px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-full">
                  {transportAdminSubTransports[selectedTransportAdmin]?.length || 0} sub-transports
                </span>
                <button
                  onClick={() => setSelectedTransportAdmin('')}
                  className="text-[9px] text-red-600 hover:text-red-800 font-semibold px-1"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

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
              <th className="px-1.5 py-1.5 text-right font-semibold text-gray-900 text-[10px] w-16">DD Chrg</th>
              <th className="px-1.5 py-1.5 text-center font-semibold text-gray-900 text-[10px] w-28">Kaat</th>
              <th className="px-1.5 py-1.5 text-right font-semibold text-gray-900 text-[10px] w-16">PF</th>
              <th className="px-1.5 py-1.5 text-right font-semibold text-gray-900 text-[10px] w-16">Act.Rate</th>
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
                      <div className="max-w-[140px]" title={bilty.transport_name}>
                        <div className="font-semibold text-indigo-700 text-[10px] break-words leading-tight">{bilty.transport_name}</div>
                        {bilty.transport_gst && (
                          <div className="text-[8px] text-gray-500 truncate mt-0.5">{bilty.transport_gst}</div>
                        )}
                        {/* Show transport admin name */}
                        {(() => {
                          const gst = bilty.transport_gst?.trim();
                          const tName = bilty.transport_name?.toLowerCase().trim();
                          for (const [adminId, subs] of Object.entries(transportAdminSubTransports)) {
                            const match = subs.find(s => 
                              (gst && s.gst_number?.trim() === gst) ||
                              (tName && s.transport_name?.toLowerCase().trim() === tName)
                            );
                            if (match) {
                              const admin = transportAdmins.find(a => a.transport_id === adminId);
                              if (admin) {
                                return (
                                  <div className="text-[7px] text-teal-600 font-semibold truncate mt-0.5" title={`Admin: ${admin.transport_name}`}>
                                    🏢 {admin.transport_name}
                                  </div>
                                );
                              }
                            }
                          }
                          return null;
                        })()}
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
                    <div className="flex items-center justify-end gap-1">
                      <Package className="w-3 h-3 text-blue-600" />
                      <span>{bilty?.no_of_pkg || station?.no_of_packets || 0}</span>
                    </div>
                  </td>
                  <td className="px-1.5 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TrendingUp className="w-3 h-3 text-purple-600" />
                      <span className="font-semibold text-gray-900 text-[10px]">
                        {formatWeight(bilty?.wt || station?.weight || 0)}
                      </span>
                    </div>
                  </td>
                  <td className="px-1.5 py-1.5 text-right font-semibold text-[10px]">
                    <div className="bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-block">
                      <span className="text-blue-800 font-bold">
                        {(() => {
                          const paymentMode = bilty?.payment_mode || station?.payment_status;
                          const isPaidOrDD = paymentMode?.toLowerCase().includes('paid') || bilty?.delivery_type?.toLowerCase().includes('door');
                          return isPaidOrDD ? '0.00' : formatCurrency(bilty?.total || station?.amount || 0);
                        })()}
                      </span>
                    </div>
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
                  {/* DD Charge Column */}
                  <td className="px-1.5 py-1.5 text-right">
                    {(() => {
                      const paymentMode = bilty?.payment_mode || station?.payment_status;
                      const deliveryType = bilty?.delivery_type || station?.delivery_type || '';
                      const hasDDFlag = deliveryType.toLowerCase().includes('door');
                      const kaatDataRow = allKaatData[transit.gr_no];
                      const ddChrg = kaatDataRow?.dd_chrg ? parseFloat(kaatDataRow.dd_chrg) : 0;
                      
                      if (!hasDDFlag) return <span className="text-gray-300 text-[10px]">-</span>;
                      
                      if (ddChrg > 0) {
                        return (
                          <div className="bg-red-50 px-1 py-0.5 rounded border border-red-200 inline-block">
                            <span className="font-bold text-[10px] text-red-700">-₹{ddChrg.toFixed(2)}</span>
                          </div>
                        );
                      }
                      
                      return (
                        <span className="text-[9px] text-orange-500 font-semibold">DD ⚠</span>
                      );
                    })()}
                  </td>
                  <td className="px-1.5 py-1.5">
                    <BiltyKaatCell
                      grNo={transit.gr_no}
                      challanNo={selectedChallan.challan_no}
                      destinationCityId={bilty?.to_city_id || getCityIdByCode(station?.station, cities)}
                      biltyWeight={bilty?.wt || station?.weight || 0}
                      biltyPackages={bilty?.no_of_pkg || station?.no_of_packets || 0}
                      biltyTransportGst={bilty?.transport_gst || null}
                      paymentMode={bilty?.payment_mode || station?.payment_status || ''}
                      deliveryType={bilty?.delivery_type || station?.delivery_type || ''}
                      kaatData={allKaatData[transit.gr_no] || null}
                      onKaatUpdate={(newData) => handleKaatUpdated(transit.gr_no, newData)}
                      onKaatDelete={() => handleKaatDeleted(transit.gr_no)}
                    />
                  </td>
                  {/* PF Column */}
                  <td className="px-1.5 py-1.5 text-right">
                    {(() => {
                      const kaatData = allKaatData[transit.gr_no];
                      if (!kaatData || kaatData.pf == null) return <span className="text-gray-400 text-[10px]">-</span>;
                      const pf = parseFloat(kaatData.pf);
                      return (
                        <div className={`px-1 py-0.5 rounded border inline-block ${
                          pf > 0 ? 'bg-green-50 border-green-200' : pf < 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <span className={`font-bold text-[10px] ${
                            pf > 0 ? 'text-green-700' : pf < 0 ? 'text-red-700' : 'text-gray-700'
                          }`}>
                            ₹{pf.toFixed(2)}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  {/* Actual Kaat Rate Column */}
                  <td className="px-1.5 py-1.5 text-right">
                    {(() => {
                      const kaatData = allKaatData[transit.gr_no];
                      if (!kaatData || !kaatData.actual_kaat_rate) return <span className="text-gray-400 text-[10px]">-</span>;
                      return (
                        <span className="font-semibold text-indigo-700 text-[10px]">
                          ₹{parseFloat(kaatData.actual_kaat_rate).toFixed(2)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-1.5 py-1.5 text-right">
                    {(() => {
                      const kaatData = allKaatData[transit.gr_no];
                      
                      // Get the actual total (considering Paid/DD should be 0)
                      const paymentMode = bilty?.payment_mode || station?.payment_status;
                      const isPaidOrDD = paymentMode?.toLowerCase().includes('paid') || bilty?.delivery_type?.toLowerCase().includes('door');
                      const totalAmount = isPaidOrDD ? 0 : parseFloat(bilty?.total || station?.amount || 0);
                      
                      // Get DD charge from kaat data
                      const ddChrg = kaatData?.dd_chrg ? parseFloat(kaatData.dd_chrg) : 0;
                      
                      // If no kaat data, show - or just the negative of total if it exists
                      if (!kaatData) {
                        const adjustedTotal = totalAmount - ddChrg;
                        if (adjustedTotal === 0 && ddChrg === 0) return <span className="text-gray-400 text-[10px]">-</span>;
                        return (
                          <div className="bg-green-50 px-1.5 py-0.5 rounded border border-green-200 inline-block">
                            <span className={`font-bold text-[10px] ${
                              adjustedTotal > 0 ? 'text-green-700' : 'text-gray-700'
                            }`}>
                              ₹{adjustedTotal.toFixed(2)}
                            </span>
                          </div>
                        );
                      }
                      
                      // Use stored kaat value if available, otherwise calculate
                      let kaatAmount = 0;
                      if (kaatData.kaat != null) {
                        kaatAmount = parseFloat(kaatData.kaat);
                      } else {
                        const weight = parseFloat(bilty?.wt || station?.weight || 0);
                        const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
                        const rateKg = parseFloat(kaatData.rate_per_kg) || 0;
                        const ratePkg = parseFloat(kaatData.rate_per_pkg) || 0;
                        const effectiveWeight = Math.max(weight, 50);
                        
                        if (kaatData.rate_type === 'per_kg') {
                          kaatAmount = effectiveWeight * rateKg;
                        } else if (kaatData.rate_type === 'per_pkg') {
                          kaatAmount = packages * ratePkg;
                        } else if (kaatData.rate_type === 'hybrid') {
                          kaatAmount = (effectiveWeight * rateKg) + (packages * ratePkg);
                        }
                      }
                      
                      // Profit = Total Amount - Kaat Amount - DD Charge (can be negative for Paid/DD bilties)
                      const profit = totalAmount - kaatAmount - ddChrg;
                      
                      return (
                        <div className={`px-1.5 py-0.5 rounded border inline-block ${
                          profit > 0 ? 'bg-green-50 border-green-200' : profit < 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <span className={`font-bold text-[10px] ${
                            profit > 0 ? 'text-green-700' : profit < 0 ? 'text-red-700' : 'text-gray-700'
                          }`}>
                            ₹{profit.toFixed(2)}
                          </span>
                        </div>
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
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 border-t-4 border-indigo-500 flex-shrink-0 shadow-lg">
        <table className="w-full text-xs">
          <tfoot>
            <tr className="font-bold bg-white/50">
              <td className="px-1.5 py-2.5 text-center text-gray-900 text-[10px] w-8"></td>
              <td className="px-1.5 py-2.5 text-center text-gray-900 text-[10px] w-8"></td>
              <td className="px-1.5 py-2.5 text-left text-gray-900 text-[10px]"></td>
              <td className="px-1.5 py-2.5 text-left text-gray-900 text-[10px]"></td>
              <td className="px-1.5 py-2.5 text-left text-gray-900 text-[10px]"></td>
              <td className="px-1.5 py-2.5 text-left text-gray-900 text-[10px]"></td>
              <td className="px-1.5 py-2.5 text-left text-gray-900 text-[10px]"></td>
              <td className="px-1.5 py-2.5 text-left text-gray-900 text-[10px] w-16"></td>
              <td className="px-1.5 py-2.5 text-left text-gray-700 text-[10px]"></td>
              <td className="px-1.5 py-2.5 text-right text-gray-900 font-bold text-xs">
                <div className="flex items-center justify-end gap-1">
                  <Package className="w-3 h-3 text-blue-600" />
                  <span>{financialSummary.totalPackages}</span>
                </div>
              </td>
              <td className="px-1.5 py-2.5 text-right text-gray-900 font-bold text-xs">
                <div className="flex items-center justify-end gap-1">
                  <TrendingUp className="w-3 h-3 text-purple-600" />
                  <span>{financialSummary.totalWeight.toFixed(2)}</span>
                </div>
              </td>
              <td className="px-1.5 py-2.5 text-right text-gray-900 font-bold text-xs w-16">
                <div className="flex items-center justify-end gap-1 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                  <span className="text-blue-700 font-bold">₹</span>
                  <span className="text-blue-800">
                    {(() => {
                      // Exclude Paid/DD amounts from total
                      const total = filteredTransits.reduce((sum, transit) => {
                        const bilty = transit.bilty;
                        const station = transit.station;
                        const paymentMode = bilty?.payment_mode || station?.payment_status;
                        const isPaidOrDD = paymentMode?.toLowerCase().includes('paid') || bilty?.delivery_type?.toLowerCase().includes('door');
                        
                        if (isPaidOrDD) return sum;
                        
                        return sum + parseFloat(bilty?.total || station?.amount || 0);
                      }, 0);
                      return total.toFixed(2);
                    })()}
                  </span>
                </div>
              </td>
              <td className="px-1.5 py-2.5 text-center text-gray-900 text-[10px]"></td>
              {/* DD Chrg Footer Total */}
              <td className="px-1.5 py-2.5 text-right text-gray-900 font-bold text-xs w-16">
                <div className="flex items-center justify-end gap-1 bg-red-50 px-2 py-1 rounded border border-red-200">
                  <span className="text-red-700">
                    {(() => {
                      const totalDdChrg = filteredTransits.reduce((sum, transit) => {
                        const kaatData = allKaatData[transit.gr_no];
                        if (!kaatData || !kaatData.dd_chrg) return sum;
                        return sum + parseFloat(kaatData.dd_chrg);
                      }, 0);
                      return totalDdChrg > 0 ? `-₹${totalDdChrg.toFixed(2)}` : '0.00';
                    })()}
                  </span>
                </div>
              </td>
              <td className="px-1.5 py-2.5 text-center text-gray-900 font-bold text-xs w-28">
                <div className="flex items-center justify-center gap-1 bg-orange-50 px-2 py-1 rounded border border-orange-200">
                  <FileText className="w-3 h-3 text-orange-700" />
                  <span className="text-orange-800">
                    {(() => {
                      const total = filteredTransits.reduce((sum, transit) => {
                        const kaatData = allKaatData[transit.gr_no];
                        if (!kaatData) return sum;
                        
                        // Use stored kaat value if available, otherwise calculate
                        if (kaatData.kaat != null) {
                          return sum + parseFloat(kaatData.kaat);
                        }
                        
                        const bilty = transit.bilty;
                        const station = transit.station;
                        const weight = parseFloat(bilty?.wt || station?.weight || 0);
                        const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
                        const rateKg = parseFloat(kaatData.rate_per_kg) || 0;
                        const ratePkg = parseFloat(kaatData.rate_per_pkg) || 0;
                        
                        // Apply 50kg minimum for per_kg rate type
                        const effectiveWeight = Math.max(weight, 50);
                        
                        let kaatAmount = 0;
                        if (kaatData.rate_type === 'per_kg') {
                          kaatAmount = effectiveWeight * rateKg;
                        } else if (kaatData.rate_type === 'per_pkg') {
                          kaatAmount = packages * ratePkg;
                        } else if (kaatData.rate_type === 'hybrid') {
                          kaatAmount = (effectiveWeight * rateKg) + (packages * ratePkg);
                        }
                        
                        return sum + kaatAmount;
                      }, 0);
                      return total.toFixed(2);
                    })()}
                  </span>
                </div>
              </td>
              {/* PF Footer Total */}
              <td className="px-1.5 py-2.5 text-right text-gray-900 font-bold text-xs w-16">
                <div className="flex items-center justify-end gap-1 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                  <span className={`${(() => {
                    const totalPf = filteredTransits.reduce((sum, transit) => {
                      const kaatData = allKaatData[transit.gr_no];
                      if (!kaatData || kaatData.pf == null) return sum;
                      return sum + parseFloat(kaatData.pf);
                    }, 0);
                    return totalPf >= 0 ? 'text-green-700' : 'text-red-700';
                  })()}`}>
                    {(() => {
                      const totalPf = filteredTransits.reduce((sum, transit) => {
                        const kaatData = allKaatData[transit.gr_no];
                        if (!kaatData || kaatData.pf == null) return sum;
                        return sum + parseFloat(kaatData.pf);
                      }, 0);
                      return totalPf.toFixed(2);
                    })()}
                  </span>
                </div>
              </td>
              {/* Act.Rate Footer - empty */}
              <td className="px-1.5 py-2.5 text-right text-gray-900 text-[10px] w-16"></td>
              <td className="px-1.5 py-2.5 text-right text-gray-900 font-bold text-xs w-16">
                <div className="flex items-center justify-end gap-1 bg-green-50 px-2 py-1 rounded border border-green-200">
                  <TrendingUp className="w-3 h-3 text-green-700" />
                  <span className={`${(() => {
                    const totalProfit = filteredTransits.reduce((sum, transit) => {
                      const bilty = transit.bilty;
                      const station = transit.station;
                      const kaatData = allKaatData[transit.gr_no];
                      
                      const paymentMode = bilty?.payment_mode || station?.payment_status;
                      const isPaidOrDD = paymentMode?.toLowerCase().includes('paid') || bilty?.delivery_type?.toLowerCase().includes('door');
                      const totalAmount = isPaidOrDD ? 0 : parseFloat(bilty?.total || station?.amount || 0);
                      const ddChrg = kaatData?.dd_chrg ? parseFloat(kaatData.dd_chrg) : 0;
                      
                      if (!kaatData) {
                        return sum + totalAmount - ddChrg;
                      }
                      
                      // Use stored kaat value if available
                      let kaatAmount = 0;
                      if (kaatData.kaat != null) {
                        kaatAmount = parseFloat(kaatData.kaat);
                      } else {
                        const weight = parseFloat(bilty?.wt || station?.weight || 0);
                        const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
                        const rateKg = parseFloat(kaatData.rate_per_kg) || 0;
                        const ratePkg = parseFloat(kaatData.rate_per_pkg) || 0;
                        const effectiveWeight = Math.max(weight, 50);
                        
                        if (kaatData.rate_type === 'per_kg') {
                          kaatAmount = effectiveWeight * rateKg;
                        } else if (kaatData.rate_type === 'per_pkg') {
                          kaatAmount = packages * ratePkg;
                        } else if (kaatData.rate_type === 'hybrid') {
                          kaatAmount = (effectiveWeight * rateKg) + (packages * ratePkg);
                        }
                      }
                      
                      const profit = totalAmount - kaatAmount - ddChrg;
                      return sum + profit;
                    }, 0);
                    return totalProfit > 0 ? 'text-green-700 font-bold' : totalProfit < 0 ? 'text-red-700 font-bold' : 'text-gray-700';
                  })()}`}>
                    {(() => {
                      const totalProfit = filteredTransits.reduce((sum, transit) => {
                        const bilty = transit.bilty;
                        const station = transit.station;
                        const kaatData = allKaatData[transit.gr_no];
                        
                        const paymentMode = bilty?.payment_mode || station?.payment_status;
                        const isPaidOrDD = paymentMode?.toLowerCase().includes('paid') || bilty?.delivery_type?.toLowerCase().includes('door');
                        const totalAmount = isPaidOrDD ? 0 : parseFloat(bilty?.total || station?.amount || 0);
                        const ddChrg = kaatData?.dd_chrg ? parseFloat(kaatData.dd_chrg) : 0;
                        
                        if (!kaatData) {
                          return sum + totalAmount - ddChrg;
                        }
                        
                        // Use stored kaat value if available
                        let kaatAmount = 0;
                        if (kaatData.kaat != null) {
                          kaatAmount = parseFloat(kaatData.kaat);
                        } else {
                          const weight = parseFloat(bilty?.wt || station?.weight || 0);
                          const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
                          const rateKg = parseFloat(kaatData.rate_per_kg) || 0;
                          const ratePkg = parseFloat(kaatData.rate_per_pkg) || 0;
                          const effectiveWeight = Math.max(weight, 50);
                          
                          if (kaatData.rate_type === 'per_kg') {
                            kaatAmount = effectiveWeight * rateKg;
                          } else if (kaatData.rate_type === 'per_pkg') {
                            kaatAmount = packages * ratePkg;
                          } else if (kaatData.rate_type === 'hybrid') {
                            kaatAmount = (effectiveWeight * rateKg) + (packages * ratePkg);
                          }
                        }
                        
                        const profit = totalAmount - kaatAmount - ddChrg;
                        return sum + profit;
                      }, 0);
                      return totalProfit.toFixed(2);
                    })()}
                  </span>
                </div>
              </td>
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
              
              {/* Transport Selection */}
              {loadingModalTransports ? (
                <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center gap-2 text-white/90">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading transport details...</span>
                  </div>
                </div>
              ) : modalUniqueTransports.length > 0 ? (
                <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-xs font-semibold mb-2 text-white/90">📦 Select Transport for this Bill (Optional):</div>
                  <div className="space-y-2">
                    {modalUniqueTransports.map((transport, idx) => {
                      // Find admin for this transport
                      let adminName = null;
                      for (const [adminId, subs] of Object.entries(transportAdminSubTransports)) {
                        const match = subs.find(s => 
                          (transport.gst && s.gst_number?.trim() === transport.gst) ||
                          (transport.name && s.transport_name?.toLowerCase().trim() === transport.name?.toLowerCase().trim())
                        );
                        if (match) {
                          adminName = transportAdmins.find(a => a.transport_id === adminId)?.transport_name;
                          break;
                        }
                      }

                      return (
                      <div
                        key={idx}
                        onClick={() => setSelectedTransportForBill(transport)}
                        className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${
                          selectedTransportForBill?.name === transport.name && selectedTransportForBill?.gst === transport.gst
                            ? 'bg-white text-green-700 border-white shadow-lg'
                            : 'bg-white/5 text-white border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-sm">{transport.name}</div>
                            {transport.gst && <div className="text-xs opacity-80 mt-0.5">GST: {transport.gst}</div>}
                            {adminName && (
                              <div className={`text-[10px] mt-0.5 flex items-center gap-1 ${
                                selectedTransportForBill?.name === transport.name && selectedTransportForBill?.gst === transport.gst
                                  ? 'text-teal-600'
                                  : 'text-teal-300'
                              }`}>
                                🏢 Admin: {adminName}
                              </div>
                            )}
                          </div>
                          <div className={`text-xs font-semibold px-2 py-1 rounded ${
                            selectedTransportForBill?.name === transport.name && selectedTransportForBill?.gst === transport.gst
                              ? 'bg-green-100 text-green-700'
                              : 'bg-white/20 text-white'
                          }`}>
                            {transport.count} {transport.count === 1 ? 'bilty' : 'bilties'}
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-4 bg-yellow-500/20 backdrop-blur-sm rounded-lg p-3 border border-yellow-500/30">
                  <div className="text-xs text-white/90">
                    ℹ️ <strong>No transport info found</strong> - Will use data from first bilty
                  </div>
                </div>
              )}

              {/* Transport Admin Info */}
              {(() => {
                // Auto-detect transport admin from selected transport
                const selectedGst = selectedTransportForBill?.gst;
                const selectedName = selectedTransportForBill?.name;
                let matchedAdmin = null;

                if (selectedGst || selectedName) {
                  // Find sub-transport matching the selected transport
                  for (const [adminId, subs] of Object.entries(transportAdminSubTransports)) {
                    const match = subs.find(s => 
                      (selectedGst && s.gst_number?.trim() === selectedGst) ||
                      (selectedName && s.transport_name?.toLowerCase().trim() === selectedName?.toLowerCase().trim())
                    );
                    if (match) {
                      matchedAdmin = transportAdmins.find(a => a.transport_id === adminId);
                      break;
                    }
                  }
                }

                if (matchedAdmin) {
                  return (
                    <div className="mt-3 bg-teal-500/20 backdrop-blur-sm rounded-lg p-3 border border-teal-400/30">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-white" />
                        <div>
                          <div className="text-xs font-bold text-white">Transport Admin: {matchedAdmin.transport_name}</div>
                          <div className="text-[10px] text-white/80">
                            {matchedAdmin.gstin && <span>GSTIN: {matchedAdmin.gstin} • </span>}
                            {matchedAdmin.owner_name && <span>Owner: {matchedAdmin.owner_name}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
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
                              <span className="text-gray-500">Transport:</span> <span className="font-medium text-blue-700">{bilty?.transport_name || station?.transport_name || 'Station Bilty'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">GST:</span> <span className="font-medium text-gray-700">{bilty?.transport_gst || station?.transport_gst || '-'}</span>
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
                            <div>
                              <span className="text-gray-500">Payment:</span> <span className="font-medium">{bilty?.payment_mode || station?.payment_status || 'N/A'}</span>
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
                                <div>
                                  <span className="text-gray-500">Kaat:</span> <span className="font-bold text-green-700 text-sm">₹{kaatDetail.kaatAmount.toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">PF:</span> <span className={`font-bold text-sm ${kaatDetail.pf >= 0 ? 'text-green-700' : 'text-red-700'}`}>₹{kaatDetail.pf.toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Act.Rate:</span> <span className="font-semibold text-indigo-600">₹{kaatDetail.actual_kaat_rate.toFixed(2)}/kg</span>
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
                    setSelectedTransportForBill(null);
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

      {/* ========== BULK CREATE MODAL ========== */}
      {showBulkCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-5 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    Bulk Create Kaat Bills
                  </h3>
                  <p className="text-sm text-white/80 mt-1">
                    Select transport admins to create individual transport-wise bills automatically
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (!bulkCreating) {
                      setShowBulkCreateModal(false);
                      setBulkSelectedAdmins([]);
                      setBulkProgress({ current: 0, total: 0, results: [] });
                      setBulkAdminSearch('');
                    }
                  }}
                  className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  disabled={bulkCreating}
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  type="text"
                  value={bulkAdminSearch}
                  onChange={(e) => setBulkAdminSearch(e.target.value)}
                  placeholder="Search transport admin by name or GSTIN..."
                  className="w-full pl-9 pr-3 py-2 bg-white/15 border border-white/20 rounded-lg text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40"
                  disabled={bulkCreating}
                />
              </div>
            </div>

            {/* Admin List */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Quick actions */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-gray-500">
                  {bulkSelectedAdmins.length} admin(s) selected
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const filtered = transportAdmins.filter(admin => {
                        if (bulkAdminSearch) {
                          const q = bulkAdminSearch.toLowerCase();
                          if (!admin.transport_name?.toLowerCase().includes(q) && !admin.gstin?.toLowerCase().includes(q)) return false;
                        }
                        const subTransports = transportAdminSubTransports[admin.transport_id] || [];
                        if (subTransports.length === 0) return false;
                        // Check if this admin has any unsaved bilties
                        const subGsts = subTransports.map(t => t.gst_number?.trim()).filter(Boolean);
                        const subNames = subTransports.map(t => t.transport_name?.toLowerCase().trim()).filter(Boolean);
                        const subCityIds = subTransports.map(t => t.city_id).filter(Boolean);
                        return challanTransits.some(t => {
                          const grNo = String(t.gr_no).trim().toUpperCase();
                          if (alreadySavedGrNos.includes(grNo)) return false;
                          const biltyGst = t.bilty?.transport_gst?.trim();
                          const biltyName = t.bilty?.transport_name?.toLowerCase().trim();
                          const stationCode = t.station?.station;
                          const stationCityId = stationCode ? cities?.find(c => c.city_code === stationCode)?.id : null;
                          if (biltyGst && subGsts.includes(biltyGst)) return true;
                          if (biltyName && subNames.includes(biltyName)) return true;
                          if (stationCityId && subCityIds.includes(stationCityId)) return true;
                          if (t.bilty?.to_city_id && subCityIds.includes(t.bilty.to_city_id)) return true;
                          return false;
                        });
                      }).map(a => a.transport_id);
                      setBulkSelectedAdmins(filtered);
                    }}
                    className="text-xs text-teal-600 hover:text-teal-800 font-semibold px-2 py-1 rounded hover:bg-teal-50"
                    disabled={bulkCreating}
                  >
                    Select All with Bilties
                  </button>
                  <button
                    onClick={() => setBulkSelectedAdmins([])}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1 rounded hover:bg-red-50"
                    disabled={bulkCreating}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {transportAdmins
                  .filter(admin => {
                    if (!bulkAdminSearch) return true;
                    const q = bulkAdminSearch.toLowerCase();
                    return admin.transport_name?.toLowerCase().includes(q) || admin.gstin?.toLowerCase().includes(q);
                  })
                  .map(admin => {
                    const subTransports = transportAdminSubTransports[admin.transport_id] || [];
                    const isSelected = bulkSelectedAdmins.includes(admin.transport_id);

                    // Count unsaved bilties for this admin
                    const subGsts = subTransports.map(t => t.gst_number?.trim()).filter(Boolean);
                    const subNames = subTransports.map(t => t.transport_name?.toLowerCase().trim()).filter(Boolean);
                    const subCityIds = subTransports.map(t => t.city_id).filter(Boolean);

                    const matchingBilties = challanTransits.filter(t => {
                      const grNo = String(t.gr_no).trim().toUpperCase();
                      if (alreadySavedGrNos.includes(grNo)) return false;
                      const biltyGst = t.bilty?.transport_gst?.trim();
                      const biltyName = t.bilty?.transport_name?.toLowerCase().trim();
                      const stationCode = t.station?.station;
                      const stationCityId = stationCode ? cities?.find(c => c.city_code === stationCode)?.id : null;
                      if (biltyGst && subGsts.includes(biltyGst)) return true;
                      if (biltyName && subNames.includes(biltyName)) return true;
                      if (stationCityId && subCityIds.includes(stationCityId)) return true;
                      if (t.bilty?.to_city_id && subCityIds.includes(t.bilty.to_city_id)) return true;
                      return false;
                    });

                    const hasBilties = matchingBilties.length > 0;

                    return (
                      <div
                        key={admin.transport_id}
                        onClick={() => {
                          if (bulkCreating || !hasBilties) return;
                          setBulkSelectedAdmins(prev =>
                            prev.includes(admin.transport_id)
                              ? prev.filter(id => id !== admin.transport_id)
                              : [...prev, admin.transport_id]
                          );
                        }}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          !hasBilties
                            ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                            : bulkCreating
                            ? 'border-gray-200 cursor-not-allowed'
                            : isSelected
                            ? 'border-teal-500 bg-teal-50 cursor-pointer shadow-md'
                            : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/30 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Checkbox */}
                          <div className="flex-shrink-0">
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-teal-600" />
                            ) : (
                              <Square className={`w-5 h-5 ${hasBilties ? 'text-gray-400' : 'text-gray-300'}`} />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                              <span className="font-bold text-sm text-gray-900 truncate">{admin.transport_name}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                              {admin.gstin && <span className="font-mono">GST: {admin.gstin}</span>}
                              {admin.owner_name && <span>Owner: {admin.owner_name}</span>}
                              <span className="text-teal-600">{subTransports.length} sub-transport(s)</span>
                            </div>
                            {/* Sub transport names */}
                            {subTransports.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {subTransports.slice(0, 5).map((sub, i) => (
                                  <span key={i} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                    {sub.transport_name}{sub.city_name ? ` (${sub.city_name})` : ''}
                                  </span>
                                ))}
                                {subTransports.length > 5 && (
                                  <span className="text-[9px] text-gray-400">+{subTransports.length - 5} more</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Bilty count badge */}
                          <div className="flex-shrink-0 text-right">
                            {hasBilties ? (
                              <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                isSelected ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {matchingBilties.length} bilty
                              </div>
                            ) : (
                              <div className="text-[10px] text-gray-400 font-semibold px-2 py-1 bg-gray-100 rounded-full">
                                No bilties
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Progress / Results */}
            {(bulkCreating || bulkProgress.results.length > 0) && (
              <div className="border-t border-gray-200 p-4 bg-gray-50 flex-shrink-0 max-h-48 overflow-y-auto">
                {bulkCreating && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                        Creating bills...
                      </span>
                      <span className="font-bold text-teal-700">{bulkProgress.current} / {bulkProgress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                {bulkProgress.results.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Results</div>
                    {bulkProgress.results.map((r, i) => (
                      <div key={i} className={`flex items-center justify-between text-xs px-2 py-1.5 rounded ${
                        r.status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                      }`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span>{r.status === 'success' ? '✅' : '❌'}</span>
                          <span className="font-semibold truncate">{r.admin}</span>
                          <span className="text-gray-500">→</span>
                          <span className="truncate">{r.transport}</span>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <span className="font-mono font-bold">{r.bilties} bilties</span>
                          {r.amount > 0 && <span className="ml-2 font-mono">₹{r.amount.toFixed(2)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 bg-white flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-gray-600">
                <span className="font-bold text-teal-700">{bulkSelectedAdmins.length}</span> admin(s) selected
                {bulkSelectedAdmins.length > 0 && (
                  <span className="text-gray-400 ml-2">
                    • {(() => {
                      const groups = getBulkAdminBiltyGroups();
                      const totalBills = groups.reduce((s, g) => s + g.transports.length, 0);
                      const totalBilties = groups.reduce((s, g) => s + g.totalBilties, 0);
                      return `${totalBills} bill(s), ${totalBilties} bilties`;
                    })()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowBulkCreateModal(false);
                    setBulkSelectedAdmins([]);
                    setBulkProgress({ current: 0, total: 0, results: [] });
                    setBulkAdminSearch('');
                  }}
                  disabled={bulkCreating}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-gray-700 disabled:opacity-50"
                >
                  {bulkProgress.results.length > 0 ? 'Close' : 'Cancel'}
                </button>
                {!bulkProgress.results.length && (
                  <button
                    onClick={handleBulkCreateKaatBills}
                    disabled={bulkSelectedAdmins.length === 0 || bulkCreating}
                    className="px-6 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {bulkCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Layers className="w-4 h-4" />
                        Create {bulkSelectedAdmins.length > 0 ? `${bulkSelectedAdmins.length} Bill(s)` : 'Bills'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
