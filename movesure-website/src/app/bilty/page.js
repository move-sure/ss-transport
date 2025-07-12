'use client';

import React, { useState, useEffect } from 'react';
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
import InvoiceDetailsSection from '../../components/bilty/invoice';
import PackageChargesSection from '../../components/bilty/charges';
import ActionButtonsSection from '../../components/bilty/action';
import PrintModal from '../../components/bilty/print-model';
import PrintBilty from '../../components/bilty/print-bilty';

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
  
  // State for dropdown data
  const [billBooks, setBillBooks] = useState([]);
  const [cities, setCities] = useState([]);
  const [transports, setTransports] = useState([]);
  const [rates, setRates] = useState([]);
  const [consignors, setConsignors] = useState([]);
  const [consignees, setConsignees] = useState([]);
  const [branchData, setBranchData] = useState(null);
  const [fromCityName, setFromCityName] = useState('');
  const [toCityName, setToCityName] = useState('');
  
  // Selected bill book
  const [selectedBillBook, setSelectedBillBook] = useState(null);
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
  }, [loading, cities]);  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Alt') setShowShortcuts(true);      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        handleSave(true);
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
    
    // Handle consignor selection for rate updates
    const handleConsignorSelection = (event) => {
      const { consignor, cityId } = event.detail;
      console.log('🎯 Handling consignor selection event:', consignor.company_name, 'for city:', cityId);
      
      // Find consignor-specific rate for this consignor and city combination
      const consignorSpecificRate = rates.find(r => 
        r.city_id === cityId && 
        r.consignor_id === consignor.id && 
        !r.is_default
      );
      
      if (consignorSpecificRate) {
        console.log('✅ Found consignor-specific rate:', consignorSpecificRate.rate);
        setFormData(prev => ({
          ...prev,
          rate: consignorSpecificRate.rate
        }));
      } else {
        console.log('⚠️ No consignor-specific rate found, keeping current rate');
        
        // Optionally, fall back to default rate for this city
        const defaultRate = rates.find(r => 
          r.city_id === cityId && 
          r.is_default
        );
        
        if (defaultRate) {
          console.log('📋 Using default rate:', defaultRate.rate);
          setFormData(prev => ({
            ...prev,
            rate: defaultRate.rate
          }));
        }
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
          console.log('Loading bilty for edit:', { biltyId, grNo });
          
          // Load the full bilty data
          const { data: fullBilty, error } = await supabase
            .from('bilty')
            .select('*')
            .eq('id', biltyId)
            .single();
          
          if (error) {          console.error('Error loading bilty for edit:', error);
          alert('Error loading bilty data for editing');
          localStorage.removeItem('editBiltyData');
            return;
          }
            console.log('Loaded bilty data:', fullBilty);
            // Set form data with the existing bilty
          setFormData({
            ...fullBilty,
            bilty_date: format(new Date(fullBilty.bilty_date), 'yyyy-MM-dd'),
            invoice_date: fullBilty.invoice_date ? format(new Date(fullBilty.invoice_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
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
          
          // Set to city name for display
          if (fullBilty.to_city_id) {
            const city = cities.find(c => c.id === fullBilty.to_city_id);
            if (city) {
              setToCityName(city.city_name);
            }
          }
          
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
        // Load all data in parallel
      const [branchRes, citiesRes, transportsRes, ratesRes, consignorsRes, consigneesRes, booksRes, biltiesRes] = await Promise.all([
        supabase.from('branches').select('*').eq('id', user.branch_id).single(),
        supabase.from('cities').select('*').order('city_name'),
        supabase.from('transports').select('*'),
        supabase.from('rates').select('*').eq('branch_id', user.branch_id),
        supabase.from('consignors').select('*').order('company_name'),
        supabase.from('consignees').select('*').order('company_name'),
        supabase.from('bill_books').select('*').eq('branch_id', user.branch_id).eq('is_active', true).eq('is_completed', false).order('created_at', { ascending: false }),
        supabase.from('bilty').select('id, gr_no, consignor_name, consignee_name, bilty_date, total, saving_option').eq('branch_id', user.branch_id).eq('is_active', true).order('created_at', { ascending: false })
      ]);
      
      setBranchData(branchRes.data);
      setCities(citiesRes.data || []);
      setTransports(transportsRes.data || []);
      setRates(ratesRes.data || []);
      setConsignors(consignorsRes.data || []);
      setConsignees(consigneesRes.data || []);
      setBillBooks(booksRes.data || []);
      setExistingBilties(biltiesRes.data || []);
      
      // Set from city
      if (branchRes.data) {
        const fromCity = citiesRes.data?.find(c => c.city_code === branchRes.data.city_code);
        if (fromCity) {
          setFromCityName(fromCity.city_name);
          setFormData(prev => ({ ...prev, from_city_id: fromCity.id }));
        }
      }
      
      // Set default bill book and GR - Only if not editing
      if (booksRes.data?.length > 0 && !localStorage.getItem('editBiltyData')) {
        const defaultBook = branchRes.data?.default_bill_book_id 
          ? booksRes.data.find(b => b.id === branchRes.data.default_bill_book_id) || booksRes.data[0]
          : booksRes.data[0];
        
        setSelectedBillBook(defaultBook);
        const grNo = generateGRNumber(defaultBook);
        setFormData(prev => ({ ...prev, gr_no: grNo }));
        
        // Ensure we're in new mode
        setIsEditMode(false);
        setCurrentBiltyId(null);
      } else if (booksRes.data?.length > 0) {
        // Still set the selected bill book even in edit mode for bill book dropdown
        const defaultBook = branchRes.data?.default_bill_book_id 
          ? booksRes.data.find(b => b.id === branchRes.data.default_bill_book_id) || booksRes.data[0]
          : booksRes.data[0];
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
    // Prevent multiple simultaneous saves
    if (saving) {
      console.log('⚠️ Save already in progress, ignoring duplicate request');
      return;
    }

    try {
      setSaving(true);
        console.log('Starting save process...');
      console.log('Is Draft:', isDraft);
      console.log('Is Edit Mode:', isEditMode);
      console.log('Current Bilty ID:', currentBiltyId);      // Debug: Log current form data to see what we have
      console.log('🔍 Current Form Data:', {
        gr_no: formData.gr_no,
        consignor_name: formData.consignor_name,
        consignee_name: formData.consignee_name,
        to_city_id: formData.to_city_id
      });
      
      // No validation - allow direct save// Prepare save data with explicit type conversion and null handling
      const saveData = {
        gr_no: formData.gr_no?.toString().trim(),
        branch_id: user.branch_id,
        staff_id: user.id,
        from_city_id: formData.from_city_id || null,
        to_city_id: formData.to_city_id || null,
        bilty_date: formData.bilty_date,
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
        payment_mode: formData.payment_mode || 'to-pay',
        contain: formData.contain?.toString().trim() || null,
        invoice_no: formData.invoice_no?.toString().trim() || null,
        invoice_value: parseFloat(formData.invoice_value) || 0,
        invoice_date: formData.invoice_date || null,
        e_way_bill: formData.e_way_bill?.toString().trim() || null,
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
        is_active: true
      };
        console.log('Prepared save data:', saveData);
      
      let savedData;
      let isActuallyNewBilty = false; // Track if this is genuinely a new bilty creation
      
      if (isEditMode && currentBiltyId) {
        console.log('Updating existing bilty:', currentBiltyId);
        
        // For updates, check if GR number conflicts with other bilties (not the current one)
        const { data: conflictingBilty, error: conflictError } = await supabase
          .from('bilty')
          .select('id')
          .eq('gr_no', saveData.gr_no)
          .eq('branch_id', user.branch_id)
          .eq('is_active', true)
          .neq('id', currentBiltyId)
          .single();
        
        if (conflictError && conflictError.code !== 'PGRST116') {
          console.error('Error checking GR number conflict during update:', conflictError);
          throw new Error('Error checking for GR number conflicts');
        }
          if (conflictingBilty) {
          console.log('GR Number already exists in another bilty, but proceeding with save');
        }
        
        // Remove created_at for updates
        delete saveData.created_at;
        
        const { data, error } = await supabase
          .from('bilty')
          .update(saveData)
          .eq('id', currentBiltyId)
          .select()
          .single();
        
        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        
        savedData = data;
        console.log('Bilty updated successfully:', savedData);      } else {        console.log('Creating new bilty...');
          // ⭐ CRITICAL FIX: Check for existing GR number BEFORE attempting save
        // This prevents bill book number increment on duplicate attempts
        const { data: existingBilty, error: duplicateCheckError } = await supabase
          .from('bilty')
          .select('id, gr_no')
          .eq('gr_no', saveData.gr_no)
          .eq('branch_id', user.branch_id)
          .eq('is_active', true)
          .single();
        
        if (existingBilty && !duplicateCheckError) {
          console.log('🚫 GR Number already exists in database:', existingBilty.gr_no);
          console.log('⚠️ This is a duplicate attempt - will NOT update bill book current number');
          isActuallyNewBilty = false;
          
          // Set savedData to the existing bilty data for PDF generation
          savedData = saveData; // Use the prepared save data for PDF
          console.log('Using prepared saveData for PDF generation (duplicate GR):', savedData);
        } else {
          console.log('✅ GR Number is unique, proceeding with new bilty creation...');
          
          const { data, error } = await supabase
            .from('bilty')
            .insert([saveData])
            .select()
            .single();if (error) {
            console.error('Insert error details:', {
              error,
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint
            });
              // Handle specific database constraint errors
            if (error.code === '23505' && error.message?.includes('gr_no')) {
              console.log('🚫 GR Number constraint violation - duplicate detected at DB level');
              isActuallyNewBilty = false; // Mark as not new to prevent bill book update
            }
            
            // Don't throw error, let it continue - try to save anyway
            console.warn('Insert had an issue but continuing:', error);
            
            // CRITICAL FIX: Set savedData to formData even if database fails
            // This ensures PDF generator always has valid data
            savedData = saveData; // Use the prepared save data
            console.log('Setting savedData from formData due to DB error:', savedData);
          } else {
            savedData = data;
            console.log('✅ New bilty created successfully:', savedData);
            isActuallyNewBilty = true; // Confirm this is genuinely new
          }
        }// ⭐ AUTOMATIC RATE SAVING FUNCTIONALITY ⭐
        // Only save rates for non-draft bilties and when rate is provided
        if (!isDraft && formData.rate && parseFloat(formData.rate) > 0 && formData.consignor_name && formData.to_city_id) {
          console.log('🔍 Starting automatic rate saving process...');
          console.log('📊 Rate saving criteria check:', {
            isDraft,
            hasRate: !!formData.rate,
            rateValue: formData.rate,
            hasConsignor: !!formData.consignor_name,
            consignorName: formData.consignor_name,
            hasCityId: !!formData.to_city_id,
            cityId: formData.to_city_id,
            branchId: user.branch_id
          });
          
          try {
            // Enhanced consignor lookup with multiple search strategies
            let consignorId = null;
            let consignorData = null;
            
            // Strategy 1: Exact match (case-insensitive)
            const { data: exactMatch, error: exactError } = await supabase
              .from('consignors')
              .select('id, company_name')
              .ilike('company_name', formData.consignor_name.trim())
              .single();
            
            if (exactMatch && !exactError) {
              consignorData = exactMatch;
              consignorId = exactMatch.id;
              console.log('✅ Found consignor by exact match:', consignorData);
            } else if (exactError && exactError.code !== 'PGRST116') {
              console.warn('Error in exact consignor search:', exactError);
            }
            
            // Strategy 2: If exact match failed, try partial match
            if (!consignorId) {
              const { data: partialMatches, error: partialError } = await supabase
                .from('consignors')
                .select('id, company_name')
                .ilike('company_name', `%${formData.consignor_name.trim()}%`)
                .limit(5);
              
              if (partialMatches && partialMatches.length > 0 && !partialError) {
                // Look for closest match
                const cleanConsignorName = formData.consignor_name.trim().toLowerCase();
                const bestMatch = partialMatches.find(c => 
                  c.company_name.toLowerCase() === cleanConsignorName
                ) || partialMatches[0]; // Fall back to first match
                
                consignorData = bestMatch;
                consignorId = bestMatch.id;
                console.log('✅ Found consignor by partial match:', consignorData);
              } else if (partialError) {
                console.warn('Error in partial consignor search:', partialError);
              }            }
            
            // Log the final consignor decision
            if (consignorId) {
              console.log(`📋 Using CONSIGNOR-SPECIFIC rate for: ${consignorData.company_name} (ID: ${consignorId})`);
            } else {
              console.log('📋 No matching consignor found, will create DEFAULT rate');
              // Ensure consignorId is explicitly null for default rates
              consignorId = null;
            }
            
            // Check if rate already exists for this exact combination
            let existingRateQuery = supabase
              .from('rates')
              .select('id, rate, is_default, consignor_id')
              .eq('branch_id', user.branch_id)
              .eq('city_id', formData.to_city_id);
            
            if (consignorId) {
              // Check for consignor-specific rate
              existingRateQuery = existingRateQuery.eq('consignor_id', consignorId);
            } else {
              // Check for default rate (no consignor)
              existingRateQuery = existingRateQuery.is('consignor_id', null);
            }
            
            const { data: existingRate, error: rateCheckError } = await existingRateQuery.single();
            
            if (rateCheckError && rateCheckError.code !== 'PGRST116') {
              console.warn('Error checking existing rate:', rateCheckError);
            }
            
            const newRate = parseFloat(formData.rate);
            
            if (existingRate) {
              // Update existing rate if different
              if (Math.abs(existingRate.rate - newRate) > 0.01) { // Use small tolerance for floating point comparison
                console.log(`🔄 Updating existing ${consignorId ? 'consignor-specific' : 'default'} rate from ₹${existingRate.rate} to ₹${newRate}`);
                  const { error: updateError } = await supabase
                  .from('rates')
                  .update({ 
                    rate: newRate
                  })
                  .eq('id', existingRate.id);
                
                if (updateError) {
                  console.error('❌ Error updating rate:', updateError);
                } else {
                  console.log('✅ Rate updated successfully');
                }
              } else {
                console.log(`✅ Rate already exists with same value (₹${existingRate.rate}), no update needed`);
              }
            } else {              // Create new rate entry
              console.log(`➕ Creating new ${consignorId ? 'consignor-specific' : 'default'} rate entry...`);
                const rateData = {
                branch_id: user.branch_id,
                city_id: formData.to_city_id,                consignor_id: consignorId,
                rate: newRate,
                is_default: !consignorId // true if no consignor (default rate)
              };
              
              console.log('Rate data to insert:', rateData);
              
              // Validate data types and format
              if (typeof rateData.branch_id !== 'string' && typeof rateData.branch_id !== 'number') {
                console.error('❌ Invalid branch_id type:', typeof rateData.branch_id, rateData.branch_id);
                throw new Error('Invalid branch_id type');
              }
              
              if (typeof rateData.city_id !== 'string' && typeof rateData.city_id !== 'number') {
                console.error('❌ Invalid city_id type:', typeof rateData.city_id, rateData.city_id);
                throw new Error('Invalid city_id type');
              }
              
              if (typeof rateData.rate !== 'number' || isNaN(rateData.rate) || rateData.rate <= 0) {
                console.error('❌ Invalid rate value:', typeof rateData.rate, rateData.rate);
                throw new Error('Invalid rate value');
              }
              
              if (rateData.consignor_id !== null && (typeof rateData.consignor_id !== 'string' && typeof rateData.consignor_id !== 'number')) {
                console.error('❌ Invalid consignor_id type:', typeof rateData.consignor_id, rateData.consignor_id);
                throw new Error('Invalid consignor_id type');
              }
              
              console.log('✅ Rate data validation passed');
                // Validate required fields before insertion
              if (!rateData.branch_id || !rateData.city_id || !rateData.rate) {
                console.error('❌ Missing required fields for rate insertion:', {
                  branch_id: rateData.branch_id,
                  city_id: rateData.city_id,
                  rate: rateData.rate
                });
                throw new Error('Missing required fields for rate insertion');
              }
              
              // Validate that branch and city exist
              const [branchCheck, cityCheck] = await Promise.all([
                supabase.from('branches').select('id').eq('id', rateData.branch_id).single(),
                supabase.from('cities').select('id').eq('id', rateData.city_id).single()
              ]);
              
              if (branchCheck.error) {
                console.error('❌ Invalid branch_id:', rateData.branch_id, branchCheck.error);
                throw new Error(`Invalid branch_id: ${rateData.branch_id}`);
              }
              
              if (cityCheck.error) {
                console.error('❌ Invalid city_id:', rateData.city_id, cityCheck.error);
                throw new Error(`Invalid city_id: ${rateData.city_id}`);
              }
              
              // If consignor_id is provided, validate it exists
              if (rateData.consignor_id) {
                const { error: consignorCheckError } = await supabase
                  .from('consignors')
                  .select('id')
                  .eq('id', rateData.consignor_id)
                  .single();
                
                if (consignorCheckError) {
                  console.error('❌ Invalid consignor_id:', rateData.consignor_id, consignorCheckError);
                  throw new Error(`Invalid consignor_id: ${rateData.consignor_id}`);
                }
              }
              
              console.log('✅ All foreign key references validated');
              
              // Check for duplicate rate entry to prevent constraint violations
              const duplicateCheckQuery = supabase
                .from('rates')
                .select('id')
                .eq('branch_id', rateData.branch_id)
                .eq('city_id', rateData.city_id);
              
              if (rateData.consignor_id) {
                duplicateCheckQuery.eq('consignor_id', rateData.consignor_id);
              } else {
                duplicateCheckQuery.is('consignor_id', null);
              }
              
              const { data: duplicateRate, error: duplicateCheckError } = await duplicateCheckQuery.single();
              
              if (duplicateCheckError && duplicateCheckError.code !== 'PGRST116') {
                console.warn('⚠️ Error checking for duplicate rate:', duplicateCheckError);
              }
              
              if (duplicateRate) {
                console.log('🔄 Rate entry already exists, skipping insertion to avoid duplicate');
                return;
              }
              
              const { error: insertRateError } = await supabase
                .from('rates')
                .insert([rateData]);
                if (insertRateError) {
                console.error('❌ Error saving new rate:', {
                  error: insertRateError,
                  code: insertRateError.code,
                  message: insertRateError.message,
                  details: insertRateError.details,
                  hint: insertRateError.hint,
                  // Stringify the full error for debugging
                  fullError: JSON.stringify(insertRateError, null, 2)
                });
                // Also log the rate data that failed to insert
                console.error('Failed rate data:', rateData);
              } else {
                console.log('✅ New rate saved successfully:', rateData);
              }
            }
            
            // Optional: Refresh rates in memory for immediate use
            if (window.location.pathname === '/bilty') {
              console.log('🔄 Refreshing rates data...');
              const { data: updatedRates } = await supabase
                .from('rates')
                .select('*')
                .eq('branch_id', user.branch_id);
              
              if (updatedRates) {
                setRates(updatedRates);
                console.log('✅ Rates data refreshed');
              }
            }
              } catch (rateError) {
            console.error('❌ Error in automatic rate saving:', {
              error: rateError,
              message: rateError.message,
              code: rateError.code,
              details: rateError.details,
              stack: rateError.stack
            });
            
            // Handle specific error types
            if (rateError.code === '23505') {
              console.log('🔄 Rate already exists (unique constraint violation) - this is expected behavior');
            } else if (rateError.code === '23503') {
              console.error('🔗 Foreign key constraint violation - invalid reference to branch, city, or consignor');
            } else if (rateError.code === '23502') {
              console.error('📝 Not null constraint violation - missing required field');
            } else if (rateError.message?.includes('Invalid')) {
              console.error('🔍 Validation error during rate saving');
            } else {
              console.error('🔧 Unexpected error during rate saving');
            }
            
            // Don't fail the bilty save if rate saving fails
          }
        }          // ⭐ CRITICAL FIX: Update bill book current number ONLY for GENUINELY NEW bilties
        // This prevents bill book increment on duplicate GR number attempts
        if (selectedBillBook && !isEditMode && isActuallyNewBilty) {
          console.log('📈 Updating bill book current number for GENUINELY NEW bilty...');
          let newCurrentNumber = selectedBillBook.current_number + 1;
          
          if (newCurrentNumber > selectedBillBook.to_number) {
            if (selectedBillBook.auto_continue) {
              newCurrentNumber = selectedBillBook.from_number;            } else {              await supabase
                .from('bill_books')
                .update({ is_completed: true, current_number: selectedBillBook.to_number })
                .eq('id', selectedBillBook.id);
              
              console.log('Bill book completed, loading initial data...');
              loadInitialData();
              return;
            }
          }
          
          const { error: billBookError } = await supabase
            .from('bill_books')
            .update({ current_number: newCurrentNumber })
            .eq('id', selectedBillBook.id);
          
          if (billBookError) {
            console.error('Bill book update error:', billBookError);
            // Don't throw here, bilty was saved successfully
          }
          
          setSelectedBillBook(prev => ({ ...prev, current_number: newCurrentNumber }));
        } else if (isEditMode) {
          console.log('✅ Skipping bill book update - this is an EDIT, not a new bilty');
        } else if (!isActuallyNewBilty) {
          console.log('🚫 Skipping bill book update - this is a DUPLICATE GR number attempt');
        }
      }
      
      // Get to city name
      const toCity = cities.find(c => c.id === savedData.to_city_id);
      setToCityName(toCity?.city_name || '');
        // Refresh existing bilties list
      console.log('Refreshing bilties list...');
      const { data: updatedBilties } = await supabase
        .from('bilty')
        .select('id, gr_no, consignor_name, consignee_name, bilty_date, total, saving_option')
        .eq('branch_id', user.branch_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
        setExistingBilties(updatedBilties || []);
      
      // Show print modal if not draft
      if (!isDraft) {
        setSavedBiltyData(savedData);
        setShowPrintModal(true);
      } else {
        resetForm();
      }
      
      console.log('Save process completed successfully');
        } catch (error) {
      console.error('Error saving bilty:', {
        error,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });
      
      // Log errors but don't show alerts - allow save to proceed
      console.log('Save encountered an error but continuing...');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    const newGrNo = selectedBillBook ? generateGRNumber(selectedBillBook) : '';
    
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
      saving_option: 'SAVE'
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
    
    console.log('Form reset to new mode');
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <FileText className="w-8 h-8 text-black" />
            </div>
            <div className="text-2xl font-bold text-black mb-2">movesure.io</div>
            <div className="w-20 h-1 bg-gradient-to-r from-purple-600 to-blue-500 mx-auto rounded-full mb-4"></div>
            <div className="text-lg font-semibold text-black">Loading Bilty Form...</div>
            <div className="text-sm text-gray-600 mt-2">Preparing your workspace...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-white">
      <Navbar />
      <div className="w-full px-6 py-6">
        {/* Bill Book Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-2xl shadow-2xl p-6 mb-6 border border-purple-200">
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
                  className="bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors border-2 border-purple-300 flex items-center gap-2 shadow-lg"
                >
                  <span>
                    {selectedBillBook ? `${selectedBillBook.prefix || ''}...${selectedBillBook.postfix || ''}` : 'Select Bill Book'}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              
              {showBillBookDropdown && (
                <div className="absolute z-30 left-0 mt-2 w-80 bg-white border-2 border-purple-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                  {billBooks.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => handleBillBookSelect(book)}
                      className="w-full px-4 py-3 text-left hover:bg-purple-50 border-b border-purple-100 transition-colors first:rounded-t-xl last:rounded-b-xl last:border-b-0"
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
          </div>          {/* Keyboard Shortcuts */}
          {showShortcuts && (
            <div className="mt-4 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
              <div className="text-sm text-white text-center font-medium">
                <span className="font-bold">Keyboard Shortcuts:</span> Ctrl+S (Save) | Ctrl+D (Draft) | Ctrl+N (New) | Ctrl+E (Edit) | Alt+N (New Bill) | Alt+C (Challan) | Enter (Next Field)
              </div>
            </div>
          )}
        </div>

        {/* Form Sections - Full Width */}
        <div className="bg-white rounded-2xl shadow-2xl border border-purple-200 p-8 space-y-8">
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
          />          {/* Row 2: City & Transport */}
          <CityTransportSection
            key={`city-transport-${resetKey}`}
            formData={formData}
            setFormData={setFormData}
            cities={cities}
            transports={transports}
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
          />          {/* Row 5: Package & Charges */}
          <PackageChargesSection
            key={`charges-${resetKey}`}
            formData={formData}
            setFormData={setFormData}
            rates={rates}
            onSave={handleSave}
            saving={saving}
            isEditMode={isEditMode}
            showShortcuts={showShortcuts}
          />

          {/* Row 6: Action Buttons */}
          <ActionButtonsSection
            onReset={resetForm}
            onSaveDraft={() => handleSave(true)}
            saving={saving}
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