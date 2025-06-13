'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/auth';
import { useRouter } from 'next/navigation';
import supabase from '../utils/supabase';
import { format } from 'date-fns';
import { ChevronDown, ArrowLeft, Building2, User, MapPin, Calendar, FileText, Settings } from 'lucide-react';
import { SimpleNavigationProvider } from '../../components/bilty/simple-navigation';

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
  const router = useRouter();  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Edit mode and print states
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentBiltyId, setCurrentBiltyId] = useState(null);
  const [existingBilties, setExistingBilties] = useState([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPrintBilty, setShowPrintBilty] = useState(false);
  const [savedBiltyData, setSavedBiltyData] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
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
      }
      // Alt+N for new bill
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        resetForm();
      }
      // Alt+C for challan page
      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        router.push('/challan');
      }
    };const handleKeyUp = (e) => {
      if (e.key === 'Alt') setShowShortcuts(false);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [formData, selectedBillBook, isEditMode, currentBiltyId]);

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
          
          if (error) {
            console.error('Error loading bilty for edit:', error);
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
            labour_rate: fullBilty.labour_rate || 20
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
        supabase.from('bilty').select('id, gr_no, consignor_name, consignee_name, bilty_date, total, saving_option').eq('branch_id', user.branch_id).eq('is_active', true).order('created_at', { ascending: false }).limit(50)
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
      
      if (error) throw error;
        setFormData({
        ...fullBilty,
        bilty_date: format(new Date(fullBilty.bilty_date), 'yyyy-MM-dd'),
        invoice_date: fullBilty.invoice_date ? format(new Date(fullBilty.invoice_date), 'yyyy-MM-dd') : '',
        pf_charge: fullBilty.pf_charge || 0,
        labour_rate: fullBilty.labour_rate || 20
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
  };

  const handleSave = async (isDraft = false) => {
    try {
      setSaving(true);
      
      // Enhanced validation
      console.log('Starting save process...');
      console.log('Form data:', formData);
      console.log('User:', user);
      console.log('Is Draft:', isDraft);
      console.log('Is Edit Mode:', isEditMode);
      console.log('Current Bilty ID:', currentBiltyId);
      
      // Validate required fields
      if (!formData.gr_no?.trim()) {
        alert('GR Number is required');
        return;
      }
      
      if (!formData.consignor_name?.trim()) {
        alert('Consignor name is required');
        return;
      }
      
      if (!formData.consignee_name?.trim()) {
        alert('Consignee name is required');
        return;
      }
      
      if (!formData.to_city_id) {
        alert('Destination city is required');
        return;
      }
      
      if (!user?.branch_id) {
        alert('Branch information is missing. Please login again.');
        return;
      }
        // Prepare save data with explicit type conversion and null handling
      const saveData = {
        gr_no: formData.gr_no?.toString().trim(),
        branch_id: user.branch_id,
        staff_id: user.id,
        from_city_id: formData.from_city_id || null,
        to_city_id: formData.to_city_id || null,
        bilty_date: formData.bilty_date,
        delivery_type: formData.delivery_type || 'godown-delivery',
        consignor_name: formData.consignor_name?.toString().trim(),
        consignor_gst: formData.consignor_gst?.toString().trim() || null,
        consignor_number: formData.consignor_number?.toString().trim() || null,
        consignee_name: formData.consignee_name?.toString().trim(),
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
        labour_rate: parseFloat(formData.labour_rate) || 20,
        pvt_marks: formData.pvt_marks?.toString().trim() || null,
        freight_amount: parseFloat(formData.freight_amount) || 0,
        labour_charge: parseFloat(formData.labour_charge) || 0,
        bill_charge: parseFloat(formData.bill_charge) || 0,
        toll_charge: parseFloat(formData.toll_charge) || 0,
        dd_charge: parseFloat(formData.dd_charge) || 0,
        other_charge: parseFloat(formData.other_charge) || 0,
        pf_charge: parseFloat(formData.pf_charge) || 0,
        total: parseFloat(formData.total) || 0,
        remark: formData.remark?.toString().trim() || null,
        saving_option: isDraft ? 'DRAFT' : 'SAVE',
        is_active: true,
        created_at: isEditMode ? undefined : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('Prepared save data:', saveData);
      
      let savedData;
      
      if (isEditMode && currentBiltyId) {
        console.log('Updating existing bilty:', currentBiltyId);
        
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
        console.log('Bilty updated successfully:', savedData);
      } else {
        console.log('Creating new bilty...');
        
        // Check for duplicate GR number only when creating new
        console.log('Checking for duplicate GR number...');
        const { data: existingBilty, error: duplicateError } = await supabase
          .from('bilty')
          .select('id')
          .eq('gr_no', formData.gr_no)
          .eq('branch_id', user.branch_id)
          .eq('is_active', true)
          .single();
        
        if (duplicateError && duplicateError.code !== 'PGRST116') {
          console.error('Error checking duplicate:', duplicateError);
          throw new Error('Error checking for duplicate GR number');
        }
        
        if (existingBilty) {
          alert('GR Number already exists! Please refresh and try again.');
          return;
        }
        
        console.log('No duplicate found, inserting new bilty...');
        const { data, error } = await supabase
          .from('bilty')
          .insert([saveData])
          .select()
          .single();
        
        if (error) {
          console.error('Insert error details:', {
            error,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw error;
        }
          savedData = data;
        console.log('New bilty created successfully:', savedData);
        
        // Update bill book current number for both draft and saved bilties
        if (selectedBillBook) {
          console.log('Updating bill book current number...');
          let newCurrentNumber = selectedBillBook.current_number + 1;
          
          if (newCurrentNumber > selectedBillBook.to_number) {
            if (selectedBillBook.auto_continue) {
              newCurrentNumber = selectedBillBook.from_number;
            } else {
              await supabase
                .from('bill_books')
                .update({ is_completed: true, current_number: selectedBillBook.to_number })
                .eq('id', selectedBillBook.id);
              
              alert('Bill book completed. Please select a new bill book.');
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
        .order('created_at', { ascending: false })
        .limit(50);
      
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
      
      // More specific error messages
      if (error?.code === '23505') {
        alert('Duplicate entry error. Please check your data and try again.');
      } else if (error?.code === '23502') {
        alert('Missing required field. Please fill all required fields.');
      } else if (error?.code === '23503') {
        alert('Invalid reference data. Please check city or branch selection.');
      } else if (error?.message?.includes('JWT')) {
        alert('Session expired. Please login again.');
        router.push('/login');
      } else {
        alert(`Error saving bilty: ${error?.message || 'Unknown error'}. Please try again.`);
      }
    } finally {
      setSaving(false);
    }
  };  const resetForm = () => {
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
    resetForm();
  };

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
    );  }

  return (
    <SimpleNavigationProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-white">
      <div className="w-full px-6 py-6">
        {/* Enhanced Header with Back Button */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-500 rounded-2xl shadow-2xl p-6 mb-6 border border-purple-200">
          {/* Top Section - Back Button and Brand */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-purple-600 p-3 rounded-xl transition-all transform hover:scale-105 border border-white border-opacity-20 flex items-center gap-2 font-medium"
              >
                <ArrowLeft className="w-5 h-5" />
                Dashboard
              </button>
              <div className="h-8 w-px bg-white bg-opacity-30"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white">movesure.io</div>
                  <div className="w-16 h-0.5 bg-white bg-opacity-40 rounded-full"></div>
                </div>
              </div>
            </div>

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
                <div className="absolute z-30 right-0 mt-2 w-80 bg-white border-2 border-purple-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
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
          </div>

          {/* Main Header Info */}
          <div className="flex justify-between items-center">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-white flex-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <div className="text-xs text-white text-opacity-80">BRANCH</div>
                  <div className="font-bold">{branchData?.branch_name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <div className="text-xs text-white text-opacity-80">STAFF</div>
                  <div className="font-bold">{user?.username}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <div className="text-xs text-white text-opacity-80">FROM CITY</div>
                  <div className="font-bold">{fromCityName}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <div className="text-xs text-white text-opacity-80">DATE</div>
                  <div className="font-bold">{format(new Date(), 'dd/MM/yyyy')}</div>
                </div>
              </div>
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
        showShortcuts={showShortcuts}
      />

      {/* Print Component */}
      {showPrintBilty && savedBiltyData && (
        <PrintBilty
          biltyData={savedBiltyData}
          branchData={branchData}
          fromCityName={fromCityName}
          toCityName={toCityName}
          onClose={handlePrintClose}        />
      )}
    </div>
    </SimpleNavigationProvider>
  );
}