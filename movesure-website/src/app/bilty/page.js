'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import { format } from 'date-fns';
import { ChevronDown } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
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
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    e_way_bill: '',
    document_number: '',
    no_of_pkg: 0,
    wt: 0,
    rate: 0,
    pvt_marks: '',
    freight_amount: 0,
    labour_charge: 0,
    bill_charge: 50,
    toll_charge: 0,
    dd_charge: 0,
    other_charge: 0,
    total: 50,
    remark: '',
    saving_option: 'SAVE'
  });

  // Load initial data
  useEffect(() => {
    if (user?.branch_id) {
      loadInitialData();
    }
  }, [user]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Alt') setShowShortcuts(true);
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
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
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Alt') setShowShortcuts(false);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [formData, selectedBillBook, isEditMode, currentBiltyId]);

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
      
      // Set default bill book and GR - ALWAYS NEW ON LOAD
      if (booksRes.data?.length > 0) {
        const defaultBook = branchRes.data?.default_bill_book_id 
          ? booksRes.data.find(b => b.id === branchRes.data.default_bill_book_id) || booksRes.data[0]
          : booksRes.data[0];
        
        setSelectedBillBook(defaultBook);
        const grNo = generateGRNumber(defaultBook);
        setFormData(prev => ({ ...prev, gr_no: grNo }));
        
        // Ensure we're in new mode
        setIsEditMode(false);
        setCurrentBiltyId(null);
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
        invoice_date: fullBilty.invoice_date ? format(new Date(fullBilty.invoice_date), 'yyyy-MM-dd') : ''
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
      
      if (!formData.gr_no || !formData.consignor_name) {
        alert('Please fill required fields');
        return;
      }
      
      const saveData = {
        ...formData,
        saving_option: isDraft ? 'DRAFT' : 'SAVE',
        is_active: true
      };
      
      let savedData;
      
      if (isEditMode && currentBiltyId) {
        const { data, error } = await supabase
          .from('bilty')
          .update(saveData)
          .eq('id', currentBiltyId)
          .select()
          .single();
        
        if (error) throw error;
        savedData = data;
      } else {
        // Check for duplicate GR number
        const { data: existingBilty } = await supabase
          .from('bilty')
          .select('id')
          .eq('gr_no', formData.gr_no)
          .eq('branch_id', user.branch_id)
          .eq('is_active', true)
          .single();
        
        if (existingBilty) {
          alert('GR Number already exists! Please refresh and try again.');
          return;
        }
        
        const { data, error } = await supabase
          .from('bilty')
          .insert([saveData])
          .select()
          .single();
        
        if (error) throw error;
        savedData = data;
        
        // Update bill book current number if not draft
        if (!isDraft && selectedBillBook) {
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
          
          await supabase
            .from('bill_books')
            .update({ current_number: newCurrentNumber })
            .eq('id', selectedBillBook.id);
          
          setSelectedBillBook(prev => ({ ...prev, current_number: newCurrentNumber }));
        }
      }
      
      // Get to city name
      const toCity = cities.find(c => c.id === savedData.to_city_id);
      setToCityName(toCity?.city_name || '');
      
      // Refresh existing bilties list
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
      
    } catch (error) {
      console.error('Error saving bilty:', error);
      alert('Error saving bilty. Please try again.');
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
      pvt_marks: '',
      freight_amount: 0,
      labour_charge: 0,
      bill_charge: 50,
      toll_charge: 0,
      dd_charge: 0,
      other_charge: 0,
      total: 50,
      remark: '',
      saving_option: 'SAVE'
    });
    
    setIsEditMode(false);
    setCurrentBiltyId(null);
    setToCityName('');
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
    resetForm();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-2xl font-bold text-gray-800">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 rounded-xl shadow-2xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8 text-white">
              <span className="text-lg font-semibold"><strong>BRANCH:</strong> {branchData?.branch_name}</span>
              <span className="text-lg font-semibold"><strong>STAFF:</strong> {user?.username}</span>
              <span className="text-lg font-semibold"><strong>FROM-CITY:</strong> {fromCityName}</span>
              <span className="text-lg font-semibold"><strong>DATE:</strong> {format(new Date(), 'dd/MM/yyyy')}</span>
            </div>
            
            {/* Bill Book Selector */}
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="text-white font-bold">BILL BOOK:</span>
                <button
                  onClick={() => setShowBillBookDropdown(!showBillBookDropdown)}
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-50 transition-colors border-2 border-blue-300 flex items-center gap-2 shadow-md"
                >
                  <span>
                    {selectedBillBook ? `${selectedBillBook.prefix || ''}...${selectedBillBook.postfix || ''}` : 'Select Bill Book'}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              
              {showBillBookDropdown && (
                <div className="absolute z-30 right-0 mt-2 w-80 bg-white border-2 border-blue-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  {billBooks.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => handleBillBookSelect(book)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-blue-100 transition-colors"
                    >
                      <div className="text-sm font-bold text-black">
                        {book.prefix || ''}{String(book.from_number).padStart(book.digits, '0')} - 
                        {book.prefix || ''}{String(book.to_number).padStart(book.digits, '0')}{book.postfix || ''}
                      </div>
                      <div className="text-xs text-black">
                        Next: {generateGRNumber(book)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {showShortcuts && (
              <div className="text-xs text-white bg-blue-700 p-3 rounded-lg border border-blue-400">
                <div>Ctrl+S (Save) | Ctrl+D (Draft) | Ctrl+N (New) | Ctrl+E (Edit)</div>
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-2xl border border-blue-200 p-6 space-y-6">
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
          />

          {/* Row 2: City & Transport */}
          <CityTransportSection
            formData={formData}
            setFormData={setFormData}
            cities={cities}
            transports={transports}
            rates={rates}
            fromCityName={fromCityName}
          />

          {/* Row 3: Consignor & Consignee */}
          <ConsignorConsigneeSection
            formData={formData}
            setFormData={setFormData}
            consignors={consignors}
            consignees={consignees}
          />

          {/* Row 4: Invoice Details */}
          <InvoiceDetailsSection
            formData={formData}
            setFormData={setFormData}
          />

          {/* Row 5: Package & Charges */}
          <PackageChargesSection
            formData={formData}
            setFormData={setFormData}
            rates={rates}
          />

          {/* Row 6: Action Buttons */}
          <ActionButtonsSection
            onSave={handleSave}
            onReset={resetForm}
            onSaveDraft={() => handleSave(true)}
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
        showShortcuts={showShortcuts}
      />

      {/* Print Component */}
      {showPrintBilty && savedBiltyData && (
        <PrintBilty
          biltyData={savedBiltyData}
          branchData={branchData}
          fromCityName={fromCityName}
          toCityName={toCityName}
          onClose={handlePrintClose}
        />
      )}
    </div>
  );
}