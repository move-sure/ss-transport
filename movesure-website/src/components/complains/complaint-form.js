'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '../../app/utils/supabase';
import { AlertCircle, FileText, Calendar, AlertTriangle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';

const ComplaintForm = ({ grNo, biltyData, user, onSuccess }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bilty, setBilty] = useState(biltyData || null);
  const [fetchingBilty, setFetchingBilty] = useState(!biltyData && !!grNo);
  const [destinationCity, setDestinationCity] = useState('');
  const [grSearchInput, setGrSearchInput] = useState(grNo || '');
  const [showSearch, setShowSearch] = useState(!grNo);
  
  const [formData, setFormData] = useState({
    complaint_type: 'LOCATION_QUERY',
    complaint_description: '',
    priority: 'MEDIUM',
    expected_delivery_date: ''
  });

  useEffect(() => {
    if (grNo && !biltyData) {
      fetchBiltyByGRNo(grNo);
    }
  }, [grNo, biltyData]);

  const fetchBiltyByGRNo = async (grNumber) => {
    setFetchingBilty(true);
    try {
      console.log('Fetching bilty with GR No:', grNumber);
      
      // First fetch the bilty
      const { data: biltyData, error: biltyError } = await supabase
        .from('bilty')
        .select('*')
        .eq('gr_no', grNumber)
        .eq('is_active', true)
        .is('deleted_at', null)
        .single();

      if (biltyError) {
        console.error('Bilty fetch error:', biltyError);
        throw biltyError;
      }

      console.log('Bilty data:', biltyData);
      setBilty(biltyData);
      
      // Fetch destination city if to_city_id exists
      if (biltyData.to_city_id) {
        const { data: cityData, error: cityError } = await supabase
          .from('cities')
          .select('city_name, city_code')
          .eq('id', biltyData.to_city_id)
          .single();

        if (!cityError && cityData) {
          console.log('City data:', cityData);
          setDestinationCity(cityData.city_name);
        }
      }
    } catch (error) {
      console.error('Error fetching bilty:', error);
      alert(`Failed to fetch bilty details: ${error.message}`);
    } finally {
      setFetchingBilty(false);
    }
  };

  const generateComplaintNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('complaint_no')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error && error.code !== 'PGRST116') throw error;

      if (data && data.length > 0) {
        const lastComplaintNo = data[0].complaint_no;
        const numericPart = parseInt(lastComplaintNo.replace('SS', ''));
        const newNumber = numericPart + 1;
        return `SS${String(newNumber).padStart(4, '0')}`;
      } else {
        return 'SS0001';
      }
    } catch (error) {
      console.error('Error generating complaint number:', error);
      return `SS${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!bilty) {
      alert('Bilty information is required');
      return;
    }

    if (!formData.complaint_description.trim()) {
      alert('Please provide complaint description');
      return;
    }

    setLoading(true);

    try {
      const complaintNo = await generateComplaintNumber();

      // Fetch transit details for additional information
      const { data: transitData } = await supabase
        .from('transit_details')
        .select('*')
        .eq('gr_no', bilty.gr_no)
        .single();

      const complaintData = {
        complaint_no: complaintNo,
        gr_no: bilty.gr_no,
        bilty_id: bilty.id,
        complaint_type: formData.complaint_type,
        complaint_description: formData.complaint_description,
        priority: formData.priority,
        status: 'INVESTIGATING',
        destination_city: destinationCity,
        expected_delivery_date: formData.expected_delivery_date || null,
        challan_no: transitData?.challan_no || null,
        is_out_for_delivery: transitData?.is_out_of_delivery_from_branch2 || false,
        is_at_hub: transitData?.is_delivered_at_branch2 || false,
        is_out_for_delivery_from_hub: transitData?.is_out_of_delivery_from_branch2 || false,
        is_delivered_at_destination: false,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('complaints')
        .insert([complaintData])
        .select()
        .single();

      if (error) throw error;

      alert(`Complaint registered successfully! Complaint No: ${complaintNo}`);
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/tracking');
      }
    } catch (error) {
      console.error('Error creating complaint:', error);
      alert('Failed to create complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGrSearch = () => {
    if (!grSearchInput.trim()) {
      alert('Please enter GR Number');
      return;
    }
    setShowSearch(false);
    fetchBiltyByGRNo(grSearchInput.trim());
  };

  if (showSearch) {
    return (
      <div className="rounded-xl border-2 border-indigo-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
          <FileText className="h-6 w-6 text-indigo-600" />
          <span className="text-xl font-bold text-slate-900">Search Bilty by GR Number</span>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Enter GR Number</label>
            <input
              type="text"
              value={grSearchInput}
              onChange={(e) => setGrSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleGrSearch()}
              placeholder="e.g., A04544"
              className="w-full rounded-lg border-2 border-slate-300 px-4 py-3 text-base font-semibold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              autoFocus
            />
          </div>
          <button
            onClick={handleGrSearch}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-bold text-white shadow-lg transition hover:bg-indigo-700"
          >
            Search & Continue
          </button>
        </div>
      </div>
    );
  }

  if (fetchingBilty) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">Loading bilty details...</p>
        </div>
      </div>
    );
  }

  if (!bilty) {
    return (
      <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
        <p className="text-lg font-bold text-red-900 mb-2">Bilty Not Found</p>
        <p className="text-sm text-red-700 mb-4">Unable to load bilty information for GR No: {grSearchInput}</p>
        <button
          onClick={() => { setShowSearch(true); setBilty(null); }}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white transition hover:bg-indigo-700"
        >
          Search Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bilty Information Card */}
      <div className="rounded-xl border-2 border-indigo-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <span className="font-bold text-slate-900">Bilty Information</span>
          </div>
          <button
            type="button"
            onClick={() => { setShowSearch(true); setBilty(null); setDestinationCity(''); }}
            className="inline-flex items-center gap-1 rounded-lg border-2 border-indigo-600 bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50"
          >
            🔍 Change GR
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">GR Number</p>
            <p className="text-lg font-black text-indigo-900">GR-{bilty.gr_no}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Destination City</p>
            <p className="text-lg font-black text-green-700">{destinationCity || 'Loading...'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bilty Date</p>
            <p className="font-semibold text-slate-900">{new Date(bilty.bilty_date).toLocaleDateString()}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Consignor</p>
            <p className="font-semibold text-slate-900">{bilty.consignor_name}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Consignee</p>
            <p className="font-semibold text-slate-900">{bilty.consignee_name}</p>
          </div>
        </div>
      </div>

      {/* Complaint Form */}
      <form onSubmit={handleSubmit} className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <span className="font-bold text-slate-900">Register Complaint</span>
        </div>

        <div className="space-y-4">
          {/* Complaint Type */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Complaint Type *
            </label>
            <select
              value={formData.complaint_type}
              onChange={(e) => setFormData({ ...formData, complaint_type: e.target.value })}
              className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              required
            >
              <option value="LOCATION_QUERY">📍 Location Query</option>
              <option value="DELAY">⏰ Delivery Delay</option>
              <option value="DAMAGE">📦 Damage Report</option>
              <option value="MISSING">❌ Missing Items</option>
              <option value="OTHER">📝 Other Issue</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Priority *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority })}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-bold transition ${
                    formData.priority === priority
                      ? priority === 'URGENT'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : priority === 'HIGH'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : priority === 'MEDIUM'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-green-500 bg-green-50 text-green-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Complaint Description *
            </label>
            <textarea
              value={formData.complaint_description}
              onChange={(e) => setFormData({ ...formData, complaint_description: e.target.value })}
              rows={4}
              className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Describe your complaint in detail..."
              required
            />
          </div>

          {/* Expected Delivery Date */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Expected Delivery Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 pl-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          {/* Destination City */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Destination City
            </label>
            <input
              type="text"
              value={destinationCity}
              readOnly
              className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 cursor-not-allowed"
              placeholder="Auto-filled from bilty"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="inline h-4 w-4 mr-1" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 font-bold text-white shadow-lg transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="inline h-4 w-4 animate-spin mr-1" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="inline h-4 w-4 mr-1" />
                  Register Complaint
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ComplaintForm;
