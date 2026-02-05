'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../utils/auth';
import Navbar from '../../../components/dashboard/navbar';
import KaatRatesTable from '../../../components/transit-finance/kaat-list/kaat-rates-table';
import KaatPDFSettingsModal from '../../../components/transit-finance/kaat-list/kaat-pdf-settings-modal';
import KaatPDFPreview from '../../../components/transit-finance/kaat-list/kaat-pdf-preview';
import { generateKaatRatesPDF } from '../../../components/transit-finance/kaat-list/kaat-pdf-generator-v2';
import { DollarSign, TrendingUp, Package, Users, Plus, Loader2, AlertCircle, FileText } from 'lucide-react';
import supabase from '../../utils/supabase';
import AddKaatModal from '../../../components/transit-finance/add-kaat-modal';

export default function KaatRatePage() {
  const { user, requireAuth } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [cities, setCities] = useState([]);
  const [transports, setTransports] = useState([]);
  const [kaatRates, setKaatRates] = useState([]);
  const [stats, setStats] = useState({
    totalRates: 0,
    activeRates: 0,
    uniqueTransports: 0,
    uniqueCities: 0
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfFilename, setPdfFilename] = useState('kaat-rates.pdf');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user) {
      loadInitialData();
    }
  }, [mounted, user, refreshTrigger]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading kaat rates data...');

      // Fetch cities and rates
      const [citiesRes, ratesRes, transportsRes] = await Promise.all([
        supabase
          .from('cities')
          .select('*')
          .order('city_name'),
        supabase
          .from('transport_hub_rates')
          .select('*')
          .order('transport_name'),
        supabase
          .from('transports')
          .select('*')
      ]);

      if (citiesRes.error) throw citiesRes.error;
      if (ratesRes.error) throw ratesRes.error;
      if (transportsRes.error) throw transportsRes.error;

      const citiesData = citiesRes.data || [];
      const ratesData = ratesRes.data || [];
      const transportsData = transportsRes.data || [];

      // Map transports and cities to rates
      const enrichedRates = ratesData.map(rate => {
        const transport = transportsData.find(t => t.id === rate.transport_id);
        const city = citiesData.find(c => c.id === rate.destination_city_id);
        
        return {
          ...rate,
          transport: transport ? {
            id: transport.id,
            transport_name: transport.transport_name,
            city_name: transport.city_name,
            gst_number: transport.gst_number
          } : null,
          destination_city: city ? {
            id: city.id,
            city_name: city.city_name,
            city_code: city.city_code
          } : null
        };
      });

      setCities(citiesData);
      setKaatRates(enrichedRates);

      // Extract unique transports from actual transports table
      const uniqueTransportsMap = new Map();
      transportsData.forEach(transport => {
        uniqueTransportsMap.set(transport.id, {
          id: transport.id,
          company_name: transport.transport_name,
          transport_name: transport.transport_name, // Add this for compatibility
          hub_city_name: transport.city_name || 'N/A',
          gst_number: transport.gst_number || 'N/A'
        });
      });
      setTransports(Array.from(uniqueTransportsMap.values()));

      // Calculate stats
      const allRates = enrichedRates;
      const activeRates = allRates.filter(r => r.is_active);
      const uniqueTransportsCount = new Set(
        allRates
          .filter(r => r.transport_id)
          .map(r => r.transport_id)
      ).size;
      const uniqueCities = new Set(
        allRates.map(r => r.destination_city_id)
      ).size;

      setStats({
        totalRates: allRates.length,
        activeRates: activeRates.length,
        uniqueTransports: uniqueTransportsCount,
        uniqueCities
      });

      console.log('✅ Data loaded successfully');

    } catch (error) {
      console.error('❌ Error loading data:', error);
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRateAdded = () => {
    setShowAddModal(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleGeneratePDF = async (settings) => {
    try {
      console.log('📄 Generating PDF with settings:', settings);
      console.log('📊 Available data:', {
        kaatRates: kaatRates?.length || 0,
        cities: cities?.length || 0,
        transports: transports?.length || 0
      });
      
      // Generate PDF in preview mode
      const url = generateKaatRatesPDF(kaatRates, cities, transports, settings, true);
      
      if (!url) {
        throw new Error('Failed to generate PDF URL');
      }
      
      // Generate filename
      let filename = 'kaat-rates';
      if (settings.filterType === 'transport' && settings.selectedTransport) {
        const transport = transports?.find(t => String(t.id) === String(settings.selectedTransport));
        filename = `kaat-${(transport?.company_name || 'transport').toLowerCase().replace(/\s+/g, '-')}`;
      } else if (settings.filterType === 'city' && settings.selectedCity) {
        const city = cities?.find(c => String(c.id) === String(settings.selectedCity));
        filename = `kaat-${(city?.city_name || 'city').toLowerCase().replace(/\s+/g, '-')}`;
      }
      filename += `-${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`;
      
      setPdfUrl(url);
      setPdfFilename(filename);
      console.log('✅ PDF generated successfully');
      
      // Close settings modal and show preview
      setShowPDFModal(false);
      setShowPDFPreview(true);
      
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      alert('Failed to generate PDF: ' + error.message);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl"></div>
          </div>
          <p className="mt-6 text-gray-600 font-semibold text-lg">Initializing...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-12 border border-white/50 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                <Loader2 className="relative animate-spin h-16 w-16 text-emerald-600 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-900 to-teal-800 bg-clip-text text-transparent mb-2">
                Loading Kaat Rates
              </h3>
              <p className="text-gray-600">Please wait while we fetch the data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="container mx-auto px-6 py-16">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-10 border border-red-200 max-w-lg mx-auto">
            <div className="text-center">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-red-500 rounded-full blur-2xl opacity-20"></div>
                <div className="relative bg-gradient-to-br from-red-500 to-rose-600 p-5 rounded-2xl">
                  <AlertCircle className="w-12 h-12 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Unable to Load Data</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={loadInitialData}
                className="px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 max-w-[1800px]">
        {/* Modern Header */}
        <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-3 rounded-xl shadow-lg">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-900 via-teal-800 to-cyan-800 bg-clip-text text-transparent">
                    Kaat Rate Management
                  </h1>
                  <p className="text-gray-600 text-sm mt-1">
                    Manage transport hub rates and pricing across all destinations
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPDFModal(true)}
                className="group relative bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <FileText className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Export PDF</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="group relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Plus className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Add New Rate</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="group relative bg-white rounded-xl shadow-md hover:shadow-xl p-4 border-2 border-gray-100 hover:border-emerald-300 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full -mr-16 -mt-16 transition-transform duration-300 group-hover:scale-150"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-lg shadow-md">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Rates</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {stats.totalRates}
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-600 font-medium">All configured rates</div>
            </div>
          </div>

          <div className="group relative bg-white rounded-xl shadow-md hover:shadow-xl p-4 border-2 border-gray-100 hover:border-blue-300 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full -mr-16 -mt-16 transition-transform duration-300 group-hover:scale-150"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg shadow-md">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {stats.activeRates}
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-600 font-medium">Currently active rates</div>
            </div>
          </div>

          <div className="group relative bg-white rounded-xl shadow-md hover:shadow-xl p-4 border-2 border-gray-100 hover:border-purple-300 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full -mr-16 -mt-16 transition-transform duration-300 group-hover:scale-150"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2 rounded-lg shadow-md">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Transports</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {stats.uniqueTransports}
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-600 font-medium">Unique transport partners</div>
            </div>
          </div>

          <div className="group relative bg-white rounded-xl shadow-md hover:shadow-xl p-4 border-2 border-gray-100 hover:border-amber-300 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full -mr-16 -mt-16 transition-transform duration-300 group-hover:scale-150"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-lg shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cities</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    {stats.uniqueCities}
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-600 font-medium">Destination cities covered</div>
            </div>
          </div>
        </div>

        {/* Main Table Component */}
        <KaatRatesTable cities={cities} refreshTrigger={refreshTrigger} />
      </div>

      {/* Add Kaat Modal */}
      <AddKaatModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        cities={cities}
        onSuccess={handleRateAdded}
      />

      {/* PDF Settings Modal */}
      <KaatPDFSettingsModal
        isOpen={showPDFModal}
        onClose={() => setShowPDFModal(false)}
        cities={cities}
        transports={transports}
        onGenerate={handleGeneratePDF}
      />

      {/* PDF Preview Modal */}
      <KaatPDFPreview
        isOpen={showPDFPreview}
        onClose={() => {
          setShowPDFPreview(false);
          if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
          }
        }}
        pdfUrl={pdfUrl}
        filename={pdfFilename}
      />
    </div>
  );
}
