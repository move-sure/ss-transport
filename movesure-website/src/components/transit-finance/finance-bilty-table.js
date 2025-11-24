'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, DollarSign, Package, TrendingUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import BiltyKaatCell from './bilty-kaat-cell';
import TransportFilter from './transport-filter';
import StationTransportCell from './station-transport-cell';
import supabase from '../../app/utils/supabase';
import { generateFinanceBiltyPDF } from './finance-bilty-pdf-generator';

export default function FinanceBiltyTable({ 
  transitDetails, 
  selectedChallan,
  cities 
}) {
  const [filterPaymentMode, setFilterPaymentMode] = useState('all');
  const [filterCity, setFilterCity] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedTransports, setSelectedTransports] = useState([]);
  const [availableTransports, setAvailableTransports] = useState([]);
  const [hubRates, setHubRates] = useState([]);
  const [selectedHubRate, setSelectedHubRate] = useState('');
  const [loadingRates, setLoadingRates] = useState(false);
  const [applyingRates, setApplyingRates] = useState(false);

  // Get city name by ID
  const getCityName = (cityId) => {
    const city = cities?.find(c => c.id === cityId);
    return city?.city_name || 'Unknown';
  };

  // Get city name by code (for station bilties)
  const getCityNameByCode = (code) => {
    const city = cities?.find(c => c.city_code === code);
    return city?.city_name || code || 'Unknown';
  };

  // Filter transit details for selected challan
  const challanTransits = useMemo(() => {
    if (!transitDetails || !selectedChallan) return [];
    const filtered = transitDetails.filter(t => t.challan_no === selectedChallan.challan_no);
    console.log('🔍 Challan transits for', selectedChallan.challan_no, ':', filtered.length);
    if (filtered.length > 0) {
      console.log('📊 Sample transit data:', filtered[0]);
    }
    return filtered;
  }, [transitDetails, selectedChallan]);

  // Load hub rates when city is selected
  useEffect(() => {
    if (selectedCityId) {
      loadHubRates();
    } else {
      setHubRates([]);
      setSelectedHubRate('');
    }
  }, [selectedCityId]);

  const loadHubRates = async () => {
    try {
      setLoadingRates(true);
      
      // Get all rates for selected city
      const { data: rates, error: fetchError } = await supabase
        .from('transport_hub_rates')
        .select('*')
        .eq('destination_city_id', selectedCityId)
        .eq('is_active', true)
        .order('transport_name');

      if (fetchError) throw fetchError;

      // Get unique transport IDs
      const transportIds = [...new Set(rates.map(r => r.transport_id).filter(Boolean))];

      // Fetch transport details
      let transportsRes = { data: [] };
      if (transportIds.length > 0) {
        transportsRes = await supabase
          .from('transports')
          .select('id, transport_name, city_id')
          .in('id', transportIds);
      }

      // Get unique city IDs from transports
      const cityIds = [...new Set((transportsRes.data || []).map(t => t.city_id).filter(Boolean))];

      // Fetch city details
      let citiesRes = { data: [] };
      if (cityIds.length > 0) {
        citiesRes = await supabase
          .from('cities')
          .select('id, city_name')
          .in('id', cityIds);
      }

      // Create city map
      const cityMap = {};
      (citiesRes.data || []).forEach(c => {
        cityMap[c.id] = c.city_name;
      });

      // Create transport map with city names
      const transportMap = {};
      (transportsRes.data || []).forEach(t => {
        transportMap[t.id] = {
          ...t,
          city_name: t.city_id ? cityMap[t.city_id] : null
        };
      });

      // Enrich rates with transport details
      const enrichedRates = rates.map(rate => ({
        ...rate,
        transport: rate.transport_id ? transportMap[rate.transport_id] : null
      }));

      setHubRates(enrichedRates);
    } catch (err) {
      console.error('Error loading hub rates:', err);
    } finally {
      setLoadingRates(false);
    }
  };

  // Apply selected hub rate to all filtered bilties
  const applyHubRateToAll = async () => {
    if (!selectedHubRate || filteredTransits.length === 0) return;

    const confirmed = window.confirm(
      `Apply selected hub rate to ${filteredTransits.length} filtered bilties?`
    );
    if (!confirmed) return;

    try {
      setApplyingRates(true);

      const selectedRate = hubRates.find(r => r.id === selectedHubRate);
      if (!selectedRate) return;

      // Get user session
      let userId = null;
      if (typeof window !== 'undefined') {
        const userSession = localStorage.getItem('userSession');
        if (userSession) {
          const session = JSON.parse(userSession);
          userId = session.user?.id || null;
        }
      }

      // Prepare bulk upsert data
      const upsertData = filteredTransits.map(transit => ({
        gr_no: transit.gr_no,
        challan_no: selectedChallan.challan_no,
        destination_city_id: selectedCityId,
        transport_hub_rate_id: selectedRate.id,
        rate_type: selectedRate.pricing_mode,
        rate_per_kg: selectedRate.rate_per_kg || 0,
        rate_per_pkg: selectedRate.rate_per_pkg || 0,
        created_by: userId,
        updated_by: userId,
        updated_at: new Date().toISOString()
      }));

      // Bulk upsert
      const { error } = await supabase
        .from('bilty_wise_kaat')
        .upsert(upsertData, { 
          onConflict: 'gr_no',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      alert(`Successfully applied hub rate to ${filteredTransits.length} bilties!`);
      
      // Trigger a custom event to refresh kaat cells without page reload
      window.dispatchEvent(new CustomEvent('kaatDataUpdated'));

    } catch (err) {
      console.error('Error applying hub rates:', err);
      alert('Failed to apply hub rates: ' + err.message);
    } finally {
      setApplyingRates(false);
    }
  };

  // Get unique city list from filtered transits
  const uniqueCities = useMemo(() => {
    const citySet = new Set();
    challanTransits.forEach(t => {
      if (t.bilty?.to_city_id) {
        citySet.add(t.bilty.to_city_id);
      }
    });
    return Array.from(citySet).map(cityId => {
      const city = cities?.find(c => c.id === cityId);
      return { id: cityId, name: city?.city_name || 'Unknown' };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [challanTransits, cities]);

  // Apply filters
  const filteredTransits = useMemo(() => {
    let filtered = challanTransits;

    // Payment mode filter
    if (filterPaymentMode !== 'all') {
      filtered = filtered.filter(t => {
        const mode = (t.bilty?.payment_mode || t.station?.payment_status)?.toLowerCase();
        return mode === filterPaymentMode;
      });
    }

    // Transport filter - match by transport name from database
    if (selectedTransports.length > 0 && availableTransports.length > 0) {
      filtered = filtered.filter(t => {
        // Get destination city ID
        let destinationCityId = null;
        
        if (t.bilty?.to_city_id) {
          destinationCityId = t.bilty.to_city_id;
        } else if (t.station?.station) {
          const city = cities?.find(c => c.city_code === t.station.station);
          destinationCityId = city?.id;
        }
        
        if (!destinationCityId) return false;
        
        // Get all transports available for this destination city
        const cityTransports = availableTransports.filter(at => at.city_id === destinationCityId);
        
        // Check if any of the city's transports match the selected transports
        return cityTransports.some(cityTransport => {
          return selectedTransports.some(selectedTransport => {
            // Match by GST if available
            if (selectedTransport.gst && cityTransport.gst_number) {
              return cityTransport.gst_number.trim() === selectedTransport.gst;
            }
            
            // Match by transport name (case-insensitive)
            if (!selectedTransport.gst && !cityTransport.gst_number) {
              return cityTransport.transport_name.toLowerCase().trim() === selectedTransport.name.toLowerCase().trim();
            }
            
            return false;
          });
        });
      });
    }

    // City filter - exact match by city ID
    if (selectedCityId) {
      filtered = filtered.filter(t => {
        if (t.bilty) {
          return t.bilty.to_city_id === selectedCityId;
        }
        return false;
      });
    }

    return filtered;
  }, [challanTransits, filterPaymentMode, selectedTransports, selectedCityId, availableTransports, cities]);

  // Calculate financial summary
  const financialSummary = useMemo(() => {
    let totalAmount = 0;
    let totalFreight = 0;
    let totalPackages = 0;
    let totalWeight = 0;
    let paidCount = 0;
    let toBillCount = 0;
    let toPaidCount = 0;
    let totalLabour = 0;
    let totalOtherCharges = 0;

    filteredTransits.forEach(transit => {
      const bilty = transit.bilty;
      const station = transit.station;

      if (bilty) {
        totalAmount += parseFloat(bilty.total || 0);
        totalFreight += parseFloat(bilty.freight_amount || 0);
        totalPackages += parseInt(bilty.no_of_pkg || 0);
        totalWeight += parseFloat(bilty.wt || 0);
        totalLabour += parseFloat(bilty.labour_charge || 0);
        totalOtherCharges += parseFloat(bilty.other_charge || 0) + 
                            parseFloat(bilty.toll_charge || 0) + 
                            parseFloat(bilty.dd_charge || 0) + 
                            parseFloat(bilty.bill_charge || 0);
        
        if (bilty.payment_mode?.toLowerCase() === 'paid') paidCount++;
        else if (bilty.payment_mode?.toLowerCase() === 'to-pay') toBillCount++;
        else if (bilty.payment_mode?.toLowerCase() === 'foc') toPaidCount++;
      }

      if (station) {
        totalAmount += parseFloat(station.amount || 0);
        totalPackages += parseInt(station.no_of_packets || 0);
        totalWeight += parseFloat(station.weight || 0);
        
        if (station.payment_status?.toLowerCase() === 'paid') paidCount++;
        else if (station.payment_status?.toLowerCase() === 'to-pay') toBillCount++;
        else if (station.payment_status?.toLowerCase() === 'foc') toPaidCount++;
      }
    });

    return {
      totalAmount,
      totalFreight,
      totalPackages,
      totalWeight,
      paidCount,
      toBillCount,
      toPaidCount,
      totalLabour,
      totalOtherCharges
    };
  }, [filteredTransits]);



  // Download PDF
  const handleDownloadPDF = async () => {
    await generateFinanceBiltyPDF(filteredTransits, selectedChallan, cities, getCityName);
  };

  if (!selectedChallan) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">Please select a challan to view bilty details</p>
      </div>
    );
  }

  if (challanTransits.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">No bilties found for this challan</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full">
      {/* Header - Compact */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 text-white flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {selectedChallan.challan_no}
            </h2>
            <p className="text-xs text-white/80">
              {filteredTransits.length} {filteredTransits.length === 1 ? 'bilty' : 'bilties'}
            </p>
          </div>
          <button
            onClick={handleDownloadPDF}
            className="bg-white/20 backdrop-blur-sm hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-sm font-semibold"
          >
            <Download className="w-3 h-3" />
            Download PDF
          </button>
        </div>

        {/* Financial Summary Cards - Compact */}
        <div className="grid grid-cols-5 gap-2">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <div className="text-[10px] font-semibold opacity-90">Total</div>
            <div className="text-sm font-bold">₹{(financialSummary.totalAmount / 1000).toFixed(0)}K</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <div className="text-[10px] font-semibold opacity-90">Paid</div>
            <div className="text-sm font-bold">{financialSummary.paidCount}</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <div className="text-[10px] font-semibold opacity-90">To Pay</div>
            <div className="text-sm font-bold">{financialSummary.toBillCount}</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <div className="text-[10px] font-semibold opacity-90">Pkgs</div>
            <div className="text-sm font-bold">{financialSummary.totalPackages}</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <div className="text-[10px] font-semibold opacity-90">Weight</div>
            <div className="text-sm font-bold">{(financialSummary.totalWeight / 1000).toFixed(1)}T</div>
          </div>
        </div>
      </div>

      {/* Filters - Compact */}
      <div className="p-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex gap-2 items-center">
          {/* Transport Filter */}
          <div className="flex-1">
            <TransportFilter
              challanTransits={challanTransits}
              selectedTransports={selectedTransports}
              onTransportSelect={setSelectedTransports}
              onTransportClear={() => setSelectedTransports([])}
              cities={cities}
              onAvailableTransportsUpdate={setAvailableTransports}
            />
          </div>
          {/* Payment Mode */}
          <div className="w-32 flex-shrink-0">
            <select
              value={filterPaymentMode}
              onChange={(e) => setFilterPaymentMode(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="to-pay">To Pay</option>
              <option value="foc">FOC</option>
            </select>
          </div>

          {/* City Filter */}
          <div className="flex-1">
            <select
              value={selectedCityId}
              onChange={(e) => {
                setSelectedCityId(e.target.value);
                setSelectedHubRate('');
              }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-semibold"
            >
              <option value="">-- Select Destination City --</option>
              {uniqueCities.map(city => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
          </div>

          {/* Hub Rate Selector - Only show when city selected */}
          {selectedCityId && (
            <>
              <div className="flex-1">
                <select
                  value={selectedHubRate}
                  onChange={(e) => setSelectedHubRate(e.target.value)}
                  disabled={loadingRates}
                  className="w-full px-2 py-1.5 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-blue-50"
                >
                <option value="">-- Select Hub Rate --</option>
                {hubRates.map(rate => {
                  const transportName = rate.transport_name || rate.transport?.transport_name || 'Unknown';
                  const cityName = rate.transport?.city_name || '';
                  const rateKg = rate.rate_per_kg ? `₹${parseFloat(rate.rate_per_kg).toFixed(2)}/kg` : '';
                  const ratePkg = rate.rate_per_pkg ? `₹${parseFloat(rate.rate_per_pkg).toFixed(2)}/pkg` : '';
                  const rateDisplay = [rateKg, ratePkg].filter(Boolean).join(' + ');
                  const minCharge = rate.min_charge > 0 ? ` (Min: ₹${parseFloat(rate.min_charge).toFixed(0)})` : '';
                  
                  return (
                    <option key={rate.id} value={rate.id}>
                      {transportName} {cityName ? `(${cityName})` : ''} → {rateDisplay}{minCharge}
                    </option>
                  );
                })}
                </select>
              </div>

              <button
                onClick={applyHubRateToAll}
                disabled={!selectedHubRate || applyingRates || filteredTransits.length === 0}
                className="px-4 py-1.5 bg-green-600 text-white rounded-lg font-semibold text-xs hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1 flex-shrink-0"
              >
                {applyingRates ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-3 h-3" />
                    Apply to {filteredTransits.length}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table - Scrollable */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs">
          <thead className="bg-gray-200 sticky top-0 z-10">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-900 text-[11px]">GR Number</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-900 text-[11px]">Date</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-900 text-[11px]">Consignor</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-900 text-[11px]">Consignee</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-900 text-[11px]">Transport</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-900 text-[11px]">Destination</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-900 text-[11px]">Contents</th>
              <th className="px-2 py-1.5 text-right font-semibold text-gray-900 text-[11px]">Pkgs</th>
              <th className="px-2 py-1.5 text-right font-semibold text-gray-900 text-[11px]">Weight (KG)</th>
              <th className="px-2 py-1.5 text-right font-semibold text-gray-900 text-[11px]">Total</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-900 text-[11px]">Payment</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-900 text-[11px]">Kaat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTransits.map(transit => {
              const bilty = transit.bilty;
              const station = transit.station;
              const data = bilty || station;

              const otherCharges = bilty 
                ? parseFloat(bilty.other_charge || 0) + 
                  parseFloat(bilty.toll_charge || 0) + 
                  parseFloat(bilty.dd_charge || 0) + 
                  parseFloat(bilty.bill_charge || 0)
                : 0;

              return (
                <tr key={transit.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-2 py-1.5">
                    <span className="font-bold text-blue-700 text-xs">{transit.gr_no}</span>
                  </td>
                  <td className="px-2 py-1.5 text-gray-600">
                    {data?.bilty_date || data?.created_at 
                      ? format(new Date(data.bilty_date || data.created_at), 'dd/MM')
                      : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-gray-800 truncate max-w-[100px]" title={bilty?.consignor_name || station?.consignor || 'N/A'}>
                    {bilty?.consignor_name || station?.consignor || 'N/A'}
                  </td>
                  <td className="px-2 py-1.5 text-gray-800 truncate max-w-[100px]" title={bilty?.consignee_name || station?.consignee || 'N/A'}>
                    {bilty?.consignee_name || station?.consignee || 'N/A'}
                  </td>
                  <td className="px-2 py-1.5">
                    {bilty?.transport_name ? (
                      <div className="max-w-[150px]" title={bilty.transport_name}>
                        <div className="font-semibold text-indigo-700 text-[10px] break-words leading-tight">{bilty.transport_name}</div>
                        {bilty.transport_gst && (
                          <div className="text-[8px] text-gray-500 truncate mt-0.5">{bilty.transport_gst}</div>
                        )}
                      </div>
                    ) : station?.station ? (
                      <StationTransportCell stationCode={station.station} cities={cities} />
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="font-semibold text-purple-700 text-xs">
                      {bilty ? getCityName(bilty.to_city_id) : getCityNameByCode(station?.station)}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-gray-600 truncate max-w-[80px]" title={bilty?.contain || station?.contents || 'N/A'}>
                    {bilty?.contain || station?.contents || 'N/A'}
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-800">
                    {bilty?.no_of_pkg || station?.no_of_packets || 0}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className="font-semibold text-gray-900 text-xs">
                      {(bilty?.wt || station?.weight || 0).toFixed(2)} KG
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold text-gray-900">
                    {(bilty?.total || station?.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      (bilty?.payment_mode || station?.payment_status)?.toLowerCase() === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : (bilty?.payment_mode || station?.payment_status)?.toLowerCase() === 'to-pay'
                        ? 'bg-orange-100 text-orange-800'
                        : (bilty?.payment_mode || station?.payment_status)?.toLowerCase() === 'foc'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {(bilty?.payment_mode || station?.payment_status)?.toUpperCase() || 'N/A'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    <BiltyKaatCell
                      grNo={transit.gr_no}
                      challanNo={selectedChallan.challan_no}
                      destinationCityId={bilty?.to_city_id || (station?.station ? cities?.find(c => c.city_code === station.station)?.id : null)}
                      biltyWeight={bilty?.wt || station?.weight || 0}
                      biltyPackages={bilty?.no_of_pkg || station?.no_of_packets || 0}
                      biltyTransportGst={bilty?.transport_gst || null}
                      onKaatUpdate={() => {
                        // Optional: refresh data or show notification
                        console.log('Kaat updated for', transit.gr_no);
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer - Sticky at bottom */}
      <div className="bg-gray-200 border-t-2 border-gray-300 flex-shrink-0">
        <table className="w-full text-xs">
          <tfoot>
            <tr className="font-bold">
              <td colSpan="7" className="px-2 py-1.5 text-right">Total:</td>
              <td className="px-2 py-1.5 text-right">{financialSummary.totalPackages}</td>
              <td className="px-2 py-1.5 text-right">{financialSummary.totalWeight.toFixed(2)} KG</td>
              <td className="px-2 py-1.5 text-right text-gray-900">
                {financialSummary.totalAmount.toLocaleString()}
              </td>
              <td colSpan="2" className="px-2 py-1.5"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
