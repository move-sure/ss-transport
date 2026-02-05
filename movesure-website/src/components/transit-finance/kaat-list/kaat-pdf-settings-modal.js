'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Loader2, FileText } from 'lucide-react';
import PDFFilterButtons from './pdf-filter-buttons';
import PDFCheckboxOption from './pdf-checkbox-option';
import PDFPreviewInfo from './pdf-preview-info';
import { TransportSelector, CitySelector } from './pdf-selectors';

export default function KaatPDFSettingsModal({ isOpen, onClose, cities, transports, onGenerate }) {
  const [generating, setGenerating] = useState(false);
  const [settings, setSettings] = useState({
    subtitle: 'KAAT RATE LIST',
    filterType: 'all', // 'all', 'transport', 'city'
    selectedTransport: '',
    selectedCity: '',
    includeInactive: false,
    includeAllTransports: false,
    includeAllCities: false,
    sortBy: 'transport' // 'transport', 'city', 'rate'
  });

  useEffect(() => {
    if (isOpen) {
      // Reset to defaults when modal opens
      setSettings({
        subtitle: 'KAAT RATE LIST',
        filterType: 'all',
        selectedTransport: '',
        selectedCity: '',
        includeInactive: false,
        includeAllTransports: false,
        includeAllCities: false,
        sortBy: 'transport'
      });
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onGenerate(settings);
    } finally {
      setGenerating(false);
    }
  };

  const handleFilterChange = (filterType) => {
    setSettings(prev => ({
      ...prev,
      filterType,
      selectedTransport: filterType === 'transport' ? prev.selectedTransport : '',
      selectedCity: filterType === 'city' ? prev.selectedCity : ''
    }));
  };

  const isGenerateDisabled = () => {
    if (generating) return true;
    if (settings.filterType === 'transport' && !settings.selectedTransport) return true;
    if (settings.filterType === 'city' && !settings.selectedCity) return true;
    return false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              PDF Generation Settings
            </h2>
            <p className="text-emerald-100 text-sm mt-1">Configure and generate kaat rate PDF report</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Subtitle Input */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              PDF Subtitle
            </label>
            <input
              type="text"
              value={settings.subtitle}
              onChange={(e) => setSettings(prev => ({ ...prev, subtitle: e.target.value }))}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm font-medium"
              placeholder="KAAT RATE LIST"
            />
            <p className="text-xs text-gray-500 mt-1">This will appear below the company name in the PDF</p>
          </div>

          {/* Filter Type Selection */}
          <PDFFilterButtons 
            filterType={settings.filterType}
            onFilterChange={handleFilterChange}
          />

          {/* Transport Selection (if filter type is transport) */}
          {settings.filterType === 'transport' && (
            <TransportSelector
              transports={transports}
              selectedTransport={settings.selectedTransport}
              onChange={(value) => setSettings(prev => ({ ...prev, selectedTransport: value }))}
            />
          )}

          {/* City Selection (if filter type is city) */}
          {settings.filterType === 'city' && (
            <CitySelector
              cities={cities}
              selectedCity={settings.selectedCity}
              onChange={(value) => setSettings(prev => ({ ...prev, selectedCity: value }))}
            />
          )}

          {/* Additional Options */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Additional Options
            </label>
            <div className="space-y-3">
              <PDFCheckboxOption
                id="includeInactive"
                label="Include Inactive Rates"
                description="Show both active and inactive kaat rates"
                checked={settings.includeInactive}
                onChange={(e) => setSettings(prev => ({ ...prev, includeInactive: e.target.checked }))}
                color="emerald"
              />
              
              <PDFCheckboxOption
                id="includeAllTransports"
                label="Include All Transports"
                description="Show transports even without kaat rates"
                checked={settings.includeAllTransports}
                onChange={(e) => setSettings(prev => ({ ...prev, includeAllTransports: e.target.checked }))}
                color="purple"
              />
              
              <PDFCheckboxOption
                id="includeAllCities"
                label="Include All Cities"
                description="Show all destination cities even without rates"
                checked={settings.includeAllCities}
                onChange={(e) => setSettings(prev => ({ ...prev, includeAllCities: e.target.checked }))}
                color="blue"
              />
            </div>
          </div>

          {/* Sort By */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Sort By</label>
            <select
              value={settings.sortBy}
              onChange={(e) => setSettings(prev => ({ ...prev, sortBy: e.target.value }))}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium cursor-pointer"
            >
              <option value="transport">Transport Name</option>
              <option value="city">Destination City</option>
              <option value="rate">Rate (Low to High)</option>
            </select>
          </div>

          {/* Preview Info */}
          <PDFPreviewInfo 
            settings={settings}
            cities={cities}
            transports={transports}
          />
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 bg-gray-50 p-5 flex items-center justify-between flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-all"
            disabled={generating}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerateDisabled()}
            className="group relative px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative z-10 flex items-center gap-2">
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Generate PDF
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
