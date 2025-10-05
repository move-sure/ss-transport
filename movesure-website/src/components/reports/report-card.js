'use client';

import React from 'react';
import { Download, FileText, CheckCircle } from 'lucide-react';
import { generateCitiesReport, generateTransportsReport, generateConsignorsReport, generateConsigneesReport } from './pdf-generator';

export default function ReportCard({ report, selectedCity, dateRange, loading, setLoading }) {
  const colorClasses = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      iconBg: 'bg-blue-100',
      button: 'bg-blue-600 hover:bg-blue-700',
      accent: 'bg-blue-200',
      badge: 'bg-blue-100 text-blue-700'
    },
    green: {
      bg: 'bg-gradient-to-br from-green-50 to-green-100',
      border: 'border-green-200',
      icon: 'text-green-600',
      iconBg: 'bg-green-100',
      button: 'bg-green-600 hover:bg-green-700',
      accent: 'bg-green-200',
      badge: 'bg-green-100 text-green-700'
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
      border: 'border-purple-200',
      icon: 'text-purple-600',
      iconBg: 'bg-purple-100',
      button: 'bg-purple-600 hover:bg-purple-700',
      accent: 'bg-purple-200',
      badge: 'bg-purple-100 text-purple-700'
    },
    orange: {
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
      border: 'border-orange-200',
      icon: 'text-orange-600',
      iconBg: 'bg-orange-100',
      button: 'bg-orange-600 hover:bg-orange-700',
      accent: 'bg-orange-200',
      badge: 'bg-orange-100 text-orange-700'
    }
  };

  const colors = colorClasses[report.color] || colorClasses.blue;

  const handleDownload = async () => {
    setLoading(true);
    try {
      const filters = {
        cityId: selectedCity !== 'all' ? selectedCity : null,
        dateRange: dateRange.start && dateRange.end ? dateRange : null
      };

      switch (report.type) {
        case 'cities':
          await generateCitiesReport(filters);
          break;
        case 'transports':
          await generateTransportsReport(filters);
          break;
        case 'consignors':
          await generateConsignorsReport(filters);
          break;
        case 'consignees':
          await generateConsigneesReport(filters);
          break;
        default:
          console.error('Unknown report type');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const Icon = report.icon;

  return (
    <div className={`${colors.bg} rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 ${colors.border} overflow-hidden group cursor-pointer transform hover:-translate-y-1`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className={`p-4 ${colors.iconBg} rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-md`}>
            <Icon className={`h-8 w-8 ${colors.icon}`} />
          </div>
          <span className={`px-3 py-1.5 ${colors.badge} rounded-full text-xs font-bold shadow-sm flex items-center`}>
            <FileText className="h-3 w-3 mr-1" />
            PDF
          </span>
        </div>

        {/* Content */}
        <div className="mb-5">
          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors">{report.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{report.description}</p>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={loading}
          className={`w-full ${colors.button} text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95`}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <Download className="h-5 w-5" />
              <span>Download Report</span>
            </>
          )}
        </button>

        {/* Info Footer */}
        <div className="mt-5 pt-4 border-t-2 border-white border-opacity-50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="flex items-center font-medium">
              <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-green-600" />
              Real-time data
            </span>
            <span className="font-semibold">High quality</span>
          </div>
        </div>
      </div>
    </div>
  );
}
