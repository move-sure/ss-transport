'use client';

import React, { useState, useMemo } from 'react';
import { FileText, Download, DollarSign, Package, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function FinanceBiltyTable({ 
  transitDetails, 
  selectedChallan,
  cities 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState('all');
  const [filterCity, setFilterCity] = useState('all');

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

  // Apply filters
  const filteredTransits = useMemo(() => {
    let filtered = challanTransits;

    // Search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(t => {
        const bilty = t.bilty;
        const station = t.station;
        
        return (
          t.gr_no?.toLowerCase().includes(query) ||
          bilty?.consignor_name?.toLowerCase().includes(query) ||
          bilty?.consignee_name?.toLowerCase().includes(query) ||
          station?.consignor?.toLowerCase().includes(query) ||
          station?.consignee?.toLowerCase().includes(query)
        );
      });
    }

    // Payment mode filter
    if (filterPaymentMode !== 'all') {
      filtered = filtered.filter(t => {
        const mode = t.bilty?.payment_mode || t.station?.payment_status;
        return mode === filterPaymentMode;
      });
    }

    // City filter
    if (filterCity !== 'all') {
      filtered = filtered.filter(t => {
        if (t.bilty) {
          return t.bilty.to_city_id === filterCity;
        }
        if (t.station) {
          const city = cities?.find(c => c.city_code === t.station.station);
          return city?.id === filterCity;
        }
        return false;
      });
    }

    return filtered;
  }, [challanTransits, searchTerm, filterPaymentMode, filterCity, cities]);

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
        
        if (bilty.payment_mode === 'PAID') paidCount++;
        else if (bilty.payment_mode === 'TO BILL') toBillCount++;
        else if (bilty.payment_mode === 'TO PAID') toPaidCount++;
      }

      if (station) {
        totalAmount += parseFloat(station.amount || 0);
        totalPackages += parseInt(station.no_of_packets || 0);
        totalWeight += parseFloat(station.weight || 0);
        
        if (station.payment_status === 'PAID') paidCount++;
        else if (station.payment_status === 'TO BILL') toBillCount++;
        else if (station.payment_status === 'TO PAID') toPaidCount++;
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

  // Get unique cities for filter
  const availableCities = useMemo(() => {
    const citySet = new Set();
    challanTransits.forEach(t => {
      if (t.bilty?.to_city_id) {
        citySet.add(t.bilty.to_city_id);
      }
      if (t.station?.station) {
        const city = cities?.find(c => c.city_code === t.station.station);
        if (city) citySet.add(city.id);
      }
    });
    return Array.from(citySet);
  }, [challanTransits, cities]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'GR No', 'Date', 'Consignor', 'Consignee', 'Destination',
      'Packages', 'Weight', 'Freight', 'Total Amount', 'Payment Mode',
      'E-Way Bill', 'Invoice No', 'Invoice Value', 'Labour Charge', 'Other Charges'
    ];

    const rows = filteredTransits.map(t => {
      const bilty = t.bilty;
      const station = t.station;
      const data = bilty || station;

      return [
        t.gr_no,
        data?.bilty_date || data?.created_at 
          ? format(new Date(data.bilty_date || data.created_at), 'dd/MM/yyyy')
          : 'N/A',
        bilty?.consignor_name || station?.consignor || 'N/A',
        bilty?.consignee_name || station?.consignee || 'N/A',
        bilty ? getCityName(bilty.to_city_id) : getCityNameByCode(station?.station),
        bilty?.no_of_pkg || station?.no_of_packets || 0,
        bilty?.wt || station?.weight || 0,
        bilty?.freight_amount || 0,
        bilty?.total || station?.amount || 0,
        bilty?.payment_mode || station?.payment_status || 'N/A',
        bilty?.e_way_bill || station?.e_way_bill || 'N/A',
        bilty?.invoice_no || 'N/A',
        bilty?.invoice_value || 'N/A',
        bilty?.labour_charge || 0,
        (parseFloat(bilty?.other_charge || 0) + 
         parseFloat(bilty?.toll_charge || 0) + 
         parseFloat(bilty?.dd_charge || 0) + 
         parseFloat(bilty?.bill_charge || 0))
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `challan_${selectedChallan?.challan_no}_bilties_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
    <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)' }}>
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
            onClick={handleExportCSV}
            className="bg-white/20 backdrop-blur-sm hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-sm"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>

        {/* Financial Summary Cards - Compact */}
        <div className="grid grid-cols-5 gap-2">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <div className="text-[10px] font-semibold opacity-90">Total</div>
            <div className="text-sm font-bold">₹{(financialSummary.totalAmount / 1000).toFixed(0)}K</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <div className="text-[10px] font-semibold opacity-90">Freight</div>
            <div className="text-sm font-bold">₹{(financialSummary.totalFreight / 1000).toFixed(0)}K</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <div className="text-[10px] font-semibold opacity-90">Paid</div>
            <div className="text-sm font-bold">{financialSummary.paidCount}</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <div className="text-[10px] font-semibold opacity-90">To Bill</div>
            <div className="text-sm font-bold">{financialSummary.toBillCount}</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <div className="text-[10px] font-semibold opacity-90">Pkgs</div>
            <div className="text-sm font-bold">{financialSummary.totalPackages}</div>
          </div>
        </div>
      </div>

      {/* Filters - Compact */}
      <div className="p-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search GR, consignor..."
            className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
          />
          
          <select
            value={filterPaymentMode}
            onChange={(e) => setFilterPaymentMode(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
          >
            <option value="all">All Payments</option>
            <option value="PAID">Paid</option>
            <option value="TO BILL">To Bill</option>
            <option value="TO PAID">To Paid</option>
          </select>

          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
          >
            <option value="all">All Cities</option>
            {availableCities.map(cityId => {
              const city = cities?.find(c => c.id === cityId);
              return city ? (
                <option key={city.id} value={city.id}>
                  {city.city_name}
                </option>
              ) : null;
            })}
          </select>
        </div>
      </div>

      {/* Table - Scrollable */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs">
          <thead className="bg-gray-200 sticky top-0 z-10">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-900 text-[11px]">GR No</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-900 text-[11px]">Date</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-900 text-[11px]">Consignor</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-900 text-[11px]">Consignee</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-900 text-[11px]">Destination</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-900 text-[11px]">Contents</th>
              <th className="px-2 py-1.5 text-right font-semibold text-gray-900 text-[11px]">Pkgs</th>
              <th className="px-2 py-1.5 text-right font-semibold text-gray-900 text-[11px]">Wt</th>
              <th className="px-2 py-1.5 text-right font-semibold text-gray-900 text-[11px]">Rate</th>
              <th className="px-2 py-1.5 text-right font-semibold text-gray-900 text-[11px]">Freight</th>
              <th className="px-2 py-1.5 text-right font-semibold text-gray-900 text-[11px]">Labour</th>
              <th className="px-2 py-1.5 text-right font-semibold text-gray-900 text-[11px]">Other</th>
              <th className="px-2 py-1.5 text-right font-semibold text-gray-900 text-[11px]">Total</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-900 text-[11px]">Payment</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-900 text-[11px]">E-Way</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-900 text-[11px]">Invoice</th>
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
                  <td className="px-2 py-1.5 font-semibold text-blue-600">
                    {transit.gr_no}
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
                  <td className="px-2 py-1.5 text-gray-700 font-medium">
                    {bilty ? getCityName(bilty.to_city_id) : getCityNameByCode(station?.station)}
                  </td>
                  <td className="px-2 py-1.5 text-gray-600 truncate max-w-[80px]" title={bilty?.contain || station?.contents || 'N/A'}>
                    {bilty?.contain || station?.contents || 'N/A'}
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-800">
                    {bilty?.no_of_pkg || station?.no_of_packets || 0}
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-800">
                    {(bilty?.wt || station?.weight || 0).toFixed(1)}
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-700">
                    {bilty?.rate ? parseFloat(bilty.rate).toFixed(2) : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-right font-medium text-blue-700">
                    {(bilty?.freight_amount || 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-700">
                    {bilty?.labour_charge ? parseFloat(bilty.labour_charge).toFixed(0) : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-700">
                    {otherCharges > 0 ? otherCharges.toFixed(0) : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold text-gray-900">
                    {(bilty?.total || station?.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      (bilty?.payment_mode || station?.payment_status) === 'PAID'
                        ? 'bg-green-100 text-green-800'
                        : (bilty?.payment_mode || station?.payment_status) === 'TO BILL'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {(bilty?.payment_mode || station?.payment_status)?.substring(0, 4) || 'N/A'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-gray-600 truncate max-w-[70px]" title={bilty?.e_way_bill || station?.e_way_bill || '-'}>
                    {bilty?.e_way_bill || station?.e_way_bill || '-'}
                  </td>
                  <td className="px-2 py-1.5 text-gray-600 truncate max-w-[70px]" title={bilty?.invoice_no || '-'}>
                    {bilty?.invoice_no || '-'}
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
              <td colSpan="6" className="px-2 py-1.5 text-right">Total:</td>
              <td className="px-2 py-1.5 text-right">{financialSummary.totalPackages}</td>
              <td className="px-2 py-1.5 text-right">{financialSummary.totalWeight.toFixed(1)}</td>
              <td className="px-2 py-1.5"></td>
              <td className="px-2 py-1.5 text-right text-blue-800">
                {financialSummary.totalFreight.toLocaleString()}
              </td>
              <td className="px-2 py-1.5 text-right">
                {financialSummary.totalLabour.toLocaleString()}
              </td>
              <td className="px-2 py-1.5 text-right">
                {financialSummary.totalOtherCharges.toLocaleString()}
              </td>
              <td className="px-2 py-1.5 text-right text-gray-900">
                {financialSummary.totalAmount.toLocaleString()}
              </td>
              <td colSpan="3" className="px-2 py-1.5"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
