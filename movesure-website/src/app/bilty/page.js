'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../utils/auth';
import { useRouter } from 'next/navigation';
import supabase from '../utils/supabase';
import { format } from 'date-fns';
import { ChevronDown, ArrowLeft, Building2, User, MapPin, Calendar, FileText, Settings } from 'lucide-react';
import { navigationManager, useInputNavigation } from '../../components/bilty/input-navigation';
import Navbar from '../../components/dashboard/navbar';

// Import all components
import GRNumberSection from '../../components/bilty/grnumber-manager';
import CityTransportSection from '../../components/bilty/city-transport';
import ConsignorConsigneeSection from '../../components/bilty/consignor-consignee';
import { addNewConsignor, addNewConsignee, checkDuplicateConsignor, checkDuplicateConsignee } from '../../components/bilty/consignor-consignee-helper';
import InvoiceDetailsSection from '../../components/bilty/invoice';
import PackageChargesSection from '../../components/bilty/charges';
import { useGRReservation } from '../../utils/grReservation';
import GRLiveStatus from '../../components/bilty/gr-live-status';

// ⭐ Lazy-load heavy components (jsPDF + QRCode = ~300KB) — not needed at page load
import dynamic from 'next/dynamic';
const PrintModal = dynamic(() => import('../../components/bilty/print-model'), { ssr: false });
const PrintBilty = dynamic(() => import('../../components/bilty/print-bilty'), { ssr: false });

// Backend API URL — all bilty save/load now goes through the backend
const BILTY_API_URL = 'https://movesure-backend.onrender.com';

export default function BiltyForm() {
  const { user } = useAuth();
  const router = useRouter();

  // Navigation manager hook
  const navigation = useInputNavigation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Edit mode and print states
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentBiltyId, setCurrentBiltyId] = useState(null);
  const [existingBilties, setExistingBilties] = useState([]);  const [showPrintModal, setShowPrintModal] = useState(false);
    const [showPrintBilty, setShowPrintBilty] = useState(false);
  const [savedBiltyData, setSavedBiltyData] = useState(null);  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showBillBookDropdown, setShowBillBookDropdown] = useState(false);
  
  // Add reset key to force component re-renders
  const [resetKey, setResetKey] = useState(0);
  
  // ⭐ Server-provided next GR number (from /save response) — used for fast bilty creation
  const serverNextGrNoRef = useRef(null);
  
  // ⭐ Synchronous save guard — prevents duplicate saves (React state is async & unreliable for this)
  const savingRef = useRef(false);
  
  // GR Sequence validation - check if bill book current_number matches last bilty gr_no
  const [grSequenceError, setGrSequenceError] = useState(null);
  
  // State for dropdown data
  const [billBooks, setBillBooks] = useState([]);
  const [cities, setCities] = useState([]);
  const [transports, setTransports] = useState([]);
  const [transportByCityId, setTransportByCityId] = useState({});
  const [rates, setRates] = useState([]);
  const [consignors, setConsignors] = useState([]);
  const [consignees, setConsignees] = useState([]);
  const [branchData, setBranchData] = useState(null);
  const [fromCityName, setFromCityName] = useState('');
  const [toCityName, setToCityName] = useState('');
  
  // ⭐ Backend rate caches — populated from /api/bilty/rates/all and /api/bilty/rates/default
  const [consignorRatesByCity, setConsignorRatesByCity] = useState({});
  const [defaultRateByCityId, setDefaultRateByCityId] = useState({});
  const [selectedConsignorId, setSelectedConsignorId] = useState(null);
  
  // Selected bill book
  const [selectedBillBook, setSelectedBillBook] = useState(null);

  // ⭐ GR RESERVATION SYSTEM - Multi-user concurrent bilty creation
  const grReservation = useGRReservation({
    userId: user?.id,
    userName: user?.name || user?.username,
    branchId: user?.branch_id,
    selectedBillBook: selectedBillBook,
    isEditMode: isEditMode,
    enabled: !loading && !!user?.id && !!user?.branch_id
  });

    // Form data
  const [formData, setFormData] = useState({
    gr_no: '',
    branch_id: '',
    staff_id: '',
    from_city_id: '',
    to_city_id: '',
    bilty_date: format(new Date(), 'yyyy-MM-dd'),
    delivery_type: 'godown-delivery',
    consignor_name: '',
    consignor_gst: '',
    consignor_number: '',
    consignee_name: '',
    consignee_gst: '',
    consignee_number: '',
    transport_name: '',
    transport_gst: '',
    transport_number: '',
    transport_id: null,
    payment_mode: 'to-pay',
    contain: '',
    invoice_no: '',
    invoice_value: 0,
    invoice_date: format(new Date(), 'yyyy-MM-dd'),    e_way_bill: '',
    document_number: '',
    no_of_pkg: 0,
    wt: 0,
    rate: 0,
    labour_rate: 20,
    pvt_marks: '',
    freight_amount: 0,
    labour_charge: 0,
    bill_charge: 50,    toll_charge: 20,
    dd_charge: 0,
    other_charge: 0,
    pf_charge: 0,
    total: 70,
    remark: '',
    saving_option: 'SAVE'
  });
  // Load initial data
  useEffect(() => {
    if (user?.branch_id) {
      // Set branch_id in formData immediately when user is available
      setFormData(prev => ({ 
        ...prev, 
        branch_id: user.branch_id 
      }));
      loadInitialData();
    }
  }, [user]);

  // Check for edit data from bilty list after initial data is loaded
  useEffect(() => {
    if (!loading && cities.length > 0) {
      checkForEditData();
    }
  }, [loading, cities]);

  // ⭐ GR SEQUENCE VALIDATION — handled by backend /validate endpoint now
  // The grReservation hook calls validateBillBook on load and auto-fixes current_number.
  // We use billBookValidation from the hook to detect issues.
  useEffect(() => {
    if (!selectedBillBook || isEditMode || loading) {
      setGrSequenceError(null);
      return;
    }
    // If backend validation detected and fixed an issue, show info briefly
    if (grReservation.billBookValidation?.fixed) {
      console.log('🔧 Backend auto-fixed current_number:', grReservation.billBookValidation.old_current_number, '→', grReservation.billBookValidation.new_current_number);
      setGrSequenceError(null);
    }
  }, [selectedBillBook, isEditMode, loading, grReservation.billBookValidation]);

  // ⭐ SYNC RESERVED GR NUMBER into form data
  // When reservation system provides a GR number, use it instead of the local generateGRNumber
  useEffect(() => {
    if (grReservation.reservedGRNo && !isEditMode && !loading) {
      console.log('🎫 Syncing reserved GR into form:', grReservation.reservedGRNo);
      setFormData(prev => ({
        ...prev,
        gr_no: grReservation.reservedGRNo
      }));
      setGrSequenceError(null);
    }
  }, [grReservation.reservedGRNo, isEditMode, loading]);

  // ⭐ SHOW FIRST AVAILABLE GR when user has NO reservation
  // Uses the backend /next-available list instead of local calculation
  useEffect(() => {
    if (isEditMode || loading || grReservation.hasReservation) return;
    const available = grReservation.nextAvailable;
    if (available && available.length > 0) {
      const firstGR = available[0].gr_no;
      setFormData(prev => {
        if (prev.gr_no !== firstGR) {
          console.log('📋 Setting suggested GR from backend:', firstGR);
          return { ...prev, gr_no: firstGR };
        }
        return prev;
      });
    }
  }, [grReservation.nextAvailable, isEditMode, loading, grReservation.hasReservation]);

  // ⭐ Fix GR sequence via backend API
  const fixGRSequence = async (newCurrentNumber) => {
    if (!selectedBillBook) return;

    try {
      const result = await grReservation.fixSequence(
        newCurrentNumber ? parseInt(newCurrentNumber) : null
      );
      if (result?.fixed) {
        const updatedBook = { ...selectedBillBook, current_number: result.new_current_number };
        setSelectedBillBook(updatedBook);
        setGrSequenceError(null);
        // Refresh next available GRs
        grReservation.refreshNextAvailable();
        console.log(`✅ GR sequence fixed via backend: ${result.old_current_number} → ${result.new_current_number}`);
      }
    } catch (err) {
      console.error('❌ Error fixing GR sequence:', err);
      alert('❌ Failed to fix: ' + err.message);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Alt') setShowShortcuts(true);      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!e.repeat) handleSave(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (!e.repeat) handleSave(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        resetForm();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        toggleEditMode();
      }      // Alt+N for new bill
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        resetForm();
      }
      // Alt+C for challan page
      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        router.push('/challan');
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Alt') setShowShortcuts(false);
    };
    
    // Handle consignor selection — fetch ALL rates for this consignor from backend
    const handleConsignorSelection = async (event) => {
      const { consignor, cityId } = event.detail;
      console.log('🎯 Consignor selected:', consignor.company_name, 'ID:', consignor.id);
      
      setSelectedConsignorId(consignor.id || null);
      
      if (!consignor.id) {
        // New consignor typed (no ID yet) — clear consignor rates, keep defaults
        setConsignorRatesByCity({});
        return;
      }
      
      try {
        // Fetch BOTH consignor-specific and default rates in one call
        const res = await fetch(
          `${BILTY_API_URL}/api/bilty/rates/all?consignor_id=${consignor.id}&branch_id=${user.branch_id}`
        );
        const result = await res.json();
        
        if (result.status === 'success') {
          const data = result.data;
          setConsignorRatesByCity(data.consignor_rates_by_city || {});
          setDefaultRateByCityId(data.default_rate_by_city_id || {});
          console.log('✅ Cached consignor rates for', Object.keys(data.consignor_rates_by_city || {}).length, 'cities');
          
          // If city is already selected, apply rate immediately
          if (cityId) {
            const cityRates = (data.consignor_rates_by_city || {})[cityId];
            if (cityRates && cityRates.length > 0) {
              const r = cityRates[0];
              console.log('💰 Applying consignor profile rate:', r.rate, r.rate_unit);
              setFormData(prev => ({
                ...prev,
                rate: parseFloat(r.rate) || prev.rate
              }));
            } else {
              // Fallback to default rate
              const defRate = (data.default_rate_by_city_id || {})[cityId];
              if (defRate) {
                console.log('📋 Using default rate:', defRate);
                setFormData(prev => ({ ...prev, rate: parseFloat(defRate) }));
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching consignor rates:', err);
      }
    };    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('consignorSelected', handleConsignorSelection);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('consignorSelected', handleConsignorSelection);    };
  }, [formData, selectedBillBook, isEditMode, currentBiltyId]);

  // Navigation manager lifecycle management
  useEffect(() => {
    // Activate navigation manager when component mounts
    navigation.setActive(true);
    
    // Clear navigation manager when component unmounts or resets
    return () => {
      navigation.clear();
    };
  }, [navigation]);

  // Clear navigation when form resets
  useEffect(() => {
    if (resetKey > 0) {
      navigation.clear();
    }
  }, [resetKey, navigation]);

  const checkForEditData = async () => {
    try {
      // Check if there's edit data from bilty list
      const editData = localStorage.getItem('editBiltyData');
      if (editData) {
        const { biltyId, grNo, editMode } = JSON.parse(editData);
        
        if (editMode && biltyId) {
          console.log('Loading bilty for edit via backend:', { biltyId, grNo });
          
          // Load the full bilty data from backend (includes city names)
          const res = await fetch(`${BILTY_API_URL}/api/bilty/${biltyId}`);
          const result = await res.json();
          
          if (result.status !== 'success' || !result.data?.bilty) {
            console.error('Error loading bilty for edit:', result.message);
            alert('Error loading bilty data for editing');
            localStorage.removeItem('editBiltyData');
            return;
          }

          const fullBilty = result.data.bilty;
          const fromCityData = result.data.from_city;
          const toCityData = result.data.to_city;
          
          console.log('Loaded bilty data from backend:', fullBilty);
          
          // Set form data with the existing bilty
          setFormData({
            ...fullBilty,
            bilty_date: format(new Date(fullBilty.bilty_date), 'yyyy-MM-dd'),
            invoice_date: fullBilty.invoice_date ? format(new Date(fullBilty.invoice_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            pf_charge: fullBilty.pf_charge || 0,
            labour_rate: fullBilty.labour_rate !== undefined && fullBilty.labour_rate !== null ? fullBilty.labour_rate : 20,
            consignor_name: fullBilty.consignor_name || '',
            consignor_gst: fullBilty.consignor_gst || '',
            consignor_number: fullBilty.consignor_number || '',
            consignee_name: fullBilty.consignee_name || '',
            consignee_gst: fullBilty.consignee_gst || '',
            consignee_number: fullBilty.consignee_number || '',
            transport_name: fullBilty.transport_name || '',
            transport_gst: fullBilty.transport_gst || '',
            transport_number: fullBilty.transport_number || '',
            transport_id: fullBilty.transport_id || null,
            contain: fullBilty.contain || '',
            invoice_no: fullBilty.invoice_no || '',
            e_way_bill: fullBilty.e_way_bill || '',
            document_number: fullBilty.document_number || '',
            pvt_marks: fullBilty.pvt_marks || '',
            remark: fullBilty.remark || ''
          });
          
          // Set edit mode
          setIsEditMode(true);
          setCurrentBiltyId(biltyId);
          
          // Set city names from backend response
          if (fromCityData?.city_name) setFromCityName(fromCityData.city_name);
          if (toCityData?.city_name) setToCityName(toCityData.city_name);
          
          // Clear the localStorage data
          localStorage.removeItem('editBiltyData');
          
          console.log('Edit mode set successfully');
        }
      }
    } catch (error) {
      console.error('Error checking edit data:', error);
      localStorage.removeItem('editBiltyData');
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      setFormData(prev => ({
        ...prev,
        branch_id: user.branch_id,
        staff_id: user.id
      }));

      // Load ALL data in parallel — backend APIs + Supabase bilties list
      const [refRes, defRatesRes, biltiesResult] = await Promise.all([
        fetch(`${BILTY_API_URL}/api/bilty/reference-data?branch_id=${user.branch_id}&user_id=${user.id}`),
        fetch(`${BILTY_API_URL}/api/bilty/rates/default?branch_id=${user.branch_id}`),
        supabase
          .from('bilty')
          .select('id, gr_no, consignor_name, consignee_name, bilty_date, total, saving_option')
          .eq('branch_id', user.branch_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
      ]);
      const result = await refRes.json();
      const defRatesResult = await defRatesRes.json();

      if (result.status !== 'success') {
        console.error('Backend reference-data error:', result.message);
        throw new Error(result.message || 'Failed to load reference data');
      }

      const data = result.data;
      
      // Store default rates lookup
      if (defRatesResult.status === 'success') {
        setDefaultRateByCityId(defRatesResult.data?.rate_by_city_id || {});
        console.log('✅ Loaded default rates for', Object.keys(defRatesResult.data?.rate_by_city_id || {}).length, 'cities');
      }
      
      setBranchData(data.branch);
      setCities(data.cities || []);
      setTransports(data.transports || []);
      setTransportByCityId(data.transport_by_city_id || {});
      setRates(data.rates || []);
      setConsignors(data.consignors || []);
      setConsignees(data.consignees || []);
      setBillBooks(data.bill_books || []);
      setExistingBilties(biltiesResult.data || []);
      
      // Set from city
      if (data.branch) {
        const fromCity = data.cities?.find(c => c.city_code === data.branch.city_code);
        if (fromCity) {
          setFromCityName(fromCity.city_name);
          setFormData(prev => ({ ...prev, from_city_id: fromCity.id }));
        }
      }
      
      // Set default bill book and GR - Only if not editing
      if (data.bill_books?.length > 0 && !localStorage.getItem('editBiltyData')) {
        const defaultBook = data.branch?.default_bill_book_id 
          ? data.bill_books.find(b => b.id === data.branch.default_bill_book_id) || data.bill_books[0]
          : data.bill_books[0];
        
        setSelectedBillBook(defaultBook);
        const grNo = getNextAvailableGR(defaultBook);
        setFormData(prev => ({ ...prev, gr_no: grNo }));
        
        setIsEditMode(false);
        setCurrentBiltyId(null);
      } else if (data.bill_books?.length > 0) {
        const defaultBook = data.branch?.default_bill_book_id 
          ? data.bill_books.find(b => b.id === data.branch.default_bill_book_id) || data.bill_books[0]
          : data.bill_books[0];
        setSelectedBillBook(defaultBook);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateGRNumber = (billBook) => {
    if (!billBook) return '';
    const { prefix, current_number, digits, postfix } = billBook;
    const paddedNumber = String(current_number).padStart(digits, '0');
    return `${prefix || ''}${paddedNumber}${postfix || ''}`;
  };

  // ⭐ getNextAvailableGR now uses backend /next-available data
  // Kept as a fallback for immediate display before backend responds
  const getNextAvailableGR = (billBook) => {
    // Use backend next-available list if present
    if (grReservation.nextAvailable?.length > 0) {
      return grReservation.nextAvailable[0].gr_no;
    }
    // Fallback to local generation
    return generateGRNumber(billBook);
  };

  const loadExistingBilty = async (bilty) => {
    try {
      const { data: fullBilty, error } = await supabase
        .from('bilty')
        .select('*')
        .eq('id', bilty.id)
        .single();
      
      if (error) throw error;      setFormData({
        ...fullBilty,
        bilty_date: format(new Date(fullBilty.bilty_date), 'yyyy-MM-dd'),
        invoice_date: fullBilty.invoice_date ? format(new Date(fullBilty.invoice_date), 'yyyy-MM-dd') : '',
        pf_charge: fullBilty.pf_charge || 0,
        labour_rate: fullBilty.labour_rate !== undefined && fullBilty.labour_rate !== null ? fullBilty.labour_rate : 20,
        // Ensure all string fields are not null to prevent React errors
        consignor_name: fullBilty.consignor_name || '',
        consignor_gst: fullBilty.consignor_gst || '',
        consignor_number: fullBilty.consignor_number || '',
        consignee_name: fullBilty.consignee_name || '',
        consignee_gst: fullBilty.consignee_gst || '',
        consignee_number: fullBilty.consignee_number || '',
        transport_name: fullBilty.transport_name || '',
        transport_gst: fullBilty.transport_gst || '',
        transport_number: fullBilty.transport_number || '',
        transport_id: fullBilty.transport_id || null,
        contain: fullBilty.contain || '',
        invoice_no: fullBilty.invoice_no || '',
        e_way_bill: fullBilty.e_way_bill || '',
        document_number: fullBilty.document_number || '',
        pvt_marks: fullBilty.pvt_marks || '',
        remark: fullBilty.remark || ''
      });
      
      setCurrentBiltyId(bilty.id);
      setIsEditMode(true);
      
      // Set to city name for display
      if (fullBilty.to_city_id) {
        const city = cities.find(c => c.id === fullBilty.to_city_id);
        if (city) {
          setToCityName(city.city_name);
        }
      }
    } catch (error) {
      console.error('Error loading bilty:', error);
      alert('Error loading bilty data');
    }
  };  const handleSave = async (isDraft = false) => {
    // Prevent multiple simultaneous saves — useRef is synchronous (React state is async & can race)
    if (savingRef.current || saving) {
      console.log('⚠️ Save already in progress, ignoring duplicate request');
      return;
    }
    savingRef.current = true;

    // ⭐ BLOCK SAVE if GR sequence error detected (only for new bilties)
    if (grSequenceError && !isEditMode) {
      console.error('🚨 SAVE BLOCKED: GR sequence error -', grSequenceError.message);
      alert(`❌ SAVE BLOCKED!\n\nGR Number "${grSequenceError.currentGR}" already exists as a saved bilty.\n\nBill book current_number (${grSequenceError.currentNumber}) is NOT ahead of the last bilty.\n\nPlease fix the bill book sequence before creating new bilties.`);
      return;
    }

    try {
      setSaving(true);
      console.log('Starting save process via backend API...');
      console.log('Is Draft:', isDraft);
      console.log('Is Edit Mode:', isEditMode);
      console.log('Current Bilty ID:', currentBiltyId);

      // 🆕 Save new consignor/consignee to DB if they were typed (not selected from dropdown)
      if (formData.consignor_name && formData.consignor_name.trim()) {
        const consignorName = formData.consignor_name.trim().toUpperCase();
        const consignorExists = consignors.some(c => 
          c.company_name.trim().toUpperCase() === consignorName
        );
        if (!consignorExists) {
          const isDup = await checkDuplicateConsignor(consignorName);
          if (!isDup) {
            console.log('🆕 Saving new consignor with bilty:', consignorName);
            await addNewConsignor({
              company_name: consignorName,
              gst_num: formData.consignor_gst?.trim() || null,
              number: formData.consignor_number?.trim() || null
            });
          }
        }
      }
      
      if (formData.consignee_name && formData.consignee_name.trim()) {
        const consigneeName = formData.consignee_name.trim().toUpperCase();
        const consigneeExists = consignees.some(c => 
          c.company_name.trim().toUpperCase() === consigneeName
        );
        if (!consigneeExists) {
          const isDup = await checkDuplicateConsignee(consigneeName);
          if (!isDup) {
            console.log('🆕 Saving new consignee with bilty:', consigneeName);
            await addNewConsignee({
              company_name: consigneeName,
              gst_num: formData.consignee_gst?.trim() || null,
              number: formData.consignee_number?.trim() || null
            });
          }
        }
      }

      // Refresh consignor/consignee lists after saving new entries
      refreshConsignorConsigneeData();

      // ⭐ SAVE VIA BACKEND API — single call handles insert/update, rate saving, bill book update
      // Backend is the sole authority on current_number — we do NOT calculate it locally
      const savePayload = {
        branch_id: user.branch_id,
        staff_id: user.id,
        gr_no: formData.gr_no?.toString().trim(),
        bilty_date: formData.bilty_date,
        from_city_id: formData.from_city_id || null,
        to_city_id: formData.to_city_id || null,
        delivery_type: formData.delivery_type || 'godown-delivery',
        consignor_name: formData.consignor_name?.toString().trim() || null,
        consignor_gst: formData.consignor_gst?.toString().trim() || null,
        consignor_number: formData.consignor_number?.toString().trim() || null,
        consignee_name: formData.consignee_name?.toString().trim() || null,
        consignee_gst: formData.consignee_gst?.toString().trim() || null,
        consignee_number: formData.consignee_number?.toString().trim() || null,
        transport_name: formData.transport_name?.toString().trim() || null,
        transport_gst: formData.transport_gst?.toString().trim() || null,
        transport_number: formData.transport_number?.toString().trim() || null,
        transport_id: formData.transport_id || null,
        payment_mode: formData.payment_mode || 'to-pay',
        contain: formData.contain?.toString().trim() || null,
        invoice_no: formData.invoice_no?.toString().trim() || null,
        invoice_value: parseFloat(formData.invoice_value) || 0,
        invoice_date: formData.invoice_date || null,
        e_way_bill: formData.e_way_bill ? formData.e_way_bill.toString().trim() : '',
        document_number: formData.document_number?.toString().trim() || null,
        no_of_pkg: parseInt(formData.no_of_pkg) || 0,
        wt: parseFloat(formData.wt) || 0,
        rate: parseFloat(formData.rate) || 0,
        labour_rate: formData.labour_rate !== undefined && formData.labour_rate !== null ? parseFloat(formData.labour_rate) : 20,
        pvt_marks: formData.pvt_marks?.toString().trim() || null,
        freight_amount: parseFloat(formData.freight_amount) || 0,
        labour_charge: parseFloat(formData.labour_charge) || 0,
        bill_charge: parseFloat(formData.bill_charge) || 0,
        toll_charge: parseFloat(formData.toll_charge) >= 0 ? parseFloat(formData.toll_charge) : 0,
        dd_charge: parseFloat(formData.dd_charge) || 0,
        other_charge: parseFloat(formData.other_charge) || 0,
        pf_charge: parseFloat(formData.pf_charge) || 0,
        total: parseFloat(formData.total) || 0,
        remark: formData.remark?.toString().trim() || null,
        saving_option: isDraft ? 'DRAFT' : 'SAVE',
        // Bill book — backend auto-advances current_number safely
        bill_book_id: selectedBillBook?.id || null,
        // Edit mode
        ...(isEditMode && currentBiltyId ? { bilty_id: currentBiltyId } : {})
      };

      console.log('📤 Sending save request to backend:', savePayload.gr_no);

      const res = await fetch(`${BILTY_API_URL}/api/bilty/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savePayload)
      });

      const result = await res.json();

      if (result.status !== 'success') {
        console.error('❌ Backend save error:', result.message);
        alert(`❌ Save failed: ${result.message}`);
        return;
      }

      console.log('✅ Backend save successful:', result.data?.bilty?.id);

      // ✅ USE SERVER RESPONSE — guaranteed correct data from DB
      const savedData = result.data.bilty;
      const fromCityData = result.data.from_city;
      const toCityData = result.data.to_city;

      // Update city names from backend response
      if (fromCityData?.city_name) setFromCityName(fromCityData.city_name);
      if (toCityData?.city_name) setToCityName(toCityData.city_name);

      // ⭐ Sync local bill book state from server response (NEVER calculate locally)
      const serverCurrentNumber = result.data.new_current_number;
      if (serverCurrentNumber != null && selectedBillBook) {
        setSelectedBillBook(prev => ({ ...prev, current_number: serverCurrentNumber }));
        console.log('📘 Bill book current_number synced from server:', serverCurrentNumber);
      }

      // ⭐ Store server-provided next GR for instant use in resetForm (fast bilty creation)
      const nextGrNo = result.data.next_gr_no;
      if (nextGrNo && !isEditMode) {
        serverNextGrNoRef.current = nextGrNo;
        console.log('📋 Next GR from server save response:', nextGrNo);
      }

      // ⭐ GR reservation completion (for new bilties only)
      if (!isEditMode && savedData?.id) {
        if (grReservation.hasReservation) {
          console.log('🎫 Completing GR reservation:', grReservation.reservedGRNo);
          await grReservation.completeAndReserveNext();
        }
        // Refresh next-available list from backend
        grReservation.refreshNextAvailable();
      }

      // Refresh existing bilties list
      const { data: updatedBilties } = await supabase
        .from('bilty')
        .select('id, gr_no, consignor_name, consignee_name, bilty_date, total, saving_option')
        .eq('branch_id', user.branch_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      setExistingBilties(updatedBilties || []);

      // ⭐ BACKGROUND PDF UPLOAD — lazy-load jsPDF only when needed
      if (savedData && savedData.id) {
        import('../../utils/biltyPdfUpload').then(({ uploadBiltyPdf }) => {
          uploadBiltyPdf(savedData, null)
            .then((url) => {
              if (url) console.log('📄 [Background] PDF uploaded:', url);
            })
            .catch((err) => console.error('📄 [Background] PDF upload error:', err));
        });
      }
      
      // Show print modal if not draft — use backend data for correct city names
      if (!isDraft) {
        setSavedBiltyData(savedData);
        // Set city names from backend response for print
        if (toCityData?.city_name) setToCityName(toCityData.city_name);
        if (fromCityData?.city_name) setFromCityName(fromCityData.city_name);
        setShowPrintModal(true);
      } else {
        resetForm();
      }
      
      console.log('Save process completed successfully via backend');

    } catch (error) {
      console.error('Error saving bilty:', error);
      alert('❌ Save failed: ' + (error?.message || 'Network error. Please try again.'));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const resetForm = async () => {
    // Priority: server save response > reservation > next-available list > local generation
    const serverNextGr = serverNextGrNoRef.current;
    const currentReservedGR = grReservation.reservedGRNo;
    const nextFromBackend = grReservation.nextAvailable?.[0]?.gr_no;
    const newGrNo = serverNextGr || currentReservedGR || nextFromBackend || (selectedBillBook ? generateGRNumber(selectedBillBook) : '');
    
    // Clear the server next GR after using it (one-time use)
    serverNextGrNoRef.current = null;
    
    setFormData({
      gr_no: newGrNo,
      branch_id: user.branch_id,
      staff_id: user.id,
      from_city_id: formData.from_city_id,
      to_city_id: '',
      bilty_date: format(new Date(), 'yyyy-MM-dd'),
      delivery_type: 'godown-delivery',
      consignor_name: '',
      consignor_gst: '',
      consignor_number: '',
      consignee_name: '',
      consignee_gst: '',
      consignee_number: '',
      transport_name: '',
      transport_gst: '',
      transport_number: '',
      transport_id: null,
      payment_mode: 'to-pay',
      contain: '',
      invoice_no: '',
      invoice_value: 0,
      invoice_date: format(new Date(), 'yyyy-MM-dd'),
      e_way_bill: '',
      document_number: '',
      no_of_pkg: 0,
      wt: 0,
      rate: 0,
      labour_rate: 20,
      pvt_marks: '',
      freight_amount: 0,
      labour_charge: 0,
      bill_charge: 50,
      toll_charge: 20,
      dd_charge: 0,
      other_charge: 0,
      pf_charge: 0,
      total: 70,
      remark: '',
      saving_option: 'SAVE',
      // Reset internal state flags
      _rate_unit: 'PER_KG',
      _rate_unit_override: false,
      _labour_unit: 'PER_NAG',
      _minimum_freight: 0,
      _is_minimum_applied: false,
      _dd_charge_applied: 0,
      _rs_charge_applied: 0
    });
    
    // Always set to new mode after reset
    setIsEditMode(false);
    setCurrentBiltyId(null);
    setToCityName('');
    setSavedBiltyData(null); // Clear saved bilty data
    
    // Increment reset key to force component re-renders and clear local states
    setResetKey(prev => prev + 1);
    
    // Clear any remaining localStorage data
    localStorage.removeItem('editBiltyData');
    
    console.log('Form reset to new mode, keeping reserved GR:', currentReservedGR || 'none');
  };
  const toggleEditMode = () => {
    if (!isEditMode) {
      // Switching to edit mode - clear form and enable edit
      setIsEditMode(true);
      setCurrentBiltyId(null);
      
      // Trigger focus on GR search input via a custom event
      // This will be picked up by the GRNumberSection component
      setTimeout(() => {
        const event = new CustomEvent('focusGRSearch');
        window.dispatchEvent(event);
        console.log('🎯 Edit mode activated - Focus event dispatched');
      }, 100);
    } else {
      // Switching to new mode - reset form
      resetForm();
    }
  };

  const handleBillBookSelect = (book) => {
    setSelectedBillBook(book);
    // The hook will auto-fetch next-available for the new bill book via useEffect
    // For immediate display, use local generation as fallback
    if (!isEditMode) {
      const grNo = generateGRNumber(book);
      setFormData(prev => ({ ...prev, gr_no: grNo }));
    }
    setShowBillBookDropdown(false);
  };
  const handlePrint = () => {
    setShowPrintModal(false);
    setShowPrintBilty(true);
  };

  const handleSaveOnly = () => {
    setShowPrintModal(false);
    resetForm();  };

  const handlePrintClose = () => {
    setShowPrintBilty(false);
  // Always reset to new bilty after print, regardless of edit mode
    resetForm();
  };

  const refreshConsignorConsigneeData = async () => {
    try {
      const [consignorsRes, consigneesRes] = await Promise.all([
        supabase.from('consignors').select('*').order('company_name'),
        supabase.from('consignees').select('*').order('company_name')
      ]);
      
      setConsignors(consignorsRes.data || []);
      setConsignees(consigneesRes.data || []);
    } catch (error) {
      console.error('Error refreshing consignor/consignee data:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-slate-700 to-slate-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <FileText className="w-8 h-8 text-black" />
            </div>
            <div className="text-2xl font-bold text-black mb-2">movesure.io</div>
            <div className="w-20 h-1 bg-gradient-to-r from-slate-700 to-slate-500 mx-auto rounded-full mb-4"></div>
            <div className="text-lg font-semibold text-black">Loading Bilty Form...</div>
            <div className="text-sm text-gray-600 mt-2">Preparing your workspace...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <Navbar />
      <div className="w-full px-4 py-3">
        {/* Bill Book Header - hidden per request */}
        {false && (
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 rounded-2xl shadow-xl p-6 mb-6 border border-slate-300">
            <div className="flex justify-between items-center">
              {/* Bill Book Selector */}
              <div className="relative">
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    BILL BOOK:
                  </span>
                  <button
                    onClick={() => setShowBillBookDropdown(!showBillBookDropdown)}
                    className="bg-white text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors border border-slate-200 flex items-center gap-2 shadow-sm"
                  >
                    <span>
                      {selectedBillBook ? `${selectedBillBook.prefix || ''}...${selectedBillBook.postfix || ''}` : 'Select Bill Book'}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                
                {showBillBookDropdown && (
                  <div className="absolute z-30 left-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                    {billBooks.map((book) => (
                      <button
                        key={book.id}
                        onClick={() => handleBillBookSelect(book)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 transition-colors first:rounded-t-xl last:rounded-b-xl last:border-b-0"
                      >
                        <div className="text-sm font-bold text-black">
                          {book.prefix || ''}{String(book.from_number).padStart(book.digits, '0')} - 
                          {book.prefix || ''}{String(book.to_number).padStart(book.digits, '0')}{book.postfix || ''}
                        </div>
                        <div className="text-xs text-gray-600">
                          Next: {generateGRNumber(book)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Edit Mode Indicator */}
              {isEditMode && currentBiltyId && (
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-black px-6 py-3 rounded-xl font-bold text-sm border-2 border-amber-300 shadow-lg">
                  EDITING: {formData.gr_no}
                </div>
              )}
            </div>
            {/* Keyboard Shortcuts */}
            {showShortcuts && (
              <div className="mt-4 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                <div className="text-sm text-white text-center font-medium">
                  <span className="font-bold">Keyboard Shortcuts:</span> Ctrl+S (Save) | Ctrl+D (Draft) | Ctrl+N (New) | Ctrl+E (Edit) | Alt+N (New Bill) | Alt+C (Challan) | Enter (Next Field)
                </div>
              </div>
            )}
          </div>
        )}

        {/* Keyboard Shortcuts (visible even when header hidden) */}
        {showShortcuts && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
            <div className="text-sm text-slate-600 text-center font-medium">
              <span className="font-semibold">Keyboard Shortcuts:</span> Ctrl+S (Save) | Ctrl+D (Draft) | Ctrl+N (New) | Ctrl+E (Edit) | Alt+N (New Bill) | Alt+C (Challan) | Enter (Next Field)
            </div>
          </div>
        )}

        {/* Form Sections - Compact Layout */}
  <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 space-y-4">
          {/* Row 1: GR Number Management */}
          <GRNumberSection 
            formData={formData}
            setFormData={setFormData}
            billBooks={billBooks}
            selectedBillBook={selectedBillBook}
            setSelectedBillBook={setSelectedBillBook}
            onLoadExistingBilty={loadExistingBilty}
            isEditMode={isEditMode}
            setIsEditMode={setIsEditMode}
            toggleEditMode={toggleEditMode}
            resetForm={resetForm}
            existingBilties={existingBilties}
            showShortcuts={showShortcuts}
            cities={cities}
            grSequenceError={grSequenceError}
            onFixGRSequence={fixGRSequence}
            grReservation={grReservation}
            nextAvailable={grReservation.nextAvailable}
            billBookValidation={grReservation.billBookValidation}
          />

          {/* ⭐ Live GR Reservation Status - Multi-user */}
          <GRLiveStatus
            branchReservations={grReservation.branchReservations}
            recentBilties={grReservation.recentBilties}
            currentUserId={user?.id}
            currentReservation={grReservation.reservation}
            reserving={grReservation.reserving}
            onRefresh={grReservation.refreshStatus}
            onReleaseById={grReservation.releaseById}
            onSwitchToReservation={grReservation.switchToReservation}
            myPendingReservations={grReservation.myPendingReservations}
            nextAvailable={grReservation.nextAvailable}
            grReservation={grReservation}
            enabled={!isEditMode}
          />

          {/* Row 2: City & Transport */}
          <CityTransportSection
            key={`city-transport-${resetKey}`}
            formData={formData}
            setFormData={setFormData}
            cities={cities}
            transports={transports}
            transportByCityId={transportByCityId}
            consignorRatesByCity={consignorRatesByCity}
            defaultRateByCityId={defaultRateByCityId}
            rates={rates}
            fromCityName={fromCityName}
            resetKey={resetKey}
          />

          {/* Row 3: Consignor & Consignee */}
          <ConsignorConsigneeSection
            key={`consignor-consignee-${resetKey}`}
            formData={formData}
            setFormData={setFormData}
            consignors={consignors}
            consignees={consignees}
            onDataUpdate={refreshConsignorConsigneeData}
          />

          {/* Row 4: Invoice Details */}
          <InvoiceDetailsSection
            key={`invoice-${resetKey}`}
            formData={formData}
            setFormData={setFormData}
            isEditMode={isEditMode}
          />          {/* Row 5: Package & Charges */}
          <PackageChargesSection
            key={`charges-${resetKey}`}
            formData={formData}
            setFormData={setFormData}
            rates={rates}
            cities={cities}
            consignorRatesByCity={consignorRatesByCity}
            defaultRateByCityId={defaultRateByCityId}
            onSave={handleSave}
            onSaveDraft={() => handleSave(true)}
            onReset={resetForm}
            saving={saving}
            isEditMode={isEditMode}
            showShortcuts={showShortcuts}
          />
        </div>
      </div>

      {/* Print Modal */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        onPrint={handlePrint}
        onSaveOnly={handleSaveOnly}
        biltyData={savedBiltyData}
        branchData={branchData}
        cities={cities}
        fromCityName={fromCityName}
        toCityName={toCityName}
        showShortcuts={showShortcuts}
        onNewBilty={resetForm}
      />      {/* Print Component */}
      {showPrintBilty && savedBiltyData && (
        <PrintBilty
          biltyData={savedBiltyData}
          branchData={branchData}
                  fromCityName={fromCityName}
          toCityName={toCityName}
          onClose={handlePrintClose}        />      )}
    </div>
  );
}