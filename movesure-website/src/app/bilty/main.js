'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import { format } from 'date-fns';
import { FileText } from 'lucide-react';

// Import all components
import GRNumberSection from './components/GRNumberSection';
import CityTransportSection from './components/CityTransportSection';
import ConsignorConsigneeSection from './components/ConsignorConsigneeSection';
import InvoiceDetailsSection from './components/InvoiceDetailsSection';
import PackageChargesSection from './components/PackageChargesSection';
import ActionButtonsSection from './components/ActionButtonsSection';

export default function BiltyForm() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // State for dropdown data
  const [billBooks, setBillBooks] = useState([]);
  const [cities, setCities] = useState([]);
  const [transports, setTransports] = useState([]);
  const [rates, setRates] = useState([]);
  const [consignors, setConsignors] = useState([]);
  const [consignees, setConsignees] = useState([]);
  const [branchData, setBranchData] = useState(null);
  const [fromCityName, setFromCityName] = useState('');
  
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
    total: 0,
    remark: '',
    saving_option: 'SAVE'
  });

  // Load initial data
  useEffect(() => {
    if (user?.branch_id) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Set user data
      setFormData(prev => ({
        ...prev,
        branch_id: user.branch_id,
        staff_id: user.id
      }));
      
      // Load branch data
      const { data: branch } = await supabase
        .from('branches')
        .select('*')
        .eq('id', user.branch_id)
        .single();
      
      if (branch) {
        setBranchData(branch);
        
        // Get city name for from_city
        const { data: fromCity } = await supabase
          .from('cities')
          .select('*')
          .eq('city_code', branch.city_code)
          .single();
        
        if (fromCity) {
          setFromCityName(fromCity.city_name);
          setFormData(prev => ({ ...prev, from_city_id: fromCity.id }));
        }
      }
      
      // Load bill books for this branch
      const { data: books } = await supabase
        .from('bill_books')
        .select('*')
        .eq('branch_id', user.branch_id)
        .eq('is_active', true)
        .eq('is_completed', false)
        .order('created_at', { ascending: false });
      
      setBillBooks(books || []);
      
      // Set default bill book
      if (books && books.length > 0) {
        const defaultBook = branch?.default_bill_book_id 
          ? books.find(b => b.id === branch.default_bill_book_id) || books[0]
          : books[0];
        
        setSelectedBillBook(defaultBook);
        const grNo = generateGRNumber(defaultBook);
        setFormData(prev => ({ ...prev, gr_no: grNo }));
      }
      
      // Load other data
      const [citiesRes, transportsRes, ratesRes, consignorsRes, consigneesRes] = await Promise.all([
        supabase.from('cities').select('*').order('city_name'),
        supabase.from('transports').select('*'),
        supabase.from('rates').select('*').eq('branch_id', user.branch_id),
        supabase.from('consignors').select('*').order('company_name'),
        supabase.from('consignees').select('*').order('company_name')
      ]);
      
      setCities(citiesRes.data || []);
      setTransports(transportsRes.data || []);
      setRates(ratesRes.data || []);
      setConsignors(consignorsRes.data || []);
      setConsignees(consigneesRes.data || []);
      
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

  const handleSave = async (isDraft = false) => {
    try {
      setSaving(true);
      
      // Validate required fields
      if (!formData.gr_no || !formData.consignor_name) {
        alert('Please fill all required fields');
        return;
      }
      
      // Prepare data
      const saveData = {
        ...formData,
        saving_option: isDraft ? 'DRAFT' : 'SAVE',
        is_active: true
      };
      
      // Save bilty
      const { data, error } = await supabase
        .from('bilty')
        .insert([saveData])
        .select()
        .single();
      
      if (error) throw error;
      
      // Update bill book current number if not draft
      if (!isDraft && selectedBillBook) {
        let newCurrentNumber = selectedBillBook.current_number + 1;
        
        // Check if bill book is completed
        if (newCurrentNumber > selectedBillBook.to_number) {
          if (selectedBillBook.auto_continue) {
            // Auto-continue: reset to from_number
            newCurrentNumber = selectedBillBook.from_number;
          } else {
            // Mark as completed
            await supabase
              .from('bill_books')
              .update({ is_completed: true, current_number: selectedBillBook.to_number })
              .eq('id', selectedBillBook.id);
            
            alert('Bill book completed. Please select a new bill book.');
            loadInitialData();
            return;
          }
        }
        
        // Update current number
        await supabase
          .from('bill_books')
          .update({ current_number: newCurrentNumber })
          .eq('id', selectedBillBook.id);
      }
      
      alert(isDraft ? 'Bilty saved as draft!' : 'Bilty saved successfully!');
      
      // Reset form
      resetForm();
      
    } catch (error) {
      console.error('Error saving bilty:', error);
      alert('Error saving bilty. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    const newGrNo = selectedBillBook ? generateGRNumber({
      ...selectedBillBook,
      current_number: selectedBillBook.current_number + 1
    }) : '';
    
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
      total: 0,
      remark: '',
      saving_option: 'SAVE'
    });
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave(false);
      }
      // Ctrl+D or Cmd+D to save as draft
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        handleSave(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, selectedBillBook]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Bilty</h1>
              <p className="text-sm text-gray-500 mt-1">
                Branch: {branchData?.branch_name} | Date: {format(new Date(), 'dd/MM/yyyy')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Save as Draft
            </button>
          </div>
        </div>
        
        {/* Form Sections */}
        <div className="space-y-6">
          <GRNumberSection 
            formData={formData}
            setFormData={setFormData}
            billBooks={billBooks}
            selectedBillBook={selectedBillBook}
            setSelectedBillBook={setSelectedBillBook}
          />
          
          <CityTransportSection
            formData={formData}
            setFormData={setFormData}
            cities={cities}
            transports={transports}
            rates={rates}
            fromCityName={fromCityName}
          />
          
          <ConsignorConsigneeSection
            formData={formData}
            setFormData={setFormData}
            consignors={consignors}
            consignees={consignees}
          />
          
          <InvoiceDetailsSection
            formData={formData}
            setFormData={setFormData}
          />
          
          <PackageChargesSection
            formData={formData}
            setFormData={setFormData}
            rates={rates}
          />
          
          {/* Action Buttons */}
          <ActionButtonsSection
            onSave={handleSave}
            onReset={resetForm}
            onSaveDraft={() => handleSave(true)}
            saving={saving}
          />
        </div>
      </div>
    </div>
  );
}