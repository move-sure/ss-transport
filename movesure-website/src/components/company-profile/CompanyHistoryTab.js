'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Building2, X, MapPin, TrendingUp, Package, Calendar, Loader2, Plus, Edit2 } from 'lucide-react';
import supabase from '../../app/utils/supabase';

const CompanyHistoryTab = ({ 
  consignors, 
  cities, 
  onCreateProfile, 
  existingProfiles,
  getConsignorName 
}) => {
  // Search states
  const [consignorSearch, setConsignorSearch] = useState('');
  const [selectedConsignor, setSelectedConsignor] = useState(null);
  const [showConsignorDropdown, setShowConsignorDropdown] = useState(false);
  const consignorRef = useRef(null);

  // Data states
  const [biltyHistory, setBiltyHistory] = useState([]);
  const [ratesData, setRatesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stationStats, setStationStats] = useState([]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (consignorRef.current && !consignorRef.current.contains(e.target)) {
        setShowConsignorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered consignors for dropdown
  const filteredConsignors = useMemo(() => {
    if (!consignorSearch) return consignors.slice(0, 50);
    const search = consignorSearch.toLowerCase();
    return consignors.filter(c =>
      c.company_name.toLowerCase().includes(search) ||
      (c.gst_num && c.gst_num.toLowerCase().includes(search))
    ).slice(0, 50);
  }, [consignors, consignorSearch]);

  // Handle consignor selection
  const handleConsignorSelect = useCallback((consignor) => {
    setSelectedConsignor(consignor);
    setConsignorSearch(consignor.company_name);
    setShowConsignorDropdown(false);
    fetchCompanyHistory(consignor);
  }, []);

  // Fetch company history from bilty table
  const fetchCompanyHistory = async (consignor) => {
    setLoading(true);
    try {
      // Fetch bilty records for this consignor
      const { data: biltyData, error: biltyError } = await supabase
        .from('bilty')
        .select('id, gr_no, bilty_date, to_city_id, transport_name, rate, labour_rate, wt, no_of_pkg, total, freight_amount, labour_charge, toll_charge, bill_charge, dd_charge, other_charge, pf_charge')
        .ilike('consignor_name', `%${consignor.company_name}%`)
        .eq('is_active', true)
        .order('bilty_date', { ascending: false })
        .limit(500);

      if (biltyError) throw biltyError;

      // Fetch rates for this consignor
      const { data: ratesRes, error: ratesError } = await supabase
        .from('rates')
        .select('id, city_id, rate, is_default')
        .eq('consignor_id', consignor.id);

      if (ratesError) throw ratesError;

      setBiltyHistory(biltyData || []);
      setRatesData(ratesRes || []);

      // Calculate station-wise statistics
      calculateStationStats(biltyData || [], ratesRes || [], consignor.id);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate station statistics
  const calculateStationStats = (biltyData, rates, consignorId) => {
    const statsMap = {};

    // Process bilty data
    biltyData.forEach(bilty => {
      if (!bilty.to_city_id) return;
      
      if (!statsMap[bilty.to_city_id]) {
        statsMap[bilty.to_city_id] = {
          city_id: bilty.to_city_id,
          total_bilties: 0,
          total_weight: 0,
          total_amount: 0,
          total_packages: 0,
          total_toll_charge: 0,
          total_bill_charge: 0,
          total_freight: 0,
          total_dd_charge: 0,
          total_other_charge: 0,
          total_pf_charge: 0,
          transports: new Set(),
          rates_used: [],
          labour_rates_used: [],
          toll_charges_used: [],
          bill_charges_used: [],
          freight_amounts_used: [],
          dd_charges_used: [],
          other_charges_used: [],
          pf_charges_used: [],
          last_bilty_date: null,
          first_bilty_date: null
        };
      }

      const stat = statsMap[bilty.to_city_id];
      stat.total_bilties++;
      stat.total_weight += parseFloat(bilty.wt) || 0;
      stat.total_amount += parseFloat(bilty.total) || 0;
      stat.total_packages += bilty.no_of_pkg || 0;
      
      if (bilty.transport_name) {
        stat.transports.add(bilty.transport_name);
      }
      
      if (bilty.rate) {
        stat.rates_used.push(parseFloat(bilty.rate));
      }
      
      if (bilty.labour_rate) {
        stat.labour_rates_used.push(parseFloat(bilty.labour_rate));
      }

      if (bilty.toll_charge) {
        stat.toll_charges_used.push(parseFloat(bilty.toll_charge));
        stat.total_toll_charge += parseFloat(bilty.toll_charge) || 0;
      }

      if (bilty.bill_charge) {
        stat.bill_charges_used.push(parseFloat(bilty.bill_charge));
        stat.total_bill_charge += parseFloat(bilty.bill_charge) || 0;
      }

      if (bilty.freight_amount) {
        stat.freight_amounts_used.push(parseFloat(bilty.freight_amount));
        stat.total_freight += parseFloat(bilty.freight_amount) || 0;
      }

      if (bilty.dd_charge) {
        stat.dd_charges_used.push(parseFloat(bilty.dd_charge));
        stat.total_dd_charge += parseFloat(bilty.dd_charge) || 0;
      }

      if (bilty.other_charge) {
        stat.other_charges_used.push(parseFloat(bilty.other_charge));
        stat.total_other_charge += parseFloat(bilty.other_charge) || 0;
      }

      if (bilty.pf_charge) {
        stat.pf_charges_used.push(parseFloat(bilty.pf_charge));
        stat.total_pf_charge += parseFloat(bilty.pf_charge) || 0;
      }

      const biltyDate = new Date(bilty.bilty_date);
      if (!stat.last_bilty_date || biltyDate > new Date(stat.last_bilty_date)) {
        stat.last_bilty_date = bilty.bilty_date;
      }
      if (!stat.first_bilty_date || biltyDate < new Date(stat.first_bilty_date)) {
        stat.first_bilty_date = bilty.bilty_date;
      }
    });

    // Add rates data
    rates.forEach(rate => {
      if (statsMap[rate.city_id]) {
        statsMap[rate.city_id].saved_rate = rate.rate;
      }
    });

    // Convert to array and calculate averages
    const statsArray = Object.values(statsMap).map(stat => ({
      ...stat,
      transports: Array.from(stat.transports),
      avg_rate: stat.rates_used.length > 0 
        ? (stat.rates_used.reduce((a, b) => a + b, 0) / stat.rates_used.length).toFixed(2)
        : null,
      avg_labour_rate: stat.labour_rates_used.length > 0
        ? (stat.labour_rates_used.reduce((a, b) => a + b, 0) / stat.labour_rates_used.length).toFixed(2)
        : null,
      avg_toll_charge: stat.toll_charges_used.length > 0
        ? (stat.toll_charges_used.reduce((a, b) => a + b, 0) / stat.toll_charges_used.length).toFixed(2)
        : null,
      avg_bill_charge: stat.bill_charges_used.length > 0
        ? (stat.bill_charges_used.reduce((a, b) => a + b, 0) / stat.bill_charges_used.length).toFixed(2)
        : null,
      avg_freight: stat.freight_amounts_used.length > 0
        ? (stat.freight_amounts_used.reduce((a, b) => a + b, 0) / stat.freight_amounts_used.length).toFixed(2)
        : null,
      avg_dd_charge: stat.dd_charges_used.length > 0
        ? (stat.dd_charges_used.reduce((a, b) => a + b, 0) / stat.dd_charges_used.length).toFixed(2)
        : null,
      avg_other_charge: stat.other_charges_used.length > 0
        ? (stat.other_charges_used.reduce((a, b) => a + b, 0) / stat.other_charges_used.length).toFixed(2)
        : null,
      avg_pf_charge: stat.pf_charges_used.length > 0
        ? (stat.pf_charges_used.reduce((a, b) => a + b, 0) / stat.pf_charges_used.length).toFixed(2)
        : null,
      most_common_rate: stat.rates_used.length > 0 
        ? getMostCommon(stat.rates_used)
        : null,
      hasExistingProfile: existingProfiles.some(
        p => p.consignor_id === consignorId && p.destination_station_id === stat.city_id
      )
    }));

    // Sort by total bilties
    statsArray.sort((a, b) => b.total_bilties - a.total_bilties);
    setStationStats(statsArray);
  };

  // Get most common value from array
  const getMostCommon = (arr) => {
    const freq = {};
    let maxCount = 0;
    let mostCommon = arr[0];
    
    arr.forEach(val => {
      freq[val] = (freq[val] || 0) + 1;
      if (freq[val] > maxCount) {
        maxCount = freq[val];
        mostCommon = val;
      }
    });
    
    return mostCommon;
  };

  // Get city name
  const getCityName = (cityId) => {
    const city = cities.find(c => c.id === cityId);
    return city ? city.city_name : 'Unknown';
  };

  // Get city code
  const getCityCode = (cityId) => {
    const city = cities.find(c => c.id === cityId);
    return city ? city.city_code : '';
  };

  // Handle create profile from history
  const handleCreateFromHistory = (stat) => {
    const profileData = {
      consignor_id: selectedConsignor.id,
      destination_station_id: stat.city_id,
      city_code: getCityCode(stat.city_id),
      city_name: getCityName(stat.city_id),
      transport_name: stat.transports[0] || '',
      rate: stat.most_common_rate || stat.avg_rate || 0,
      labour_rate: stat.avg_labour_rate || 0
    };
    onCreateProfile(profileData);
  };

  // Clear selection
  const handleClear = () => {
    setSelectedConsignor(null);
    setConsignorSearch('');
    setBiltyHistory([]);
    setRatesData([]);
    setStationStats([]);
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-600" />
          Search Company History
        </h3>
        
        <div ref={consignorRef} className="relative max-w-xl">
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={consignorSearch}
              onChange={(e) => {
                setConsignorSearch(e.target.value);
                setShowConsignorDropdown(true);
                if (!e.target.value) {
                  handleClear();
                }
              }}
              onFocus={() => setShowConsignorDropdown(true)}
              placeholder="Search company by name or GST..."
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
            {selectedConsignor && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {/* Consignor Dropdown */}
          {showConsignorDropdown && filteredConsignors.length > 0 && !selectedConsignor && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
              {filteredConsignors.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleConsignorSelect(c)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <p className="font-medium text-gray-900">{c.company_name}</p>
                  <div className="flex gap-4 text-sm text-gray-500">
                    {c.gst_num && <span>GST: {c.gst_num}</span>}
                    {c.number && <span>Ph: {c.number}</span>}
                    {c.company_add && <span className="truncate max-w-xs">{c.company_add}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading company history...</span>
        </div>
      )}

      {/* Selected Company Info */}
      {selectedConsignor && !loading && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{selectedConsignor.company_name}</h3>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                {selectedConsignor.gst_num && <p>GST: {selectedConsignor.gst_num}</p>}
                {selectedConsignor.company_add && <p>Address: {selectedConsignor.company_add}</p>}
                {selectedConsignor.number && <p>Contact: {selectedConsignor.number}</p>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{biltyHistory.length}</div>
              <div className="text-sm text-gray-500">Total Bilties</div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <MapPin className="w-4 h-4" />
                Destinations
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stationStats.length}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Package className="w-4 h-4" />
                Total Weight
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {stationStats.reduce((sum, s) => sum + s.total_weight, 0).toFixed(0)} kg
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <TrendingUp className="w-4 h-4" />
                Total Business
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                ₹{stationStats.reduce((sum, s) => sum + s.total_amount, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Calendar className="w-4 h-4" />
                Profiles Created
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {stationStats.filter(s => s.hasExistingProfile).length} / {stationStats.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Station-wise History Table */}
      {selectedConsignor && !loading && stationStats.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">Station-wise Working History</h3>
            <p className="text-sm text-gray-500 mt-1">Click on a station to create or edit profile</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-2 py-2 text-left text-[9px] font-semibold text-gray-600 uppercase">Station</th>
                  <th className="px-2 py-2 text-center text-[9px] font-semibold text-gray-600 uppercase">Bilties</th>
                  <th className="px-2 py-2 text-center text-[9px] font-semibold text-gray-600 uppercase">Weight</th>
                  <th className="px-2 py-2 text-center text-[9px] font-semibold text-gray-600 uppercase">Rate</th>
                  <th className="px-2 py-2 text-center text-[9px] font-semibold text-gray-600 uppercase">Freight</th>
                  <th className="px-2 py-2 text-center text-[9px] font-semibold text-gray-600 uppercase">Labour</th>
                  <th className="px-2 py-2 text-center text-[9px] font-semibold text-gray-600 uppercase">Toll</th>
                  <th className="px-2 py-2 text-center text-[9px] font-semibold text-gray-600 uppercase">Bilty</th>
                  <th className="px-2 py-2 text-center text-[9px] font-semibold text-gray-600 uppercase">DD</th>
                  <th className="px-2 py-2 text-center text-[9px] font-semibold text-gray-600 uppercase">Other</th>
                  <th className="px-2 py-2 text-center text-[9px] font-semibold text-gray-600 uppercase">PF</th>
                  <th className="px-2 py-2 text-left text-[9px] font-semibold text-gray-600 uppercase">Transport</th>
                  <th className="px-2 py-2 text-center text-[9px] font-semibold text-gray-600 uppercase">Last</th>
                  <th className="px-2 py-2 text-center text-[9px] font-semibold text-gray-600 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stationStats.map((stat, index) => (
                  <tr key={stat.city_id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-2 py-1.5">
                      <div className="font-medium text-gray-900 text-[10px]">{getCityName(stat.city_id)}</div>
                      <div className="text-[9px] text-gray-500">{getCityCode(stat.city_id)}</div>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
                        {stat.total_bilties}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center text-[10px] text-gray-900">
                      {stat.total_weight.toFixed(0)}kg
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="text-[10px] text-green-700 font-medium">
                        {stat.most_common_rate ? `₹${stat.most_common_rate}` : '-'}
                      </div>
                      {stat.avg_rate && (
                        <div className="text-[9px] text-gray-500">avg: ₹{stat.avg_rate}</div>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center text-[10px] text-blue-600 font-medium">
                      {stat.avg_freight ? `₹${stat.avg_freight}` : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center text-[10px] text-gray-900">
                      {stat.avg_labour_rate ? `₹${stat.avg_labour_rate}` : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center text-[10px] text-orange-600 font-medium">
                      {stat.avg_toll_charge ? `₹${stat.avg_toll_charge}` : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center text-[10px] text-purple-600 font-medium">
                      {stat.avg_bill_charge ? `₹${stat.avg_bill_charge}` : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center text-[10px] text-red-600 font-medium">
                      {stat.avg_dd_charge ? `₹${stat.avg_dd_charge}` : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center text-[10px] text-teal-600 font-medium">
                      {stat.avg_other_charge ? `₹${stat.avg_other_charge}` : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center text-[10px] text-pink-600 font-medium">
                      {stat.avg_pf_charge ? `₹${stat.avg_pf_charge}` : '-'}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex flex-wrap gap-0.5">
                        {stat.transports.slice(0, 1).map((t, i) => (
                          <span key={i} className="inline-flex items-center px-1 py-0.5 rounded bg-gray-100 text-gray-700 text-[9px]">
                            {t.length > 10 ? t.substring(0, 10) + '..' : t}
                          </span>
                        ))}
                        {stat.transports.length > 1 && (
                          <span className="text-[9px] text-gray-500">+{stat.transports.length - 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center text-[9px] text-gray-500">
                      {stat.last_bilty_date ? new Date(stat.last_bilty_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCreateFromHistory(stat);
                        }}
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          stat.hasExistingProfile
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {stat.hasExistingProfile ? (
                          <>
                            <Edit2 className="w-2.5 h-2.5 mr-0.5" />
                            Edit
                          </>
                        ) : (
                          <>
                            <Plus className="w-2.5 h-2.5 mr-0.5" />
                            Add
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Data State */}
      {selectedConsignor && !loading && stationStats.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No History Found</h3>
          <p className="text-gray-500 mt-2">No bilty records found for this company.</p>
        </div>
      )}

      {/* Initial State */}
      {!selectedConsignor && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Search for a Company</h3>
          <p className="text-gray-500 mt-2">
            Enter company name or GST number to view their working history and create rate profiles.
          </p>
        </div>
      )}
    </div>
  );
};

export default CompanyHistoryTab;
