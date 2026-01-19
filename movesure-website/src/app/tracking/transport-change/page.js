'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../utils/auth';
import supabase from '../../utils/supabase';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Truck, 
  FileText, 
  Save, 
  X, 
  AlertCircle, 
  CheckCircle,
  Phone,
  Building,
  User,
  MapPin,
  Package,
  RefreshCw
} from 'lucide-react';

export default function TransportChangePage() {
  const { user, requireAuth } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [grNumber, setGrNumber] = useState('');
  const [bilty, setBilty] = useState(null);
  const [transports, setTransports] = useState([]);
  const [cities, setCities] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Transport form state
  const [transportData, setTransportData] = useState({
    transport_name: '',
    transport_gst: '',
    transport_number: ''
  });
  
  const [showTransportDropdown, setShowTransportDropdown] = useState(false);
  const [transportSearch, setTransportSearch] = useState('');
  const transportRef = useRef(null);
  const grInputRef = useRef(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!requireAuth()) {
      router.push('/login');
    }
  }, [requireAuth, router]);

  // Load initial data
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Focus on GR input on mount
  useEffect(() => {
    if (grInputRef.current) {
      setTimeout(() => {
        grInputRef.current.focus();
      }, 100);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (transportRef.current && !transportRef.current.contains(event.target)) {
        setShowTransportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      const [transportsData, citiesData] = await Promise.all([
        supabase.from('transports').select('*').order('transport_name'),
        supabase.from('cities').select('*').order('city_name')
      ]);

      if (transportsData.error) throw transportsData.error;
      if (citiesData.error) throw citiesData.error;

      setTransports(transportsData.data || []);
      setCities(citiesData.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please refresh the page.');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!grNumber.trim()) {
      setError('Please enter a GR number');
      return;
    }

    setSearchLoading(true);
    setError(null);
    setSuccess(null);
    setBilty(null);

    try {
      const { data, error: searchError } = await supabase
        .from('bilty')
        .select('*')
        .ilike('gr_no', grNumber.trim())
        .eq('is_active', true)
        .single();

      if (searchError) {
        if (searchError.code === 'PGRST116') {
          throw new Error('No bilty found with this GR number');
        }
        throw searchError;
      }

      setBilty(data);
      setTransportData({
        transport_name: data.transport_name || '',
        transport_gst: data.transport_gst || '',
        transport_number: data.transport_number || ''
      });
      setTransportSearch(data.transport_name || '');
    } catch (err) {
      console.error('Error searching bilty:', err);
      setError(err.message || 'Failed to search bilty. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleTransportSelect = (transport) => {
    setTransportSearch(transport.transport_name);
    setTransportData({
      transport_name: transport.transport_name,
      transport_gst: transport.gst_number || '',
      transport_number: transport.mob_number || ''
    });
    setShowTransportDropdown(false);
  };

  const handleUpdateTransport = async () => {
    if (!bilty) {
      setError('No bilty selected');
      return;
    }

    if (!transportData.transport_name.trim()) {
      setError('Transport name is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('bilty')
        .update({
          transport_name: transportData.transport_name,
          transport_gst: transportData.transport_gst,
          transport_number: transportData.transport_number
        })
        .eq('id', bilty.id);

      if (updateError) throw updateError;

      setSuccess('Transport details updated successfully!');
      
      // Refresh bilty data
      const { data: updatedBilty } = await supabase
        .from('bilty')
        .select('*')
        .eq('id', bilty.id)
        .single();
      
      if (updatedBilty) {
        setBilty(updatedBilty);
      }

      // Clear form after 2 seconds
      setTimeout(() => {
        handleReset();
      }, 2000);
    } catch (err) {
      console.error('Error updating transport:', err);
      setError(err.message || 'Failed to update transport. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setGrNumber('');
    setBilty(null);
    setTransportData({
      transport_name: '',
      transport_gst: '',
      transport_number: ''
    });
    setTransportSearch('');
    setError(null);
    setSuccess(null);
    if (grInputRef.current) {
      grInputRef.current.focus();
    }
  };

  const filteredTransports = transports.filter(t =>
    t.transport_name.toLowerCase().includes(transportSearch.toLowerCase())
  );

  const getCityName = (cityId) => {
    if (!cityId) return 'N/A';
    const city = cities.find(c => c.id === cityId);
    return city ? `${city.city_name} (${city.city_code})` : 'N/A';
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-lg">
                <Truck className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Transport Change</h1>
                <p className="text-indigo-100 text-sm mt-1">Update transport details for bilties</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/tracking')}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Close
            </button>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Search by GR Number
              </label>
              <div className="relative">
                <input
                  ref={grInputRef}
                  type="text"
                  value={grNumber}
                  onChange={(e) => setGrNumber(e.target.value.toUpperCase())}
                  placeholder="Enter GR Number..."
                  className="w-full px-4 py-3 text-lg font-semibold border-2 border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                  disabled={searchLoading}
                />
                <Search className="absolute right-3 top-3.5 w-5 h-5 text-slate-400" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={searchLoading || !grNumber.trim()}
                className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-lg"
              >
                {searchLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Search
                  </>
                )}
              </button>
              {bilty && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-3 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-800 font-medium">{success}</p>
          </div>
        )}

        {/* Bilty Details */}
        {bilty && (
          <div className="space-y-6">
            {/* Current Bilty Info */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Bilty Details
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <FileText className="w-4 h-4" />
                    GR Number
                  </div>
                  <p className="text-lg font-bold text-slate-900">{bilty.gr_no}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <User className="w-4 h-4" />
                    Consignor
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{bilty.consignor_name || 'N/A'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <User className="w-4 h-4" />
                    Consignee
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{bilty.consignee_name || 'N/A'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <MapPin className="w-4 h-4" />
                    From City
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{getCityName(bilty.from_city_id)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <MapPin className="w-4 h-4" />
                    To City
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{getCityName(bilty.to_city_id)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <Package className="w-4 h-4" />
                    Packages / Weight
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {bilty.no_of_pkg || 0} pkg / {bilty.wt ? parseFloat(bilty.wt).toFixed(2) : 0} kg
                  </p>
                </div>
              </div>
            </div>

            {/* Current Transport Details */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Current Transport Details
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <Building className="w-4 h-4" />
                    Transport Name
                  </div>
                  <p className="text-lg font-bold text-slate-900">{bilty.transport_name || 'Not Set'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <FileText className="w-4 h-4" />
                    GST Number
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{bilty.transport_gst || 'N/A'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{bilty.transport_number || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Update Transport Form */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Update Transport
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {/* Transport Name with Dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Transport Name *
                  </label>
                  <div className="relative" ref={transportRef}>
                    <input
                      type="text"
                      value={transportSearch}
                      onChange={(e) => {
                        setTransportSearch(e.target.value.toUpperCase());
                        setShowTransportDropdown(true);
                        setTransportData(prev => ({ ...prev, transport_name: e.target.value.toUpperCase() }));
                      }}
                      onFocus={() => setShowTransportDropdown(true)}
                      placeholder="Search or enter transport name..."
                      className="w-full px-4 py-3 text-lg font-semibold border-2 border-slate-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                    />
                    {showTransportDropdown && filteredTransports.length > 0 && (
                      <div className="absolute z-20 mt-2 w-full bg-white border-2 border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                        <div className="p-3 bg-green-600 text-white text-sm font-semibold sticky top-0">
                          Select Transport
                        </div>
                        {filteredTransports.map((transport) => (
                          <button
                            key={transport.id}
                            type="button"
                            onClick={() => handleTransportSelect(transport)}
                            className="w-full px-4 py-3 text-left hover:bg-green-50 border-b border-slate-100 transition-colors"
                          >
                            <div className="font-semibold text-slate-900">{transport.transport_name}</div>
                            <div className="text-xs text-slate-600 mt-1">
                              {transport.gst_number && `GST: ${transport.gst_number}`}
                              {transport.mob_number && ` | Phone: ${transport.mob_number}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Transport GST */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={transportData.transport_gst}
                    onChange={(e) => setTransportData(prev => ({ ...prev, transport_gst: e.target.value.toUpperCase() }))}
                    placeholder="Enter GST number..."
                    className="w-full px-4 py-3 text-lg font-semibold border-2 border-slate-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                  />
                </div>

                {/* Transport Number */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={transportData.transport_number}
                    onChange={(e) => setTransportData(prev => ({ ...prev, transport_number: e.target.value }))}
                    placeholder="Enter phone number..."
                    maxLength={10}
                    className="w-full px-4 py-3 text-lg font-semibold border-2 border-slate-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t border-slate-200">
                  <button
                    onClick={handleUpdateTransport}
                    disabled={loading || !transportData.transport_name.trim()}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Update Transport
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={loading}
                    className="px-6 py-3 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!bilty && !searchLoading && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-4">
              <Search className="w-10 h-10 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Search for a Bilty</h3>
            <p className="text-slate-600">Enter a GR number above to update transport details</p>
          </div>
        )}
      </div>
    </div>
  );
}
