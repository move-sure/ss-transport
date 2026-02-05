'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, FileText, Building2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function ConsolidatedSettingsModal({ 
  isOpen, 
  onClose, 
  onProceed, 
  firstBill,
  selectedBillsCount 
}) {
  const [subtitle, setSubtitle] = useState('');
  const [useDefault, setUseDefault] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (isOpen && firstBill) {
      // Default subtitle from first bill
      const defaultSubtitle = `${firstBill.transport_name || 'Transport'}${firstBill.transport_gst ? ` | GST: ${firstBill.transport_gst}` : ''}`;
      setSubtitle(defaultSubtitle);
    }
  }, [isOpen, firstBill]);

  if (!isOpen) return null;

  const handleProceed = () => {
    onProceed({
      subtitle: useDefault ? `${firstBill?.transport_name || 'Transport'}${firstBill?.transport_gst ? ` | GST: ${firstBill.transport_gst}` : ''}` : subtitle,
      billDate: new Date().toISOString(),
      fromDate: fromDate || null,
      toDate: toDate || null
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white rounded-t-xl flex items-center justify-between">
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
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
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

          {/* Subtitle Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
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

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <p className="font-medium mb-1">PDF will include:</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                  <li>Company header with GST & Customer Care</li>
                  <li>Bills sorted by challan number (ascending)</li>
                  <li>Dispatch dates for each challan</li>
                  <li>Grand total summary at the end</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-xl flex items-center justify-end gap-3">
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
