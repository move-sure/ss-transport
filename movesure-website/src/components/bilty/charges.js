'use client';

import React, { useEffect } from 'react';

const PackageChargesSection = ({ formData, setFormData, rates }) => {
  useEffect(() => {
    // Calculate labour charge based on number of packages and labour rate
    const labourRate = formData.labour_rate || 20; // Default to 20 if not set
    const labourCharge = (formData.no_of_pkg || 0) * labourRate;
    setFormData(prev => ({ ...prev, labour_charge: labourCharge }));
  }, [formData.no_of_pkg, formData.labour_rate, setFormData]);

  useEffect(() => {
    // Calculate freight amount
    const freightAmount = (formData.wt || 0) * (formData.rate || 0);
    setFormData(prev => ({ ...prev, freight_amount: freightAmount }));
  }, [formData.wt, formData.rate, setFormData]);

  useEffect(() => {
    // Calculate total
    const total = (formData.freight_amount || 0) + 
                  (formData.labour_charge || 0) + 
                  (formData.bill_charge || 0) + 
                  (formData.toll_charge || 0) + 
                  (formData.dd_charge || 0) + 
                  (formData.other_charge || 0) + 
                  (formData.pf_charge || 0);
    setFormData(prev => ({ ...prev, total }));
  }, [formData.freight_amount, formData.labour_charge, formData.bill_charge, 
      formData.toll_charge, formData.dd_charge, formData.other_charge, formData.pf_charge, setFormData]);

  // Initialize labour rate if not set
  useEffect(() => {
    if (!formData.labour_rate) {
      setFormData(prev => ({ ...prev, labour_rate: 20 }));
    }
  }, [formData.labour_rate, setFormData]);

  return (
    <div className="bg-white p-6 rounded-xl border-2 border-purple-200 shadow-lg">
      <div className="grid grid-cols-12 gap-6">
        {/* Package Details - Left Side (8 columns) */}
        <div className="col-span-8">
          <div className="bg-white rounded-lg p-4 border-2 border-purple-200 shadow-md">
            <h4 className="text-sm font-bold text-black mb-3 text-center bg-gradient-to-r from-purple-100 to-blue-100 py-2 rounded">
              PACKAGE DETAILS
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {/* No of Packages */}
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[90px]">
                  PACKAGES
                </span>
                <input
                  type="number"
                  value={formData.no_of_pkg}
                  onChange={(e) => setFormData(prev => ({ ...prev, no_of_pkg: parseInt(e.target.value) || 0 }))}
                  className="flex-1 px-3 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-600 bg-white shadow-sm hover:border-purple-400 transition-colors"
                  placeholder="0"
                  tabIndex={20}
                />
              </div>

              {/* Weight */}
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[90px]">
                  WEIGHT
                </span>
                <input
                  type="number"
                  step="0.001"
                  value={formData.wt}
                  onChange={(e) => setFormData(prev => ({ ...prev, wt: parseFloat(e.target.value) || 0 }))}
                  className="flex-1 px-3 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-600 bg-white shadow-sm hover:border-purple-400 transition-colors"
                  placeholder="0"
                  tabIndex={21}
                />
              </div>

              {/* Rate per kg */}
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[90px]">
                  RATE
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                  className="flex-1 px-3 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-600 bg-white shadow-sm hover:border-purple-400 transition-colors"
                  placeholder="0"
                  tabIndex={22}
                />
              </div>

              {/* Private Marks */}
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[90px]">
                  PVT MARKS
                </span>
                <input
                  type="text"
                  value={formData.pvt_marks}
                  onChange={(e) => setFormData(prev => ({ ...prev, pvt_marks: e.target.value }))}
                  className="flex-1 px-3 py-2 text-black font-semibold border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-600 bg-white shadow-sm hover:border-purple-400 transition-colors"
                  placeholder="Private marks"
                  tabIndex={23}
                />
              </div>

              {/* Labour Rate - New Field */}
              <div className="flex items-center gap-3 col-span-2">
                <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-lg whitespace-nowrap min-w-[120px]">
                  LABOUR RATE
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.labour_rate || 20}
                  onChange={(e) => setFormData(prev => ({ ...prev, labour_rate: parseFloat(e.target.value) || 20 }))}
                  className="w-32 px-3 py-2 text-black font-semibold border-2 border-orange-300 rounded-lg focus:outline-none focus:border-orange-500 bg-white shadow-sm hover:border-orange-400 transition-colors"
                  placeholder="20"
                  tabIndex={23.5}
                />
                <span className="text-sm text-gray-600 font-medium">₹ per package</span>
                <span className="text-xs text-gray-500 ml-auto">
                  Total Labour: ₹{((formData.no_of_pkg || 0) * (formData.labour_rate || 20)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Charges Section - Right Side (4 columns) */}
        <div className="col-span-4">
          <div className="bg-white rounded-lg border-2 border-purple-300 p-4 shadow-lg h-full">
            <h4 className="text-sm font-bold text-black mb-4 text-center bg-gradient-to-r from-purple-100 to-blue-100 py-2 rounded">
              CHARGES BREAKDOWN
            </h4>
            <div className="space-y-3">
              {/* Freight Charge */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-xs font-bold rounded shadow-lg whitespace-nowrap">
                  FREIGHT
                </span>
                <input
                  type="number"
                  value={formData.freight_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, freight_amount: parseFloat(e.target.value) || 0 }))}
                  className="w-24 px-2 py-2 text-black font-bold border-2 border-purple-300 rounded focus:outline-none focus:border-purple-600 text-center bg-white hover:border-purple-400 transition-colors"
                  tabIndex={24}
                />
              </div>

              {/* Labour Charge with Rate Display */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-2 text-xs font-bold rounded shadow-lg whitespace-nowrap">
                  LABOUR
                </span>
                <div className="flex flex-col items-end">
                  <input
                    type="number"
                    value={formData.labour_charge}
                    onChange={(e) => setFormData(prev => ({ ...prev, labour_charge: parseFloat(e.target.value) || 0 }))}
                    className="w-24 px-2 py-2 text-black font-bold border-2 border-orange-300 rounded focus:outline-none focus:border-orange-500 text-center bg-white hover:border-orange-400 transition-colors"
                    tabIndex={25}
                  />
                  <span className="text-xs text-gray-500 mt-1">
                    @₹{formData.labour_rate || 20}/pkg
                  </span>
                </div>
              </div>

              {/* Bill Charge */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-xs font-bold rounded shadow-lg whitespace-nowrap">
                  BILL CHR
                </span>
                <input
                  type="number"
                  value={formData.bill_charge}
                  onChange={(e) => setFormData(prev => ({ ...prev, bill_charge: parseFloat(e.target.value) || 0 }))}
                  className="w-24 px-2 py-2 text-black font-bold border-2 border-purple-300 rounded focus:outline-none focus:border-purple-600 text-center bg-white hover:border-purple-400 transition-colors"
                  tabIndex={26}
                />
              </div>

              {/* PF Charge */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-xs font-bold rounded shadow-lg whitespace-nowrap">
                  PF CHR
                </span>
                <input
                  type="number"
                  value={formData.pf_charge}
                  onChange={(e) => setFormData(prev => ({ ...prev, pf_charge: parseFloat(e.target.value) || 0 }))}
                  className="w-24 px-2 py-2 text-black font-bold border-2 border-purple-300 rounded focus:outline-none focus:border-purple-600 text-center bg-white hover:border-purple-400 transition-colors"
                  tabIndex={27}
                />
              </div>

              {/* Toll Charge - Moved here after PF Charge */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-3 py-2 text-xs font-bold rounded shadow-lg whitespace-nowrap">
                  TOLL
                </span>
                <input
                  type="number"
                  value={formData.toll_charge}
                  onChange={(e) => setFormData(prev => ({ ...prev, toll_charge: parseFloat(e.target.value) || 0 }))}
                  className="w-24 px-2 py-2 text-black font-bold border-2 border-green-300 rounded focus:outline-none focus:border-green-600 text-center bg-white hover:border-green-400 transition-colors"
                  tabIndex={28}
                />
              </div>

              {/* Other Charge */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 text-xs font-bold rounded shadow-lg whitespace-nowrap">
                  OTHER
                </span>
                <input
                  type="number"
                  value={formData.other_charge}
                  onChange={(e) => setFormData(prev => ({ ...prev, other_charge: parseFloat(e.target.value) || 0 }))}
                  className="w-24 px-2 py-2 text-black font-bold border-2 border-purple-300 rounded focus:outline-none focus:border-purple-600 text-center bg-white hover:border-purple-400 transition-colors"
                  tabIndex={29}
                />
              </div>

              {/* Total Amount */}
              <div className="border-t-2 border-purple-300 pt-3 mt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-gradient-to-r from-purple-800 to-purple-600 text-white px-3 py-3 text-sm font-bold rounded shadow-lg whitespace-nowrap">
                    TOTAL
                  </span>
                  <input
                    type="number"
                    value={formData.total}
                    readOnly
                    className="w-24 px-2 py-3 text-black font-bold border-4 border-purple-400 rounded bg-purple-50 text-center text-lg shadow-lg"
                    tabIndex={30}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageChargesSection;