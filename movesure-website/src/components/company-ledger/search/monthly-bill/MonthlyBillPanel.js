'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Calendar, 
  FileText, 
  Save, 
  X, 
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import supabase from '@/app/utils/supabase';
import { useAuth } from '@/app/utils/auth';

export default function MonthlyBillPanel({ 
  selectedBilties = [], 
  onBillCreated,
  totals = {}
}) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  
  // Bill form state
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [billingStartDate, setBillingStartDate] = useState('');
  const [billingEndDate, setBillingEndDate] = useState('');
  const [remark, setRemark] = useState('');
  const [status, setStatus] = useState('PENDING');
  
  // Saving state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Generate bill number
  useEffect(() => {
    generateBillNumber();
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('bill_company_profile')
        .select('id, company_name, gst_num, pan, mobile_number, alternate_number, email, company_address, city, state, pincode, stakeholder_type, outstanding_amount')
        .order('company_name');
      
      if (error) throw error;
      setCompanies(data || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const generateBillNumber = async () => {
    if (!selectedCompany) {
      setBillNo('');
      return;
    }
    
    try {
      // Get count of existing bills for this company
      const { count, error } = await supabase
        .from('monthly_bill_master')
        .select('*', { count: 'exact', head: true })
        .eq('company_profile_id', selectedCompany.id);
      
      if (error) throw error;
      
      const prefix = selectedCompany.company_name?.substring(0, 3).toUpperCase() || 'MBL';
      const date = format(new Date(), 'yyMM');
      const sequence = String((count || 0) + 1).padStart(4, '0');
      setBillNo(`${prefix}-${date}-${sequence}`);
    } catch (err) {
      console.error('Error generating bill number:', err);
      setBillNo(`MBL-${format(new Date(), 'yyMMdd')}-0001`);
    }
  };

  // Filter companies based on search
  const filteredCompanies = useMemo(() => {
    if (!companySearch) return companies;
    const term = companySearch.toLowerCase();
    return companies.filter(c => 
      c.company_name?.toLowerCase().includes(term) ||
      c.gst_num?.toLowerCase().includes(term) ||
      c.city?.toLowerCase().includes(term) ||
      c.mobile_number?.includes(term) ||
      c.stakeholder_type?.toLowerCase().includes(term)
    );
  }, [companies, companySearch]);

  // Calculate bill totals from selected bilties
  const billTotals = useMemo(() => {
    return selectedBilties.reduce((acc, bilty) => {
      acc.freight += parseFloat(bilty.freight_amount || 0);
      acc.labour += parseFloat(bilty.labour_charge || 0);
      acc.bill_charge += parseFloat(bilty.bill_charge || 0);
      acc.toll += parseFloat(bilty.toll_charge || 0);
      acc.dd += parseFloat(bilty.dd_charge || 0);
      acc.other += parseFloat(bilty.other_charge || 0);
      acc.total += parseFloat(bilty.total || bilty.grand_total || bilty.amount || 0);
      return acc;
    }, { freight: 0, labour: 0, bill_charge: 0, toll: 0, dd: 0, other: 0, total: 0 });
  }, [selectedBilties]);

  const handleSelectCompany = (company) => {
    setSelectedCompany(company);
    setShowCompanyDropdown(false);
    setCompanySearch('');
  };

  const handleCreateBill = async () => {
    // Validation
    if (!selectedCompany) {
      setError('Please select a company');
      return;
    }
    if (!billNo) {
      setError('Bill number is required');
      return;
    }
    if (!billingStartDate || !billingEndDate) {
      setError('Billing period dates are required');
      return;
    }
    if (selectedBilties.length === 0) {
      setError('No bilties selected');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Fetch city data for mapping city_code to city_id and city_name
      // For regular bilties: to_city_id is UUID, need city_name
      // For station bilties: station is city_code, need city_id and city_name
      const regularCityIds = selectedBilties
        .filter(b => b.type === 'regular' && b.to_city_id)
        .map(b => b.to_city_id);
      
      const stationCityCodes = selectedBilties
        .filter(b => b.type === 'station' && b.station)
        .map(b => b.station);

      let cityMapById = {};  // { city_id: { city_name, city_code } }
      let cityMapByCode = {}; // { city_code: { city_id, city_name } }

      // Fetch cities by ID for regular bilties
      if (regularCityIds.length > 0) {
        const uniqueCityIds = [...new Set(regularCityIds)];
        const { data: citiesById } = await supabase
          .from('cities')
          .select('id, city_name, city_code')
          .in('id', uniqueCityIds);
        
        if (citiesById) {
          cityMapById = citiesById.reduce((m, c) => ({
            ...m,
            [c.id]: { city_name: c.city_name, city_code: c.city_code }
          }), {});
        }
      }

      // Fetch cities by code for station bilties
      if (stationCityCodes.length > 0) {
        const uniqueCityCodes = [...new Set(stationCityCodes)];
        const { data: citiesByCode } = await supabase
          .from('cities')
          .select('id, city_name, city_code')
          .in('city_code', uniqueCityCodes);
        
        if (citiesByCode) {
          cityMapByCode = citiesByCode.reduce((m, c) => ({
            ...m,
            [c.city_code]: { city_id: c.id, city_name: c.city_name }
          }), {});
        }
      }

      // 1. Create master bill
      const { data: masterBill, error: masterError } = await supabase
        .from('monthly_bill_master')
        .insert([{
          company_profile_id: selectedCompany.id,
          bill_no: billNo,
          bill_date: billDate,
          billing_start_date: billingStartDate,
          billing_end_date: billingEndDate,
          total_freight: billTotals.freight,
          total_labour: billTotals.labour,
          total_bill_charge: billTotals.bill_charge,
          total_toll: billTotals.toll,
          total_dd: billTotals.dd,
          total_other: billTotals.other,
          total_amount: billTotals.total,
          status: status,
          remark: remark || null,
          created_by: user?.id || null,
          updated_by: user?.id || null
        }])
        .select()
        .single();

      if (masterError) throw masterError;

      // 2. Create bill items for each selected bilty
      const billItems = selectedBilties.map(bilty => {
        const isRegular = bilty.type === 'regular';
        
        // Get city info based on bilty type
        let cityId = null;
        let destination = null;
        
        if (isRegular) {
          // Regular bilty: to_city_id is UUID
          cityId = bilty.to_city_id || null;
          destination = cityMapById[bilty.to_city_id]?.city_name || bilty.to_city_name || null;
        } else {
          // Station bilty: station is city_code
          const cityInfo = cityMapByCode[bilty.station];
          cityId = cityInfo?.city_id || null;
          destination = cityInfo?.city_name || bilty.station_city_name || bilty.station || null;
        }

        // Get payment mode - bilty uses payment_mode, station uses payment_status
        const paymentMode = bilty.payment_mode || bilty.payment_status || null;

        // Get delivery type and normalize to 'door' or 'godown'
        // bilty table: door-delivery, godown-delivery
        // station_bilty_summary: door, godown
        let deliveryType = bilty.delivery_type || null;
        if (deliveryType) {
          deliveryType = deliveryType.toLowerCase();
          if (deliveryType.includes('door')) {
            deliveryType = 'door';
          } else if (deliveryType.includes('godown')) {
            deliveryType = 'godown';
          } else {
            deliveryType = null; // Invalid value, set to null
          }
        }

        return {
          monthly_bill_id: masterBill.id,
          bilty_type: isRegular ? 'REGULAR' : 'MANUAL',
          gr_no: bilty.gr_no,
          bilty_date: bilty.bilty_date || bilty.created_at || null,
          // Logistics fields - destination, city_id, packages, weight, pvt_marks
          destination: destination,
          city_id: cityId,
          no_of_packages: parseInt(bilty.no_of_pkg || bilty.packages || bilty.no_of_packets || 0),
          weight: parseFloat(bilty.wt || bilty.weight || 0),
          pvt_marks: bilty.pvt_marks || null,
          // Payment mode and delivery type
          payment_mode: paymentMode,
          delivery_type: deliveryType,
          // Payment fields
          freight_amount: parseFloat(bilty.freight_amount || 0),
          rate: parseFloat(bilty.rate || 0),
          labour_rate: parseFloat(bilty.labour_rate || 0),
          labour_charge: parseFloat(bilty.labour_charge || 0),
          bill_charge: parseFloat(bilty.bill_charge || 0),
          toll_charge: parseFloat(bilty.toll_charge || 0),
          dd_charge: parseFloat(bilty.dd_charge || 0),
          other_charge: parseFloat(bilty.other_charge || 0),
          total_amount: parseFloat(bilty.total || bilty.grand_total || bilty.amount || 0),
          created_by: user?.id || null,
          updated_by: user?.id || null
        };
      });

      const { error: itemsError } = await supabase
        .from('monthly_bill_items')
        .insert(billItems);

      if (itemsError) throw itemsError;

      setSuccess(true);
      
      // Notify parent component
      if (onBillCreated) {
        onBillCreated(masterBill);
      }

      // Reset form after success
      setTimeout(() => {
        setSuccess(false);
        setSelectedCompany(null);
        setBillNo('');
        setBillingStartDate('');
        setBillingEndDate('');
        setRemark('');
      }, 3000);

    } catch (err) {
      console.error('Error creating bill:', err);
      setError(err.message || 'Failed to create bill');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200 px-3 py-2 mb-2 flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Left Section - Company Selection */}
        <div className="w-56">
          <div className="flex items-center gap-1 mb-1">
            <Building2 className="h-3 w-3 text-slate-600" />
            <span className="text-xs font-semibold text-slate-700">Monthly Bill</span>
          </div>
          
          {/* Company Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
              disabled={loadingCompanies}
              className="w-full flex items-center justify-between gap-1 px-2 py-1 bg-white border border-slate-300 rounded text-left hover:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              {loadingCompanies ? (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading...
                </span>
              ) : selectedCompany ? (
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 truncate">{selectedCompany.company_name}</div>
                </div>
              ) : (
                <span className="text-xs text-gray-400">Select company...</span>
              )}
              <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${showCompanyDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {showCompanyDropdown && (
              <div className="absolute z-50 w-72 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
                {/* Search */}
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                    <input
                      type="text"
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      placeholder="Search companies..."
                      className="w-full pl-7 pr-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                </div>
                
                {/* Options */}
                <div className="max-h-48 overflow-auto">
                  {filteredCompanies.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-gray-500 text-center">No companies found</div>
                  ) : (
                    filteredCompanies.map(company => (
                      <button
                        key={company.id}
                        onClick={() => handleSelectCompany(company)}
                        className={`w-full px-2 py-1.5 text-left hover:bg-blue-50 flex items-center justify-between ${
                          selectedCompany?.id === company.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-gray-900 truncate">{company.company_name}</div>
                          <div className="text-[10px] text-gray-500 truncate">
                            <span className={`inline-block px-1 rounded text-[9px] mr-1 ${
                              company.stakeholder_type === 'CONSIGNOR' ? 'bg-blue-100 text-blue-700' :
                              company.stakeholder_type === 'CONSIGNEE' ? 'bg-green-100 text-green-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {company.stakeholder_type}
                            </span>
                            {company.gst_num || 'No GST'} • {company.city || 'N/A'}
                          </div>
                        </div>
                        {selectedCompany?.id === company.id && (
                          <CheckCircle2 className="h-3 w-3 text-blue-600 flex-shrink-0 ml-1" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle Section - Bill Details */}
        <div className="flex items-center gap-2">
          {/* Bill Number */}
          <div className="w-28">
            <label className="text-[10px] text-gray-500 block">Bill No</label>
            <input
              type="text"
              value={billNo}
              onChange={(e) => setBillNo(e.target.value)}
              placeholder="Auto"
              className="w-full px-1.5 py-0.5 text-xs text-gray-900 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Bill Date */}
          <div className="w-28">
            <label className="text-[10px] text-gray-500 block">Bill Date</label>
            <input
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full px-1.5 py-0.5 text-xs text-gray-900 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Billing Start Date */}
          <div className="w-28">
            <label className="text-[10px] text-gray-500 block">Period Start</label>
            <input
              type="date"
              value={billingStartDate}
              onChange={(e) => setBillingStartDate(e.target.value)}
              className="w-full px-1.5 py-0.5 text-xs text-gray-900 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Billing End Date */}
          <div className="w-28">
            <label className="text-[10px] text-gray-500 block">Period End</label>
            <input
              type="date"
              value={billingEndDate}
              onChange={(e) => setBillingEndDate(e.target.value)}
              className="w-full px-1.5 py-0.5 text-xs text-gray-900 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status Select */}
          <div className="w-20">
            <label className="text-[10px] text-gray-500 block">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-1 py-0.5 text-xs text-gray-900 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="PENDING">Pending</option>
              <option value="FINAL">Final</option>
              <option value="PAID">Paid</option>
              <option value="TO-PAY">To Pay</option>
            </select>
          </div>

          {/* Remark */}
          <div className="w-32">
            <label className="text-[10px] text-gray-500 block">Remark</label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Optional..."
              className="w-full px-1.5 py-0.5 text-xs text-gray-900 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Right Section - Amount & Button */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Total Amount Display */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded px-2 py-1 text-white text-center">
            <div className="text-[9px] opacity-80">Amount</div>
            <div className="text-sm font-bold">₹{billTotals.total.toLocaleString('en-IN')}</div>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreateBill}
            disabled={saving || !selectedCompany || selectedBilties.length === 0}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              saving || !selectedCompany || selectedBilties.length === 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-3 w-3" />
                Create
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mt-1 flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
          <AlertCircle className="h-3 w-3" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {success && (
        <div className="mt-1 flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
          <CheckCircle2 className="h-3 w-3" />
          Bill created successfully!
        </div>
      )}
    </div>
  );
}
