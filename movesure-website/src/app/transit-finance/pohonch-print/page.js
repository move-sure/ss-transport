'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../utils/auth';
import supabase from '../../utils/supabase';
import Navbar from '../../../components/dashboard/navbar';
import { generatePohonchPDF } from '../../../components/transit-finance/pohonch-print/pohonch-pdf-generator';
import RecentPohonch from '../../../components/transit-finance/pohonch-print/recent-pohonch';
import { 
  Loader2, 
  AlertCircle, 
  ArrowLeft, 
  Printer, 
  RefreshCw,
  Search,
  Package,
  Check,
  X,
  Truck,
  ChevronDown,
  ChevronRight,
  Hash,
  CheckSquare,
  Square,
  Save,
  FileText,
  Clock,
  PenTool,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';

export default function PohonchPrintPage() {
  const router = useRouter();
  const { user, requireAuth } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Search Bilties State
  const [transportSearch, setTransportSearch] = useState('');
  const [transportSuggestions, setTransportSuggestions] = useState([]);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sbLoading, setSbLoading] = useState(false);
  const [sbBilties, setSbBilties] = useState([]);
  const [sbBiltyDetails, setSbBiltyDetails] = useState({});
  const [sbCitiesMap, setSbCitiesMap] = useState({});
  const [sbError, setSbError] = useState(null);
  const [sbExpandedChallans, setSbExpandedChallans] = useState({});
  const [cities, setCities] = useState([]);

  // Selection state for printing
  const [selectedGrNos, setSelectedGrNos] = useState(new Set());

  // Multi-challan select state
  const [challanSearchText, setChallanSearchText] = useState('');
  const [challanSuggestions, setChallanSuggestions] = useState([]);
  const [showChallanSuggestions, setShowChallanSuggestions] = useState(false);
  const [selectedChallans, setSelectedChallans] = useState([]); // array of selected challan numbers

  // City filter state
  const [citySearch, setCitySearch] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  // Challan range state
  const [fromChallan, setFromChallan] = useState('');
  const [toChallan, setToChallan] = useState('');

  // PDF generation state
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Pohonch save state
  const [saving, setSaving] = useState(false);
  const [lastSavedPohonch, setLastSavedPohonch] = useState(null);
  const [lastSelectedData, setLastSelectedData] = useState(null);
  const [recentKey, setRecentKey] = useState(0); // to trigger refresh in RecentPohonch

  useEffect(() => { setMounted(true); }, []);

  // ====== Destination Resolver Helper ======
  // Resolves the best available destination name for a bilty from multiple sources
  const resolveDestination = useCallback((kaatItem, bilty, station, citiesMap) => {
    // Priority: 1) bilty_wise_kaat destination_city_id → city name
    //           2) bilty's to_city_id → city name
    //           3) station's station field (station name text)
    //           4) fallback '-'
    if (kaatItem?.destination_city_id && citiesMap[kaatItem.destination_city_id]) return citiesMap[kaatItem.destination_city_id];
    if (bilty?.to_city_id && citiesMap[bilty.to_city_id]) return citiesMap[bilty.to_city_id];
    if (station?.station && station.station !== '-') return station.station;
    return '-';
  }, []);

  // ====== Pohonch Number Generator ======
  // Uses transport name initials + last 4 digits of GST for uniqueness per GST
  // BUT: if user previously used a custom prefix (e.g., "DP"), auto-detect and continue the sequence
  const generatePohonchPrefix = (transportName, gstNumber) => {
    const words = (transportName || 'TRANSPORT').trim().split(/\s+/).filter(w => w.length > 0);
    const skipWords = ['AND', '&', 'THE', 'OF', 'PVT', 'LTD', 'PRIVATE', 'LIMITED', 'CO', 'COMPANY', 'CORPORATION', 'ENTERPRISE', 'ENTERPRISES', 'TRANSPORT', 'TRANSPORTS', 'LOGISTICS'];
    let initials = words
      .filter(w => !skipWords.includes(w.toUpperCase()))
      .map(w => w[0].toUpperCase())
      .join('')
      .substring(0, 3);
    if (initials.length === 0) initials = (transportName || 'POH').substring(0, 3).toUpperCase();
    // Append last 4 chars of GST for uniqueness per transport GST
    const gstSuffix = gstNumber ? gstNumber.slice(-4).toUpperCase() : '';
    return initials + gstSuffix;
  };

  // Detect user's last-used prefix for this transport (custom or auto-generated)
  const detectLastUsedPrefix = (pohonchNumber) => {
    if (!pohonchNumber) return null;
    // Split: prefix is the leading letters, rest is digits
    const match = pohonchNumber.match(/^([A-Za-z]+)(\d+)$/);
    if (match) return { prefix: match[1], num: parseInt(match[2], 10) };
    return null;
  };

  // ====== Save Pohonch (called by user clicking Save button) ======
  const handleSavePohonch = async () => {
    if (!user?.id) { alert('Please login to save'); return; }
    if (!selectedTransport) return;
    if (!lastSelectedData || lastSelectedData.length === 0) { alert('No bilty data to save'); return; }
    if (lastSavedPohonch) { alert(`Already saved as ${lastSavedPohonch.pohonch_number}`); return; }
    try {
      setSaving(true);

      // ===== DUPLICATE CHECK: ensure no GR is already in another pohonch =====
      const grNos = lastSelectedData.map(b => b.gr_no).filter(Boolean);
      const { data: existing } = await supabase
        .from('pohonch')
        .select('pohonch_number, bilty_metadata')
        .eq('is_active', true);

      if (existing && existing.length > 0) {
        const usedGrNos = new Set();
        const grToPohonch = {};
        existing.forEach(p => {
          const bilties = Array.isArray(p.bilty_metadata) ? p.bilty_metadata : [];
          bilties.forEach(b => {
            if (b.gr_no) {
              usedGrNos.add(b.gr_no);
              grToPohonch[b.gr_no] = p.pohonch_number;
            }
          });
        });
        const duplicates = grNos.filter(gr => usedGrNos.has(gr));
        if (duplicates.length > 0) {
          const dupDetails = duplicates.slice(0, 5).map(gr => `${gr} (in ${grToPohonch[gr]})`).join(', ');
          const more = duplicates.length > 5 ? ` and ${duplicates.length - 5} more` : '';
          alert(`Cannot save! These bilties already exist in another pohonch:\n${dupDetails}${more}\n\nRemove them from selection or delete the existing pohonch first.`);
          setSaving(false);
          return;
        }
      }

      const defaultPrefix = generatePohonchPrefix(selectedTransport.transport_name, selectedTransport.gst_number);

      // ===== SMART PREFIX: Detect if user previously customized the pohonch number for this transport =====
      let smartPrefix = defaultPrefix;
      let smartNextNum = 1;

      const gstQuery = selectedTransport.gst_number
        ? supabase.from('pohonch').select('pohonch_number').eq('transport_gstin', selectedTransport.gst_number).eq('is_active', true).order('created_at', { ascending: false }).limit(20)
        : supabase.from('pohonch').select('pohonch_number').eq('transport_name', selectedTransport.transport_name).eq('is_active', true).order('created_at', { ascending: false }).limit(20);

      const { data: transportPohonch } = await gstQuery;

      if (transportPohonch && transportPohonch.length > 0) {
        // Use the latest prefix (most recently created pohonch for this transport)
        const latestParsed = detectLastUsedPrefix(transportPohonch[0].pohonch_number);
        if (latestParsed) {
          smartPrefix = latestParsed.prefix;
          // Find highest number across ALL pohonch with this prefix
          const { data: allWithPrefix } = await supabase
            .from('pohonch')
            .select('pohonch_number')
            .ilike('pohonch_number', `${smartPrefix}%`)
            .order('pohonch_number', { ascending: false })
            .limit(1);
          if (allWithPrefix && allWithPrefix.length > 0) {
            const lastParsed = detectLastUsedPrefix(allWithPrefix[0].pohonch_number);
            if (lastParsed) smartNextNum = lastParsed.num + 1;
          }
        }
      } else {
        // First pohonch for this transport — use default auto-generated prefix
        const { data: lastPohonchData } = await supabase
          .from('pohonch')
          .select('pohonch_number')
          .ilike('pohonch_number', `${defaultPrefix}%`)
          .order('pohonch_number', { ascending: false })
          .limit(1);
        if (lastPohonchData && lastPohonchData.length > 0) {
          const lastNum = parseInt(lastPohonchData[0].pohonch_number.replace(defaultPrefix, ''), 10);
          if (!isNaN(lastNum)) smartNextNum = lastNum + 1;
        }
      }

      const pohonchNumber = `${smartPrefix}${String(smartNextNum).padStart(4, '0')}`;

      // Double-check this pohonch number doesn't already exist (race condition safety)
      const { data: dupCheck } = await supabase
        .from('pohonch')
        .select('id')
        .eq('pohonch_number', pohonchNumber)
        .eq('is_active', true)
        .limit(1);
      if (dupCheck && dupCheck.length > 0) {
        alert(`Pohonch number ${pohonchNumber} already exists! Please try again.`);
        setSaving(false);
        return;
      }

      const challanNos = [...new Set(lastSelectedData.map(b => b.challan_no).filter(Boolean))];
      const biltyMeta = lastSelectedData.map(b => ({
        gr_no: b.gr_no, challan_no: b.challan_no, pohonch_bilty: b.pohonch_bilty || null,
        consignor: b.consignor, consignee: b.consignee,
        destination: b.destination, packages: b.packages, weight: b.weight, amount: b.amount,
        kaat: b.kaat, kaat_rate: b.kaat_rate || 0, dd: b.dd, pf: b.pf, payment_mode: b.payment_mode, is_paid: b.is_paid,
        date: b.date || null, e_way_bill: b.e_way_bill || null,
      }));

      let tAmt = 0, tKaat = 0, tPF = 0, tDD = 0, tPkg = 0, tWt = 0;
      lastSelectedData.forEach(b => {
        tAmt += b.amount || 0; tKaat += b.kaat || 0; tPF += b.pf || 0;
        tDD += b.dd || 0; tPkg += b.packages || 0; tWt += b.weight || 0;
      });

      const { data: saved, error } = await supabase
        .from('pohonch')
        .insert({
          pohonch_number: pohonchNumber,
          transport_name: selectedTransport.transport_name,
          transport_gstin: selectedTransport.gst_number || null,
          admin_transport_id: null,
          challan_metadata: challanNos,
          bilty_metadata: biltyMeta,
          total_bilties: lastSelectedData.length,
          total_amount: tAmt, total_kaat: tKaat, total_pf: tPF, total_dd: tDD,
          total_packages: tPkg, total_weight: tWt,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      setLastSavedPohonch(saved);
      setRecentKey(prev => prev + 1); // trigger refresh
      alert(`Pohonch saved as ${pohonchNumber}`);
    } catch (err) {
      console.error('Error saving pohonch:', err);
      alert('Failed to save pohonch: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ====== Challan Search Function (multi-select) ======
  const fetchChallanSuggestions = async (value) => {
    if (value.length < 1) { setChallanSuggestions([]); setShowChallanSuggestions(false); return; }
    try {
      const { data } = await supabase
        .from('challan_details')
        .select('challan_no')
        .ilike('challan_no', `%${value}%`)
        .eq('is_active', true)
        .order('challan_no')
        .limit(20);
      const results = (data || []).map(d => d.challan_no).filter(c => !selectedChallans.includes(c));
      setChallanSuggestions(results);
      setShowChallanSuggestions(results.length > 0);
    } catch (err) {
      setChallanSuggestions([]);
    }
  };

  const addChallan = (challanNo) => {
    if (!selectedChallans.includes(challanNo)) {
      setSelectedChallans(prev => [...prev, challanNo]);
    }
    setChallanSearchText('');
    setChallanSuggestions([]);
    setShowChallanSuggestions(false);
  };

  const removeChallan = (challanNo) => {
    setSelectedChallans(prev => prev.filter(c => c !== challanNo));
  };

  // ====== City Search Functions ======
  const handleCitySearchChange = async (value) => {
    setCitySearch(value);
    setSelectedCity(null);
    if (value.length < 2) { setCitySuggestions([]); setShowCitySuggestions(false); return; }
    try {
      const { data } = await supabase
        .from('cities')
        .select('id, city_name, city_code')
        .ilike('city_name', `%${value}%`)
        .order('city_name')
        .limit(15);
      setCitySuggestions(data || []);
      setShowCitySuggestions((data || []).length > 0);
    } catch (err) {
      setCitySuggestions([]);
    }
  };

  const handleSelectCity = (city) => {
    setSelectedCity(city);
    setCitySearch(city.city_name);
    setShowCitySuggestions(false);
  };

  // ====== Transport Search Functions ======
  const handleTransportSearchChange = async (value) => {
    setTransportSearch(value);
    setSelectedTransport(null);
    if (value.length < 2) { setTransportSuggestions([]); setShowSuggestions(false); return; }
    try {
      const { data } = await supabase
        .from('transports')
        .select('id, transport_name, gst_number, mob_number, city_name')
        .or(`transport_name.ilike.%${value}%,gst_number.ilike.%${value}%`)
        .order('transport_name')
        .limit(50);
      // Deduplicate: keep one entry per unique GST (or transport_name if no GST)
      const seen = new Set();
      const unique = (data || []).filter(t => {
        const key = t.gst_number ? t.gst_number.trim().toUpperCase() : `name:${t.transport_name?.trim().toUpperCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setTransportSuggestions(unique.slice(0, 15));
      setShowSuggestions(true);
    } catch (err) {
      setTransportSuggestions([]);
    }
  };

  const handleSelectTransport = (transport) => {
    setSelectedTransport(transport);
    setTransportSearch(`${transport.transport_name}${transport.gst_number ? ' | GST: ' + transport.gst_number : ''}`);
    setShowSuggestions(false);
  };

  const handleSearchBilties = async () => {
    if (!selectedTransport && selectedChallans.length === 0 && !fromChallan && !toChallan) { alert('Please select a transport or enter challan number(s)'); return; }
    try {
      setSbLoading(true);
      setSbError(null);
      setSbBilties([]);
      setSbBiltyDetails({});
      setSelectedGrNos(new Set());

      // Build cities map
      if (cities.length === 0) {
        const { data: citiesData } = await supabase.from('cities').select('id, city_name, city_code').order('city_name');
        setCities(citiesData || []);
        const cMap = {};
        (citiesData || []).forEach(c => { cMap[c.id] = c.city_name; });
        setSbCitiesMap(cMap);
      } else {
        const cMap = {};
        cities.forEach(c => { cMap[c.id] = c.city_name; });
        setSbCitiesMap(cMap);
      }

      // Find ALL transport IDs with the same GST or name (same transport, different cities)
      let allTransportIds = [];
      if (selectedTransport) {
        allTransportIds = [selectedTransport.id];
        if (selectedTransport.gst_number) {
          const { data: sameGst } = await supabase
            .from('transports')
            .select('id')
            .eq('gst_number', selectedTransport.gst_number);
          if (sameGst && sameGst.length > 0) {
            allTransportIds = sameGst.map(t => t.id);
          }
        } else if (selectedTransport.transport_name) {
          const { data: sameName } = await supabase
            .from('transports')
            .select('id')
            .eq('transport_name', selectedTransport.transport_name);
          if (sameName && sameName.length > 0) {
            allTransportIds = sameName.map(t => t.id);
          }
        }
      }

      // Fetch from bilty_wise_kaat — by transport IDs or by challan filter
      let query = supabase
        .from('bilty_wise_kaat')
        .select('*')
        .order('challan_no', { ascending: true });

      if (allTransportIds.length > 0) {
        query = query.in('transport_id', allTransportIds);
      } else if (selectedChallans.length > 0) {
        // Challan-only search (no transport selected)
        query = query.in('challan_no', selectedChallans);
      } else if (fromChallan || toChallan) {
        // Range-only search — fetch all and filter client-side
      }

      const { data: kaatData, error: kaatErr } = await query;
      if (kaatErr) throw kaatErr;

      let filteredKaat = kaatData || [];

      // Apply multi-challan filter if any challans are selected
      if (selectedChallans.length > 0) {
        const challanSet = new Set(selectedChallans);
        filteredKaat = filteredKaat.filter(k => challanSet.has(k.challan_no));
      }

      // Apply challan range filter (from/to)
      if (fromChallan || toChallan) {
        filteredKaat = filteredKaat.filter(k => {
          const challanNo = k.challan_no || '';
          const challanNum = parseInt(challanNo.replace(/\D/g, '') || '0', 10);
          const fromNum = fromChallan ? parseInt(fromChallan.replace(/\D/g, '') || '0', 10) : 0;
          const toNum = toChallan ? parseInt(toChallan.replace(/\D/g, '') || '0', 10) : Infinity;
          return challanNum >= fromNum && challanNum <= toNum;
        });
      }

      // Apply city filter (destination_city_id)
      if (selectedCity) {
        filteredKaat = filteredKaat.filter(k => k.destination_city_id === selectedCity.id);
      }

      setSbBilties(filteredKaat);

      // Fetch bilty + station details + challan destination for all gr_nos
      if (filteredKaat.length > 0) {
        const grNos = filteredKaat.map(k => k.gr_no).filter(Boolean);
        const batchSize = 200;
        const detailsMap = {};
        for (let i = 0; i < grNos.length; i += batchSize) {
          const batch = grNos.slice(i, i + batchSize);
          const [biltyRes, stationRes] = await Promise.all([
            supabase.from('bilty').select('gr_no, bilty_date, consignor_name, consignee_name, no_of_pkg, wt, total, payment_mode, delivery_type, to_city_id, from_city_id, e_way_bill').in('gr_no', batch).eq('is_active', true),
            supabase.from('station_bilty_summary').select('gr_no, created_at, consignor, consignee, no_of_packets, weight, amount, payment_status, delivery_type, station, e_way_bill').in('gr_no', batch)
          ]);
          (biltyRes.data || []).forEach(b => { detailsMap[b.gr_no] = { ...detailsMap[b.gr_no], bilty: b }; });
          (stationRes.data || []).forEach(s => { detailsMap[s.gr_no] = { ...detailsMap[s.gr_no], station: s }; });
        }
        setSbBiltyDetails(detailsMap);
      }

      // Expand all challans by default
      const expandMap = {};
      filteredKaat.forEach(k => { expandMap[k.challan_no] = true; });
      setSbExpandedChallans(expandMap);

    } catch (err) {
      console.error('Error searching bilties:', err);
      setSbError(err.message || 'Failed to search bilties');
    } finally {
      setSbLoading(false);
    }
  };

  const handleClearSbSearch = () => {
    setTransportSearch('');
    setSelectedTransport(null);
    setSelectedChallans([]);
    setChallanSearchText('');
    setCitySearch('');
    setSelectedCity(null);
    setCitySuggestions([]);
    setShowCitySuggestions(false);
    setFromChallan('');
    setToChallan('');
    setSbBilties([]);
    setSbBiltyDetails({});
    setSbError(null);
    setSelectedGrNos(new Set());
  };

  // Group search-bilties results by challan
  const sbGroupedByChallan = useMemo(() => {
    const groups = {};
    sbBilties.forEach(k => {
      const challan = k.challan_no || 'Unknown';
      if (!groups[challan]) groups[challan] = [];
      groups[challan].push(k);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });
  }, [sbBilties]);

  // Totals for search bilties
  const sbTotals = useMemo(() => {
    let totalKaat = 0, totalDD = 0, totalPF = 0, totalAmt = 0, totalWt = 0, totalPkg = 0;
    sbBilties.forEach(k => {
      const detail = sbBiltyDetails[k.gr_no];
      const bilty = detail?.bilty;
      const station = detail?.station;
      const weight = parseFloat(bilty?.wt || station?.weight || 0);
      const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
      const kaatAmt = parseFloat(k.kaat) || 0;
      const pfAmt = parseFloat(k.pf) || 0;
      const ddChrg = parseFloat(k.dd_chrg) || 0;
      const payMode = (bilty?.payment_mode || station?.payment_status || '').toUpperCase();
      const isPaid = payMode.includes('PAID');
      const amt = isPaid ? 0 : parseFloat(bilty?.total || station?.amount || 0);
      totalKaat += kaatAmt;
      totalDD += ddChrg;
      totalAmt += amt;
      totalPF += pfAmt;
      totalWt += weight;
      totalPkg += packages;
    });
    return { totalKaat, totalDD, totalPF, totalAmt, totalWt, totalPkg };
  }, [sbBilties, sbBiltyDetails]);

  const toggleSbChallan = (challan) => {
    setSbExpandedChallans(prev => ({ ...prev, [challan]: !prev[challan] }));
  };

  // ====== Selection Functions ======
  const toggleSelectBilty = (grNo) => {
    setSelectedGrNos(prev => {
      const next = new Set(prev);
      if (next.has(grNo)) next.delete(grNo);
      else next.add(grNo);
      return next;
    });
  };

  const selectAllBilties = () => {
    const allGrNos = sbBilties.map(k => k.gr_no).filter(Boolean);
    setSelectedGrNos(new Set(allGrNos));
  };

  const deselectAllBilties = () => {
    setSelectedGrNos(new Set());
  };

  const selectChallanBilties = (challanNo) => {
    const challanGrNos = sbBilties.filter(k => k.challan_no === challanNo).map(k => k.gr_no).filter(Boolean);
    setSelectedGrNos(prev => {
      const next = new Set(prev);
      const allSelected = challanGrNos.every(gr => next.has(gr));
      if (allSelected) {
        challanGrNos.forEach(gr => next.delete(gr));
      } else {
        challanGrNos.forEach(gr => next.add(gr));
      }
      return next;
    });
  };

  // ====== PDF Generation ======
  const handlePrintSelected = async () => {
    if (selectedGrNos.size === 0) {
      alert('Please select at least one bilty to print');
      return;
    }
    try {
      setGenerating(true);
      // Build data for selected bilties
      const selectedData = sbBilties
        .filter(k => selectedGrNos.has(k.gr_no))
        .map(k => {
          const detail = sbBiltyDetails[k.gr_no] || {};
          const bilty = detail.bilty;
          const station = detail.station;
          const weight = parseFloat(bilty?.wt || station?.weight || 0);
          const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
          const kaatAmt = parseFloat(k.kaat) || 0;
          const pfAmt = parseFloat(k.pf) || 0;
          const ddChrg = parseFloat(k.dd_chrg) || 0;
          const payMode = (bilty?.payment_mode || station?.payment_status || '').toUpperCase();
          const isPaid = payMode.includes('PAID');
          const amt = isPaid ? 0 : parseFloat(bilty?.total || station?.amount || 0);

          const destName = resolveDestination(k, bilty, station, sbCitiesMap);
          
          let fromName = '-';
          if (bilty?.from_city_id && sbCitiesMap[bilty.from_city_id]) fromName = sbCitiesMap[bilty.from_city_id];

          const pohonchBilty = k.pohonch_no && k.bilty_number ? `${k.pohonch_no}/${k.bilty_number}` : k.pohonch_no || k.bilty_number || '-';

          const ewb = bilty?.e_way_bill || station?.e_way_bill || '';

          return {
            gr_no: k.gr_no,
            challan_no: k.challan_no,
            pohonch_bilty: pohonchBilty,
            pohonch_no: k.pohonch_no || '',
            bilty_number: k.bilty_number || '',
            consignor: bilty?.consignor_name || station?.consignor || '-',
            consignee: bilty?.consignee_name || station?.consignee || '-',
            destination: destName,
            from_city: fromName,
            packages,
            weight,
            amount: amt,
            kaat: kaatAmt,
            kaat_rate: parseFloat(k.actual_kaat_rate) || 0,
            dd: ddChrg,
            pf: pfAmt,
            payment_mode: bilty?.payment_mode || station?.payment_status || '-',
            is_paid: isPaid,
            date: bilty?.bilty_date || station?.created_at || null,
            e_way_bill: ewb,
          };
        });

      const url = generatePohonchPDF(selectedData, selectedTransport, true);
      setPdfUrl(url);
      setShowPreview(true);
      setLastSelectedData(selectedData);
      setLastSavedPohonch(null); // reset for new preview
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      const selectedData = sbBilties
        .filter(k => selectedGrNos.has(k.gr_no))
        .map(k => {
          const detail = sbBiltyDetails[k.gr_no] || {};
          const bilty = detail.bilty;
          const station = detail.station;
          const weight = parseFloat(bilty?.wt || station?.weight || 0);
          const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
          const kaatAmt = parseFloat(k.kaat) || 0;
          const pfAmt = parseFloat(k.pf) || 0;
          const ddChrg = parseFloat(k.dd_chrg) || 0;
          const payMode = (bilty?.payment_mode || station?.payment_status || '').toUpperCase();
          const isPaid = payMode.includes('PAID');
          const amt = isPaid ? 0 : parseFloat(bilty?.total || station?.amount || 0);

          const destName = resolveDestination(k, bilty, station, sbCitiesMap);
          
          let fromName = '-';
          if (bilty?.from_city_id && sbCitiesMap[bilty.from_city_id]) fromName = sbCitiesMap[bilty.from_city_id];

          const pohonchBilty = k.pohonch_no && k.bilty_number ? `${k.pohonch_no}/${k.bilty_number}` : k.pohonch_no || k.bilty_number || '-';

          const ewb = detail.bilty?.e_way_bill || detail.station?.e_way_bill || '';

          return {
            gr_no: k.gr_no,
            challan_no: k.challan_no,
            pohonch_bilty: pohonchBilty,
            pohonch_no: k.pohonch_no || '',
            bilty_number: k.bilty_number || '',
            consignor: bilty?.consignor_name || station?.consignor || '-',
            consignee: bilty?.consignee_name || station?.consignee || '-',
            destination: destName,
            from_city: fromName,
            packages,
            weight,
            amount: amt,
            kaat: kaatAmt,
            kaat_rate: parseFloat(k.actual_kaat_rate) || 0,
            dd: ddChrg,
            pf: pfAmt,
            payment_mode: bilty?.payment_mode || station?.payment_status || '-',
            is_paid: isPaid,
            date: bilty?.bilty_date || station?.created_at || null,
            e_way_bill: ewb,
          };
        });

      generatePohonchPDF(selectedData, selectedTransport, false);
      alert('PDF downloaded successfully!');
    } catch (err) {
      alert('Failed to download PDF: ' + err.message);
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    setLastSelectedData(null);
    setLastSavedPohonch(null);
    if (pdfUrl) { URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-emerald-50">
      <Navbar />
      
      <div className="w-full mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/transit-finance')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-900 via-emerald-800 to-teal-800 bg-clip-text text-transparent">
                  Pohonch Print
                </h1>
                <p className="text-gray-600 mt-1">Search bilties by transport and print pohonch slips</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/transit-finance/pohonch-print/pohonch-list')}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:from-teal-700 hover:to-emerald-700 transition-all"
            >
              <FileText className="w-4 h-4" /> Pohonch List
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Search Filters */}
          <div className="bg-white rounded-xl shadow-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-teal-600" />
              <h2 className="text-lg font-bold text-gray-800">Search Bilties by Transport</h2>
            </div>
            {/* Row 1: Transport + City */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              {/* Transport Search with Autocomplete */}
              <div className="md:col-span-2 relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Transport Name / GST</label>
                <input
                  type="text"
                  value={transportSearch}
                  onChange={(e) => handleTransportSearchChange(e.target.value)}
                  onFocus={() => transportSuggestions.length > 0 && setShowSuggestions(true)}
                  onKeyDown={(e) => e.key === 'Enter' && selectedTransport && handleSearchBilties()}
                  placeholder="Type transport name or GST..."
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                    selectedTransport ? 'border-teal-400 bg-teal-50' : 'border-teal-200 bg-teal-50/30'
                  }`}
                />
                {selectedTransport && (
                  <div className="mt-1 text-xs text-teal-700 font-medium">
                    <Check className="w-3 h-3 inline mr-1" />
                    {selectedTransport.transport_name} {selectedTransport.gst_number ? `| GST: ${selectedTransport.gst_number}` : ''}
                  </div>
                )}
                {/* Suggestions dropdown */}
                {showSuggestions && transportSuggestions.length > 0 && (
                  <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {transportSuggestions.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTransport(t)}
                        className={`w-full text-left px-3 py-2 hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-0 ${
                          selectedTransport?.id === t.id ? 'bg-teal-50' : ''
                        }`}
                      >
                        <div className="font-semibold text-sm text-gray-800">{t.transport_name}</div>
                        <div className="text-xs text-gray-500">
                          {t.gst_number && <span className="mr-2">GST: {t.gst_number}</span>}
                          {t.mob_number && <span>Mob: {t.mob_number}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Destination City Search */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Destination City</label>
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => handleCitySearchChange(e.target.value)}
                  onFocus={() => citySuggestions.length > 0 && setShowCitySuggestions(true)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchBilties()}
                  placeholder="Type city name..."
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                    selectedCity ? 'border-teal-400 bg-teal-50' : 'border-teal-200 bg-teal-50/30'
                  }`}
                />
                {selectedCity && (
                  <div className="mt-1 text-xs text-teal-700 font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {selectedCity.city_name}
                    <button onClick={() => { setSelectedCity(null); setCitySearch(''); }} className="ml-1 text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                  </div>
                )}
                {showCitySuggestions && citySuggestions.length > 0 && (
                  <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {citySuggestions.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCity(c)}
                        className={`w-full text-left px-3 py-2 hover:bg-teal-50 transition-colors border-b border-gray-100 last:border-0 ${
                          selectedCity?.id === c.id ? 'bg-teal-50' : ''
                        }`}
                      >
                        <div className="font-semibold text-sm text-gray-800">{c.city_name}</div>
                        {c.city_code && <div className="text-xs text-gray-500">Code: {c.city_code}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Multi Challan Select */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Select Challans (optional)</label>
                <input
                  type="text"
                  value={challanSearchText}
                  onChange={(e) => { setChallanSearchText(e.target.value); fetchChallanSuggestions(e.target.value); }}
                  onFocus={() => { if (challanSuggestions.length > 0) setShowChallanSuggestions(true); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (challanSuggestions.length > 0) addChallan(challanSuggestions[0]);
                      else handleSearchBilties();
                    }
                    if (e.key === 'Backspace' && challanSearchText === '' && selectedChallans.length > 0) {
                      removeChallan(selectedChallans[selectedChallans.length - 1]);
                    }
                  }}
                  placeholder={selectedChallans.length > 0 ? 'Add more...' : 'Type challan no...'}
                  className="w-full px-3 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50/30 font-mono text-sm"
                />
                {showChallanSuggestions && challanSuggestions.length > 0 && (
                  <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {challanSuggestions.map((c) => (
                      <button key={c} onClick={() => addChallan(c)} className="w-full text-left px-3 py-1.5 hover:bg-teal-50 text-sm font-mono border-b border-gray-50 last:border-0 flex items-center gap-2">
                        <Hash className="w-3 h-3 text-teal-500" /> {c}
                      </button>
                    ))}
                  </div>
                )}
                {/* Selected challan chips */}
                {selectedChallans.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {selectedChallans.map(c => (
                      <span key={c} className="inline-flex items-center gap-0.5 bg-teal-100 text-teal-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {c}
                        <button onClick={() => removeChallan(c)} className="ml-0.5 hover:text-red-600 transition-colors"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                    {selectedChallans.length > 1 && (
                      <button onClick={() => setSelectedChallans([])} className="text-xs text-red-500 hover:text-red-700 font-medium px-1">Clear all</button>
                    )}
                  </div>
                )}
              </div>
              {/* From / To Challan Range */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Challan Range</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={fromChallan}
                    onChange={(e) => setFromChallan(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchBilties()}
                    placeholder="From"
                    className="w-1/2 px-2 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50/30 font-mono text-sm"
                  />
                  <input
                    type="text"
                    value={toChallan}
                    onChange={(e) => setToChallan(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchBilties()}
                    placeholder="To"
                    className="w-1/2 px-2 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50/30 font-mono text-sm"
                  />
                </div>
                {(fromChallan || toChallan) && (
                  <div className="mt-1 text-xs text-teal-700 font-medium">
                    Range: {fromChallan || '...'} → {toChallan || '...'}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSearchBilties}
                  disabled={(!selectedTransport && selectedChallans.length === 0 && !fromChallan && !toChallan) || sbLoading}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-bold text-sm hover:bg-teal-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sbLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {sbLoading ? 'Searching...' : 'Search'}
                </button>
                {(transportSearch || selectedChallans.length > 0 || selectedCity || fromChallan || toChallan) && (
                  <button
                    onClick={handleClearSbSearch}
                    className="px-3 py-2 bg-red-100 text-red-600 rounded-lg font-semibold text-sm hover:bg-red-200 transition-colors"
                    title="Clear"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error */}
          {sbError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" /> {sbError}
            </div>
          )}

          {/* Results Summary + Print Button */}
          {sbBilties.length > 0 && (
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl shadow-lg p-4 border border-teal-100">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-teal-600 p-2 rounded-lg">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-800">
                      {selectedTransport?.transport_name}
                      {selectedTransport?.gst_number && <span className="text-gray-500 font-normal text-sm ml-2">GST: {selectedTransport.gst_number}</span>}
                    </div>
                    <div className="text-sm text-gray-600">
                      {sbBilties.length} bilties in {sbGroupedByChallan.length} challans
                      {selectedChallans.length > 0 && ` | Challans: ${selectedChallans.join(', ')}`}
                      {selectedCity && ` | City: ${selectedCity.city_name}`}
                      {(fromChallan || toChallan) && ` | Range: ${fromChallan || '...'} → ${toChallan || '...'}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-teal-200">
                    <span className="text-gray-500">Pkg:</span> <span className="font-bold text-gray-800">{Math.round(sbTotals.totalPkg)}</span>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-teal-200">
                    <span className="text-gray-500">Wt:</span> <span className="font-bold text-gray-800">{sbTotals.totalWt.toFixed(1)}</span>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-teal-200">
                    <span className="text-gray-500">Amt:</span> <span className="font-bold text-gray-800">&#8377;{sbTotals.totalAmt.toFixed(0)}</span>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-teal-200">
                    <span className="text-gray-500">Kaat:</span> <span className="font-bold text-emerald-700">&#8377;{sbTotals.totalKaat.toFixed(0)}</span>
                  </div>
                  {sbTotals.totalDD > 0 && (
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-red-200">
                      <span className="text-gray-500">DD:</span> <span className="font-bold text-red-600">&#8377;{sbTotals.totalDD.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="bg-teal-600 text-white px-3 py-1.5 rounded-lg font-bold">
                    PF: &#8377;{sbTotals.totalPF.toFixed(0)}
                  </div>
                </div>
              </div>
              {/* Selection Controls & Print */}
              <div className="mt-3 pt-3 border-t border-teal-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={selectAllBilties} className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 px-2 py-1 rounded hover:bg-teal-100 transition-colors">
                    <CheckSquare className="w-3.5 h-3.5" /> Select All
                  </button>
                  <button onClick={deselectAllBilties} className="text-xs font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                    <Square className="w-3.5 h-3.5" /> Deselect All
                  </button>
                  <span className="text-xs text-gray-500">
                    {selectedGrNos.size} of {sbBilties.length} selected
                  </span>
                </div>
                <button
                  onClick={handlePrintSelected}
                  disabled={selectedGrNos.size === 0 || generating}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  {generating ? 'Generating...' : `Print Pohonch (${selectedGrNos.size})`}
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {sbLoading && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-teal-600 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Searching bilties for {selectedTransport?.transport_name}...</p>
            </div>
          )}

          {/* Results Table — grouped by challan */}
          {!sbLoading && sbBilties.length > 0 && sbGroupedByChallan.map(([challanNo, kaatItems]) => {
            const isExpanded = sbExpandedChallans[challanNo] !== false;
            const challanGrNos = kaatItems.map(k => k.gr_no).filter(Boolean);
            const allChallanSelected = challanGrNos.length > 0 && challanGrNos.every(gr => selectedGrNos.has(gr));
            const someChallanSelected = challanGrNos.some(gr => selectedGrNos.has(gr));
            // Challan subtotals
            let cPkg = 0, cWt = 0, cAmt = 0, cKaat = 0, cDD = 0, cPF = 0;
            kaatItems.forEach(k => {
              const detail = sbBiltyDetails[k.gr_no];
              const bilty = detail?.bilty;
              const station = detail?.station;
              const weight = parseFloat(bilty?.wt || station?.weight || 0);
              const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
              const kaatAmt = parseFloat(k.kaat) || 0;
              const pfAmt = parseFloat(k.pf) || 0;
              const ddChrg = parseFloat(k.dd_chrg) || 0;
              const payMode = (bilty?.payment_mode || station?.payment_status || '').toUpperCase();
              const isPaid = payMode.includes('PAID');
              const amt = isPaid ? 0 : parseFloat(bilty?.total || station?.amount || 0);
              cPkg += packages; cWt += weight; cAmt += amt; cKaat += kaatAmt; cDD += ddChrg; cPF += pfAmt;
            });

            return (
              <div key={challanNo} className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Challan Header */}
                <div className="flex items-center bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
                  <button
                    onClick={(e) => { e.stopPropagation(); selectChallanBilties(challanNo); }}
                    className="px-3 py-3 hover:bg-white/10 transition-colors"
                    title={allChallanSelected ? 'Deselect all in challan' : 'Select all in challan'}
                  >
                    {allChallanSelected ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : someChallanSelected ? (
                      <div className="w-4 h-4 border-2 border-white rounded-sm bg-white/30" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleSbChallan(challanNo)}
                    className="flex-1 flex items-center justify-between px-2 py-3 hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <Hash className="w-4 h-4" />
                      <span className="font-bold">Challan {challanNo}</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-medium">{kaatItems.length} bilties</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium">
                      <span>Pkg: {Math.round(cPkg)}</span>
                      <span>Wt: {cWt.toFixed(1)}</span>
                      <span>Amt: &#8377;{cAmt.toFixed(0)}</span>
                      <span>Kaat: &#8377;{cKaat.toFixed(0)}</span>
                      {cDD > 0 && <span className="text-red-200">DD: -&#8377;{cDD.toFixed(0)}</span>}
                      <span className="bg-white/20 px-2 py-0.5 rounded-full font-bold">PF: &#8377;{cPF.toFixed(0)}</span>
                    </div>
                  </button>
                </div>

                {/* Bilties Table */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-2 py-2 text-center text-xs font-bold text-gray-500 uppercase w-8"></th>
                          <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                          <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 uppercase">GR No.</th>
                          <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 uppercase">EWB</th>
                          <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 uppercase">P/B No.</th>
                          <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                          <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 uppercase">Consignor</th>
                          <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 uppercase">Consignee</th>
                          <th className="px-2 py-2 text-left text-xs font-bold text-gray-500 uppercase">Dest</th>
                          <th className="px-2 py-2 text-center text-xs font-bold text-gray-500 uppercase">Pay</th>
                          <th className="px-2 py-2 text-center text-xs font-bold text-gray-500 uppercase">Pkg</th>
                          <th className="px-2 py-2 text-right text-xs font-bold text-gray-500 uppercase">Wt</th>
                          <th className="px-2 py-2 text-right text-xs font-bold text-gray-500 uppercase">Amt</th>
                          <th className="px-2 py-2 text-right text-xs font-bold text-gray-500 uppercase">DD</th>
                          <th className="px-2 py-2 text-right text-xs font-bold text-gray-500 uppercase">Kaat</th>
                          <th className="px-2 py-2 text-right text-xs font-bold text-gray-500 uppercase">Rate</th>
                          <th className="px-2 py-2 text-right text-xs font-bold text-gray-500 uppercase">PF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kaatItems.map((k, idx) => {
                          const detail = sbBiltyDetails[k.gr_no] || {};
                          const bilty = detail.bilty;
                          const station = detail.station;
                          const weight = parseFloat(bilty?.wt || station?.weight || 0);
                          const packages = parseFloat(bilty?.no_of_pkg || station?.no_of_packets || 0);
                          const kaatAmt = parseFloat(k.kaat) || 0;
                          const pfAmt = parseFloat(k.pf) || 0;
                          const actualKaatRate = parseFloat(k.actual_kaat_rate) || 0;
                          const ddChrg = parseFloat(k.dd_chrg) || 0;
                          const payMode = (bilty?.payment_mode || station?.payment_status || '').toUpperCase();
                          const isPaid = payMode.includes('PAID');
                          const amt = isPaid ? 0 : parseFloat(bilty?.total || station?.amount || 0);
                          const pf = pfAmt;
                          const payDisplay = bilty?.payment_mode?.toUpperCase() || station?.payment_status?.toUpperCase() || '-';
                          const ddSuffix = (bilty?.delivery_type || station?.delivery_type || '').toLowerCase().includes('door') ? '/DD' : '';
                          const dateStr = bilty?.bilty_date ? format(new Date(bilty.bilty_date), 'dd/MM/yy') : station?.created_at ? format(new Date(station.created_at), 'dd/MM/yy') : '-';

                          const destName = resolveDestination(k, bilty, station, sbCitiesMap);

                          const rateDisplay = actualKaatRate > 0 ? `₹${actualKaatRate}` : '-';

                          const pohonchBilty = k.pohonch_no && k.bilty_number ? `${k.pohonch_no}/${k.bilty_number}` : k.pohonch_no || k.bilty_number || '-';
                          const isSelected = selectedGrNos.has(k.gr_no);
                          const ewb = bilty?.e_way_bill || station?.e_way_bill || '';

                          return (
                            <tr 
                              key={k.gr_no || idx} 
                              onClick={() => toggleSelectBilty(k.gr_no)}
                              className={`border-b border-gray-100 cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'bg-teal-50 hover:bg-teal-100' 
                                  : isPaid 
                                    ? 'bg-yellow-50/50 hover:bg-yellow-50' 
                                    : idx % 2 === 0 
                                      ? 'bg-white hover:bg-gray-50' 
                                      : 'bg-gray-50/30 hover:bg-gray-100'
                              }`}
                            >
                              <td className="px-2 py-2 text-center">
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-teal-600 mx-auto" />
                                ) : (
                                  <Square className="w-4 h-4 text-gray-300 mx-auto" />
                                )}
                              </td>
                              <td className="px-2 py-2 text-gray-500 font-mono text-xs">{idx + 1}</td>
                              <td className="px-2 py-2 font-mono font-semibold text-gray-800">
                                {k.gr_no || '-'}
                                {ewb && <span className="text-green-600 font-bold ml-0.5 text-[10px]">(E)</span>}
                              </td>
                              <td className="px-2 py-2 text-[10px] font-mono text-gray-500 max-w-[80px] truncate" title={ewb || '-'}>{ewb || '-'}</td>
                              <td className="px-2 py-2 text-gray-700 text-xs">{pohonchBilty}</td>
                              <td className="px-2 py-2 text-gray-600 text-xs">{dateStr}</td>
                              <td className="px-2 py-2 text-gray-700 truncate max-w-[120px]" title={bilty?.consignor_name || station?.consignor || '-'}>{(bilty?.consignor_name || station?.consignor || '-').substring(0, 15)}</td>
                              <td className="px-2 py-2 text-gray-700 truncate max-w-[120px]" title={bilty?.consignee_name || station?.consignee || '-'}>{(bilty?.consignee_name || station?.consignee || '-').substring(0, 15)}</td>
                              <td className="px-2 py-2 text-gray-600 text-xs">{destName.substring(0, 12)}</td>
                              <td className="px-2 py-2 text-center">
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                                  isPaid ? 'bg-yellow-100 text-yellow-700' : payMode.includes('TO PAY') || payMode.includes('TO-PAY') ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {payDisplay}{ddSuffix}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center font-medium text-gray-900">{packages}</td>
                              <td className="px-2 py-2 text-right font-medium text-gray-900">{weight.toFixed(1)}</td>
                              <td className="px-2 py-2 text-right font-medium text-gray-900">{isPaid ? <span className="text-yellow-600 text-xs">PAID</span> : `₹${amt.toFixed(0)}`}</td>
                              <td className="px-2 py-2 text-right">{ddChrg > 0 ? <span className="text-red-600 font-medium">-₹{ddChrg.toFixed(0)}</span> : '-'}</td>
                              <td className="px-2 py-2 text-right font-medium text-emerald-700">₹{kaatAmt.toFixed(0)}</td>
                              <td className="px-2 py-2 text-right text-xs text-gray-500">{rateDisplay}</td>
                              <td className="px-2 py-2 text-right font-bold text-teal-700">₹{pf.toFixed(0)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty state */}
          {!sbLoading && sbBilties.length === 0 && (selectedTransport || selectedChallans.length > 0 || fromChallan || toChallan) && !sbError && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No bilties found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting the challan range, city filter, or search a different transport</p>
            </div>
          )}

          {/* Initial state */}
          {!sbLoading && sbBilties.length === 0 && !selectedTransport && selectedChallans.length === 0 && !fromChallan && !toChallan && !sbError && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Truck className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Search for a transport to view bilties</p>
              <p className="text-gray-400 text-sm mt-1">Type transport name or GST number, select from suggestions, then click Search</p>
            </div>
          )}

          {/* ====== Recent Pohonch Section ====== */}
          <RecentPohonch key={recentKey} onRefreshNeeded={() => setRecentKey(prev => prev + 1)} />
        </div>

        {/* PDF Preview Modal */}
        {showPreview && pdfUrl && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-emerald-50">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Pohonch Print Preview</h3>
                  <p className="text-sm text-gray-500">
                    {selectedGrNos.size} bilties selected
                    {lastSavedPohonch && (
                      <span className="ml-2 inline-flex items-center gap-1 text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full text-xs">
                        <Save className="w-3 h-3" /> Saved as {lastSavedPohonch.pohonch_number}
                      </span>
                    )}
                    {saving && <span className="ml-2 text-amber-600 text-xs"><Loader2 className="w-3 h-3 inline animate-spin mr-1" />Saving...</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSavePohonch}
                    disabled={saving || lastSavedPohonch}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2 ${
                      lastSavedPohonch 
                        ? 'bg-green-100 text-green-700 cursor-default' 
                        : saving 
                          ? 'bg-amber-100 text-amber-700 cursor-wait'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                    }`}
                  >
                    {lastSavedPohonch ? (
                      <><Check className="w-4 h-4" /> Saved ({lastSavedPohonch.pohonch_number})</>
                    ) : saving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="w-4 h-4" /> Save Pohonch</>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" /> Download PDF
                  </button>
                  <button
                    onClick={closePreview}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              {/* PDF Viewer */}
              <div className="flex-1 p-4 bg-gray-100">
                <iframe
                  src={pdfUrl}
                  className="w-full h-full rounded-lg border border-gray-200"
                  title="Pohonch Print Preview"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
