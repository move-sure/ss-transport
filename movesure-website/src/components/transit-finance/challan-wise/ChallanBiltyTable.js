'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FileText, Package, Loader2 } from 'lucide-react';
import supabase from '../../../app/utils/supabase';
import {
  getCityNameById,
  getCityNameByCode,
  getCityIdByCode,
  calculateFinancialSummary,
  getUniqueCities,
  applyPaymentModeFilter,
  applyTransportFilter,
  applyCityFilter,
} from '../finance-bilty-helpers';
import {
  loadHubRatesForCity,
  applyHubRateToMultipleBilties,
  calculateTotalKaatAmount,
  getTransportDetailsFromBilties,
  saveKaatBillToDatabase,
  getCurrentUser,
  autoApplyKaatToAllBilties
} from '../kaat-bill-service';

// Sub-components
import ChallanFinanceSummary from './ChallanFinanceSummary';
import ChallanFilters from './ChallanFilters';
import ChallanActionBar from './ChallanActionBar';
import ChallanTableRow from './ChallanTableRow';
import ChallanTableFooter from './ChallanTableFooter';
import BiltySelectorModal from './BiltySelectorModal';
import BulkCreateModal from './BulkCreateModal';

const TABLE_HEADERS = [
  { key: '#', label: '#', align: 'center' },
  { key: 'select', label: '', align: 'center' },
  { key: 'gr_no', label: 'GR No', align: 'left' },
  { key: 'date', label: 'Date', align: 'left' },
  { key: 'consignor', label: 'Consignor', align: 'left' },
  { key: 'consignee', label: 'Consignee', align: 'left' },
  { key: 'transport', label: 'Transport', align: 'left' },
  { key: 'dest', label: 'Dest', align: 'left' },
  { key: 'contents', label: 'Contents', align: 'left' },
  { key: 'pkg', label: 'Pkg', align: 'right' },
  { key: 'weight', label: 'Wt(KG)', align: 'right' },
  { key: 'total', label: 'Total', align: 'right' },
  { key: 'pay', label: 'Pay', align: 'center' },
  { key: 'dd_chrg', label: 'DD Chrg', align: 'right' },
  { key: 'pohonch', label: 'Pohonch', align: 'left' },
  { key: 'bilty_no', label: 'Bilty#', align: 'left' },
  { key: 'kaat', label: 'Kaat', align: 'center' },
  { key: 'pf', label: 'PF', align: 'right' },
  { key: 'act_rate', label: 'Act.Rate', align: 'right' },
  { key: 'profit', label: 'Profit', align: 'right' },
];

export default function ChallanBiltyTable({
  transitDetails,
  selectedChallan,
  cities,
  editMode = false,
  editingBillId = null,
  editingBillGrNumbers = [],
  onKaatBillSaved = null,
  onCancelEdit = null,
  onViewKaatBills = null,
}) {
  // Filter states
  const [filterPaymentMode, setFilterPaymentMode] = useState('all');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedTransports, setSelectedTransports] = useState([]);
  const [availableTransports, setAvailableTransports] = useState([]);
  const [hubRates, setHubRates] = useState([]);
  const [selectedHubRate, setSelectedHubRate] = useState('');
  const [loadingRates, setLoadingRates] = useState(false);
  const [applyingRates, setApplyingRates] = useState(false);

  // Kaat bill states
  const [savingKaatBill, setSavingKaatBill] = useState(false);
  const [selectedBiltiesForSave, setSelectedBiltiesForSave] = useState([]);
  const [showBiltySelector, setShowBiltySelector] = useState(false);
  const [selectedTransportForBill, setSelectedTransportForBill] = useState(null);
  const [kaatDetails, setKaatDetails] = useState([]);
  const [alreadySavedGrNos, setAlreadySavedGrNos] = useState([]);
  const [autoApplyingKaat, setAutoApplyingKaat] = useState(false);
  const [modalUniqueTransports, setModalUniqueTransports] = useState([]);
  const [loadingModalTransports, setLoadingModalTransports] = useState(false);

  // Batch loaded data
  const [allKaatData, setAllKaatData] = useState({});
  const [transportsByCity, setTransportsByCity] = useState({});
  const [loadingBatchData, setLoadingBatchData] = useState(false);

  // Preloaded hub rates for instant kaat cell editing (keyed by destination city id)
  const [preloadedHubRates, setPreloadedHubRates] = useState({});
  // User names for created_by/updated_by display
  const [userNamesMap, setUserNamesMap] = useState({});

  // Transport Admin states
  const [transportAdmins, setTransportAdmins] = useState([]);
  const [selectedTransportAdmin, setSelectedTransportAdmin] = useState('');
  const [transportAdminSearch, setTransportAdminSearch] = useState('');
  const [loadingTransportAdmins, setLoadingTransportAdmins] = useState(false);
  const [transportAdminSubTransports, setTransportAdminSubTransports] = useState({});

  // Bulk create
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [bulkSelectedAdmins, setBulkSelectedAdmins] = useState([]);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, results: [] });
  const [bulkAdminSearch, setBulkAdminSearch] = useState('');

  // Pagination
  const PAGE_SIZE = 40;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // ========== MEMOIZED DATA ==========
  const challanTransits = useMemo(() => {
    if (!transitDetails || !selectedChallan) return [];
    return transitDetails.filter(t => t.challan_no === selectedChallan.challan_no);
  }, [transitDetails, selectedChallan]);

  const uniqueCities = useMemo(() => getUniqueCities(challanTransits, cities), [challanTransits, cities]);

  const filteredTransits = useMemo(() => {
    let filtered = challanTransits;
    filtered = applyPaymentModeFilter(filtered, filterPaymentMode);
    filtered = applyTransportFilter(filtered, selectedTransports, availableTransports, cities);
    filtered = applyCityFilter(filtered, selectedCityId);

    if (selectedTransportAdmin) {
      const subTransports = transportAdminSubTransports[selectedTransportAdmin] || [];
      const subGsts = subTransports.map(t => t.gst_number?.trim()).filter(Boolean);
      const subNames = subTransports.map(t => t.transport_name?.toLowerCase().trim()).filter(Boolean);
      const subCityIds = subTransports.map(t => t.city_id).filter(Boolean);

      filtered = filtered.filter(t => {
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
    }

    return filtered;
  }, [challanTransits, filterPaymentMode, selectedTransports, selectedCityId, availableTransports, cities, selectedTransportAdmin, transportAdminSubTransports]);

  const visibleTransits = useMemo(() => filteredTransits.slice(0, visibleCount), [filteredTransits, visibleCount]);
  const hasMoreToShow = filteredTransits.length > visibleCount;

  const financialSummary = useMemo(() => calculateFinancialSummary(filteredTransits), [filteredTransits]);

  const transportAdminLookup = useMemo(() => {
    const lookup = {};
    for (const admin of transportAdmins) {
      if (admin.gstin?.trim()) lookup['gst:' + admin.gstin.toLowerCase().trim()] = admin.transport_name;
      if (admin.transport_name?.trim()) lookup['name:' + admin.transport_name.toLowerCase().trim()] = admin.transport_name;
    }
    for (const [adminId, subs] of Object.entries(transportAdminSubTransports)) {
      const admin = transportAdmins.find(a => a.transport_id === adminId);
      if (!admin) continue;
      for (const sub of subs) {
        if (sub.gst_number?.trim()) lookup['gst:' + sub.gst_number.toLowerCase().trim()] = admin.transport_name;
        if (sub.transport_name?.trim()) lookup['name:' + sub.transport_name.toLowerCase().trim()] = admin.transport_name;
      }
    }
    return lookup;
  }, [transportAdminSubTransports, transportAdmins]);

  const getAdminNameForBilty = useCallback((transportGst, transportName) => {
    if (transportGst?.trim()) {
      const byGst = transportAdminLookup['gst:' + transportGst.toLowerCase().trim()];
      if (byGst) return byGst;
    }
    if (transportName?.trim()) {
      const byName = transportAdminLookup['name:' + transportName.toLowerCase().trim()];
      if (byName) return byName;
    }
    return null;
  }, [transportAdminLookup]);

  const footerTotals = useMemo(() => {
    let totalAmount = 0, totalDdChrg = 0, totalKaat = 0, totalPf = 0, totalProfit = 0;
    filteredTransits.forEach(transit => {
      const bilty = transit.bilty;
      const station = transit.station;
      const kaatData = allKaatData[transit.gr_no];
      const paymentMode = bilty?.payment_mode || station?.payment_status;
      const isPaidOrDD = paymentMode?.toLowerCase().includes('paid') || bilty?.delivery_type?.toLowerCase().includes('door');
      const amt = isPaidOrDD ? 0 : parseFloat(bilty?.total || station?.amount || 0);
      totalAmount += amt;
      const ddChrg = kaatData?.dd_chrg ? parseFloat(kaatData.dd_chrg) : 0;
      totalDdChrg += ddChrg;
      if (kaatData) {
        if (kaatData.pf != null) totalPf += parseFloat(kaatData.pf);
        let kaatAmount = 0;
        if (kaatData.kaat != null) {
          kaatAmount = parseFloat(kaatData.kaat);
        } else {
          const weight = parseFloat(bilty?.wt || station?.weight || 0);
          const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
          const rateKg = parseFloat(kaatData.rate_per_kg) || 0;
          const ratePkg = parseFloat(kaatData.rate_per_pkg) || 0;
          const effectiveWeight = Math.max(weight, 50);
          if (kaatData.rate_type === 'per_kg') kaatAmount = effectiveWeight * rateKg;
          else if (kaatData.rate_type === 'per_pkg') kaatAmount = packages * ratePkg;
          else if (kaatData.rate_type === 'hybrid') kaatAmount = (effectiveWeight * rateKg) + (packages * ratePkg);
          kaatAmount += parseFloat(kaatData.bilty_chrg || 0) + parseFloat(kaatData.ewb_chrg || 0) + parseFloat(kaatData.labour_chrg || 0) + parseFloat(kaatData.other_chrg || 0);
        }
        totalKaat += kaatAmount;
        totalProfit += amt - kaatAmount - ddChrg;
      } else {
        totalProfit += amt - ddChrg;
      }
    });
    return { totalAmount, totalDdChrg, totalKaat, totalPf, totalProfit };
  }, [filteredTransits, allKaatData]);

  // ========== EFFECTS ==========
  useEffect(() => {
    if (editMode && editingBillGrNumbers.length > 0) {
      setSelectedBiltiesForSave(editingBillGrNumbers.map(gr => String(gr).trim().toUpperCase()));
    } else if (!editMode) {
      setSelectedBiltiesForSave([]);
    }
  }, [editMode, editingBillGrNumbers]);

  useEffect(() => {
    if (showBiltySelector && selectedBiltiesForSave.length > 0) loadModalTransports();
    else { setModalUniqueTransports([]); setSelectedTransportForBill(null); }
  }, [showBiltySelector, selectedBiltiesForSave]);

  useEffect(() => { loadTransportAdmins(); }, []);

  useEffect(() => {
    if (transitDetails?.length > 0 && selectedChallan?.challan_no) {
      loadAllKaatData();
      loadAllTransportData();
      loadAllHubRatesPreload();
    }
  }, [transitDetails, selectedChallan?.challan_no]);

  useEffect(() => {
    const fetchSaved = async () => {
      if (!selectedChallan?.challan_no) { setAlreadySavedGrNos([]); return; }
      const { data } = await supabase.from('kaat_bill_master').select('gr_numbers').eq('challan_no', selectedChallan.challan_no);
      if (data) {
        const all = data.reduce((acc, bill) => [...acc, ...(bill.gr_numbers || []).map(gr => String(gr).trim().toUpperCase())], []);
        setAlreadySavedGrNos([...new Set(all)]);
      }
    };
    fetchSaved();
  }, [selectedChallan?.challan_no]);

  // ========== REALTIME SUBSCRIPTIONS ==========
  // Keep a ref of GR numbers so the subscription callback always has the latest set
  const grNumbersRef = useRef(new Set());
  useEffect(() => {
    grNumbersRef.current = new Set(challanTransits.map(t => t.gr_no).filter(Boolean));
  }, [challanTransits]);

  useEffect(() => {
    if (!selectedChallan?.challan_no) return;
    const challanNoSafe = selectedChallan.challan_no.replace(/[^a-zA-Z0-9]/g, '_');

    const channel = supabase
      .channel(`kaat_live_${challanNoSafe}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bilty_wise_kaat',
        filter: `challan_no=eq.${selectedChallan.challan_no}`
      }, (payload) => {
        const { eventType, new: newRec, old: oldRec } = payload;
        const grNo = newRec?.gr_no || oldRec?.gr_no;
        if (!grNo) return;
        if (eventType === 'DELETE') {
          setAllKaatData(prev => { const u = { ...prev }; delete u[grNo]; return u; });
        } else {
          setAllKaatData(prev => ({ ...prev, [grNo]: newRec }));
        }
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'kaat_bill_master',
        filter: `challan_no=eq.${selectedChallan.challan_no}`
      }, () => {
        refreshSavedGrNos();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_hub_rates' }, () => {
        loadAllHubRatesPreload();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedChallan?.challan_no]);

  // ========== USER NAMES FOR KAAT DISPLAY ==========
  useEffect(() => {
    const loadUserNames = async () => {
      const allUserIds = [...new Set(
        Object.values(allKaatData)
          .flatMap(k => [k.created_by, k.updated_by])
          .filter(Boolean)
      )];
      if (allUserIds.length === 0) return;
      // Only fetch IDs we don't already have
      const missingIds = allUserIds.filter(id => !userNamesMap[id]);
      if (missingIds.length === 0) return;
      const { data } = await supabase.from('users').select('id, name, username').in('id', missingIds);
      if (data && data.length > 0) {
        setUserNamesMap(prev => {
          const updated = { ...prev };
          data.forEach(u => { updated[u.id] = u.name || u.username; });
          return updated;
        });
      }
    };
    if (Object.keys(allKaatData).length > 0) loadUserNames();
  }, [allKaatData]);

  useEffect(() => {
    if (selectedCityId) { loadHubRates(); } else { setHubRates([]); setSelectedHubRate(''); }
  }, [selectedCityId]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filterPaymentMode, selectedTransports, selectedCityId, selectedTransportAdmin]);

  // ========== DATA LOADERS ==========
  const loadTransportAdmins = async () => {
    try {
      setLoadingTransportAdmins(true);
      const [adminsRes, subsRes] = await Promise.all([
        supabase.from('transport_admin').select('transport_id, transport_name, gstin, hub_mobile_number, owner_name').order('transport_name'),
        supabase.from('transports').select('id, transport_name, gst_number, city_id, city_name, transport_admin_id').not('transport_admin_id', 'is', null),
      ]);
      setTransportAdmins(adminsRes.data || []);
      const adminMap = {};
      (subsRes.data || []).forEach(t => {
        if (!adminMap[t.transport_admin_id]) adminMap[t.transport_admin_id] = [];
        adminMap[t.transport_admin_id].push(t);
      });
      setTransportAdminSubTransports(adminMap);
    } catch (err) {
      console.error('Error loading transport admins:', err);
    } finally {
      setLoadingTransportAdmins(false);
    }
  };

  const loadAllKaatData = async () => {
    try {
      setLoadingBatchData(true);
      const grNumbers = [...new Set(challanTransits.map(t => t.gr_no).filter(Boolean))];
      if (grNumbers.length === 0) { setAllKaatData({}); return; }
      const { data, error } = await supabase.from('bilty_wise_kaat').select('*').in('gr_no', grNumbers);
      if (error) throw error;
      const kaatMap = {};
      (data || []).forEach(kaat => { kaatMap[kaat.gr_no] = kaat; });
      setAllKaatData(kaatMap);
    } catch (err) {
      console.error('Error batch loading kaat:', err);
      setAllKaatData({});
    } finally {
      setLoadingBatchData(false);
    }
  };

  const loadAllTransportData = async () => {
    try {
      const stationCodes = [...new Set(challanTransits.filter(t => t.station?.station).map(t => t.station.station))];
      if (stationCodes.length === 0) { setTransportsByCity({}); return; }
      const cityIds = stationCodes.map(code => cities?.find(c => c.city_code === code)?.id).filter(Boolean);
      if (cityIds.length === 0) { setTransportsByCity({}); return; }
      const { data, error } = await supabase.from('transports').select('id, transport_name, gst_number, city_id').in('city_id', cityIds);
      if (error) throw error;
      const transportMap = {};
      (data || []).forEach(t => {
        if (!transportMap[t.city_id]) transportMap[t.city_id] = [];
        transportMap[t.city_id].push(t);
      });
      setTransportsByCity(transportMap);
    } catch (err) {
      console.error('Error batch loading transports:', err);
      setTransportsByCity({});
    }
  };

  const loadAllHubRatesPreload = async () => {
    try {
      const destCityIds = [...new Set(challanTransits.map(t => {
        if (t.bilty?.to_city_id) return t.bilty.to_city_id;
        if (t.station?.station) {
          const city = cities?.find(c => c.city_code === t.station.station);
          return city?.id;
        }
        return null;
      }).filter(Boolean))];
      if (destCityIds.length === 0) return;

      // Batch fetch hub rates for all destination cities
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < destCityIds.length; i += batchSize) batches.push(destCityIds.slice(i, i + batchSize));
      let allRates = [];
      for (const batch of batches) {
        const { data } = await supabase
          .from('transport_hub_rates')
          .select('id, transport_id, transport_name, destination_city_id, rate_per_kg, rate_per_pkg, min_charge, pricing_mode, is_active, bilty_chrg, ewb_chrg, labour_chrg, other_chrg')
          .in('destination_city_id', batch)
          .eq('is_active', true);
        allRates = [...allRates, ...(data || [])];
      }

      // Enrich with transport details
      const transportIds = [...new Set(allRates.map(r => r.transport_id).filter(Boolean))];
      let transportsData = [];
      if (transportIds.length > 0) {
        const tBatches = [];
        for (let i = 0; i < transportIds.length; i += 100) tBatches.push(transportIds.slice(i, i + 100));
        for (const batch of tBatches) {
          const { data } = await supabase.from('transports').select('id, transport_name, city_id, gst_number').in('id', batch);
          transportsData = [...transportsData, ...(data || [])];
        }
      }
      const transCityIds = [...new Set(transportsData.map(t => t.city_id).filter(Boolean))];
      let citiesData = [];
      if (transCityIds.length > 0) {
        const { data } = await supabase.from('cities').select('id, city_name').in('id', transCityIds);
        citiesData = data || [];
      }
      const cityNameMap = {};
      citiesData.forEach(c => { cityNameMap[c.id] = c.city_name; });
      const transportLookup = {};
      transportsData.forEach(t => { transportLookup[t.id] = { ...t, city_name: cityNameMap[t.city_id] || null }; });

      // Group enriched rates by destination city
      const ratesByCity = {};
      allRates.forEach(rate => {
        const enriched = { ...rate, transport: rate.transport_id ? transportLookup[rate.transport_id] : null };
        const cid = rate.destination_city_id;
        if (!ratesByCity[cid]) ratesByCity[cid] = [];
        ratesByCity[cid].push(enriched);
      });
      setPreloadedHubRates(ratesByCity);
    } catch (err) {
      console.error('Error preloading hub rates:', err);
    }
  };

  const refreshSavedGrNos = async () => {
    if (!selectedChallan?.challan_no) return;
    const { data } = await supabase.from('kaat_bill_master').select('gr_numbers').eq('challan_no', selectedChallan.challan_no);
    if (data) {
      const all = data.reduce((acc, bill) => [...acc, ...(bill.gr_numbers || []).map(gr => String(gr).trim().toUpperCase())], []);
      setAlreadySavedGrNos([...new Set(all)]);
    }
  };

  const loadHubRates = async () => {
    setLoadingRates(true);
    const { rates } = await loadHubRatesForCity(selectedCityId);
    setHubRates(rates || []);
    setLoadingRates(false);
  };

  const getTransportForBilty = async (transit) => {
    if (transit.bilty?.transport_name) return { name: transit.bilty.transport_name, gst: transit.bilty.transport_gst || null };
    if (transit.station?.station) {
      try {
        const { data: cityData } = await supabase.from('cities').select('id').eq('city_code', transit.station.station).single();
        if (cityData) {
          const { data: transportData } = await supabase.from('transports').select('transport_name, gst_number').eq('city_id', cityData.id).limit(1).single();
          if (transportData) return { name: transportData.transport_name, gst: transportData.gst_number || null };
        }
      } catch (err) { /* skip */ }
    }
    return { name: 'Unknown Transport', gst: null };
  };

  const loadModalTransports = async () => {
    try {
      setLoadingModalTransports(true);
      const selected = filteredTransits.filter(t => selectedBiltiesForSave.includes(String(t.gr_no).trim().toUpperCase()));
      const results = await Promise.all(selected.map(t => getTransportForBilty(t)));
      const map = new Map();
      const list = [];
      results.forEach(({ name, gst }) => {
        if (!name || name === 'Unknown Transport') return;
        const key = `${name}_${gst || ''}`;
        if (!map.has(key)) { map.set(key, true); list.push({ name, gst: gst || null, count: 1 }); }
        else { list.find(u => `${u.name}_${u.gst || ''}` === key).count++; }
      });
      setModalUniqueTransports(list);
      if (!selectedTransportForBill && list.length > 0) setSelectedTransportForBill(list[0]);
    } catch (err) {
      setModalUniqueTransports([]);
    } finally {
      setLoadingModalTransports(false);
    }
  };

  // ========== CALLBACKS ==========
  const handleKaatUpdated = useCallback((grNo, newKaatData) => {
    setAllKaatData(prev => ({ ...prev, [grNo]: newKaatData }));
  }, []);

  const handleKaatDeleted = useCallback((grNo) => {
    setAllKaatData(prev => { const updated = { ...prev }; delete updated[grNo]; return updated; });
  }, []);

  const handleTransportChanged = useCallback((grNo, transportInfo) => {
    loadAllTransportData();
    loadAllHubRatesPreload();
  }, []);

  const handleInlineFieldSave = useCallback(async (grNo, field, value) => {
    try {
      let userId = null;
      if (typeof window !== 'undefined') {
        const s = localStorage.getItem('userSession');
        if (s) userId = JSON.parse(s).user?.id || null;
      }
      const existing = allKaatData[grNo];
      if (existing) {
        const { data, error } = await supabase
          .from('bilty_wise_kaat')
          .update({ [field]: value || null, updated_by: userId, updated_at: new Date().toISOString() })
          .eq('gr_no', grNo)
          .select()
          .single();
        if (error) throw error;
        setAllKaatData(prev => ({ ...prev, [grNo]: data }));
      } else {
        const { data, error } = await supabase
          .from('bilty_wise_kaat')
          .insert([{ gr_no: grNo, challan_no: selectedChallan.challan_no, [field]: value || null, created_by: userId, updated_by: userId }])
          .select()
          .single();
        if (error) throw error;
        setAllKaatData(prev => ({ ...prev, [grNo]: data }));
      }
    } catch (err) {
      console.error(`Error saving ${field}:`, err);
    }
  }, [allKaatData, selectedChallan?.challan_no]);

  const handleToggleSelect = useCallback((normalizedGrNo) => {
    setSelectedBiltiesForSave(prev =>
      prev.includes(normalizedGrNo)
        ? prev.filter(gr => gr !== normalizedGrNo)
        : [...prev, normalizedGrNo]
    );
  }, []);

  const handleSelectAllCheckbox = useCallback((checked) => {
    if (checked) {
      const unsaved = filteredTransits
        .filter(t => !alreadySavedGrNos.includes(String(t.gr_no).trim().toUpperCase()))
        .map(t => String(t.gr_no).trim().toUpperCase());
      setSelectedBiltiesForSave(unsaved);
    } else {
      setSelectedBiltiesForSave([]);
    }
  }, [filteredTransits, alreadySavedGrNos]);

  // ========== HUB RATE ==========
  const applyHubRateToAll = async () => {
    if (!selectedHubRate || filteredTransits.length === 0) return;
    if (!window.confirm(`Apply selected hub rate to ${filteredTransits.length} bilties?`)) return;
    setApplyingRates(true);
    const { success, count } = await applyHubRateToMultipleBilties(filteredTransits, selectedChallan, selectedCityId, selectedHubRate, hubRates);
    if (success) { alert(`Applied hub rate to ${count} bilties!`); loadAllKaatData(); }
    setApplyingRates(false);
  };

  // ========== AUTO KAAT ==========
  const handleAutoApplyKaat = async () => {
    if (challanTransits.length === 0) return;
    if (!window.confirm(`Auto apply kaat to ${challanTransits.length} bilties?`)) return;
    setAutoApplyingKaat(true);
    try {
      const { success, applied, skipped } = await autoApplyKaatToAllBilties(challanTransits, selectedChallan, cities);
      if (success) { alert(`✅ Applied: ${applied}, Skipped: ${skipped}`); loadAllKaatData(); }
    } catch (err) { alert('Error: ' + err.message); }
    finally { setAutoApplyingKaat(false); }
  };

  const handleAutoApplyKaatForSelected = async () => {
    const selected = challanTransits.filter(t => selectedBiltiesForSave.includes(String(t.gr_no).trim().toUpperCase()));
    if (selected.length === 0) return;
    if (!window.confirm(`Auto apply kaat to ${selected.length} selected bilties?`)) return;
    setAutoApplyingKaat(true);
    try {
      const { success, applied, skipped } = await autoApplyKaatToAllBilties(selected, selectedChallan, cities);
      if (success) { alert(`✅ Applied: ${applied}, Skipped: ${skipped}`); loadAllKaatData(); }
    } catch (err) { alert('Error: ' + err.message); }
    finally { setAutoApplyingKaat(false); }
  };

  // ========== SAVE KAAT BILL ==========
  const handleSaveKaatBill = () => {
    if (selectedBiltiesForSave.length === 0) { alert('Select bilties first!'); return; }
    setShowBiltySelector(true);
  };

  const confirmSaveKaatBill = async () => {
    if (selectedBiltiesForSave.length === 0) return;
    try {
      setSavingKaatBill(true);
      const biltiesWithKaat = filteredTransits.filter(t => selectedBiltiesForSave.includes(String(t.gr_no).trim().toUpperCase()));
      if (biltiesWithKaat.length === 0) throw new Error('No bilty data found');
      const { totalKaatAmount, kaatDetails: details, error: calcError } = await calculateTotalKaatAmount(biltiesWithKaat);
      if (calcError) throw calcError;
      setKaatDetails(details);

      let transportName = selectedTransportForBill?.name;
      let transportGst = selectedTransportForBill?.gst;
      if (!transportName) {
        const td = await getTransportForBilty(biltiesWithKaat[0]);
        transportName = td.name; transportGst = td.gst;
      }

      let transportAdminId = null;
      try {
        let q = null;
        if (transportGst) q = await supabase.from('transports').select('transport_admin_id').eq('gst_number', transportGst).not('transport_admin_id', 'is', null).limit(1).single();
        if (!q?.data && transportName) q = await supabase.from('transports').select('transport_admin_id').ilike('transport_name', transportName).not('transport_admin_id', 'is', null).limit(1).single();
        if (q?.data?.transport_admin_id) transportAdminId = q.data.transport_admin_id;
      } catch { /* skip */ }
      if (selectedTransportAdmin) transportAdminId = selectedTransportAdmin;

      const currentUser = getCurrentUser();

      if (editMode && editingBillId) {
        const { error } = await supabase.from('kaat_bill_master').update({
          gr_numbers: selectedBiltiesForSave, total_bilty_count: selectedBiltiesForSave.length,
          total_kaat_amount: totalKaatAmount, transport_name: transportName, transport_gst: transportGst,
          transport_admin_id: transportAdminId, updated_by: currentUser.id, updated_at: new Date().toISOString()
        }).eq('id', editingBillId);
        if (error) throw error;
        alert(`✅ Kaat Bill updated!\nBilties: ${selectedBiltiesForSave.length}\nAmount: ₹${totalKaatAmount.toFixed(2)}`);
      } else {
        const { success, error } = await saveKaatBillToDatabase({
          challan_no: selectedChallan.challan_no, transport_name: transportName, transport_gst: transportGst,
          transport_admin_id: transportAdminId, gr_numbers: selectedBiltiesForSave,
          total_bilty_count: selectedBiltiesForSave.length, total_kaat_amount: totalKaatAmount,
          created_by: currentUser.id, updated_by: currentUser.id, printed_yet: false
        });
        if (!success) throw error;
        alert(`✅ Kaat Bill saved!\nBilties: ${selectedBiltiesForSave.length}\nAmount: ₹${totalKaatAmount.toFixed(2)}`);
      }

      // Refresh saved GR numbers
      const { data: updatedData } = await supabase.from('kaat_bill_master').select('gr_numbers').eq('challan_no', selectedChallan.challan_no);
      if (updatedData) {
        const all = updatedData.reduce((acc, b) => [...acc, ...(b.gr_numbers || []).map(gr => String(gr).trim().toUpperCase())], []);
        setAlreadySavedGrNos([...new Set(all)]);
      }
      setShowBiltySelector(false);
      setSelectedBiltiesForSave([]);
      setSelectedTransportForBill(null);
      if (onKaatBillSaved) onKaatBillSaved();
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setSavingKaatBill(false);
    }
  };

  // ========== BULK CREATE ==========
  const getBulkAdminBiltyGroups = () => {
    const groups = [];
    for (const adminId of bulkSelectedAdmins) {
      const admin = transportAdmins.find(a => a.transport_id === adminId);
      const subTransports = transportAdminSubTransports[adminId] || [];
      if (!admin || subTransports.length === 0) continue;

      const subGsts = subTransports.map(t => t.gst_number?.toLowerCase().trim()).filter(Boolean);
      const subNames = subTransports.map(t => t.transport_name?.toLowerCase().trim()).filter(Boolean);
      const subCityIds = subTransports.map(t => t.city_id).filter(Boolean);
      if (admin.gstin?.trim()) subGsts.push(admin.gstin.toLowerCase().trim());
      if (admin.transport_name?.trim()) subNames.push(admin.transport_name.toLowerCase().trim());

      const matching = challanTransits.filter(t => {
        const grNo = String(t.gr_no).trim().toUpperCase();
        if (alreadySavedGrNos.includes(grNo)) return false;
        const biltyGst = t.bilty?.transport_gst?.toLowerCase().trim();
        const biltyName = t.bilty?.transport_name?.toLowerCase().trim();
        const stationCode = t.station?.station;
        const stationCityId = stationCode ? cities?.find(c => c.city_code === stationCode)?.id : null;
        if (biltyGst && subGsts.includes(biltyGst)) return true;
        if (biltyName && subNames.includes(biltyName)) return true;
        if (stationCityId && subCityIds.includes(stationCityId)) return true;
        if (t.bilty?.to_city_id && subCityIds.includes(t.bilty.to_city_id)) return true;
        return false;
      });

      if (matching.length > 0) {
        const transportMap = {};
        let skippedCount = 0;
        matching.forEach(t => {
          let tName = t.bilty?.transport_name?.trim();
          let tGst = t.bilty?.transport_gst || '';
          if (!tName && t.station?.station) {
            const stationCity = cities?.find(c => c.city_code === t.station.station);
            if (stationCity?.id) {
              const cityTransports = transportsByCity[stationCity.id] || [];
              const match = cityTransports.find(ct => {
                if (ct.gst_number?.toLowerCase().trim() && subGsts.includes(ct.gst_number.toLowerCase().trim())) return true;
                if (ct.transport_name?.toLowerCase().trim() && subNames.includes(ct.transport_name.toLowerCase().trim())) return true;
                return false;
              });
              if (match) { tName = match.transport_name?.trim(); tGst = match.gst_number || ''; }
              else if (cityTransports.length === 1) { tName = cityTransports[0].transport_name?.trim(); tGst = cityTransports[0].gst_number || ''; }
            }
          }
          if (!tName) { skippedCount++; return; }
          const key = `${tName}|||${tGst}`;
          if (!transportMap[key]) transportMap[key] = { name: tName, gst: tGst || null, bilties: [] };
          transportMap[key].bilties.push(t);
        });
        const valid = Object.values(transportMap).filter(tp => tp.bilties.length > 0);
        const count = valid.reduce((s, tp) => s + tp.bilties.length, 0);
        if (valid.length > 0) groups.push({ adminId, adminName: admin.transport_name, adminGstin: admin.gstin, transports: valid, totalBilties: count, skippedBilties: skippedCount });
      }
    }
    return groups;
  };

  const handleBulkCreateKaatBills = async () => {
    const groups = getBulkAdminBiltyGroups();
    if (groups.length === 0) { alert('No bilties found for selected admins.'); return; }
    const totalBills = groups.reduce((s, g) => s + g.transports.length, 0);
    if (!window.confirm(`Create ${totalBills} kaat bill(s) for ${groups.length} admin(s)?`)) return;
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
          const { totalKaatAmount, error: calcError } = await calculateTotalKaatAmount(transport.bilties);
          if (calcError) throw calcError;
          const { success, error } = await saveKaatBillToDatabase({
            challan_no: selectedChallan.challan_no, transport_name: transport.name, transport_gst: transport.gst,
            transport_admin_id: group.adminId, gr_numbers: grNumbers, total_bilty_count: grNumbers.length,
            total_kaat_amount: totalKaatAmount, created_by: currentUser.id, updated_by: currentUser.id, printed_yet: false
          });
          if (!success) throw error;
          results.push({ admin: group.adminName, transport: transport.name, bilties: grNumbers.length, amount: totalKaatAmount, status: 'success' });
        } catch (err) {
          results.push({ admin: group.adminName, transport: transport.name, bilties: transport.bilties.length, amount: 0, status: 'error', error: err.message });
        }
      }
    }
    setBulkProgress(prev => ({ ...prev, results }));
    // Refresh
    const { data: updatedData } = await supabase.from('kaat_bill_master').select('gr_numbers').eq('challan_no', selectedChallan.challan_no);
    if (updatedData) {
      const all = updatedData.reduce((acc, b) => [...acc, ...(b.gr_numbers || []).map(gr => String(gr).trim().toUpperCase())], []);
      setAlreadySavedGrNos([...new Set(all)]);
    }
    setBulkCreating(false);
    const successCount = results.filter(r => r.status === 'success').length;
    const failCount = results.filter(r => r.status === 'error').length;
    if (failCount === 0) {
      alert(`✅ All ${successCount} bills created!`);
      setShowBulkCreateModal(false);
      setBulkSelectedAdmins([]);
      setBulkProgress({ current: 0, total: 0, results: [] });
      if (onKaatBillSaved) onKaatBillSaved();
    } else {
      alert(`⚠️ ${successCount} created, ${failCount} failed.`);
    }
  };

  // ========== EMPTY STATES ==========
  if (!selectedChallan) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Select a challan to view bilty details</p>
      </div>
    );
  }

  if (challanTransits.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No bilties found for this challan</p>
      </div>
    );
  }

  const unsavedCount = filteredTransits.filter(t => !alreadySavedGrNos.includes(String(t.gr_no).trim().toUpperCase())).length;
  const allUnsavedSelected = selectedBiltiesForSave.length === unsavedCount && unsavedCount > 0;
  const alreadySavedFilteredCount = filteredTransits.filter(t => alreadySavedGrNos.includes(String(t.gr_no).trim().toUpperCase())).length;

  return (
    <div className="flex flex-col h-full">
      {/* Summary */}
      <ChallanFinanceSummary
        financialSummary={financialSummary}
        filteredCount={filteredTransits.length}
        totalCount={challanTransits.length}
      />

      {/* Action Bar */}
      <ChallanActionBar
        editMode={editMode}
        selectedBiltiesCount={selectedBiltiesForSave.length}
        autoApplyingKaat={autoApplyingKaat}
        savingKaatBill={savingKaatBill}
        onAutoKaatAll={handleAutoApplyKaat}
        onAutoKaatSelected={handleAutoApplyKaatForSelected}
        onSaveKaatBill={handleSaveKaatBill}
        onBulkCreate={() => setShowBulkCreateModal(true)}
        onCancelEdit={onCancelEdit}
        onViewKaatBills={onViewKaatBills}
        challanTransitsCount={challanTransits.length}
      />

      {/* Filters */}
      <ChallanFilters
        transportAdmins={transportAdmins}
        selectedTransportAdmin={selectedTransportAdmin}
        setSelectedTransportAdmin={setSelectedTransportAdmin}
        transportAdminSearch={transportAdminSearch}
        transportAdminSubTransports={transportAdminSubTransports}
        loadingTransportAdmins={loadingTransportAdmins}
        challanTransits={challanTransits}
        selectedTransports={selectedTransports}
        setSelectedTransports={setSelectedTransports}
        cities={cities}
        onAvailableTransportsUpdate={setAvailableTransports}
        alreadySavedGrNos={alreadySavedGrNos}
        filterPaymentMode={filterPaymentMode}
        setFilterPaymentMode={setFilterPaymentMode}
        selectedCityId={selectedCityId}
        setSelectedCityId={setSelectedCityId}
        uniqueCities={uniqueCities}
        hubRates={hubRates}
        selectedHubRate={selectedHubRate}
        setSelectedHubRate={setSelectedHubRate}
        loadingRates={loadingRates}
        applyingRates={applyingRates}
        filteredTransitsCount={filteredTransits.length}
        onApplyHubRate={applyHubRateToAll}
        selectedBiltiesCount={selectedBiltiesForSave.length}
        alreadySavedCount={alreadySavedFilteredCount}
        editMode={editMode}
        onClearSelection={() => setSelectedBiltiesForSave([])}
      />

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        {loadingBatchData && (
          <div className="bg-blue-50 border-b border-blue-200 px-3 py-1.5 flex items-center gap-2 text-xs text-blue-700 flex-shrink-0">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading kaat data...
          </div>
        )}

        <div className="overflow-auto flex-1">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-1 py-2 text-center font-bold text-gray-700 text-[10px] uppercase tracking-wider whitespace-nowrap">#</th>
                <th className="px-1 py-2 text-center font-bold text-gray-700 text-[10px] whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={allUnsavedSelected}
                    onChange={(e) => handleSelectAllCheckbox(e.target.checked)}
                    className="cursor-pointer w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                {TABLE_HEADERS.slice(2).map(h => (
                  <th key={h.key} className={`px-1 py-2 text-${h.align} font-bold text-gray-700 text-[10px] uppercase tracking-wider whitespace-nowrap`}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleTransits.map((transit, index) => {
                const normalizedGrNo = String(transit.gr_no).trim().toUpperCase();
                const isSelected = selectedBiltiesForSave.includes(normalizedGrNo);
                const isAlreadySaved = !editMode && alreadySavedGrNos.includes(normalizedGrNo);
                return (
                  <ChallanTableRow
                    key={transit.id}
                    transit={transit}
                    index={index}
                    cities={cities}
                    selectedChallan={selectedChallan}
                    isSelected={isSelected}
                    isAlreadySaved={isAlreadySaved}
                    editMode={editMode}
                    allKaatData={allKaatData}
                    transportsByCity={transportsByCity}
                    preloadedHubRates={preloadedHubRates}
                    userNamesMap={userNamesMap}
                    getAdminNameForBilty={getAdminNameForBilty}
                    onToggleSelect={handleToggleSelect}
                    onKaatUpdate={handleKaatUpdated}
                    onKaatDelete={handleKaatDeleted}
                    onTransportChanged={handleTransportChanged}
                    onInlineFieldSave={handleInlineFieldSave}
                  />
                );
              })}
            </tbody>
          </table>

          {/* Load More */}
          {hasMoreToShow && (
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm py-2.5 px-4 border-t border-gray-100 flex items-center justify-center gap-3">
              <span className="text-[11px] text-gray-400">
                {visibleCount} of {filteredTransits.length}
              </span>
              <button
                onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                Load {Math.min(PAGE_SIZE, filteredTransits.length - visibleCount)} More
              </button>
              <button
                onClick={() => setVisibleCount(filteredTransits.length)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
              >
                All ({filteredTransits.length})
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <ChallanTableFooter financialSummary={financialSummary} footerTotals={footerTotals} />
      </div>

      {/* Modals */}
      <BiltySelectorModal
        isOpen={showBiltySelector}
        filteredTransits={filteredTransits}
        selectedBiltiesForSave={selectedBiltiesForSave}
        setSelectedBiltiesForSave={setSelectedBiltiesForSave}
        selectedTransportForBill={selectedTransportForBill}
        setSelectedTransportForBill={setSelectedTransportForBill}
        modalUniqueTransports={modalUniqueTransports}
        loadingModalTransports={loadingModalTransports}
        savingKaatBill={savingKaatBill}
        kaatDetails={kaatDetails}
        getAdminNameForBilty={getAdminNameForBilty}
        transportAdmins={transportAdmins}
        onConfirmSave={confirmSaveKaatBill}
        onClose={() => { setShowBiltySelector(false); setSelectedBiltiesForSave([]); setSelectedTransportForBill(null); }}
      />

      <BulkCreateModal
        isOpen={showBulkCreateModal}
        onClose={() => { setShowBulkCreateModal(false); setBulkSelectedAdmins([]); setBulkProgress({ current: 0, total: 0, results: [] }); setBulkAdminSearch(''); }}
        bulkCreating={bulkCreating}
        bulkSelectedAdmins={bulkSelectedAdmins}
        setBulkSelectedAdmins={setBulkSelectedAdmins}
        bulkAdminSearch={bulkAdminSearch}
        setBulkAdminSearch={setBulkAdminSearch}
        bulkProgress={bulkProgress}
        transportAdmins={transportAdmins}
        transportAdminSubTransports={transportAdminSubTransports}
        challanTransits={challanTransits}
        alreadySavedGrNos={alreadySavedGrNos}
        cities={cities}
        transportsByCity={transportsByCity}
        onCreateBills={handleBulkCreateKaatBills}
        getBulkAdminBiltyGroups={getBulkAdminBiltyGroups}
      />
    </div>
  );
}
