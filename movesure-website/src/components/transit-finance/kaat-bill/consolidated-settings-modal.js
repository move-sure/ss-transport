'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, FileText, Building2, Calendar, Truck, ArrowDownAZ } from 'lucide-react';
import { format } from 'date-fns';

export default function ConsolidatedSettingsModal({ 
  isOpen, 
  onClose, 
  onProceed, 
  firstBill,
  selectedBills = [],
  selectedBillsCount 
}) {
  const [subtitle, setSubtitle] = useState('');
  const [useDefault, setUseDefault] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showPerBillTransport, setShowPerBillTransport] = useState(false);
  const [sortOrder, setSortOrder] = useState('challan'); // 'challan' or 'city'
  const [showRemarkColumn, setShowRemarkColumn] = useState(false);

  useEffect(() => {
    if (isOpen && firstBill) {
      const defaultSubtitle = `${firstBill.transport_name || 'Transport'}${firstBill.transport_gst ? ` | GST: ${firstBill.transport_gst}` : ''}`;
      setSubtitle(defaultSubtitle);
    }
  }, [isOpen, firstBill]);

  if (!isOpen) return null;

  // Check if bills have different transport names
  const uniqueTransports = [...new Set((selectedBills || []).map(b => b.transport_name).filter(Boolean))];
  const hasMultipleTransports = uniqueTransports.length > 1;

  const handleProceed = () => {
    onProceed({
      subtitle: showPerBillTransport 
        ? null 
        : useDefault 
          ? `${firstBill?.transport_name || 'Transport'}${firstBill?.transport_gst ? ` | GST: ${firstBill.transport_gst}` : ''}` 
          : subtitle,
      billDate: new Date().toISOString(),
      fromDate: fromDate || null,
      toDate: toDate || null,
      showPerBillTransport,
      sortOrder,
      showRemarkColumn
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white rounded-t-xl flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-bold">PDF Settings</h2>
              <p className="text-sm text-white/80">{selectedBillsCount} bills selected</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Date Range Section */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Date Range (Optional - for display only)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            {(fromDate || toDate) && (
              <p className="text-xs text-gray-500 mt-1">
                Date range will be shown in PDF header
              </p>
            )}
          </div>

          {/* â•â•â•â•â•â• Transport Details Display Option â•â•â•â•â•â• */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600" />
              Transport Details Display
            </label>
            
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="transportDisplay"
                  checked={!showPerBillTransport}
                  onChange={() => setShowPerBillTransport(false)}
                  className="w-4 h-4 text-indigo-600 mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">Single Subtitle (Header Only)</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    One transport name &amp; GST shown in the PDF header for all bills
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                showPerBillTransport 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="transportDisplay"
                  checked={showPerBillTransport}
                  onChange={() => setShowPerBillTransport(true)}
                  className="w-4 h-4 text-indigo-600 mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">Per-Bill Transport Details âœ¨</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Each challan shows its own transport name &amp; GST from kaat bill master
                  </div>
                  {hasMultipleTransports && (
                    <div className="mt-1.5 text-xs text-indigo-600 font-medium bg-indigo-100 px-2 py-0.5 rounded inline-block">
                      {uniqueTransports.length} different transports detected â€” recommended!
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Subtitle Section â€” only show when NOT per-bill */}
          {!showPerBillTransport && (
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                PDF Subtitle
              </label>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="subtitleOption"
                    checked={useDefault}
                    onChange={() => setUseDefault(true)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Use Default</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {firstBill?.transport_name || 'Transport'} {firstBill?.transport_gst ? `| GST: ${firstBill.transport_gst}` : ''}
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="subtitleOption"
                    checked={!useDefault}
                    onChange={() => setUseDefault(false)}
                    className="w-4 h-4 text-indigo-600 mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-2">Custom Subtitle</div>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => {
                        setSubtitle(e.target.value);
                        setUseDefault(false);
                      }}
                      placeholder="Enter custom subtitle..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={useDefault}
                    />
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* â•â•â•â•â•â• Sort Order â•â•â•â•â•â• */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <ArrowDownAZ className="w-4 h-4 text-indigo-600" />
              Sort Order
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSortOrder('challan')}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors text-center ${
                  sortOrder === 'challan'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                By Challan No.
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('city')}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors text-center ${
                  sortOrder === 'city'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                By City Name (A-Z)
              </button>
            </div>
          </div>

          {/* ══════ Remark Column Toggle ══════ */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Extra Columns
            </label>
            <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
              showRemarkColumn
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <input
                type="checkbox"
                checked={showRemarkColumn}
                onChange={(e) => setShowRemarkColumn(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-sm">Add Remark Column</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Adds an empty &quot;Remark&quot; column at the end of each table for handwritten notes
                </div>
              </div>
            </label>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <p className="font-medium mb-1">PDF will include:</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                  <li>Company header with GST &amp; Customer Care</li>
                  <li>Bills sorted {sortOrder === 'city' ? 'alphabetically by city name' : 'by challan number (ascending)'}</li>
                  {showPerBillTransport && <li className="font-semibold">Transport Name &amp; GST on each challan header</li>}
                  {showRemarkColumn && <li className="font-semibold">Remark column for handwritten notes</li>}
                  <li>Dispatch dates for each challan</li>
                  <li>Grand total summary at the end</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-xl flex items-center justify-end gap-3 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleProceed}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Generate PDF
          </button>
        </div>
      </div>
    </div>
  );
}
