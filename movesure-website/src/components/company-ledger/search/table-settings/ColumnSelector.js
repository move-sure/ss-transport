'use client';

import React, { useState } from 'react';
import { Settings2, ChevronDown, ChevronUp, Check } from 'lucide-react';

// All available columns with their properties
export const ALL_COLUMNS = [
  // Basic Info
  { id: 'sno', label: 'S.No', width: 'w-12', category: 'basic', sortable: false },
  { id: 'gr_no', label: 'GR No', width: 'w-24', category: 'basic', sortable: true, sortKey: 'gr_no' },
  { id: 'date', label: 'Date', width: 'w-20', category: 'basic', sortable: true, sortKey: 'bilty_date' },
  { id: 'type', label: 'Type', width: 'w-16', category: 'basic', sortable: true, sortKey: 'type' },
  
  // Party Info
  { id: 'consignor', label: 'Consignor', width: 'w-32', category: 'party', sortable: true, sortKey: 'consignor_name' },
  { id: 'consignee', label: 'Consignee', width: 'w-32', category: 'party', sortable: true, sortKey: 'consignee_name' },
  { id: 'consignor_gst', label: 'Consignor GST', width: 'w-28', category: 'party', sortable: false, biltyOnly: true },
  { id: 'consignee_gst', label: 'Consignee GST', width: 'w-28', category: 'party', sortable: false, biltyOnly: true },
  { id: 'consignor_number', label: 'Consignor Ph', width: 'w-24', category: 'party', sortable: false, biltyOnly: true },
  { id: 'consignee_number', label: 'Consignee Ph', width: 'w-24', category: 'party', sortable: false, biltyOnly: true },
  { id: 'transport_name', label: 'Transport', width: 'w-28', category: 'party', sortable: true, sortKey: 'transport_name', biltyOnly: true },
  
  // Location
  { id: 'city', label: 'To City', width: 'w-24', category: 'location', sortable: true, sortKey: 'to_city_name' },
  { id: 'from_city', label: 'From City', width: 'w-24', category: 'location', sortable: true, sortKey: 'from_city_name', biltyOnly: true },
  { id: 'delivery_type', label: 'Delivery', width: 'w-20', category: 'location', sortable: true, sortKey: 'delivery_type' },
  
  // Package Info
  { id: 'pkgs', label: 'Pkgs', width: 'w-14', category: 'package', sortable: true, sortKey: 'no_of_pkg' },
  { id: 'weight', label: 'Weight', width: 'w-16', category: 'package', sortable: true, sortKey: 'wt' },
  { id: 'contain', label: 'Contents', width: 'w-28', category: 'package', sortable: false },
  { id: 'pvt_marks', label: 'Pvt Marks', width: 'w-24', category: 'package', sortable: false },
  
  // Invoice Info
  { id: 'invoice_no', label: 'Invoice No', width: 'w-24', category: 'invoice', sortable: true, sortKey: 'invoice_no', biltyOnly: true },
  { id: 'invoice_value', label: 'Inv Value', width: 'w-20', category: 'invoice', sortable: true, sortKey: 'invoice_value', biltyOnly: true },
  { id: 'invoice_date', label: 'Inv Date', width: 'w-20', category: 'invoice', sortable: true, sortKey: 'invoice_date', biltyOnly: true },
  { id: 'e_way_bill', label: 'E-Way Bill', width: 'w-24', category: 'invoice', sortable: true, sortKey: 'e_way_bill' },
  
  // Charges
  { id: 'rate', label: 'Rate', width: 'w-16', category: 'charges', sortable: true, sortKey: 'rate', biltyOnly: true },
  { id: 'labour_rate', label: 'Lab Rate', width: 'w-16', category: 'charges', sortable: true, sortKey: 'labour_rate', biltyOnly: true },
  { id: 'freight_amount', label: 'Freight', width: 'w-18', category: 'charges', sortable: true, sortKey: 'freight_amount', biltyOnly: true },
  { id: 'labour_charge', label: 'Labour', width: 'w-16', category: 'charges', sortable: true, sortKey: 'labour_charge', biltyOnly: true },
  { id: 'bill_charge', label: 'Bill Ch', width: 'w-16', category: 'charges', sortable: true, sortKey: 'bill_charge', biltyOnly: true },
  { id: 'toll_charge', label: 'Toll', width: 'w-16', category: 'charges', sortable: true, sortKey: 'toll_charge', biltyOnly: true },
  { id: 'dd_charge', label: 'DD Ch', width: 'w-16', category: 'charges', sortable: true, sortKey: 'dd_charge', biltyOnly: true },
  { id: 'pf_charge', label: 'PF Ch', width: 'w-16', category: 'charges', sortable: true, sortKey: 'pf_charge', biltyOnly: true },
  { id: 'other_charge', label: 'Other Ch', width: 'w-16', category: 'charges', sortable: true, sortKey: 'other_charge', biltyOnly: true },
  
  // Payment
  { id: 'payment', label: 'Payment', width: 'w-16', category: 'payment', sortable: true, sortKey: 'payment_mode' },
  { id: 'amount', label: 'Amount', width: 'w-20', category: 'payment', sortable: true, sortKey: 'total' },
  
  // Other
  { id: 'challan', label: 'Challan', width: 'w-18', category: 'other', sortable: true, sortKey: 'challan_no' },
  { id: 'remark', label: 'Remark', width: 'w-28', category: 'other', sortable: false, biltyOnly: true },
  { id: 'saving_option', label: 'Status', width: 'w-16', category: 'other', sortable: true, sortKey: 'saving_option', biltyOnly: true },
  
  // Action
  { id: 'action', label: '', width: 'w-10', category: 'action', sortable: false }
];

// Default visible columns
export const DEFAULT_VISIBLE_COLUMNS = [
  'sno', 'gr_no', 'date', 'consignor', 'consignee', 'city', 
  'pkgs', 'weight', 'payment', 'amount', 'pvt_marks', 'challan', 'action'
];

const CATEGORIES = [
  { id: 'basic', label: 'Basic' },
  { id: 'party', label: 'Party Info' },
  { id: 'location', label: 'Location' },
  { id: 'package', label: 'Package' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'charges', label: 'Charges' },
  { id: 'payment', label: 'Payment' },
  { id: 'other', label: 'Other' }
];

export default function ColumnSelector({ 
  visibleColumns = DEFAULT_VISIBLE_COLUMNS, 
  onColumnChange,
  sortConfig = { key: null, direction: 'asc' },
  onSortChange
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);

  const toggleColumn = (columnId) => {
    if (columnId === 'sno' || columnId === 'action') return; // Always visible
    
    const newColumns = visibleColumns.includes(columnId)
      ? visibleColumns.filter(id => id !== columnId)
      : [...visibleColumns, columnId];
    
    onColumnChange(newColumns);
  };

  const selectAll = () => {
    onColumnChange(ALL_COLUMNS.map(c => c.id));
  };

  const selectDefault = () => {
    onColumnChange(DEFAULT_VISIBLE_COLUMNS);
  };

  const getColumnsByCategory = (categoryId) => {
    return ALL_COLUMNS.filter(col => col.category === categoryId && col.id !== 'action');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Settings2 className="h-3.5 w-3.5" />
        Columns ({visibleColumns.length - 2})
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-80 overflow-auto">
            {/* Quick Actions */}
            <div className="p-2 border-b border-gray-100 flex gap-2">
              <button
                onClick={selectAll}
                className="flex-1 px-2 py-1 text-[10px] bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              >
                Select All
              </button>
              <button
                onClick={selectDefault}
                className="flex-1 px-2 py-1 text-[10px] bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
              >
                Default
              </button>
            </div>

            {/* Categories */}
            <div className="p-1">
              {CATEGORIES.map(category => {
                const columns = getColumnsByCategory(category.id);
                const selectedCount = columns.filter(c => visibleColumns.includes(c.id)).length;
                const isExpanded = expandedCategory === category.id;

                return (
                  <div key={category.id} className="mb-0.5">
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded"
                    >
                      <span>{category.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400">{selectedCount}/{columns.length}</span>
                        <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="pl-2 pb-1">
                        {columns.map(column => (
                          <label
                            key={column.id}
                            className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={visibleColumns.includes(column.id)}
                              onChange={() => toggleColumn(column.id)}
                              disabled={column.id === 'sno'}
                              className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[11px] text-gray-600 flex-1">{column.label}</span>
                            {column.biltyOnly && (
                              <span className="text-[9px] px-1 py-0.5 bg-blue-100 text-blue-600 rounded">Bilty</span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Sort indicator component
export function SortIndicator({ columnId, sortConfig, onSortChange, sortable }) {
  if (!sortable) return null;

  const isActive = sortConfig?.key === columnId;
  const direction = isActive ? sortConfig.direction : null;

  const handleClick = (e) => {
    e.stopPropagation();
    if (!isActive) {
      onSortChange({ key: columnId, direction: 'asc' });
    } else if (direction === 'asc') {
      onSortChange({ key: columnId, direction: 'desc' });
    } else {
      onSortChange({ key: null, direction: 'asc' });
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`ml-1 p-0.5 rounded hover:bg-white/20 ${isActive ? 'text-yellow-300' : 'text-white/50'}`}
      title={isActive ? (direction === 'asc' ? 'Descending' : 'Clear') : 'Sort Ascending'}
    >
      {isActive && direction === 'desc' ? (
        <ChevronDown className="h-3 w-3" />
      ) : (
        <ChevronUp className={`h-3 w-3 ${!isActive && 'opacity-50'}`} />
      )}
    </button>
  );
}
