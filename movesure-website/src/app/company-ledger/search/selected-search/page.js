'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Package, 
  FileText, 
  Download, 
  Copy, 
  Printer,
  Trash2,
  MapPin,
  Calendar,
  IndianRupee,
  Scale,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';

// Storage key for selected bilties
const STORAGE_KEY = 'ledger_selected_bilties';

export default function SelectedSearchPage() {
  const router = useRouter();
  const [selectedBilties, setSelectedBilties] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load selected bilties from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSelectedBilties(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading selected bilties:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save to localStorage whenever selection changes
  const saveToStorage = (bilties) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bilties));
    } catch (err) {
      console.error('Error saving to localStorage:', err);
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    return selectedBilties.reduce((acc, bilty) => {
      acc.count = selectedBilties.length;
      acc.packages += parseInt(bilty.no_of_pkg || bilty.packages || 0);
      acc.weight += parseFloat(bilty.wt || bilty.weight || 0);
      acc.amount += parseFloat(bilty.total || bilty.grand_total || bilty.amount || 0);
      acc.regular += bilty.type === 'regular' ? 1 : 0;
      acc.station += bilty.type === 'station' ? 1 : 0;
      return acc;
    }, { count: 0, packages: 0, weight: 0, amount: 0, regular: 0, station: 0 });
  }, [selectedBilties]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
  };

  const handleRemoveBilty = (bilty) => {
    const updated = selectedBilties.filter(b => !(b.type === bilty.type && b.id === bilty.id));
    setSelectedBilties(updated);
    saveToStorage(updated);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all selected bilties?')) {
      setSelectedBilties([]);
      saveToStorage([]);
    }
  };

  const handleDownloadCSV = () => {
    if (selectedBilties.length === 0) return;
    
    const headers = ['S.No', 'GR No', 'Type', 'Date', 'Consignor', 'Consignee', 'City', 'Packages', 'Weight (kg)', 'Payment', 'Amount', 'Pvt Marks', 'Challan No'];
    
    const rows = selectedBilties.map((b, idx) => [
      idx + 1,
      b.gr_no,
      b.type === 'regular' ? 'Regular' : 'Station',
      b.bilty_date || b.created_at || '',
      b.consignor_name || b.consignor || '',
      b.consignee_name || b.consignee || '',
      b.to_city_name || b.station_city_name || b.station || '',
      b.no_of_pkg || b.packages || 0,
      b.wt || b.weight || 0,
      (b.payment_mode || b.payment_status || '').toUpperCase(),
      b.total || b.grand_total || b.amount || 0,
      b.pvt_marks || '',
      b.challan_no || ''
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `selected_bilties_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleCopyToClipboard = async () => {
    if (selectedBilties.length === 0) return;
    
    const header = 'S.No | GR No | Consignor | Consignee | City | Pkgs | Weight | Amount';
    const divider = '-'.repeat(80);
    
    const rows = selectedBilties.map((b, idx) => 
      `${idx + 1}. ${b.gr_no} | ${b.consignor_name || b.consignor} | ${b.consignee_name || b.consignee} | ${b.to_city_name || b.station_city_name || b.station} | ${b.no_of_pkg || b.packages || 0} | ${b.wt || b.weight || 0}kg | ₹${b.total || b.grand_total || b.amount || 0}`
    ).join('\n');
    
    const summary = `\n${divider}\nTotal: ${totals.count} bilties | ${totals.packages} pkgs | ${totals.weight}kg | ₹${totals.amount.toLocaleString('en-IN')}`;
    
    try {
      await navigator.clipboard.writeText(`${header}\n${divider}\n${rows}${summary}`);
      alert('✅ Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-4 w-full h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/company-ledger/search')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Search
          </button>
          
          <div className="h-6 w-px bg-gray-300" />
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-600 rounded-lg">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Selected Bilties</h1>
              <p className="text-sm text-gray-500">{totals.count} bilties selected</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {selectedBilties.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Copy className="h-4 w-4" />
              Copy
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors print:hidden"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors print:hidden"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {selectedBilties.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4 print:grid-cols-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 opacity-80" />
              <span className="text-xs font-medium opacity-80">Total Bilties</span>
            </div>
            <div className="text-2xl font-bold">{totals.count}</div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 opacity-80" />
              <span className="text-xs font-medium opacity-80">Regular</span>
            </div>
            <div className="text-2xl font-bold">{totals.regular}</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 opacity-80" />
              <span className="text-xs font-medium opacity-80">Station</span>
            </div>
            <div className="text-2xl font-bold">{totals.station}</div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 opacity-80" />
              <span className="text-xs font-medium opacity-80">Packages</span>
            </div>
            <div className="text-2xl font-bold">{totals.packages}</div>
          </div>
          
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Scale className="h-4 w-4 opacity-80" />
              <span className="text-xs font-medium opacity-80">Weight</span>
            </div>
            <div className="text-2xl font-bold">{totals.weight.toFixed(1)} <span className="text-sm">kg</span></div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <IndianRupee className="h-4 w-4 opacity-80" />
              <span className="text-xs font-medium opacity-80">Total Amount</span>
            </div>
            <div className="text-2xl font-bold">₹{totals.amount.toLocaleString('en-IN')}</div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {selectedBilties.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Bilties Selected</h3>
          <p className="text-sm text-gray-500 mb-4">Go to search and select bilties to view them here</p>
          <button
            onClick={() => router.push('/company-ledger/search')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Search
          </button>
        </div>
      ) : (
        /* Bilties Table */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700 text-white">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold">S.No</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">GR No</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Date</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Consignor</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Consignee</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">City</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold">Pkgs</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold">Weight</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold">Payment</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold">Amount</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Pvt Marks</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">Challan</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selectedBilties.map((bilty, index) => {
                  const isRegular = bilty.type === 'regular';
                  const paymentMode = (bilty.payment_mode || bilty.payment_status || '').toLowerCase();
                  
                  return (
                    <tr 
                      key={`${bilty.type}-${bilty.id}`}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="px-3 py-2.5 text-sm text-gray-600">{index + 1}</td>
                      
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <FileText className={`h-3.5 w-3.5 ${isRegular ? 'text-blue-500' : 'text-purple-500'}`} />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{bilty.gr_no}</div>
                            <div className={`text-[10px] ${isRegular ? 'text-blue-500' : 'text-purple-500'}`}>
                              {isRegular ? 'Regular' : 'Station'}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {formatDate(bilty.bilty_date || bilty.created_at)}
                        </div>
                      </td>
                      
                      <td className="px-3 py-2.5">
                        <div className="text-sm text-gray-900 max-w-32 truncate" title={bilty.consignor_name || bilty.consignor}>
                          {bilty.consignor_name || bilty.consignor || 'N/A'}
                        </div>
                      </td>
                      
                      <td className="px-3 py-2.5">
                        <div className="text-sm text-gray-900 max-w-32 truncate" title={bilty.consignee_name || bilty.consignee}>
                          {bilty.consignee_name || bilty.consignee || 'N/A'}
                        </div>
                      </td>
                      
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="truncate max-w-24">
                            {bilty.to_city_name || bilty.station_city_name || bilty.station || 'N/A'}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-sm font-medium text-blue-600">
                          {bilty.no_of_pkg || bilty.packages || 0}
                        </span>
                      </td>
                      
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-sm font-medium text-green-600">
                          {bilty.wt || bilty.weight || 0} kg
                        </span>
                      </td>
                      
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          paymentMode === 'paid' ? 'bg-green-100 text-green-700' :
                          paymentMode === 'to-pay' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {(bilty.payment_mode || bilty.payment_status || 'N/A').toUpperCase()}
                        </span>
                      </td>
                      
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(bilty.total || bilty.grand_total || bilty.amount)}
                        </span>
                      </td>
                      
                      <td className="px-3 py-2.5">
                        <div className="text-sm text-gray-600 max-w-24 truncate" title={bilty.pvt_marks}>
                          {bilty.pvt_marks || '-'}
                        </div>
                      </td>
                      
                      <td className="px-3 py-2.5 text-sm text-gray-700">
                        {bilty.challan_no || 'N/A'}
                      </td>
                      
                      <td className="px-3 py-2.5 text-center print:hidden">
                        <button
                          onClick={() => handleRemoveBilty(bilty)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              
              {/* Footer with totals */}
              <tfoot className="bg-slate-100 font-medium">
                <tr>
                  <td colSpan="6" className="px-3 py-3 text-sm text-gray-700 text-right">
                    <strong>Totals:</strong>
                  </td>
                  <td className="px-3 py-3 text-center text-sm font-bold text-blue-600">
                    {totals.packages}
                  </td>
                  <td className="px-3 py-3 text-center text-sm font-bold text-green-600">
                    {totals.weight.toFixed(1)} kg
                  </td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3 text-right text-sm font-bold text-gray-900">
                    ₹{totals.amount.toLocaleString('en-IN')}
                  </td>
                  <td colSpan="3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .p-4, .p-4 * {
            visibility: visible;
          }
          .p-4 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
