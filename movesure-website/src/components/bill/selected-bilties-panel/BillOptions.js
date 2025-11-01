'use client';

import React from 'react';
import { Printer, Save } from 'lucide-react';

const BillOptions = ({ 
  billType, 
  setBillType, 
  customName, 
  setCustomName, 
  onPrint,
  onSaveAndPrint,
  disabled,
  isSaving 
}) => {
  return (
    <div className="w-[400px] bg-gradient-to-br from-purple-50 to-indigo-50 p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-200">
        {/* Bill Options Header */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-purple-200">
          <div className="p-3 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl">
            <Printer className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Bill Options</h3>
            <p className="text-xs text-gray-500">Customize your bill before printing</p>
          </div>
        </div>

        {/* Bill Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-3">
            Bill Type
          </label>
          <div className="space-y-3">
            <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${billType === 'consignor' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
              <input
                type="radio"
                name="billType"
                value="consignor"
                checked={billType === 'consignor'}
                onChange={(e) => setBillType(e.target.value)}
                className="w-5 h-5 text-purple-600 focus:ring-purple-500 focus:ring-2"
              />
              <span className="ml-3 text-sm font-semibold text-gray-900">Consignor Bill</span>
            </label>
            <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${billType === 'consignee' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
              <input
                type="radio"
                name="billType"
                value="consignee"
                checked={billType === 'consignee'}
                onChange={(e) => setBillType(e.target.value)}
                className="w-5 h-5 text-purple-600 focus:ring-purple-500 focus:ring-2"
              />
              <span className="ml-3 text-sm font-semibold text-gray-900">Consignee Bill</span>
            </label>
            <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${billType === 'transport' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
              <input
                type="radio"
                name="billType"
                value="transport"
                checked={billType === 'transport'}
                onChange={(e) => setBillType(e.target.value)}
                className="w-5 h-5 text-purple-600 focus:ring-purple-500 focus:ring-2"
              />
              <span className="ml-3 text-sm font-semibold text-gray-900">Transport Bill</span>
            </label>
          </div>
        </div>

        {/* Custom Name Input */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Custom Name (Optional)
          </label>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Enter custom name for the bill"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-sm font-medium"
          />
          <p className="mt-2 text-xs text-gray-500">
            Leave empty to use default name from bill type
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Print Only Button */}
          <button
            onClick={onPrint}
            disabled={disabled || isSaving}
            className="w-full py-4 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Printer className="h-5 w-5" />
            <span>Print Only</span>
          </button>

          {/* Save & Print Button */}
          <button
            onClick={onSaveAndPrint}
            disabled={disabled || isSaving}
            className="w-full py-4 text-sm font-bold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Save & Print</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillOptions;
