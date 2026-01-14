'use client';

import React, { useState, useEffect } from 'react';
import { Settings, CheckSquare, Square } from 'lucide-react';

// Available columns configuration
export const AVAILABLE_COLUMNS = [
  { id: 'sno', label: 'S.No', width: 0.03, required: true },
  { id: 'date', label: 'Date', width: 0.06, required: false },
  { id: 'grno', label: 'GR No', width: 0.07, required: true },
  { id: 'consignor', label: 'Consignor', width: 0.11, required: false },
  { id: 'consignee', label: 'Consignee', width: 0.11, required: false },
  { id: 'city', label: 'City', width: 0.08, required: false },
  { id: 'pvtMarks', label: 'Pvt Marks', width: 0.05, required: false },
  { id: 'packages', label: 'Packages', width: 0.04, required: false },
  { id: 'weight', label: 'Weight', width: 0.04, required: false },
  { id: 'delType', label: 'Del Type', width: 0.04, required: false },
  { id: 'payMode', label: 'Pay Mode', width: 0.04, required: false },
  { id: 'freight', label: 'Freight', width: 0.07, required: true },
  { id: 'labour', label: 'Labour', width: 0.05, required: false },
  { id: 'billCharge', label: 'Bill Charge', width: 0.06, required: false },
  { id: 'toll', label: 'Toll', width: 0.05, required: false },
  { id: 'dd', label: 'DD', width: 0.05, required: false },
  { id: 'pf', label: 'PF', width: 0.05, required: false },
  { id: 'other', label: 'Other', width: 0.05, required: false },
  { id: 'total', label: 'Total', width: 0.07, required: true }
];

// Default selected columns (commonly used ones)
export const DEFAULT_SELECTED_COLUMNS = [
  'sno', 'date', 'grno', 'consignor', 'consignee', 'city', 
  'packages', 'weight', 'payMode', 'freight', 'labour', 
  'billCharge', 'toll', 'dd', 'total'
];

export default function PrintColumnSelector({ selectedColumns, onColumnsChange, onClose }) {
  const [localSelectedColumns, setLocalSelectedColumns] = useState(selectedColumns || DEFAULT_SELECTED_COLUMNS);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (selectedColumns) {
      setLocalSelectedColumns(selectedColumns);
    }
  }, [selectedColumns]);

  const toggleColumn = (columnId) => {
    // Don't allow toggling required columns
    const column = AVAILABLE_COLUMNS.find(col => col.id === columnId);
    if (column?.required) return;

    setLocalSelectedColumns(prev => {
      if (prev.includes(columnId)) {
        return prev.filter(id => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  };

  const selectAll = () => {
    setLocalSelectedColumns(AVAILABLE_COLUMNS.map(col => col.id));
  };

  const selectDefault = () => {
    setLocalSelectedColumns(DEFAULT_SELECTED_COLUMNS);
  };

  const applySelection = () => {
    onColumnsChange(localSelectedColumns);
    setShowDropdown(false);
    if (onClose) onClose();
  };

  const getSelectedCount = () => localSelectedColumns.length;

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
      >
        <Settings className="h-4 w-4" />
        <span>Columns ({getSelectedCount()})</span>
      </button>

      {/* Dropdown Panel */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
              <h3 className="text-base font-bold text-gray-900 mb-2">Select Columns to Print</h3>
              <p className="text-xs text-gray-600">Choose which columns to include in the PDF</p>
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex gap-2">
              <button
                onClick={selectAll}
                className="flex-1 px-3 py-1.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={selectDefault}
                className="flex-1 px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              >
                Default
              </button>
            </div>

            {/* Column List */}
            <div className="overflow-y-auto flex-1" style={{ maxHeight: '300px' }}>
              <div className="p-3 space-y-1">
                {AVAILABLE_COLUMNS.map((column) => {
                  const isSelected = localSelectedColumns.includes(column.id);
                  const isRequired = column.required;
                  
                  return (
                    <div
                      key={column.id}
                      onClick={() => !isRequired && toggleColumn(column.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                        isRequired 
                          ? 'bg-gray-100 cursor-not-allowed opacity-60' 
                          : 'cursor-pointer hover:bg-blue-50'
                      } ${isSelected ? 'bg-blue-50 border border-blue-200' : 'border border-transparent'}`}
                    >
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <CheckSquare className={`h-4 w-4 ${isRequired ? 'text-gray-500' : 'text-blue-600'}`} />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <span className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                          {column.label}
                        </span>
                        {isRequired && (
                          <span className="ml-2 text-xs text-red-600 font-semibold">Required</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 flex gap-2">
              <button
                onClick={() => setShowDropdown(false)}
                className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={applySelection}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors"
              >
                Apply ({getSelectedCount()} columns)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
