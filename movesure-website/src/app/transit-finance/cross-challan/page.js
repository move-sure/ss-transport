'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../utils/auth';
import supabase from '../../utils/supabase';
import Navbar from '../../../components/dashboard/navbar';
import { generatePohonchPDF } from '../../../components/transit-finance/pohonch-print/pohonch-pdf-generator';
import RecentPohonch from '../../../components/transit-finance/pohonch-print/recent-pohonch';
import SearchPanel from '../../../components/transit-finance/cross-challan/SearchPanel';
import ResultsSummaryBar from '../../../components/transit-finance/cross-challan/ResultsSummaryBar';
import BiltyResultsTable from '../../../components/transit-finance/cross-challan/BiltyResultsTable';
import CreatePohonchModal from '../../../components/transit-finance/cross-challan/CreatePohonchModal';
import PdfPreviewModal from '../../../components/transit-finance/cross-challan/PdfPreviewModal';
import EditPohonchModal from '../../../components/transit-finance/cross-challan/EditPohonchModal';
import { Loader2, AlertCircle, ArrowLeft, Package, Truck, FileText } from 'lucide-react';

export default function PohonchPrintPage() {
  const router = useRouter();
  const { user, requireAuth, token } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [searchMode, setSearchMode] = useState('transport');
  const [sbLoading, setSbLoading] = useState(false);
  const [sbBilties, setSbBilties] = useState([]);
  const [sbBiltyDetails, setSbBiltyDetails] = useState({});
  const [sbCitiesMap, setSbCitiesMap] = useState({});
  const [sbCityCodeMap, setSbCityCodeMap] = useState({});
  const [sbError, setSbError] = useState(null);
  const [sbExpandedChallans, setSbExpandedChallans] = useState({});
  const [cities, setCities] = useState([]);
  const [selectedGrNos, setSelectedGrNos] = useState(new Set());

  const [transportSearch, setTransportSearch] = useState('');
  const [transportSuggestions, setTransportSuggestions] = useState([]);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [citySearch, setCitySearch] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const [challanSearchText, setChallanSearchText] = useState('');
  const [challanSuggestions, setChallanSuggestions] = useState([]);
  const [showChallanSuggestions, setShowChallanSuggestions] = useState(false);
  const [selectedChallans, setSelectedChallans] = useState([]);
  const [fromChallan, setFromChallan] = useState('');
  const [toChallan, setToChallan] = useState('');

  const [grSearchInput, setGrSearchInput] = useState('');
  const [grNosToSearch, setGrNosToSearch] = useState([]);
  const [pohonchSearch, setPohonchSearch] = useState('');

  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedPohonch, setLastSavedPohonch] = useState(null);
  const [lastSelectedData, setLastSelectedData] = useState(null);
  const [recentKey, setRecentKey] = useState(0);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createPrefix, setCreatePrefix] = useState('');
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);

  // Edit Pohonch modal
  const [showEditPohonch, setShowEditPohonch] = useState(false);
  const [editPohonchNo, setEditPohonchNo] = useState(null);
  const handleOpenEditPohonch = (pohonchNo) => { setEditPohonchNo(pohonchNo); setShowEditPohonch(true); };

  // Crossing challan map: gr_no -> pohonch_number (from pohonch table)
  const [crossChallanMap, setCrossChallanMap] = useState({});
  const fetchCrossChallanData = useCallback(async (grNos) => {
    if (!grNos?.length) return;
    try {
      const { data } = await supabase.from('pohonch').select('pohonch_number, bilty_metadata').eq('is_active', true);
      if (data) {
        const ccMap = {};
        data.forEach(p => {
          const bilties = Array.isArray(p.bilty_metadata) ? p.bilty_metadata : [];
          bilties.forEach(b => { if (b.gr_no && grNos.includes(b.gr_no)) ccMap[b.gr_no] = p.pohonch_number; });
        });
        setCrossChallanMap(ccMap);
      }
    } catch (e) { console.error('Cross challan fetch error:', e); }
  }, []);

  useEffect(() => { setMounted(true); }, []);

  const resolveDestination = useCallback((kaatItem, bilty, station, citiesMap) => {
    if (kaatItem?.destination_city_id && citiesMap[kaatItem.destination_city_id]) return citiesMap[kaatItem.destination_city_id];
    if (bilty?.to_city_id && citiesMap[bilty.to_city_id]) return citiesMap[bilty.to_city_id];
    if (station?.station && station.station !== '-') return station.station;
    return '-';
  }, []);

  const resolveDestinationCode = useCallback((kaatItem, bilty, station, codeMap) => {
    if (kaatItem?.destination_city_id && codeMap[kaatItem.destination_city_id]) return codeMap[kaatItem.destination_city_id];
    if (bilty?.to_city_id && codeMap[bilty.to_city_id]) return codeMap[bilty.to_city_id];
    return null;
  }, []);

  const buildCitiesMap = async () => {
    if (cities.length > 0) {
      const cMap = {}, ccMap = {};
      cities.forEach(c => { cMap[c.id] = c.city_name; ccMap[c.id] = c.city_code || c.city_name; });
      setSbCitiesMap(cMap); setSbCityCodeMap(ccMap); return;
    }
    const { data } = await supabase.from('cities').select('id, city_name, city_code').order('city_name');
    setCities(data || []);
    const cMap = {}, ccMap = {};
    (data || []).forEach(c => { cMap[c.id] = c.city_name; ccMap[c.id] = c.city_code || c.city_name; });
    setSbCitiesMap(cMap); setSbCityCodeMap(ccMap);
  };

  const fetchBiltyDetails = async (filteredKaat) => {
    if (!filteredKaat.length) return;
    const grNos = filteredKaat.map(k => k.gr_no).filter(Boolean);
    const detailsMap = {};
    for (let i = 0; i < grNos.length; i += 200) {
      const batch = grNos.slice(i, i + 200);
      const [biltyRes, stationRes] = await Promise.all([
        supabase.from('bilty').select('gr_no,bilty_date,consignor_name,consignee_name,no_of_pkg,wt,total,payment_mode,delivery_type,to_city_id,from_city_id,e_way_bill').in('gr_no', batch).eq('is_active', true),
        supabase.from('station_bilty_summary').select('gr_no,created_at,consignor,consignee,no_of_packets,weight,amount,payment_status,delivery_type,station,e_way_bill').in('gr_no', batch),
      ]);
      (biltyRes.data || []).forEach(b => { detailsMap[b.gr_no] = { ...detailsMap[b.gr_no], bilty: b }; });
      (stationRes.data || []).forEach(s => { detailsMap[s.gr_no] = { ...detailsMap[s.gr_no], station: s }; });
    }
    setSbBiltyDetails(detailsMap);
  };

  const generatePohonchPrefix = (transportName, gstNumber) => {
    const skipWords = ['AND','&','THE','OF','PVT','LTD','PRIVATE','LIMITED','CO','COMPANY','CORPORATION','ENTERPRISE','ENTERPRISES','TRANSPORT','TRANSPORTS','LOGISTICS'];
    const words = (transportName || 'TRANSPORT').trim().split(/\s+/).filter(w => w.length > 0);
    let initials = words.filter(w => !skipWords.includes(w.toUpperCase())).map(w => w[0].toUpperCase()).join('').substring(0, 3);
    if (!initials.length) initials = (transportName || 'POH').substring(0, 3).toUpperCase();
    return initials + (gstNumber ? gstNumber.slice(-4).toUpperCase() : '');
  };

  const detectLastUsedPrefix = (n) => {
    if (!n) return null;
    const m = n.match(/^([A-Za-z]+)(\d+)$/);
    return m ? { prefix: m[1], num: parseInt(m[2], 10) } : null;
  };

  const fetchChallanSuggestions = async (value) => {
    if (value.length < 1) { setChallanSuggestions([]); setShowChallanSuggestions(false); return; }
    const { data } = await supabase.from('challan_details').select('challan_no').ilike('challan_no', `%${value}%`).eq('is_active', true).order('challan_no').limit(20);
    const results = (data || []).map(d => d.challan_no).filter(c => !selectedChallans.includes(c));
    setChallanSuggestions(results); setShowChallanSuggestions(results.length > 0);
  };
  const addChallan = (c) => { if (!selectedChallans.includes(c)) setSelectedChallans(prev => [...prev, c]); setChallanSearchText(''); setChallanSuggestions([]); setShowChallanSuggestions(false); };
  const removeChallan = (c) => setSelectedChallans(prev => prev.filter(x => x !== c));

  const handleCitySearchChange = async (value) => {
    setCitySearch(value); setSelectedCity(null);
    if (value.length < 2) { setCitySuggestions([]); setShowCitySuggestions(false); return; }
    const { data } = await supabase.from('cities').select('id,city_name,city_code').ilike('city_name', `%${value}%`).order('city_name').limit(15);
    setCitySuggestions(data || []); setShowCitySuggestions((data || []).length > 0);
  };
  const handleSelectCity = (city) => { setSelectedCity(city); setCitySearch(city.city_name); setShowCitySuggestions(false); };

  const handleTransportSearchChange = async (value) => {
    setTransportSearch(value); setSelectedTransport(null);
    if (value.length < 2) { setTransportSuggestions([]); setShowSuggestions(false); return; }
    const { data } = await supabase.from('transports').select('id,transport_name,gst_number,mob_number,city_name').or(`transport_name.ilike.%${value}%,gst_number.ilike.%${value}%`).order('transport_name').limit(50);
    const seen = new Set();
    const unique = (data || []).filter(t => { const k = t.gst_number ? t.gst_number.trim().toUpperCase() : `name:${t.transport_name?.trim().toUpperCase()}`; if (seen.has(k)) return false; seen.add(k); return true; });
    setTransportSuggestions(unique.slice(0, 15)); setShowSuggestions(true);
  };
  const handleSelectTransport = (transport) => { setSelectedTransport(transport); setTransportSearch(`${transport.transport_name}${transport.gst_number ? ' | GST: ' + transport.gst_number : ''}`); setShowSuggestions(false); };

  const handleSearchBilties = async () => {
    if (!selectedTransport && !selectedChallans.length && !fromChallan && !toChallan) { alert('Please select a transport or enter challan number(s)'); return; }
    try {
      setSbLoading(true); setSbError(null); setSbBilties([]); setSbBiltyDetails({}); setSelectedGrNos(new Set());
      await buildCitiesMap();
      let allTransportIds = [];
      if (selectedTransport) {
        allTransportIds = [selectedTransport.id];
        if (selectedTransport.gst_number) { const { data } = await supabase.from('transports').select('id').eq('gst_number', selectedTransport.gst_number); if (data?.length) allTransportIds = data.map(t => t.id); }
        else { const { data } = await supabase.from('transports').select('id').eq('transport_name', selectedTransport.transport_name); if (data?.length) allTransportIds = data.map(t => t.id); }
      }
      let query = supabase.from('bilty_wise_kaat').select('*').order('challan_no', { ascending: true });
      if (allTransportIds.length) query = query.in('transport_id', allTransportIds);
      else if (selectedChallans.length) query = query.in('challan_no', selectedChallans);
      const { data: kaatData, error: kaatErr } = await query;
      if (kaatErr) throw kaatErr;
      let f = kaatData || [];
      if (selectedChallans.length) { const s = new Set(selectedChallans); f = f.filter(k => s.has(k.challan_no)); }
      if (fromChallan || toChallan) {
        f = f.filter(k => { const n = parseInt((k.challan_no || '').replace(/\D/g, '') || '0', 10); const from = fromChallan ? parseInt(fromChallan.replace(/\D/g, '') || '0', 10) : 0; const to = toChallan ? parseInt(toChallan.replace(/\D/g, '') || '0', 10) : Infinity; return n >= from && n <= to; });
      }
      if (selectedCity) f = f.filter(k => k.destination_city_id === selectedCity.id);
      setSbBilties(f); await fetchBiltyDetails(f);
      const em = {}; f.forEach(k => { em[k.challan_no] = true; }); setSbExpandedChallans(em);
      fetchCrossChallanData(f.map(k => k.gr_no).filter(Boolean));
    } catch (err) { setSbError(err.message || 'Failed to search'); } finally { setSbLoading(false); }
  };

  const addGrToSearch = (raw) => { const parts = raw.split(/[\s,;]+/).map(s => s.trim().toUpperCase()).filter(s => s.length > 0); setGrNosToSearch(prev => { const next = [...prev]; parts.forEach(p => { if (!next.includes(p)) next.push(p); }); return next; }); setGrSearchInput(''); };
  const removeGrFromSearch = (gr) => setGrNosToSearch(prev => prev.filter(g => g !== gr));

  const handleSearchByGrNos = async () => {
    if (!grNosToSearch.length) { alert('Please enter at least one GR number'); return; }
    try {
      setSbLoading(true); setSbError(null); setSbBilties([]); setSbBiltyDetails({}); setSelectedGrNos(new Set());
      await buildCitiesMap();
      const { data: kaatData, error } = await supabase.from('bilty_wise_kaat').select('*').in('gr_no', grNosToSearch).order('challan_no', { ascending: true });
      if (error) throw error;
      const f = kaatData || [];
      setSbBilties(f);
      if (f.length && f[0].transport_id && !selectedTransport) {
        const { data: tData } = await supabase.from('transports').select('id,transport_name,gst_number,mob_number,city_name').eq('id', f[0].transport_id).limit(1);
        if (tData?.length) { setSelectedTransport(tData[0]); setTransportSearch(`${tData[0].transport_name}${tData[0].gst_number ? ' | GST: ' + tData[0].gst_number : ''}`); }
      }
      await fetchBiltyDetails(f);
      const em = {}; f.forEach(k => { em[k.challan_no] = true; }); setSbExpandedChallans(em);
      fetchCrossChallanData(f.map(k => k.gr_no).filter(Boolean));
      const found = new Set(f.map(k => k.gr_no));
      const notFound = grNosToSearch.filter(gr => !found.has(gr));
      if (notFound.length) setSbError(`${notFound.length} GR(s) not found: ${notFound.join(', ')}`);
    } catch (err) { setSbError(err.message || 'Failed to search'); } finally { setSbLoading(false); }
  };

  const handleSearchByPohonch = async () => {
    if (!pohonchSearch.trim()) { alert('Please enter a pohonch or bilty number'); return; }
    try {
      setSbLoading(true); setSbError(null); setSbBilties([]); setSbBiltyDetails({}); setSelectedGrNos(new Set());
      await buildCitiesMap();
      const val = pohonchSearch.trim();
      const { data: kaatData, error } = await supabase.from('bilty_wise_kaat').select('*').or(`pohonch_no.ilike.%${val}%,bilty_number.ilike.%${val}%`).order('challan_no', { ascending: true });
      if (error) throw error;
      const f = kaatData || [];
      setSbBilties(f);
      if (f.length && f[0].transport_id && !selectedTransport) {
        const { data: tData } = await supabase.from('transports').select('id,transport_name,gst_number,mob_number,city_name').eq('id', f[0].transport_id).limit(1);
        if (tData?.length) { setSelectedTransport(tData[0]); setTransportSearch(`${tData[0].transport_name}${tData[0].gst_number ? ' | GST: ' + tData[0].gst_number : ''}`); }
      }
      await fetchBiltyDetails(f);
      const em = {}; f.forEach(k => { em[k.challan_no] = true; }); setSbExpandedChallans(em);
      fetchCrossChallanData(f.map(k => k.gr_no).filter(Boolean));
      if (!f.length) setSbError(`No bilties found for: ${val}`);
    } catch (err) { setSbError(err.message || 'Failed to search'); } finally { setSbLoading(false); }
  };

  const handleClearSbSearch = () => {
    setTransportSearch(''); setSelectedTransport(null); setTransportSuggestions([]);
    setSelectedChallans([]); setChallanSearchText('');
    setCitySearch(''); setSelectedCity(null); setCitySuggestions([]);
    setFromChallan(''); setToChallan('');
    setSbBilties([]); setSbBiltyDetails({}); setSbError(null); setSelectedGrNos(new Set());
    setGrNosToSearch([]); setGrSearchInput(''); setPohonchSearch('');
    setCrossChallanMap({});
  };

  const sbGroupedByChallan = useMemo(() => {
    const groups = {};
    sbBilties.forEach(k => { const c = k.challan_no || 'Unknown'; if (!groups[c]) groups[c] = []; groups[c].push(k); });
    return Object.entries(groups).sort(([a], [b]) => parseInt(a.replace(/\D/g, '') || '0', 10) - parseInt(b.replace(/\D/g, '') || '0', 10));
  }, [sbBilties]);

  const sbTotals = useMemo(() => {
    let totalKaat = 0, totalDD = 0, totalPF = 0, totalAmt = 0, totalWt = 0, totalPkg = 0;
    sbBilties.forEach(k => {
      const d = sbBiltyDetails[k.gr_no]; const b = d?.bilty; const s = d?.station;
      const isPaid = (b?.payment_mode || s?.payment_status || '').toUpperCase().includes('PAID');
      totalKaat += parseFloat(k.kaat) || 0; totalDD += parseFloat(k.dd_chrg) || 0;
      totalAmt += isPaid ? 0 : parseFloat(b?.total || s?.amount || 0);
      totalPF += parseFloat(k.pf) || 0; totalWt += parseFloat(b?.wt || s?.weight || 0); totalPkg += parseFloat(b?.no_of_pkg || s?.no_of_packets || 0);
    });
    return { totalKaat, totalDD, totalPF, totalAmt, totalWt, totalPkg };
  }, [sbBilties, sbBiltyDetails]);

  const toggleSbChallan = (c) => setSbExpandedChallans(prev => ({ ...prev, [c]: !prev[c] }));
  const toggleSelectBilty = (gr) => setSelectedGrNos(prev => { const next = new Set(prev); next.has(gr) ? next.delete(gr) : next.add(gr); return next; });
  const selectAllBilties = () => setSelectedGrNos(new Set(sbBilties.map(k => k.gr_no).filter(Boolean)));
  const deselectAllBilties = () => setSelectedGrNos(new Set());
  const selectChallanBilties = (challanNo) => {
    const grs = sbBilties.filter(k => k.challan_no === challanNo).map(k => k.gr_no).filter(Boolean);
    setSelectedGrNos(prev => { const next = new Set(prev); const all = grs.every(gr => next.has(gr)); all ? grs.forEach(gr => next.delete(gr)) : grs.forEach(gr => next.add(gr)); return next; });
  };

  const buildSelectedData = () => sbBilties.filter(k => selectedGrNos.has(k.gr_no)).map(k => {
    const d = sbBiltyDetails[k.gr_no] || {}; const b = d.bilty; const s = d.station;
    const isPaid = (b?.payment_mode || s?.payment_status || '').toUpperCase().includes('PAID');
    const weight = parseFloat(b?.wt || s?.weight || 0); const packages = parseFloat(b?.no_of_pkg || s?.no_of_packets || 0);
    const kaatAmt = parseFloat(k.kaat) || 0; const pfAmt = parseFloat(k.pf) || 0; const ddChrg = parseFloat(k.dd_chrg) || 0;
    const amt = isPaid ? 0 : parseFloat(b?.total || s?.amount || 0);
    const destName = resolveDestination(k, b, s, sbCitiesMap);
    const destCode = resolveDestinationCode(k, b, s, sbCityCodeMap) || destName;
    const fromName = b?.from_city_id && sbCitiesMap[b.from_city_id] ? sbCitiesMap[b.from_city_id] : '-';
    const pohonchBilty = k.pohonch_no && k.bilty_number ? `${k.pohonch_no}/${k.bilty_number}` : k.pohonch_no || k.bilty_number || '-';
    return { gr_no: k.gr_no, challan_no: k.challan_no, pohonch_bilty: pohonchBilty, pohonch_no: k.pohonch_no || '', bilty_number: k.bilty_number || '', consignor: b?.consignor_name || s?.consignor || '-', consignee: b?.consignee_name || s?.consignee || '-', destination: destName, destination_code: destCode, from_city: fromName, packages, weight, amount: amt, kaat: kaatAmt, kaat_rate: parseFloat(k.actual_kaat_rate) || 0, dd: ddChrg, pf: pfAmt, payment_mode: b?.payment_mode || s?.payment_status || '-', delivery_type: b?.delivery_type || s?.delivery_type || '', is_paid: isPaid, date: b?.bilty_date || s?.created_at || null, e_way_bill: b?.e_way_bill || s?.e_way_bill || '' };
  });

  const handlePrintSelected = async () => {
    if (!selectedGrNos.size) { alert('Please select at least one bilty to print'); return; }
    try {
      setGenerating(true);
      const selectedData = buildSelectedData();
      const url = generatePohonchPDF(selectedData, selectedTransport, true);
      setPdfUrl(url); setShowPreview(true); setLastSelectedData(selectedData); setLastSavedPohonch(null);
    } catch (err) { alert('Failed to generate PDF: ' + err.message); } finally { setGenerating(false); }
  };

  const handleDownloadPDF = () => {
    try { generatePohonchPDF(buildSelectedData(), selectedTransport, false); alert('PDF downloaded!'); }
    catch (err) { alert('Failed to download PDF: ' + err.message); }
  };

  const closePreview = () => { setShowPreview(false); setLastSelectedData(null); setLastSavedPohonch(null); if (pdfUrl) { URL.revokeObjectURL(pdfUrl); setPdfUrl(null); } };

  const handleSavePohonch = async () => {
    if (!user?.id) { alert('Please login to save'); return; }
    if (!selectedTransport || !lastSelectedData?.length) return;
    if (lastSavedPohonch) { alert(`Already saved as ${lastSavedPohonch.pohonch_number}`); return; }
    try {
      setSaving(true);
      const grNos = lastSelectedData.map(b => b.gr_no).filter(Boolean);
      const { data: existing } = await supabase.from('pohonch').select('pohonch_number,bilty_metadata').eq('is_active', true);
      if (existing?.length) {
        const usedGrNos = new Set(); const grToPohonch = {};
        existing.forEach(p => (Array.isArray(p.bilty_metadata) ? p.bilty_metadata : []).forEach(b => { if (b.gr_no) { usedGrNos.add(b.gr_no); grToPohonch[b.gr_no] = p.pohonch_number; } }));
        const duplicates = grNos.filter(gr => usedGrNos.has(gr));
        if (duplicates.length) { alert(`Cannot save! GRs already in pohonch:\n${duplicates.slice(0, 5).map(gr => `${gr} (in ${grToPohonch[gr]})`).join(', ')}${duplicates.length > 5 ? ` and ${duplicates.length - 5} more` : ''}`); setSaving(false); return; }
      }
      const defaultPrefix = generatePohonchPrefix(selectedTransport.transport_name, selectedTransport.gst_number);
      let smartPrefix = defaultPrefix; let smartNextNum = 1;
      const gstQ = selectedTransport.gst_number ? supabase.from('pohonch').select('pohonch_number').eq('transport_gstin', selectedTransport.gst_number).eq('is_active', true).order('created_at', { ascending: false }).limit(20) : supabase.from('pohonch').select('pohonch_number').eq('transport_name', selectedTransport.transport_name).eq('is_active', true).order('created_at', { ascending: false }).limit(20);
      const { data: tPohonch } = await gstQ;
      if (tPohonch?.length) {
        const lp = detectLastUsedPrefix(tPohonch[0].pohonch_number);
        if (lp) { smartPrefix = lp.prefix; const { data: awp } = await supabase.from('pohonch').select('pohonch_number').ilike('pohonch_number', `${smartPrefix}%`).order('pohonch_number', { ascending: false }).limit(1); if (awp?.length) { const l = detectLastUsedPrefix(awp[0].pohonch_number); if (l) smartNextNum = l.num + 1; } }
      } else {
        const { data: lpd } = await supabase.from('pohonch').select('pohonch_number').ilike('pohonch_number', `${defaultPrefix}%`).order('pohonch_number', { ascending: false }).limit(1);
        if (lpd?.length) { const n = parseInt(lpd[0].pohonch_number.replace(defaultPrefix, ''), 10); if (!isNaN(n)) smartNextNum = n + 1; }
      }
      const pohonchNumber = `${smartPrefix}${String(smartNextNum).padStart(4, '0')}`;
      const { data: dc } = await supabase.from('pohonch').select('id').eq('pohonch_number', pohonchNumber).eq('is_active', true).limit(1);
      if (dc?.length) { alert(`Pohonch number ${pohonchNumber} already exists! Please try again.`); setSaving(false); return; }
      const challanNos = [...new Set(lastSelectedData.map(b => b.challan_no).filter(Boolean))];
      const biltyMeta = lastSelectedData.map(b => ({ gr_no: b.gr_no, challan_no: b.challan_no, pohonch_bilty: b.pohonch_bilty || null, consignor: b.consignor, consignee: b.consignee, destination: b.destination, packages: b.packages, weight: b.weight, amount: b.amount, kaat: b.kaat, kaat_rate: b.kaat_rate || 0, dd: b.dd, pf: b.pf, payment_mode: b.payment_mode, is_paid: b.is_paid, date: b.date || null, e_way_bill: b.e_way_bill || null }));
      let tAmt = 0, tKaat = 0, tPF = 0, tDD = 0, tPkg = 0, tWt = 0;
      lastSelectedData.forEach(b => { tAmt += b.amount || 0; tKaat += b.kaat || 0; tPF += b.pf || 0; tDD += b.dd || 0; tPkg += b.packages || 0; tWt += b.weight || 0; });
      const { data: saved, error } = await supabase.from('pohonch').insert({ pohonch_number: pohonchNumber, transport_name: selectedTransport.transport_name, transport_gstin: selectedTransport.gst_number || null, admin_transport_id: null, challan_metadata: challanNos, bilty_metadata: biltyMeta, total_bilties: lastSelectedData.length, total_amount: tAmt, total_kaat: tKaat, total_pf: tPF, total_dd: tDD, total_packages: tPkg, total_weight: tWt, created_by: user.id }).select().single();
      if (error) throw error;
      setLastSavedPohonch(saved); setRecentKey(prev => prev + 1); alert(`Pohonch saved as ${pohonchNumber}`);
    } catch (err) { alert('Failed to save pohonch: ' + err.message); } finally { setSaving(false); }
  };

  const handleCreatePohonch = async () => {
    if (!selectedTransport) { alert('Please select a transport first'); return; }
    if (!selectedGrNos.size) { alert('Please select at least one bilty'); return; }
    if (!token) { alert('Authentication required. Please login again.'); return; }
    try {
      setCreating(true); setCreateResult(null);
      const grItems = [...selectedGrNos].map(grNo => { const kaat = sbBilties.find(k => k.gr_no === grNo); const pb = kaat?.pohonch_no && kaat?.bilty_number ? `${kaat.pohonch_no}/${kaat.bilty_number}` : kaat?.pohonch_no || kaat?.bilty_number || null; return { gr_no: grNo, challan_no: kaat?.challan_no || null, pohonch_bilty: pb }; });
      const challanNos = [...new Set([...selectedGrNos].map(grNo => sbBilties.find(k => k.gr_no === grNo)?.challan_no).filter(Boolean))];
      const body = { transport_name: selectedTransport.transport_name, transport_gstin: selectedTransport.gst_number || null, challan_nos: challanNos, gr_items: grItems, created_by: user?.id || null };
      if (createPrefix.trim()) body.pohonch_prefix = createPrefix.trim().toUpperCase();
      const res = await fetch('https://api.movesure.io/api/pohonch/create', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to create pohonch');
      setCreateResult(json); setRecentKey(prev => prev + 1);
    } catch (err) { alert('Failed to create pohonch: ' + err.message); } finally { setCreating(false); }
  };

  const handleOpenCreateModal = async () => {
    setCreateResult(null);
    setCreatePrefix('');
    if (selectedTransport) {
      try {
        const q = selectedTransport.gst_number
          ? supabase.from('pohonch').select('pohonch_number').eq('transport_gstin', selectedTransport.gst_number).order('created_at', { ascending: false }).limit(5)
          : supabase.from('pohonch').select('pohonch_number').eq('transport_name', selectedTransport.transport_name).order('created_at', { ascending: false }).limit(5);
        const { data } = await q;
        if (data?.length) {
          const parsed = detectLastUsedPrefix(data[0].pohonch_number);
          if (parsed?.prefix) setCreatePrefix(parsed.prefix);
        }
      } catch (e) { /* silently ignore, user can type prefix manually */ }
    }
    setShowCreateModal(true);
  };

  if (!mounted) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar /><div className="flex items-center justify-center h-[80vh]"><Loader2 className="w-10 h-10 animate-spin text-teal-600" /></div>
    </div>
  );

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
                <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-900 via-emerald-800 to-teal-800 bg-clip-text text-transparent">CROSSING CHALLAN</h1>
                <p className="text-gray-600 mt-1">Search bilties by transport, GR no., or pohonch number</p>
              </div>
            </div>
            <button onClick={() => router.push('/transit-finance/cross-challan/cross-challan-list')} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:from-teal-700 hover:to-emerald-700 transition-all">
              <FileText className="w-4 h-4" /> Pohonch List
            </button>
          </div>
        </div>

        <div className="space-y-6">

          <SearchPanel
            searchMode={searchMode} setSearchMode={setSearchMode}
            transportSearch={transportSearch} handleTransportSearchChange={handleTransportSearchChange}
            selectedTransport={selectedTransport} handleSelectTransport={handleSelectTransport}
            showSuggestions={showSuggestions} setShowSuggestions={setShowSuggestions} transportSuggestions={transportSuggestions}
            citySearch={citySearch} handleCitySearchChange={handleCitySearchChange}
            selectedCity={selectedCity} handleSelectCity={handleSelectCity}
            showCitySuggestions={showCitySuggestions} setShowCitySuggestions={setShowCitySuggestions}
            citySuggestions={citySuggestions} setSelectedCity={setSelectedCity} setCitySearch={setCitySearch}
            challanSearchText={challanSearchText} setChallanSearchText={setChallanSearchText}
            fetchChallanSuggestions={fetchChallanSuggestions}
            showChallanSuggestions={showChallanSuggestions} setShowChallanSuggestions={setShowChallanSuggestions}
            challanSuggestions={challanSuggestions}
            selectedChallans={selectedChallans} addChallan={addChallan} removeChallan={removeChallan} setSelectedChallans={setSelectedChallans}
            fromChallan={fromChallan} setFromChallan={setFromChallan} toChallan={toChallan} setToChallan={setToChallan}
            handleSearchBilties={handleSearchBilties} handleClearSbSearch={handleClearSbSearch} sbLoading={sbLoading}
            grSearchInput={grSearchInput} setGrSearchInput={setGrSearchInput}
            grNosToSearch={grNosToSearch} addGrToSearch={addGrToSearch} removeGrFromSearch={removeGrFromSearch} handleSearchByGrNos={handleSearchByGrNos}
            pohonchSearch={pohonchSearch} setPohonchSearch={setPohonchSearch} handleSearchByPohonch={handleSearchByPohonch}
          />

          {sbError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" /> {sbError}
            </div>
          )}

          {sbBilties.length > 0 && (
            <ResultsSummaryBar
              selectedTransport={selectedTransport}
              sbBilties={sbBilties} sbGroupedByChallan={sbGroupedByChallan} sbTotals={sbTotals}
              selectedGrNos={selectedGrNos} selectedChallans={selectedChallans}
              selectedCity={selectedCity} fromChallan={fromChallan} toChallan={toChallan}
              selectAllBilties={selectAllBilties} deselectAllBilties={deselectAllBilties}
              generating={generating} onPrint={handlePrintSelected}
              onOpenCreateModal={handleOpenCreateModal}
            />
          )}

          {sbLoading && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-teal-600 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Searching...</p>
            </div>
          )}

          {!sbLoading && sbBilties.length > 0 && (
            <BiltyResultsTable
              sbGroupedByChallan={sbGroupedByChallan} sbBiltyDetails={sbBiltyDetails}
              selectedGrNos={selectedGrNos} sbExpandedChallans={sbExpandedChallans} sbCitiesMap={sbCitiesMap}
              resolveDestination={resolveDestination}
              toggleSbChallan={toggleSbChallan} selectChallanBilties={selectChallanBilties} toggleSelectBilty={toggleSelectBilty}
              onEditPohonch={handleOpenEditPohonch}
              crossChallanMap={crossChallanMap}
            />
          )}

          {!sbLoading && !sbBilties.length && (selectedTransport || selectedChallans.length || fromChallan || toChallan || grNosToSearch.length || pohonchSearch) && !sbError && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No bilties found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your search criteria</p>
            </div>
          )}

          {!sbLoading && !sbBilties.length && !selectedTransport && !selectedChallans.length && !fromChallan && !toChallan && !grNosToSearch.length && !pohonchSearch && !sbError && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Truck className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Use the search panel above to find bilties</p>
              <p className="text-gray-400 text-sm mt-1">Search by transport, GR number, or pohonch number</p>
            </div>
          )}

          <RecentPohonch key={recentKey} onRefreshNeeded={() => setRecentKey(prev => prev + 1)} />
        </div>

        <CreatePohonchModal
          show={showCreateModal}
          onClose={() => { setShowCreateModal(false); setCreateResult(null); setCreatePrefix(''); }}
          selectedTransport={selectedTransport} selectedGrNos={selectedGrNos} sbBilties={sbBilties}
          token={token} user={user} createPrefix={createPrefix} setCreatePrefix={setCreatePrefix}
          creating={creating} createResult={createResult} onCreatePohonch={handleCreatePohonch}
        />

        <PdfPreviewModal
          show={showPreview} pdfUrl={pdfUrl} onClose={closePreview}
          onDownload={handleDownloadPDF} onSave={handleSavePohonch}
          saving={saving} lastSavedPohonch={lastSavedPohonch} selectedGrNos={selectedGrNos}
        />

        <EditPohonchModal
          show={showEditPohonch}
          onClose={() => { setShowEditPohonch(false); setEditPohonchNo(null); }}
          pohonchNo={editPohonchNo}
          user={user}
          token={token}
          sbCitiesMap={sbCitiesMap}
          sbCityCodeMap={sbCityCodeMap}
          onSaved={() => setRecentKey(prev => prev + 1)}
        />
      </div>
    </div>
  );
}
