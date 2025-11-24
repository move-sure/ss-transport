'use client';

import React, { useState, useEffect } from 'react';
import { X, Printer, Calendar, Building2, FileText, Search } from 'lucide-react';
import { format } from 'date-fns';
import supabase from '../../app/utils/supabase';

export default function KaatBillPrintForm({ bill, onClose, onProceedToPrint }) {
  const [formData, setFormData] = useState({
    transport_name: bill.transport_name || '',
    transport_gst: bill.transport_gst || '',
    transport_number: bill.transport_number || '',
    bill_date: bill.created_at ? format(new Date(bill.created_at), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  });
  
  const [transports, setTransports] = useState([]);
  const [filteredTransports, setFilteredTransports] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetchTransports();
  }, []);

  useEffect(() => {
    // If GST is provided and transport name is generic, try to fetch real transport
    if (bill.transport_gst && (bill.transport_name === 'Multiple Transports' || !bill.transport_name)) {
      fetchTransportByGST(bill.transport_gst);
    }
  }, [bill.transport_gst]);

  const fetchTransports = async () => {
    try {
      const { data, error } = await supabase
        .from('transports')
        .select('*')
        .order('transport_name');

      if (error) throw error;
      console.log('✅ Fetched transports:', data?.length || 0, data);
      setTransports(data || []);
    } catch (err) {
      console.error('❌ Error fetching transports:', err);
    }
  };

  const fetchTransportByGST = async (gstNumber) => {
    try {
      console.log('🔍 Searching transport by GST:', gstNumber);
      const { data, error } = await supabase
        .from('transports')
        .select('*')
        .eq('gst_number', gstNumber)
        .limit(1)
        .single();

      if (error) {
        console.log('⚠️ No exact match, trying case-insensitive search...');
        // Try case-insensitive search
        const { data: allData, error: err2 } = await supabase
          .from('transports')
          .select('*')
          .ilike('gst_number', gstNumber);
        
        if (!err2 && allData && allData.length > 0) {
          console.log('✅ Found transport (case-insensitive):', allData[0]);
          console.log('📱 Mobile Number:', allData[0].mob_number);
          setFormData(prev => ({
            ...prev,
            transport_name: allData[0].transport_name,
            transport_gst: allData[0].gst_number || prev.transport_gst,
            transport_number: allData[0].mob_number || prev.transport_number
          }));
        } else {
          console.log('❌ No transport found with GST:', gstNumber);
        }
      } else if (data) {
        console.log('✅ Found transport:', data);
        console.log('📱 Mobile Number:', data.mob_number);
        setFormData(prev => ({
          ...prev,
          transport_name: data.transport_name,
          transport_gst: data.gst_number || prev.transport_gst,
          transport_number: data.mob_number || prev.transport_number
        }));
      }
    } catch (err) {
      console.error('❌ Error fetching transport by GST:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Filter transports based on GST input
    if (name === 'transport_gst') {
      if (value.trim()) {
        const filtered = transports.filter(t => {
          const gst = t.gst_number?.toLowerCase() || '';
          const search = value.toLowerCase().trim();
          return gst.includes(search);
        });
        console.log('🔍 Filtered transports for GST "' + value + '":', filtered);
        setFilteredTransports(filtered);
        setShowSuggestions(filtered.length > 0);
      } else {
        setFilteredTransports([]);
        setShowSuggestions(false);
      }
    }
  };

  const handleSelectTransport = (transport) => {
    setFormData(prev => ({
      ...prev,
      transport_name: transport.transport_name,
      transport_gst: transport.gst_number || '',
      transport_number: transport.mob_number || ''
    }));
    setShowSuggestions(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.transport_name.trim()) {
      alert('Please enter transport name');
      return;
    }

    // Pass the form data to parent
    onProceedToPrint(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Printer className="w-6 h-6" />
              Print Kaat Bill
            </h2>
            <p className="text-white/80 text-sm mt-1">
              Review and edit details before printing
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Bill Summary */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Challan Number</div>
              <div className="font-bold text-gray-900 text-lg">{bill.challan_no}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Bilties</div>
              <div className="font-bold text-gray-900 text-lg">{bill.total_bilty_count}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Kaat Amount</div>
              <div className="font-bold text-green-600 text-lg">₹{parseFloat(bill.total_kaat_amount).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">GR Numbers</div>
              <div className="font-semibold text-gray-900 text-sm truncate" title={bill.gr_numbers?.join(', ')}>
                {bill.gr_numbers?.length || 0} bilties
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            {/* Transport GST */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Search className="w-4 h-4 inline mr-2" />
                Transport GST Number (Search)
              </label>
              <input
                type="text"
                name="transport_gst"
                value={formData.transport_gst}
                onChange={handleChange}
                onFocus={() => {
                  if (formData.transport_gst && filteredTransports.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-900 font-medium"
                placeholder="Type GST to search transport"
                maxLength={15}
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && filteredTransports.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredTransports.map((transport) => (
                    <div
                      key={transport.id}
                      onClick={() => handleSelectTransport(transport)}
                      className="px-4 py-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-0"
                    >
                      <div className="font-semibold text-gray-900">{transport.transport_name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        GST: {transport.gst_number} | Phone: {transport.mob_number}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transport Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-2" />
                Transport Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="transport_name"
                value={formData.transport_name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-900 font-medium"
                placeholder="Enter transport name"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Transport Phone Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Transport Phone Number
              </label>
              <input
                type="text"
                name="transport_number"
                value={formData.transport_number}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-900 font-medium"
                placeholder="Enter phone number (optional)"
                maxLength={15}
              />
            </div>

            {/* Bill Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Bill Date
              </label>
              <input
                type="date"
                name="bill_date"
                value={formData.bill_date}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-900 font-medium"
                style={{ colorScheme: 'light' }}
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5" />
              Proceed to Print
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
