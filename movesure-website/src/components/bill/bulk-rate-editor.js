'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, Save, RefreshCw, MapPin, Package } from 'lucide-react';

const BulkRateEditor = ({ billDetails, onApplyRates, onRefresh, savedMetadata }) => {
  const [cityRates, setCityRates] = useState({});
  const [commonLabourRate, setCommonLabourRate] = useState(0);
  const [commonRateType, setCommonRateType] = useState('per-package'); // Common rate type for all
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
          rate: 0
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
        }
      });
    }
    
    setCityRates(cities);
  }, [billDetails, savedMetadata]);

  // Load saved settings when savedMetadata changes
  useEffect(() => {
    if (savedMetadata) {
      if (savedMetadata.commonLabourRate !== undefined) {
        setCommonLabourRate(savedMetadata.commonLabourRate);
      }
      if (savedMetadata.commonRateType) {
        setCommonRateType(savedMetadata.commonRateType);
      }
    }
  }, [savedMetadata]);

  const handleCityRateChange = (city, value) => {
    setCityRates(prev => ({
      ...prev,
      [city]: {
        ...prev[city],
        rate: value
      }
    }));
  };

  const applyBulkRates = async () => {
    setApplying(true);
    
    const updatedDetails = billDetails.map(detail => {
      const city = detail.city || 'Unknown';
      const cityRate = cityRates[city];
      
      if (!cityRate) return detail;

      // Calculate freight based on common rate type
      let freightAmount = 0;
      if (commonRateType === 'per-package') {
        freightAmount = parseFloat(cityRate.rate || 0) * parseInt(detail.no_of_pckg || 0);
      } else {
        freightAmount = parseFloat(cityRate.rate || 0) * parseFloat(detail.wt || 0);
      }

      // Calculate labour charge based on common rate type
      let labourCharge = 0;
      if (commonRateType === 'per-package') {
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
        rate_by_kg: commonRateType === 'per-kg' ? cityRate.rate : 0,
        labour_rate: commonRateType === 'per-kg' ? commonLabourRate : 0,
        freight_amount: freightAmount,
        labour_charge: labourCharge,
        bilty_total: biltyTotal
      };
    });

    // Prepare metadata to save
    const bulkEditMetadata = {
      commonLabourRate: commonLabourRate,
      commonRateType: commonRateType,
      cityRates: cityRates
    };

    await onApplyRates(updatedDetails, bulkEditMetadata);
    setApplying(false);
  };

  const totalCities = Object.keys(cityRates).length;
  const totalBilties = billDetails.length;

  return (
    <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 rounded-xl shadow-lg p-4 border-2 border-purple-300 mb-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-purple-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bulk Rate Editor</h2>
            <p className="text-xs text-gray-600">
              {totalCities} cities • {totalBilties} bilties
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reset</span>
          </button>
          <button
            onClick={applyBulkRates}
            disabled={applying}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 shadow-md"
          >
            <Save className="h-4 w-4" />
            <span>{applying ? 'Applying...' : 'Apply to All Bilties'}</span>
          </button>
        </div>
      </div>

      {/* Common Settings */}
      <div className="bg-white rounded-lg p-3 mb-4 shadow-sm border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Common Labour Rate</label>
            <input
              type="number"
              step="0.01"
              value={commonLabourRate}
              onChange={(e) => setCommonLabourRate(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-sm font-semibold"
              placeholder="Enter labour rate"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Common Rate Type (All Cities)</label>
            <select
              value={commonRateType}
              onChange={(e) => setCommonRateType(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-sm font-semibold"
            >
              <option value="per-package">Per Package</option>
              <option value="per-kg">Per KG</option>
            </select>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
            <p className="text-xs text-gray-700">
              💡 {commonRateType === 'per-package' 
                ? 'Charges = Rate × Packages' 
                : 'Charges = Rate × Weight'}
            </p>
          </div>
        </div>
      </div>

      {/* City Rates Grid - Compact Table */}
      <div className="bg-white rounded-lg p-3 shadow-sm border border-purple-200">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-purple-600" />
          City-wise Freight Rates
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Object.entries(cityRates).map(([city, data]) => (
            <div 
              key={city} 
              className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-3 w-3 text-purple-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate" title={city}>{city}</p>
                  <p className="text-xs text-gray-600">
                    {data.count}B • {data.totalPackages}P • {data.totalWeight.toFixed(0)}kg
                  </p>
                </div>
              </div>
              
              <input
                type="number"
                step="0.01"
                value={data.rate}
                onChange={(e) => handleCityRateChange(city, e.target.value)}
                className="w-full px-2 py-1.5 border border-purple-300 rounded text-sm font-semibold focus:border-purple-500 focus:ring-1 focus:ring-purple-200"
                placeholder="Rate"
              />
              
              <div className="mt-2 bg-white rounded px-2 py-1 border border-green-200">
                <p className="text-xs text-gray-600">Est. Freight</p>
                <p className="text-sm font-bold text-green-600">
                  ₹{(
                    commonRateType === 'per-package' 
                      ? parseFloat(data.rate || 0) * data.totalPackages
                      : parseFloat(data.rate || 0) * data.totalWeight
                  ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BulkRateEditor;
