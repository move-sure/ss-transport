'use client';

import React, { useEffect } from 'react';

const PackageChargesSection = ({ formData, setFormData, rates }) => {
  useEffect(() => {
    // Calculate labour charge based on number of packages
    const labourCharge = (formData.no_of_pkg || 0) * 20;
    setFormData(prev => ({ ...prev, labour_charge: labourCharge }));
  }, [formData.no_of_pkg, setFormData]);

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

  return (
    <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200 shadow-md">
      <div className="grid grid-cols-12 gap-4">
        {/* Package Details - Left Side (8 columns) */}
        <div className="col-span-8">
          <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
            <h4 className="text-sm font-bold text-gray-800 mb-3 text-center bg-gradient-to-r from-purple-100 to-pink-100 py-2 rounded">
              PACKAGE DETAILS
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {/* No of Packages */}
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-md whitespace-nowrap min-w-[90px]">
                  PACKAGES
                </span>
                <input
                  type="number"
                  value={formData.no_of_pkg}
                  onChange={(e) => setFormData(prev => ({ ...prev, no_of_pkg: parseInt(e.target.value) || 0 }))}
                  className="flex-1 px-3 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
                  placeholder="0"
                  tabIndex={20}
                />
              </div>

              {/* Weight */}
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-md whitespace-nowrap min-w-[90px]">
                  WEIGHT
                </span>
                <input
                  type="number"
                  step="0.001"
                  value={formData.wt}
                  onChange={(e) => setFormData(prev => ({ ...prev, wt: parseFloat(e.target.value) || 0 }))}
                  className="flex-1 px-3 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
                  placeholder="0"
                  tabIndex={21}
                />
              </div>

              {/* Rate per kg */}
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-md whitespace-nowrap min-w-[90px]">
                  RATE
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                  className="flex-1 px-3 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
                  placeholder="0"
                  tabIndex={22}
                />
              </div>

              {/* Private Marks */}
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-2 text-sm font-bold rounded-lg text-center shadow-md whitespace-nowrap min-w-[90px]">
                  PVT MARKS
                </span>
                <input
                  type="text"
                  value={formData.pvt_marks}
                  onChange={(e) => setFormData(prev => ({ ...prev, pvt_marks: e.target.value }))}
                  className="flex-1 px-3 py-2 text-gray-800 font-semibold border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white shadow-sm"
                  placeholder="Private marks"
                  tabIndex={23}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Charges Section - Right Side (4 columns) */}
        <div className="col-span-4">
          <div className="bg-white rounded-lg border-2 border-blue-300 p-4 shadow-lg h-full">
            <h4 className="text-sm font-bold text-gray-800 mb-4 text-center bg-gradient-to-r from-blue-100 to-indigo-100 py-2 rounded">
              CHARGES BREAKDOWN
            </h4>
            <div className="space-y-3">
              {/* Freight Charge */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-2 text-xs font-bold rounded shadow-sm whitespace-nowrap">
                  FREIGHT
                </span>
                <input
                  type="number"
                  value={formData.freight_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, freight_amount: parseFloat(e.target.value) || 0 }))}
                  className="w-24 px-2 py-2 text-gray-800 font-bold border-2 border-blue-300 rounded focus:outline-none focus:border-blue-600 text-center bg-white"
                  tabIndex={24}
                />
              </div>

              {/* Labour Charge */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-2 text-xs font-bold rounded shadow-sm whitespace-nowrap">
                  LABOUR
                </span>
                <input
                  type="number"
                  value={formData.labour_charge}
                  onChange={(e) => setFormData(prev => ({ ...prev, labour_charge: parseFloat(e.target.value) || 0 }))}
                  className="w-24 px-2 py-2 text-gray-800 font-bold border-2 border-blue-300 rounded focus:outline-none focus:border-blue-600 text-center bg-white"
                  tabIndex={25}
                />
              </div>

              {/* Bill Charge */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-2 text-xs font-bold rounded shadow-sm whitespace-nowrap">
                  BILL CHR
                </span>
                <input
                  type="number"
                  value={formData.bill_charge}
                  onChange={(e) => setFormData(prev => ({ ...prev, bill_charge: parseFloat(e.target.value) || 0 }))}
                  className="w-24 px-2 py-2 text-gray-800 font-bold border-2 border-blue-300 rounded focus:outline-none focus:border-blue-600 text-center bg-white"
                  tabIndex={26}
                />
              </div>

              {/* PF Charge */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-2 text-xs font-bold rounded shadow-sm whitespace-nowrap">
                  PF CHR
                </span>
                <input
                  type="number"
                  value={formData.pf_charge}
                  onChange={(e) => setFormData(prev => ({ ...prev, pf_charge: parseFloat(e.target.value) || 0 }))}
                  className="w-24 px-2 py-2 text-gray-800 font-bold border-2 border-blue-300 rounded focus:outline-none focus:border-blue-600 text-center bg-white"
                  tabIndex={27}
                />
              </div>

              {/* Other Charge */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-2 text-xs font-bold rounded shadow-sm whitespace-nowrap">
                  OTHER
                </span>
                <input
                  type="number"
                  value={formData.other_charge}
                  onChange={(e) => setFormData(prev => ({ ...prev, other_charge: parseFloat(e.target.value) || 0 }))}
                  className="w-24 px-2 py-2 text-gray-800 font-bold border-2 border-blue-300 rounded focus:outline-none focus:border-blue-600 text-center bg-white"
                  tabIndex={28}
                />
              </div>

              {/* Toll Charge */}
              <div className="flex items-center justify-between gap-2">
                <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-2 text-xs font-bold rounded shadow-sm whitespace-nowrap">
                  TOLL
                </span>
                <input
                  type="number"
                  value={formData.toll_charge}
                  onChange={(e) => setFormData(prev => ({ ...prev, toll_charge: parseFloat(e.target.value) || 0 }))}
                  className="w-24 px-2 py-2 text-gray-800 font-bold border-2 border-blue-300 rounded focus:outline-none focus:border-blue-600 text-center bg-white"
                  tabIndex={29}
                />
              </div>

              {/* Total Amount */}
              <div className="border-t-2 border-blue-300 pt-3 mt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-3 py-3 text-sm font-bold rounded shadow-md whitespace-nowrap">
                    TOTAL
                  </span>
                  <input
                    type="number"
                    value={formData.total}
                    readOnly
                    className="w-24 px-2 py-3 text-gray-800 font-bold border-4 border-red-400 rounded bg-red-50 text-center text-lg shadow-md"
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