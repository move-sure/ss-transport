'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/auth';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/dashboard/navbar';
import ReportsHeader from '../../components/reports/reports-header';
import ReportCard from '../../components/reports/report-card';
import ReportFilters from '../../components/reports/report-filters';
import { FileText, MapPin, Truck, Calendar, Download } from 'lucide-react';

export default function ReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const reports = [
    {
      id: 'cities-list',
      title: 'Cities List',
      description: 'Download complete list of all cities with their codes',
      icon: MapPin,
      color: 'blue',
      type: 'cities'
    },
    {
      id: 'transports-city-wise',
      title: 'Transport List (City-wise)',
      description: 'Download transport details organized by city',
      icon: Truck,
      color: 'green',
      type: 'transports'
    },
    {
      id: 'consignors-list',
      title: 'Consignors List',
      description: 'Download complete list of all consignors',
      icon: FileText,
      color: 'purple',
      type: 'consignors'
    },
    {
      id: 'consignees-list',
      title: 'Consignees List',
      description: 'Download complete list of all consignees',
      icon: FileText,
      color: 'orange',
      type: 'consignees'
    }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-10 h-10 bg-indigo-600 rounded-full opacity-20 animate-pulse"></div>
            </div>
          </div>
          <p className="mt-6 text-gray-700 text-lg font-medium">Loading Reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <ReportsHeader user={user} />

          {/* Filters Section */}
          <ReportFilters 
            selectedCity={selectedCity}
            setSelectedCity={setSelectedCity}
            dateRange={dateRange}
            setDateRange={setDateRange}
          />

          {/* Reports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                selectedCity={selectedCity}
                dateRange={dateRange}
                loading={loading}
                setLoading={setLoading}
              />
            ))}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600" />
              Report Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border border-blue-200">
                <p className="text-sm text-blue-700 font-semibold mb-2">Total Reports</p>
                <p className="text-3xl font-bold text-blue-900">{reports.length}</p>
                <p className="text-xs text-blue-600 mt-1">Available types</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border border-green-200">
                <p className="text-sm text-green-700 font-semibold mb-2">Format</p>
                <p className="text-3xl font-bold text-green-900">PDF</p>
                <p className="text-xs text-green-600 mt-1">High quality exports</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border border-purple-200">
                <p className="text-sm text-purple-700 font-semibold mb-2">Data Source</p>
                <p className="text-3xl font-bold text-purple-900">Live</p>
                <p className="text-xs text-purple-600 mt-1">Real-time updates</p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Download className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-bold text-gray-900 mb-1">How to Download Reports</h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Click on any report card to generate and download a PDF. All reports are generated in real-time with the latest data from your database. Use the filters above to customize your reports by city or date range.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
