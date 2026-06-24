'use client';

import React, { useState, useEffect } from 'react';
import { Settings, CheckSquare, Square } from 'lucide-react';

// Available columns configuration
export const AVAILABLE_COLUMNS = [
  { id: 'sno',        label: 'S.No',       width: 0.03, required: true },
  { id: 'challanNo',  label: 'Challan No', width: 0.06, required: false },
  { id: 'date',       label: 'Date',       width: 0.06, required: false },
  { id: 'grno',       label: 'GR No',      width: 0.07, required: true },
  { id: 'consignor',  label: 'Consignor',  width: 0.11, required: false },
  { id: 'consignee',  label: 'Consignee',  width: 0.11, required: false },
  { id: 'city',       label: 'City',       width: 0.08, required: false },
  { id: 'pvtMarks',   label: 'Pvt Marks',  width: 0.05, required: false },
  { id: 'packages',   label: 'Packages',   width: 0.04, required: false },
  { id: 'weight',     label: 'Weight',     width: 0.04, required: false },
  { id: 'delType',    label: 'Del Type',   width: 0.04, required: false },
  { id: 'payMode',    label: 'Pay Mode',   width: 0.04, required: false },
  { id: 'freight',    label: 'Freight',    width: 0.07, required: true },
  { id: 'labour',     label: 'Labour',     width: 0.05, required: false },
  { id: 'billCharge', label: 'Bill Charge',width: 0.06, required: false },
  { id: 'toll',       label: 'Toll',       width: 0.05, required: false },
  { id: 'dd',         label: 'DD',         width: 0.05, required: false },
  { id: 'pf',         label: 'PF',         width: 0.05, required: false },
  { id: 'other',      label: 'Other',      width: 0.05, required: false },
  { id: 'total',      label: 'Total',      width: 0.07, required: true },
  // Remark columns — blank in PDF for manual writing
  { id: 'remark1',    label: 'Remark',     width: 0.08, required: false, isRemark: true },
  { id: 'remark2',    label: 'Remark',     width: 0.08, required: false, isRemark: true },
  { id: 'remark3',    label: 'Remark',     width: 0.08, required: false, isRemark: true },
];

export const DEFAULT_SELECTED_COLUMNS = [
  'sno', 'challanNo', 'date', 'grno', 'consignor', 'consignee', 'city',
  'packages', 'weight', 'payMode', 'freight', 'labour',
  'billCharge', 'toll', 'dd', 'total'
];

const REMARK_IDS = ['remark1', 'remark2', 'remark3'];

const getRemarkCount = (cols) =>
  REMARK_IDS.filter(id => cols.includes(id)).length;

const applyRemarkCount = (cols, count) => {
  const withoutRemarks = cols.filter(id => !REMARK_IDS.includes(id));
  return [...withoutRemarks, ...REMARK_IDS.slice(0, count)];
};

export default function PrintColumnSelector({ selectedColumns, onColumnsChange, onClose }) {
  const [localSelected, setLocalSelected] = useState(selectedColumns || DEFAULT_SELECTED_COLUMNS);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (selectedColumns) setLocalSelected(selectedColumns);
  }, [selectedColumns]);

  const toggleColumn = (columnId) => {
    const col = AVAILABLE_COLUMNS.find(c => c.id === columnId);
    if (col?.required || col?.isRemark) return;
    setLocalSelected(prev =>
      prev.includes(columnId) ? prev.filter(id => id !== columnId) : [...prev, columnId]
    );
  };

  const handleRemarkCount = (count) => {
    setLocalSelected(prev => applyRemarkCount(prev, count));
  };

  const selectAll = () => {
    const allNonRemark = AVAILABLE_COLUMNS.filter(c => !c.isRemark).map(c => c.id);
    setLocalSelected(applyRemarkCount(allNonRemark, getRemarkCount(localSelected)));
  };

  const selectDefault = () => setLocalSelected(DEFAULT_SELECTED_COLUMNS);

  const apply = () => {
    onColumnsChange(localSelected);
    setShowDropdown(false);
    if (onClose) onClose();
  };

  const remarkCount = getRemarkCount(localSelected);
  const regularColumns = AVAILABLE_COLUMNS.filter(c => !c.isRemark);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
      >
        <Settings className="h-4 w-4" />
        <span>Columns ({localSelected.length})</span>
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />

          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col" style={{ maxHeight: '520px' }}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50 flex-shrink-0">
              <h3 className="text-base font-bold text-gray-900 mb-1">Select Columns to Print</h3>
              <p className="text-xs text-gray-600">Choose which columns to include in the PDF</p>
            </div>

            {/* Quick actions */}
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex gap-2 flex-shrink-0">
              <button onClick={selectAll} className="flex-1 px-3 py-1.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                Select All
              </button>
              <button onClick={selectDefault} className="flex-1 px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
                Default
              </button>
            </div>

            {/* Remark columns selector */}
            <div className="px-4 py-3 border-b border-gray-200 bg-amber-50 flex-shrink-0">
              <p className="text-xs font-bold text-amber-900 mb-2">
                Remark Columns
                <span className="ml-1 font-normal text-amber-700">(blank cols for manual notes)</span>
              </p>
              <div className="flex gap-2">
                {[0, 1, 2, 3].map(count => (
                  <button
                    key={count}
                    onClick={() => handleRemarkCount(count)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded border transition-all ${
                      remarkCount === count
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    {count === 0 ? 'None' : `${count} Col${count > 1 ? 's' : ''}`}
                  </button>
                ))}
              </div>
              {remarkCount > 0 && (
                <p className="mt-1.5 text-[10px] text-amber-600">
                  {remarkCount} blank remark column{remarkCount > 1 ? 's' : ''} will appear after the Total column
                </p>
              )}
            </div>

            {/* Column list */}
            <div className="overflow-y-auto flex-1">
              <div className="p-3 space-y-1">
                {regularColumns.map((column) => {
                  const isSelected = localSelected.includes(column.id);
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
                        {isSelected
                          ? <CheckSquare className={`h-4 w-4 ${isRequired ? 'text-gray-500' : 'text-blue-600'}`} />
                          : <Square className="h-4 w-4 text-gray-400" />}
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                        {column.label}
                        {isRequired && <span className="ml-2 text-xs text-red-600 font-semibold">Required</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 flex gap-2 flex-shrink-0">
              <button
                onClick={() => setShowDropdown(false)}
                className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={apply}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors"
              >
                Apply ({localSelected.length})
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
