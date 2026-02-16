'use client';

import { Calendar, MapPin, Package, IndianRupee, Truck, Weight, Search, Copy, Check, Eye } from 'lucide-react';
import { useState } from 'react';
import BiltyDetailPopup from './bilty-detail-popup';

const ConsignorRateTable = ({ results, cities, loading }) => {
  const [copiedRate, setCopiedRate] = useState(null);
  const [selectedBilty, setSelectedBilty] = useState(null);

  const getCityName = (cityId) => {
    const city = cities.find(c => c.id === cityId);
    return city ? city.city_name : 'Unknown';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleCopyRate = async (rate, biltyId) => {
    try {
      await navigator.clipboard.writeText(rate);
      setCopiedRate(biltyId);
      
      // Store in localStorage for the charges component to pick up
      localStorage.setItem('copiedRate', rate);
      
      // Dispatch custom event to notify charges component
      window.dispatchEvent(new CustomEvent('rateCopied', { detail: { rate } }));
      
      // Show toast message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-slideIn';
      toast.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span class="font-semibold">Rate set to ₹${rate}</span>
      `;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.remove();
      }, 3000);
      
      setTimeout(() => {
        setCopiedRate(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy rate:', err);
    }
  };

  const getDeliveryTypeLabel = (deliveryType) => {
    if (deliveryType === 'door-delivery' || deliveryType === 'door delivery') {
      return 'DD';
    }
    return deliveryType || 'godown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading consignor rates...</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <Search className="w-12 h-12 text-slate-400" />
        </div>
        <p className="text-lg font-semibold text-slate-700">No rates found for this consignor</p>
        <p className="text-sm text-slate-500 mt-2">Try selecting a different consignor</p>
      </div>
    );
  }

  return (
    <>
    {selectedBilty && (
      <BiltyDetailPopup
        bilty={selectedBilty}
        onClose={() => setSelectedBilty(null)}
        cities={cities}
      />
    )}
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-100 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">GR No</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Consignee</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">To City</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Rate</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Weight</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Packages</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Labour Rate</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Payment</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Delivery</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {results.map((bilty, index) => (
            <tr key={bilty.id} className={`hover:bg-indigo-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
              <td className="px-4 py-3 text-sm text-slate-700">
                <Calendar className="w-3 h-3 inline mr-1 text-slate-400" />
                {formatDate(bilty.bilty_date)}
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-indigo-600">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedBilty(bilty)}
                    className="p-1 rounded hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 transition-colors"
                    title="View bilty details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <span>{bilty.gr_no}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-slate-700">{bilty.consignee_name || '-'}</td>
              <td className="px-4 py-3 text-sm text-slate-700">
                <MapPin className="w-3 h-3 inline mr-1 text-slate-400" />
                {getCityName(bilty.to_city_id)}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700">
                    ₹{parseFloat(bilty.rate).toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleCopyRate(parseFloat(bilty.rate).toFixed(2), bilty.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-sm font-medium ${
                      copiedRate === bilty.id 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                    }`}
                    title="Copy rate"
                  >
                    {copiedRate === bilty.id ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </td>
              <td className="px-4 py-3 text-center text-sm text-slate-700">
                <Weight className="w-3 h-3 inline mr-1 text-slate-400" />
                {bilty.wt} kg
              </td>
              <td className="px-4 py-3 text-center text-sm text-slate-700">
                <Package className="w-3 h-3 inline mr-1 text-slate-400" />
                {bilty.no_of_pkg}
              </td>
              <td className="px-4 py-3 text-center text-sm text-slate-700">₹{parseFloat(bilty.labour_rate || 0).toFixed(2)}</td>
              <td className="px-4 py-3 text-center">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                  bilty.payment_mode === 'paid' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {bilty.payment_mode || 'to-pay'}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                  <Truck className="w-3 h-3 mr-1" />
                  {getDeliveryTypeLabel(bilty.delivery_type)}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-sm font-bold text-slate-900">
                  <IndianRupee className="w-3 h-3 inline" />
                  {parseFloat(bilty.total || 0).toFixed(2)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
};

export default ConsignorRateTable;