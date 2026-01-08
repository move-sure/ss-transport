'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, Save, RefreshCw, MapPin, Package, Zap } from 'lucide-react';

const BulkRateEditor = ({ billDetails, onApplyRates, onRefresh, savedMetadata }) => {
  const [cityRates, setCityRates] = useState({});
  const [rateType, setRateType] = useState('per-package'); // Overall rate type (per-package or per-kg)
  
  // Per-Package Common Rates
  const [labourRatePerPackage, setLabourRatePerPackage] = useState(0);
  const [billChargePerBilty, setBillChargePerBilty] = useState(0); // Per Bilty, not per package
  const [tollChargePerBilty, setTollChargePerBilty] = useState(0); // Per Bilty, not per package
  
  // Per-KG Common Rates
  const [labourRatePerKg, setLabourRatePerKg] = useState(0);
  
  // City Wise Per-Package Rates
  const [cityLabourRate, setCityLabourRate] = useState({});
  const [cityLabourRatePerPackage, setCityLabourRatePerPackage] = useState({});
  const [cityLabourRatePerKg, setCityLabourRatePerKg] = useState({});
  const [cityBillCharge, setCityBillCharge] = useState({}); // Per Bilty
  const [cityTollCharge, setCityTollCharge] = useState({}); // Per Bilty
  
  const [applying, setApplying] = useState(false);

  // Extract unique cities and initialize rates
  useEffect(() => {
    const cities = {};
    billDetails.forEach(detail => {
      const city = detail.city || 'Unknown';
      if (!cities[city]) {
        cities[city] = {
          count: 0,
          totalPackages: 0,
          totalWeight: 0,
          freightRate: 0
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
          cities[city].freightRate = savedMetadata.cityRates[city].freightRate || 0;
        }
      });
    }
    
    setCityRates(cities);
  }, [billDetails, savedMetadata]);

  // Load saved settings when savedMetadata changes
  useEffect(() => {
    if (savedMetadata) {
      if (savedMetadata.rateType) setRateType(savedMetadata.rateType);
      if (savedMetadata.labourRatePerPackage !== undefined) setLabourRatePerPackage(savedMetadata.labourRatePerPackage);
      if (savedMetadata.billChargePerBilty !== undefined) setBillChargePerBilty(savedMetadata.billChargePerBilty);
      if (savedMetadata.tollChargePerBilty !== undefined) setTollChargePerBilty(savedMetadata.tollChargePerBilty);
      if (savedMetadata.labourRatePerKg !== undefined) setLabourRatePerKg(savedMetadata.labourRatePerKg);
      if (savedMetadata.cityLabourRatePerPackage) setCityLabourRatePerPackage(savedMetadata.cityLabourRatePerPackage);
      if (savedMetadata.cityLabourRatePerKg) setCityLabourRatePerKg(savedMetadata.cityLabourRatePerKg);
      if (savedMetadata.cityBillCharge) setCityBillCharge(savedMetadata.cityBillCharge);
      if (savedMetadata.cityTollCharge) setCityTollCharge(savedMetadata.cityTollCharge);
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

  const handleCityLabourChange = (city, value) => {
    setCityLabourRate(prev => ({ ...prev, [city]: value }));
  };

  const handleCityLabourPerPackageChange = (city, value) => {
    setCityLabourRatePerPackage(prev => ({ ...prev, [city]: value }));
  };

  const handleCityLabourPerKgChange = (city, value) => {
    setCityLabourRatePerKg(prev => ({ ...prev, [city]: value }));
  };

  const handleCityBillChange = (city, value) => {
    setCityBillCharge(prev => ({ ...prev, [city]: value }));
  };

  const handleCityTollChange = (city, value) => {
    setCityTollCharge(prev => ({ ...prev, [city]: value }));
  };

  // Helper function to get rate value, treating empty strings as undefined
  const getRateValue = (value) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) || value === '' || value === undefined ? 0 : parsed;
  };

  // Helper to get labour rate based on rate type
  const getLabourRate = (city) => {
    if (rateType === 'per-package') {
      const cityRate = getRateValue(cityLabourRatePerPackage[city]);
      return cityRate > 0 ? cityRate : getRateValue(labourRatePerPackage);
    } else {
      const cityRate = getRateValue(cityLabourRatePerPackage[city]);
      return cityRate > 0 ? cityRate : getRateValue(labourRatePerPackage);
    }
  };

  // Get labour rate per package for display and calculation
  const getLabourRatePerPackage = (city) => {
    const cityRate = getRateValue(cityLabourRatePerPackage[city]);
    return cityRate > 0 ? cityRate : getRateValue(labourRatePerPackage);
  };

  // Get labour rate per kg for display only
  const getLabourRatePerKg = (city) => {
    const cityRate = getRateValue(cityLabourRatePerKg[city]);
    return cityRate > 0 ? cityRate : getRateValue(labourRatePerKg);
  };

  const applyBulkRates = async () => {
    setApplying(true);
    
    const updatedDetails = billDetails.map(detail => {
      const city = detail.city || 'Unknown';
      const cityData = cityRates[city];
      
      if (!cityData) return detail;

      let freightAmount = 0;
      let labourCharge = 0;
      let billCharge = 0;
      let tollCharge = 0;

      // Calculate based on rate type for freight and labour
      const quantity = rateType === 'per-package' ? parseInt(detail.no_of_pckg || 0) : parseFloat(detail.wt || 0);

      // Freight (city-specific rate) - scaled by quantity based on overall rate type
      freightAmount = getRateValue(cityData.freightRate) * quantity;

      // Labour charge - ALWAYS per package if available, otherwise falls back to default labour per package
      // This is independent of the overall rate type selection
      const labourRatePerPkg = getLabourRatePerPackage(city);
      labourCharge = getRateValue(labourRatePerPkg) * parseInt(detail.no_of_pckg || 0);

      // Bill charge - PER BILTY ONLY (NOT multiplied by quantity)
      billCharge = getRateValue(cityBillCharge[city]) > 0 ? getRateValue(cityBillCharge[city]) : getRateValue(billChargePerBilty);

      // Toll charge - PER BILTY ONLY (NOT multiplied by quantity)
      tollCharge = getRateValue(cityTollCharge[city]) > 0 ? getRateValue(cityTollCharge[city]) : getRateValue(tollChargePerBilty);

      // Calculate new total
      const ddCharge = parseFloat(detail.dd_charge || 0);
      const pfCharge = parseFloat(detail.pf_charge || 0);
      const otherCharge = parseFloat(detail.other_charge || 0);
      const biltyTotal = freightAmount + labourCharge + billCharge + tollCharge + ddCharge + pfCharge + otherCharge;

      return {
        ...detail,
        freight_amount: freightAmount,
        labour_charge: labourCharge,
        bill_charge: billCharge,
        toll_charge: tollCharge,
        bilty_total: biltyTotal
      };
    });

    // Prepare metadata to save
    const bulkEditMetadata = {
      rateType: rateType,
      labourRatePerPackage: labourRatePerPackage,
      billChargePerBilty: billChargePerBilty,
      tollChargePerBilty: tollChargePerBilty,
      labourRatePerKg: labourRatePerKg,
      cityRates: cityRates,
      cityLabourRatePerPackage: cityLabourRatePerPackage,
      cityLabourRatePerKg: cityLabourRatePerKg,
      cityBillCharge: cityBillCharge,
      cityTollCharge: cityTollCharge
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
            <h2 className="text-xl font-bold text-gray-900">Advanced Bulk Rate Editor</h2>
            <p className="text-xs text-gray-600">
              {totalCities} cities • {totalBilties} bilties • Per-Package & Per-KG Options
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

      {/* Rate Type Selector */}
      <div className="bg-white rounded-lg p-3 mb-4 shadow-sm border-2 border-blue-300">
        <div className="flex items-center gap-3 mb-3">
          <Zap className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-bold text-gray-900">Overall Rate Calculation Type</h3>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={rateType === 'per-package'}
              onChange={() => setRateType('per-package')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-semibold text-gray-700">Per Package</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={rateType === 'per-kg'}
              onChange={() => setRateType('per-kg')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-semibold text-gray-700">Per KG</span>
          </label>
        </div>
        <p className="text-xs text-gray-600 mt-2 bg-blue-50 p-2 rounded">
          💡 All rates will be calculated {rateType === 'per-package' ? 'per package' : 'per kilogram'}. You can override per-city rates below.
        </p>
      </div>

      {/* Common/Overall Rates */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 mb-4 shadow-sm border border-blue-300">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-600" />
          Overall Default Rates (Applied to All Bilties)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {rateType === 'per-package' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Labour Rate Per Package</label>
                <input
                  type="number"
                  step="0.01"
                  value={labourRatePerPackage}
                  onChange={(e) => setLabourRatePerPackage(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-400 rounded-lg focus:border-blue-600 focus:ring-1 focus:ring-blue-200 text-sm font-semibold bg-white"
                  placeholder="₹/pkg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Bill Charge Per Bilty (GR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={billChargePerBilty}
                  onChange={(e) => setBillChargePerBilty(e.target.value)}
                  className="w-full px-3 py-2 border border-green-400 rounded-lg focus:border-green-600 focus:ring-1 focus:ring-green-200 text-sm font-semibold bg-white"
                  placeholder="₹/bilty"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Toll Charge Per Bilty (GR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={tollChargePerBilty}
                  onChange={(e) => setTollChargePerBilty(e.target.value)}
                  className="w-full px-3 py-2 border border-orange-400 rounded-lg focus:border-orange-600 focus:ring-1 focus:ring-orange-200 text-sm font-semibold bg-white"
                  placeholder="₹/bilty"
                />
              </div>
              <div className="bg-blue-50 rounded-lg p-2 border border-blue-300">
                <p className="text-xs font-semibold text-gray-700">
                  📊 Per Package Mode
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Freight & Labour = Rate × Packages<br/>Bill & Toll = Per Bilty (GR)
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Labour Rate Per KG</label>
                <input
                  type="number"
                  step="0.01"
                  value={labourRatePerKg}
                  onChange={(e) => setLabourRatePerKg(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-400 rounded-lg focus:border-blue-600 focus:ring-1 focus:ring-blue-200 text-sm font-semibold bg-white"
                  placeholder="₹/kg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Bill Charge Per Bilty (GR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={billChargePerBilty}
                  onChange={(e) => setBillChargePerBilty(e.target.value)}
                  className="w-full px-3 py-2 border border-green-400 rounded-lg focus:border-green-600 focus:ring-1 focus:ring-green-200 text-sm font-semibold bg-white"
                  placeholder="₹/bilty"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Toll Charge Per Bilty (GR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={tollChargePerBilty}
                  onChange={(e) => setTollChargePerBilty(e.target.value)}
                  className="w-full px-3 py-2 border border-orange-400 rounded-lg focus:border-orange-600 focus:ring-1 focus:ring-orange-200 text-sm font-semibold bg-white"
                  placeholder="₹/bilty"
                />
              </div>
              <div className="bg-blue-50 rounded-lg p-2 border border-blue-300">
                <p className="text-xs font-semibold text-gray-700">
                  📊 Per KG Mode
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Freight & Labour = Rate × Weight (KG)<br/>Bill & Toll = Per Bilty (GR)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* City-Wise Rates Grid */}
      <div className="bg-white rounded-lg p-3 shadow-sm border border-purple-200">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-purple-600" />
          City-Wise Custom Rates (Optional - Overrides Overall Rates)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {Object.entries(cityRates).map(([city, data]) => (
            <div 
              key={city} 
              className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border-2 border-purple-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-300">
                <MapPin className="h-4 w-4 text-purple-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate" title={city}>{city}</p>
                  <p className="text-xs text-gray-600">
                    {data.count}B • {data.totalPackages}P • {data.totalWeight.toFixed(0)}kg
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Freight</label>
                  <input
                    type="number"
                    step="0.01"
                    value={data.freightRate}
                    onChange={(e) => handleCityRateChange(city, 'freightRate', e.target.value)}
                    className="w-full px-2 py-1 border border-purple-300 rounded text-xs font-semibold focus:border-purple-500 focus:ring-1 focus:ring-purple-200 bg-white"
                    placeholder={rateType === 'per-package' ? '₹/pkg' : '₹/kg'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Labour/Pkg</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cityLabourRatePerPackage[city] || ''}
                    onChange={(e) => handleCityLabourPerPackageChange(city, e.target.value)}
                    className="w-full px-2 py-1 border border-blue-300 rounded text-xs font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white"
                    placeholder="₹/pkg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Labour/KG</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cityLabourRatePerKg[city] || ''}
                    onChange={(e) => handleCityLabourPerKgChange(city, e.target.value)}
                    className="w-full px-2 py-1 border border-indigo-300 rounded text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 bg-white"
                    placeholder="₹/kg"
                  />
                </div>
              </div>
              
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Bill (Per Bilty)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cityBillCharge[city] || ''}
                    onChange={(e) => handleCityBillChange(city, e.target.value)}
                    className="w-full px-2 py-1 border border-green-300 rounded text-xs font-semibold focus:border-green-500 focus:ring-1 focus:ring-green-200 bg-white"
                    placeholder="₹/bilty"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Toll (Per Bilty)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cityTollCharge[city] || ''}
                    onChange={(e) => handleCityTollChange(city, e.target.value)}
                    className="w-full px-2 py-1 border border-orange-300 rounded text-xs font-semibold focus:border-orange-500 focus:ring-1 focus:ring-orange-200 bg-white"
                    placeholder="₹/bilty"
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-purple-200">
                <div className="bg-white rounded px-2 py-1 border border-purple-300">
                  <p className="text-xs text-gray-600 font-semibold">Freight Est. ({rateType === 'per-package' ? 'Pkg' : 'KG'})</p>
                  <p className="text-sm font-bold text-purple-600">
                    ₹{(getRateValue(data.freightRate) * (rateType === 'per-package' ? data.totalPackages : data.totalWeight)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="bg-white rounded px-2 py-1 border border-blue-300">
                  <p className="text-xs text-gray-600 font-semibold">Labour Est. (Per Pkg)</p>
                  <p className="text-sm font-bold text-blue-600">
                    ₹{(getLabourRatePerPackage(city) * data.totalPackages).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="bg-white rounded px-2 py-1 border border-indigo-300">
                  <p className="text-xs text-gray-600 font-semibold">Labour Est. (Per KG)</p>
                  <p className="text-sm font-bold text-indigo-600">
                    ₹{(getLabourRatePerKg(city) * data.totalWeight).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="bg-white rounded px-2 py-1 border border-green-300">
                  <p className="text-xs text-gray-600 font-semibold">Bill (Per Bilty)</p>
                  <p className="text-sm font-bold text-green-600">
                    ₹{(getRateValue(cityBillCharge[city]) > 0 ? getRateValue(cityBillCharge[city]) : getRateValue(billChargePerBilty)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-white rounded px-2 py-1 border border-orange-300">
                  <p className="text-xs text-gray-600 font-semibold">Toll (Per Bilty)</p>
                  <p className="text-sm font-bold text-orange-600">
                    ₹{(getRateValue(cityTollCharge[city]) > 0 ? getRateValue(cityTollCharge[city]) : getRateValue(tollChargePerBilty)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BulkRateEditor;
