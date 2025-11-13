'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, Save, RefreshCw, MapPin, Package, Weight } from 'lucide-react';

const BulkRateEditor = ({ billDetails, onApplyRates, onRefresh, savedMetadata }) => {
  const [cityRates, setCityRates] = useState({});
  const [commonLabourRate, setCommonLabourRate] = useState(0);
  const [labourRateType, setLabourRateType] = useState('per-package'); // 'per-package' or 'per-kg'
  const [applying, setApplying] = useState(false);

  // Extract unique cities with their bilty counts AND merge saved metadata
  useEffect(() => {
    const cities = {};
    billDetails.forEach(detail => {
      const city = detail.city || 'Unknown';
      if (!cities[city]) {
        cities[city] = {
          count: 0,
          totalPackages: 0,
          totalWeight: 0,
          rate: 0,
          rateType: 'per-package' // 'per-package' or 'per-kg'
        };
      }
      cities[city].count++;
      cities[city].totalPackages += parseInt(detail.no_of_pckg || 0);
      cities[city].totalWeight += parseFloat(detail.wt || 0);
    });
    
    // Merge saved rates if available
    if (savedMetadata && savedMetadata.cityRates) {
      Object.keys(savedMetadata.cityRates).forEach(city => {
        if (cities[city]) {
          cities[city].rate = savedMetadata.cityRates[city].rate || 0;
          cities[city].rateType = savedMetadata.cityRates[city].rateType || 'per-package';
        }
      });
    }
    
    setCityRates(cities);
  }, [billDetails, savedMetadata]);

  // Load saved labour rate when savedMetadata changes
  useEffect(() => {
    if (savedMetadata) {
      if (savedMetadata.commonLabourRate !== undefined) {
        setCommonLabourRate(savedMetadata.commonLabourRate);
      }
      if (savedMetadata.labourRateType) {
        setLabourRateType(savedMetadata.labourRateType);
      }
    }
  }, [savedMetadata]);

  const handleCityRateChange = (city, field, value) => {
    setCityRates(prev => ({
      ...prev,
      [city]: {
        ...prev[city],
        [field]: value
      }
    }));
  };

  const applyBulkRates = async () => {
    setApplying(true);
    
    const updatedDetails = billDetails.map(detail => {
      const city = detail.city || 'Unknown';
      const cityRate = cityRates[city];
      
      if (!cityRate) return detail;

      // Calculate freight based on rate type
      let freightAmount = 0;
      if (cityRate.rateType === 'per-package') {
        freightAmount = parseFloat(cityRate.rate || 0) * parseInt(detail.no_of_pckg || 0);
      } else {
        freightAmount = parseFloat(cityRate.rate || 0) * parseFloat(detail.wt || 0);
      }

      // Calculate labour charge based on common rate
      let labourCharge = 0;
      if (labourRateType === 'per-package') {
        labourCharge = parseFloat(commonLabourRate || 0) * parseInt(detail.no_of_pckg || 0);
      } else {
        labourCharge = parseFloat(commonLabourRate || 0) * parseFloat(detail.wt || 0);
      }

      // Calculate new total
      const ddCharge = parseFloat(detail.dd_charge || 0);
      const tollCharge = parseFloat(detail.toll_charge || 0);
      const pfCharge = parseFloat(detail.pf_charge || 0);
      const otherCharge = parseFloat(detail.other_charge || 0);
      const biltyTotal = freightAmount + labourCharge + ddCharge + tollCharge + pfCharge + otherCharge;

      return {
        ...detail,
        rate_by_kg: cityRate.rateType === 'per-kg' ? cityRate.rate : 0,
        labour_rate: labourRateType === 'per-kg' ? commonLabourRate : 0,
        freight_amount: freightAmount,
        labour_charge: labourCharge,
        bilty_total: biltyTotal
      };
    });

    // Prepare metadata to save
    const bulkEditMetadata = {
      commonLabourRate: commonLabourRate,
      labourRateType: labourRateType,
      cityRates: cityRates
    };

    await onApplyRates(updatedDetails, bulkEditMetadata);
    setApplying(false);
  };

  const totalCities = Object.keys(cityRates).length;
  const totalBilties = billDetails.length;

  return (
    <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 rounded-xl shadow-lg p-6 border-2 border-purple-300 mb-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-purple-300">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-md">
            <Calculator className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bulk Rate Editor</h2>
            <p className="text-sm text-gray-600">
              Set rates for {totalCities} cities • {totalBilties} bilties
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
            <span>Reset</span>
          </button>
          <button
            onClick={applyBulkRates}
            disabled={applying}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 shadow-lg"
          >
            <Save className="h-5 w-5" />
            <span>{applying ? 'Applying...' : 'Apply to All Bilties'}</span>
          </button>
        </div>
      </div>

      {/* Common Labour Rate */}
      <div className="bg-white rounded-xl p-5 mb-6 shadow-md border-2 border-blue-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          Common Labour Rate (Applied to All Bilties)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Labour Rate</label>
            <input
              type="number"
              step="0.01"
              value={commonLabourRate}
              onChange={(e) => setCommonLabourRate(e.target.value)}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg font-semibold"
              placeholder="Enter labour rate"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Rate Type</label>
            <select
              value={labourRateType}
              onChange={(e) => setLabourRateType(e.target.value)}
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg font-semibold"
            >
              <option value="per-package">Per Package</option>
              <option value="per-kg">Per KG</option>
            </select>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-3 bg-blue-50 p-3 rounded-lg">
          💡 This rate will be applied to all bilties. 
          {labourRateType === 'per-package' 
            ? ' Labour charge = Rate × No. of Packages' 
            : ' Labour charge = Rate × Weight'}
        </p>
      </div>

      {/* City Rates Grid */}
      <div className="bg-white rounded-xl p-5 shadow-md border-2 border-purple-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-purple-600" />
          City-wise Freight Rates
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {Object.entries(cityRates).map(([city, data]) => (
            <div 
              key={city} 
              className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border-2 border-purple-200 hover:shadow-lg transition-all"
            >
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                {/* City Info */}
                <div className="md:col-span-2">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-600 rounded-lg">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{city}</p>
                      <p className="text-xs text-gray-600">
                        {data.count} bilties • {data.totalPackages} pkgs • {data.totalWeight.toFixed(2)} kg
                      </p>
                    </div>
                  </div>
                </div>

                {/* Freight Rate */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Freight Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={data.rate}
                    onChange={(e) => handleCityRateChange(city, 'rate', e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-base font-semibold"
                    placeholder="0.00"
                  />
                </div>

                {/* Rate Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Rate Type</label>
                  <select
                    value={data.rateType}
                    onChange={(e) => handleCityRateChange(city, 'rateType', e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-base font-semibold"
                  >
                    <option value="per-package">Per Package</option>
                    <option value="per-kg">Per KG</option>
                  </select>
                </div>

                {/* Estimated Total */}
                <div className="bg-white rounded-lg p-3 border-2 border-green-300">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Est. Freight</p>
                  <p className="text-lg font-bold text-green-600">
                    ₹{(
                      data.rateType === 'per-package' 
                        ? parseFloat(data.rate || 0) * data.totalPackages
                        : parseFloat(data.rate || 0) * data.totalWeight
                    ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calculation Preview */}
      <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-300">
        <p className="text-sm font-semibold text-gray-800">
          📊 <strong>How it works:</strong>
        </p>
        <ul className="text-sm text-gray-700 mt-2 space-y-1 ml-4">
          <li>• <strong>Freight Amount</strong> = City Rate × (Packages or Weight based on rate type)</li>
          <li>• <strong>Labour Charge</strong> = Common Labour Rate × (Packages or Weight based on rate type)</li>
          <li>• <strong>Bilty Total</strong> = Freight + Labour + DD + Toll + PF + Other charges</li>
          <li>• Click <strong>"Apply to All Bilties"</strong> to update all bilties at once</li>
        </ul>
      </div>
    </div>
  );
};

export default BulkRateEditor;
