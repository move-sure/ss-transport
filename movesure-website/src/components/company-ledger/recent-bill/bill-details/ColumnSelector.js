'use client';

import React, { useState } from 'react';
import { Settings2, ChevronDown } from 'lucide-react';

const CATEGORIES = [
  { id: 'basic', label: 'Basic' },
  { id: 'party', label: 'Party Info' },
  { id: 'package', label: 'Package' },
  { id: 'location', label: 'Location' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'charges', label: 'Charges' },
  { id: 'payment', label: 'Payment' }
];

export default function ColumnSelector({ 
  visibleColumns, 
  onColumnChange, 
  allColumns,
  defaultColumns 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);

  const toggleColumn = (columnId) => {
    if (columnId === 'sno' || columnId === 'action') return;
    
    const newColumns = visibleColumns.includes(columnId)
      ? visibleColumns.filter(id => id !== columnId)
      : [...visibleColumns, columnId];
    
    onColumnChange(newColumns);
  };

  const selectAll = () => {
    onColumnChange(allColumns.map(c => c.id));
  };

  const selectDefault = () => {
    onColumnChange(defaultColumns);
  };

  const getColumnsByCategory = (categoryId) => {
    return allColumns.filter(col => col.category === categoryId && col.id !== 'action');
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
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-80 overflow-auto">
            <div className="p-2 border-b border-gray-100 flex gap-2">
              <button onClick={selectAll} className="flex-1 px-2 py-1 text-[10px] bg-blue-50 text-blue-600 rounded hover:bg-blue-100">
                Select All
              </button>
              <button onClick={selectDefault} className="flex-1 px-2 py-1 text-[10px] bg-gray-50 text-gray-600 rounded hover:bg-gray-100">
                Default
              </button>
            </div>

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
