'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Package, 
  FileText, 
  Trash2,
  XCircle,
  GripVertical,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  ColumnSelector, 
  ALL_COLUMNS, 
  DEFAULT_VISIBLE_COLUMNS 
} from '../../../../components/company-ledger/search/table-settings';
import { MonthlyBillPanel } from '../../../../components/company-ledger/search/monthly-bill';

// Storage key for selected bilties
const STORAGE_KEY = 'ledger_selected_bilties';
const COLUMNS_STORAGE_KEY = 'ledger_visible_columns';

export default function SelectedSearchPage() {
  const router = useRouter();
  const [selectedBilties, setSelectedBilties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Load selected bilties from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSelectedBilties(JSON.parse(stored));
      }
      // Load saved column preferences
      const savedColumns = localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (savedColumns) {
        setVisibleColumns(JSON.parse(savedColumns));
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save column preferences
  const handleColumnChange = (newColumns) => {
    setVisibleColumns(newColumns);
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(newColumns));
  };

  // Get visible columns config
  const columns = useMemo(() => {
    return visibleColumns
      .map(id => ALL_COLUMNS.find(col => col.id === id))
      .filter(Boolean);
  }, [visibleColumns]);

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
      acc.packages += parseInt(bilty.no_of_pkg || bilty.packages || bilty.no_of_packets || 0);
      acc.weight += parseFloat(bilty.wt || bilty.weight || 0);
      acc.amount += parseFloat(bilty.total || bilty.grand_total || bilty.amount || 0);
      acc.regular += bilty.type === 'regular' ? 1 : 0;
      acc.station += bilty.type === 'station' ? 1 : 0;
      acc.freight += parseFloat(bilty.freight_amount || 0);
      acc.labour += parseFloat(bilty.labour_charge || 0);
      return acc;
    }, { count: 0, packages: 0, weight: 0, amount: 0, regular: 0, station: 0, freight: 0, labour: 0 });
  }, [selectedBilties]);

  // Sorted bilties
  const sortedBilties = useMemo(() => {
    if (!sortConfig.key) return selectedBilties;
    
    return [...selectedBilties].sort((a, b) => {
      let aVal, bVal;
      
      // Map sort keys to actual field values
      switch (sortConfig.key) {
        case 'gr_no':
          aVal = a.gr_no || '';
          bVal = b.gr_no || '';
          break;
        case 'bilty_date':
        case 'date':
          aVal = new Date(a.bilty_date || a.created_at || 0);
          bVal = new Date(b.bilty_date || b.created_at || 0);
          break;
        case 'type':
          aVal = a.type || '';
          bVal = b.type || '';
          break;
        case 'consignor_name':
        case 'consignor':
          aVal = (a.consignor_name || a.consignor || '').toLowerCase();
          bVal = (b.consignor_name || b.consignor || '').toLowerCase();
          break;
        case 'consignee_name':
        case 'consignee':
          aVal = (a.consignee_name || a.consignee || '').toLowerCase();
          bVal = (b.consignee_name || b.consignee || '').toLowerCase();
          break;
        case 'to_city_name':
        case 'city':
          aVal = (a.to_city_name || a.station_city_name || a.station || '').toLowerCase();
          bVal = (b.to_city_name || b.station_city_name || b.station || '').toLowerCase();
          break;
        case 'no_of_pkg':
        case 'pkgs':
          aVal = parseInt(a.no_of_pkg || a.packages || a.no_of_packets || 0);
          bVal = parseInt(b.no_of_pkg || b.packages || b.no_of_packets || 0);
          break;
        case 'wt':
        case 'weight':
          aVal = parseFloat(a.wt || a.weight || 0);
          bVal = parseFloat(b.wt || b.weight || 0);
          break;
        case 'total':
        case 'amount':
          aVal = parseFloat(a.total || a.grand_total || a.amount || 0);
          bVal = parseFloat(b.total || b.grand_total || b.amount || 0);
          break;
        case 'payment_mode':
        case 'payment':
          aVal = (a.payment_mode || a.payment_status || '').toLowerCase();
          bVal = (b.payment_mode || b.payment_status || '').toLowerCase();
          break;
        case 'challan_no':
        case 'challan':
          aVal = a.challan_no || '';
          bVal = b.challan_no || '';
          break;
        case 'rate':
          aVal = parseFloat(a.rate || 0);
          bVal = parseFloat(b.rate || 0);
          break;
        case 'freight_amount':
          aVal = parseFloat(a.freight_amount || 0);
          bVal = parseFloat(b.freight_amount || 0);
          break;
        case 'labour_charge':
          aVal = parseFloat(a.labour_charge || 0);
          bVal = parseFloat(b.labour_charge || 0);
          break;
        case 'invoice_value':
          aVal = parseFloat(a.invoice_value || 0);
          bVal = parseFloat(b.invoice_value || 0);
          break;
        default:
          aVal = a[sortConfig.key] || '';
          bVal = b[sortConfig.key] || '';
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [selectedBilties, sortConfig]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM');
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

  // Handle bill created - clear selected bilties after successful bill creation
  const handleBillCreated = (bill) => {
    // Clear the selected bilties after bill is created
    setSelectedBilties([]);
    saveToStorage([]);
  };

  // Drag and drop handlers for column reordering
  const handleDragStart = (e, columnId) => {
    if (columnId === 'sno' || columnId === 'action') return;
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetColumnId) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnId) {
      setDraggedColumn(null);
      return;
    }
    if (targetColumnId === 'sno' || targetColumnId === 'action') {
      setDraggedColumn(null);
      return;
    }

    const newColumns = [...visibleColumns];
    const draggedIndex = newColumns.findIndex(id => id === draggedColumn);
    const targetIndex = newColumns.findIndex(id => id === targetColumnId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [removed] = newColumns.splice(draggedIndex, 1);
      newColumns.splice(targetIndex, 0, removed);
      handleColumnChange(newColumns);
    }
    setDraggedColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  // Render cell value based on column id
  const renderCellValue = (bilty, columnId, index) => {
    const isRegular = bilty.type === 'regular';
    const isStation = bilty.type === 'station';
    const paymentMode = (bilty.payment_mode || bilty.payment_status || '').toLowerCase();

    // Helper for bilty-only fields (show dash for station bilties)
    const biltyOnlyValue = (value, formatter = (v) => v) => {
      if (isStation) return <span className="text-gray-400">-</span>;
      return value ? formatter(value) : <span className="text-gray-400">-</span>;
    };

    switch (columnId) {
      case 'sno':
        return <span className="text-xs text-gray-600">{index + 1}</span>;
      
      case 'gr_no':
        return (
          <div className="flex items-center gap-1">
            <FileText className={`h-3 w-3 ${isRegular ? 'text-blue-500' : 'text-purple-500'}`} />
            <span className="text-xs font-medium text-gray-900">{bilty.gr_no}</span>
          </div>
        );
      
      case 'type':
        return (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            isRegular ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          }`}>
            {isRegular ? 'REG' : 'STN'}
          </span>
        );
      
      case 'date':
        return <span className="text-xs text-gray-700">{formatDate(bilty.bilty_date || bilty.created_at)}</span>;
      
      case 'consignor':
        return <span className="text-xs text-gray-900 truncate max-w-28 block" title={bilty.consignor_name || bilty.consignor}>{bilty.consignor_name || bilty.consignor || 'N/A'}</span>;
      
      case 'consignee':
        return <span className="text-xs text-gray-900 truncate max-w-28 block" title={bilty.consignee_name || bilty.consignee}>{bilty.consignee_name || bilty.consignee || 'N/A'}</span>;
      
      case 'consignor_gst':
        return biltyOnlyValue(bilty.consignor_gst, v => <span className="text-xs text-gray-700">{v}</span>);
      
      case 'consignee_gst':
        return biltyOnlyValue(bilty.consignee_gst, v => <span className="text-xs text-gray-700">{v}</span>);
      
      case 'consignor_number':
        return biltyOnlyValue(bilty.consignor_number, v => <span className="text-xs text-gray-700">{v}</span>);
      
      case 'consignee_number':
        return biltyOnlyValue(bilty.consignee_number, v => <span className="text-xs text-gray-700">{v}</span>);
      
      case 'transport_name':
        return biltyOnlyValue(bilty.transport_name, v => <span className="text-xs text-gray-700 truncate max-w-24 block">{v}</span>);
      
      case 'city':
        return <span className="text-xs text-gray-700 truncate max-w-20 block">{bilty.to_city_name || bilty.station_city_name || bilty.station || 'N/A'}</span>;
      
      case 'from_city':
        return biltyOnlyValue(bilty.from_city_name, v => <span className="text-xs text-gray-700">{v}</span>);
      
      case 'delivery_type':
        return <span className="text-xs text-gray-700">{bilty.delivery_type || '-'}</span>;
      
      case 'pkgs':
        return <span className="text-xs font-medium text-blue-600">{bilty.no_of_pkg || bilty.packages || bilty.no_of_packets || 0}</span>;
      
      case 'weight':
        return <span className="text-xs font-medium text-green-600">{bilty.wt || bilty.weight || 0}</span>;
      
      case 'contain':
        return <span className="text-xs text-gray-600 truncate max-w-24 block" title={bilty.contain || bilty.contents}>{bilty.contain || bilty.contents || '-'}</span>;
      
      case 'pvt_marks':
        return <span className="text-xs text-gray-600 truncate max-w-20 block" title={bilty.pvt_marks}>{bilty.pvt_marks || '-'}</span>;
      
      case 'invoice_no':
        return biltyOnlyValue(bilty.invoice_no, v => <span className="text-xs text-gray-700">{v}</span>);
      
      case 'invoice_value':
        return biltyOnlyValue(bilty.invoice_value, v => <span className="text-xs text-gray-700">{formatCurrency(v)}</span>);
      
      case 'invoice_date':
        return biltyOnlyValue(bilty.invoice_date, v => <span className="text-xs text-gray-700">{formatDate(v)}</span>);
      
      case 'e_way_bill':
        return <span className="text-xs text-gray-700">{bilty.e_way_bill || '-'}</span>;
      
      case 'rate':
        return biltyOnlyValue(bilty.rate, v => <span className="text-xs text-gray-700">₹{parseFloat(v).toFixed(0)}</span>);
      
      case 'labour_rate':
        return biltyOnlyValue(bilty.labour_rate, v => <span className="text-xs text-gray-700">₹{parseFloat(v).toFixed(0)}</span>);
      
      case 'freight_amount':
        return biltyOnlyValue(bilty.freight_amount, v => <span className="text-xs text-orange-600 font-medium">{formatCurrency(v)}</span>);
      
      case 'labour_charge':
        return biltyOnlyValue(bilty.labour_charge, v => <span className="text-xs text-gray-700">{formatCurrency(v)}</span>);
      
      case 'bill_charge':
        return biltyOnlyValue(bilty.bill_charge, v => <span className="text-xs text-gray-700">{formatCurrency(v)}</span>);
      
      case 'toll_charge':
        return biltyOnlyValue(bilty.toll_charge, v => <span className="text-xs text-gray-700">{formatCurrency(v)}</span>);
      
      case 'dd_charge':
        return biltyOnlyValue(bilty.dd_charge, v => <span className="text-xs text-gray-700">{formatCurrency(v)}</span>);
      
      case 'pf_charge':
        return biltyOnlyValue(bilty.pf_charge, v => <span className="text-xs text-gray-700">{formatCurrency(v)}</span>);
      
      case 'other_charge':
        return biltyOnlyValue(bilty.other_charge, v => <span className="text-xs text-gray-700">{formatCurrency(v)}</span>);
      
      case 'payment':
        return (
          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
            paymentMode === 'paid' ? 'bg-green-100 text-green-700' :
            paymentMode === 'to-pay' ? 'bg-yellow-100 text-yellow-700' :
            paymentMode === 'foc' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {(bilty.payment_mode || bilty.payment_status || 'N/A').toUpperCase().slice(0, 6)}
          </span>
        );
      
      case 'amount':
        return <span className="text-xs font-semibold text-gray-900">{formatCurrency(bilty.total || bilty.grand_total || bilty.amount)}</span>;
      
      case 'challan':
        return <span className="text-xs text-gray-700">{bilty.challan_no || '-'}</span>;
      
      case 'remark':
        return biltyOnlyValue(bilty.remark, v => <span className="text-xs text-gray-600 truncate max-w-24 block" title={v}>{v}</span>);
      
      case 'saving_option':
        return biltyOnlyValue(bilty.saving_option, v => (
          <span className={`text-[10px] px-1 py-0.5 rounded ${
            v === 'SAVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}>{v}</span>
        ));
      
      case 'action':
        return (
          <button
            onClick={() => handleRemoveBilty(bilty)}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Remove"
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
        );
      
      default:
        return <span className="text-xs text-gray-500">-</span>;
    }
  };

  // Handle sort
  const handleSort = (columnId) => {
    const column = ALL_COLUMNS.find(c => c.id === columnId);
    if (!column?.sortable) return;

    setSortConfig(prev => {
      if (prev.key === columnId) {
        if (prev.direction === 'asc') return { key: columnId, direction: 'desc' };
        return { key: null, direction: 'asc' };
      }
      return { key: columnId, direction: 'asc' };
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-4 w-full h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
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
            <div className="p-2 bg-green-600 rounded-lg">
              <Package className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Selected Bilties</h1>
              <p className="text-xs text-gray-500">{totals.count} bilties • Drag columns to reorder</p>
            </div>
          </div>
        </div>

        {/* Action Buttons - Only Clear All */}
        {selectedBilties.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Summary Cards - Compact */}
      {selectedBilties.length > 0 && (
        <div className="grid grid-cols-6 gap-2 mb-3 flex-shrink-0">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-2 text-white">
            <div className="text-[10px] opacity-80">Bilties</div>
            <div className="text-lg font-bold">{totals.count}</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-2 text-white">
            <div className="text-[10px] opacity-80">Regular</div>
            <div className="text-lg font-bold">{totals.regular}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-2 text-white">
            <div className="text-[10px] opacity-80">Station</div>
            <div className="text-lg font-bold">{totals.station}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-2 text-white">
            <div className="text-[10px] opacity-80">Packages</div>
            <div className="text-lg font-bold">{totals.packages}</div>
          </div>
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg p-2 text-white">
            <div className="text-[10px] opacity-80">Weight</div>
            <div className="text-lg font-bold">{totals.weight.toFixed(0)}<span className="text-xs"> kg</span></div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-2 text-white">
            <div className="text-[10px] opacity-80">Amount</div>
            <div className="text-lg font-bold">₹{totals.amount.toLocaleString('en-IN')}</div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {selectedBilties.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center flex-1 flex flex-col items-center justify-center">
          <Package className="h-16 w-16 text-gray-300 mb-4" />
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
        <>
          {/* Monthly Bill Panel - Company Selection */}
          <MonthlyBillPanel 
            selectedBilties={selectedBilties}
            onBillCreated={handleBillCreated}
            totals={totals}
          />

          {/* Bilties Table with Fixed Height and Scroll */}
          <div className="bg-white rounded-xl border border-gray-200 flex-1 flex flex-col overflow-hidden">
          {/* Column Selector Bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
            <div className="text-xs text-gray-500">
              Showing {columns.length - 2} columns • {sortedBilties.length} bilties
              {sortConfig.key && (
                <span className="ml-2 text-blue-600">
                  Sorted by {ALL_COLUMNS.find(c => c.id === sortConfig.key)?.label} ({sortConfig.direction})
                </span>
              )}
            </div>
            <ColumnSelector
              visibleColumns={visibleColumns}
              onColumnChange={handleColumnChange}
              sortConfig={sortConfig}
              onSortChange={setSortConfig}
            />
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full">
              <thead className="bg-slate-700 text-white sticky top-0 z-10">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      draggable={column.id !== 'action' && column.id !== 'sno'}
                      onDragStart={(e) => handleDragStart(e, column.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, column.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleSort(column.id)}
                      className={`px-2 py-2 text-left text-[11px] font-semibold ${column.width} ${
                        column.id !== 'action' && column.id !== 'sno' ? 'cursor-grab active:cursor-grabbing' : ''
                      } ${draggedColumn === column.id ? 'opacity-50 bg-slate-600' : ''} ${
                        column.sortable ? 'hover:bg-slate-600 cursor-pointer' : ''
                      } select-none`}
                    >
                      <div className="flex items-center gap-1">
                        {column.id !== 'action' && column.id !== 'sno' && (
                          <GripVertical className="h-3 w-3 opacity-40" />
                        )}
                        <span className="flex-1">{column.label}</span>
                        {column.sortable && sortConfig.key === column.id && (
                          sortConfig.direction === 'asc' 
                            ? <ChevronUp className="h-3 w-3 text-yellow-300" />
                            : <ChevronDown className="h-3 w-3 text-yellow-300" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedBilties.map((bilty, index) => (
                  <tr 
                    key={`${bilty.type}-${bilty.id}`}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}
                  >
                    {columns.map((column) => (
                      <td 
                        key={column.id} 
                        className={`px-2 py-1 ${column.width} ${
                          column.id === 'pkgs' || column.id === 'weight' || column.id === 'payment' || column.id === 'action' 
                            ? 'text-center' 
                            : column.id === 'amount' || column.id === 'freight_amount' || column.id === 'invoice_value'
                              ? 'text-right' 
                              : 'text-left'
                        }`}
                      >
                        {renderCellValue(bilty, column.id, index)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Footer with totals - Fixed at bottom */}
          <div className="bg-slate-100 border-t border-gray-200 px-2 py-2 flex-shrink-0">
            <div className="flex items-center justify-end gap-6 text-sm">
              <span className="text-gray-600">Total:</span>
              <span className="font-bold text-blue-600">{totals.packages} Pkgs</span>
              <span className="font-bold text-green-600">{totals.weight.toFixed(1)} kg</span>
              <span className="font-bold text-gray-900">₹{totals.amount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
