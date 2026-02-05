'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../utils/auth';
import supabase from '../../utils/supabase';
import Navbar from '../../../components/dashboard/navbar';
import KaatBillSelector from '../../../components/transit-finance/kaat-bill/kaat-bill-selector';
import ConsolidatedPDFPreview from '../../../components/transit-finance/kaat-bill/consolidated-pdf-preview';
import ConsolidatedSettingsModal from '../../../components/transit-finance/kaat-bill/consolidated-settings-modal';
import { generateConsolidatedKaatPDF } from '../../../components/transit-finance/kaat-bill/consolidated-pdf-generator';
import { 
  FileText, 
  Loader2, 
  AlertCircle, 
  ArrowLeft, 
  Printer, 
  RefreshCw,
  Calendar,
  Filter,
  Search
} from 'lucide-react';
import { format } from 'date-fns';

export default function TransitBillPage() {
  const router = useRouter();
  const { user, requireAuth } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  // Data states
  const [kaatBills, setKaatBills] = useState([]);
  const [selectedBills, setSelectedBills] = useState([]);
  const [enrichedBillsData, setEnrichedBillsData] = useState({});
  const [challanDetailsMap, setChallanDetailsMap] = useState({});
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [challanFrom, setChallanFrom] = useState('');
  const [challanTo, setChallanTo] = useState('');
  const [filterPrinted, setFilterPrinted] = useState('all'); // 'all', 'printed', 'not_printed'
  
  // PDF states
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfSettings, setPdfSettings] = useState(null);
  const [billDate, setBillDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user) {
      loadKaatBills();
    }
  }, [mounted, user]);

  const loadKaatBills = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading all kaat bills...');

      const { data, error: fetchError } = await supabase
        .from('kaat_bill_master')
        .select(`
          *,
          created_user:users!fk_kaat_bill_created_by(username, name)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      console.log('✅ Kaat bills loaded:', data?.length || 0);
      setKaatBills(data || []);
    } catch (err) {
      console.error('❌ Error loading kaat bills:', err);
      setError(err.message || 'Failed to load kaat bills');
    } finally {
      setLoading(false);
    }
  };

  // Filter bills
  const filteredBills = kaatBills.filter(bill => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesChallan = bill.challan_no?.toLowerCase().includes(query);
      const matchesTransport = bill.transport_name?.toLowerCase().includes(query);
      const matchesGst = bill.transport_gst?.toLowerCase().includes(query);
      if (!matchesChallan && !matchesTransport && !matchesGst) return false;
    }

    // Challan number range filter
    if (challanFrom || challanTo) {
      const challanNum = parseInt(bill.challan_no?.replace(/\D/g, '') || '0', 10);
      
      if (challanFrom) {
        const fromNum = parseInt(challanFrom.replace(/\D/g, '') || '0', 10);
        if (challanNum < fromNum) return false;
      }
      
      if (challanTo) {
        const toNum = parseInt(challanTo.replace(/\D/g, '') || '0', 10);
        if (challanNum > toNum) return false;
      }
    }

    // Date filters
    if (dateFrom) {
      const billDate = new Date(bill.created_at);
      const fromDate = new Date(dateFrom);
      if (billDate < fromDate) return false;
    }
    if (dateTo) {
      const billDate = new Date(bill.created_at);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (billDate > toDate) return false;
    }

    // Printed filter
    if (filterPrinted === 'printed' && !bill.printed_yet) return false;
    if (filterPrinted === 'not_printed' && bill.printed_yet) return false;

    return true;
  });

  const handleToggleBill = (bill) => {
    setSelectedBills(prev => {
      const isSelected = prev.some(b => b.id === bill.id);
      if (isSelected) {
        return prev.filter(b => b.id !== bill.id);
      } else {
        return [...prev, bill];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedBills([...filteredBills]);
  };

  const handleDeselectAll = () => {
    setSelectedBills([]);
  };

  const fetchBillDetails = async (bills) => {
    const enrichedData = {};
    
    for (const bill of bills) {
      try {
        // Fetch kaat data and bilty data
        const [kaatResult, biltyResult, stationResult] = await Promise.all([
          supabase
            .from('bilty_wise_kaat')
            .select('*')
            .in('gr_no', bill.gr_numbers || []),
          
          supabase
            .from('bilty')
            .select('*')
            .in('gr_no', bill.gr_numbers || [])
            .eq('is_active', true),
          
          supabase
            .from('station_bilty_summary')
            .select('*')
            .in('gr_no', bill.gr_numbers || [])
        ]);

        // Create maps
        const kaatMap = {};
        const biltyMap = {};
        const stationMap = {};

        (kaatResult.data || []).forEach(k => { kaatMap[k.gr_no] = k; });
        (biltyResult.data || []).forEach(b => { biltyMap[b.gr_no] = b; });
        (stationResult.data || []).forEach(s => { stationMap[s.gr_no] = s; });

        // Combine data
        const details = (bill.gr_numbers || []).map(grNo => ({
          gr_no: grNo,
          kaat: kaatMap[grNo] || null,
          bilty: biltyMap[grNo] || null,
          station: stationMap[grNo] || null
        }));

        // Fetch transport info if GST available
        let transportInfo = {
          transport_name: bill.transport_name,
          transport_gst: bill.transport_gst
        };

        if (bill.transport_gst) {
          const { data: transport } = await supabase
            .from('transports')
            .select('transport_name, gst_number, mob_number')
            .eq('gst_number', bill.transport_gst)
            .limit(1)
            .single();

          if (transport) {
            transportInfo = {
              transport_name: transport.transport_name,
              transport_gst: transport.gst_number,
              transport_number: transport.mob_number
            };
          }
        }

        enrichedData[bill.id] = {
          details,
          transportInfo
        };

      } catch (err) {
        console.error(`Error fetching details for bill ${bill.id}:`, err);
        enrichedData[bill.id] = { details: [], transportInfo: {} };
      }
    }
    
    return enrichedData;
  };

  // Fetch challan_details for dispatch dates
  const fetchChallanDetails = async (challanNos) => {
    try {
      const { data, error } = await supabase
        .from('challan_details')
        .select('challan_no, date, dispatch_date, is_dispatched')
        .in('challan_no', challanNos);

      if (error) throw error;

      const detailsMap = {};
      (data || []).forEach(item => {
        detailsMap[item.challan_no] = item;
      });

      return detailsMap;
    } catch (err) {
      console.error('Error fetching challan details:', err);
      return {};
    }
  };

  const handleOpenSettings = () => {
    if (selectedBills.length === 0) {
      alert('Please select at least one kaat bill');
      return;
    }
    setShowSettings(true);
  };

  const handleGeneratePDF = async (settings) => {
    setShowSettings(false);
    
    try {
      setGenerating(true);

      console.log('📊 Generating consolidated PDF for', selectedBills.length, 'bills');
      console.log('📊 Settings:', settings);

      // Fetch all bill details
      const enrichedData = await fetchBillDetails(selectedBills);
      setEnrichedBillsData(enrichedData);

      // Fetch challan details for dispatch dates
      const challanNos = selectedBills.map(b => b.challan_no);
      const challanDetails = await fetchChallanDetails(challanNos);
      setChallanDetailsMap(challanDetails);

      // Store settings for download
      setPdfSettings(settings);

      // Generate PDF
      const url = generateConsolidatedKaatPDF(
        selectedBills,
        enrichedData,
        settings,
        challanDetails,
        true // preview mode
      );

      setPdfUrl(url);
      setShowPreview(true);

    } catch (err) {
      console.error('❌ Error generating PDF:', err);
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // Generate fresh PDF for download
      generateConsolidatedKaatPDF(
        selectedBills,
        enrichedBillsData,
        pdfSettings,
        challanDetailsMap,
        false // download mode
      );

      // Mark bills as printed
      const billIds = selectedBills.map(b => b.id);
      await supabase
        .from('kaat_bill_master')
        .update({ printed_yet: true })
        .in('id', billIds);

      // Refresh bills list
      await loadKaatBills();

      alert('✅ PDF downloaded successfully!');
    } catch (err) {
      console.error('❌ Error downloading PDF:', err);
      throw err;
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  // Calculate totals
  const totalBilties = selectedBills.reduce((sum, bill) => sum + (bill.total_bilty_count || 0), 0);
  const totalKaatAmount = selectedBills.reduce((sum, bill) => sum + parseFloat(bill.total_kaat_amount || 0), 0);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="container mx-auto px-6 py-16">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg mx-auto text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Error Loading Data</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={loadKaatBills}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 max-w-[1400px]">
        {/* Header */}
        <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/transit-finance')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-900 via-purple-800 to-indigo-800 bg-clip-text text-transparent">
                  Consolidated Transit Bill
                </h1>
                <p className="text-gray-600 mt-1">
                  Select multiple kaat bills to generate a consolidated PDF
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadKaatBills}
                disabled={loading}
                className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-xl shadow-lg p-4">
          {/* Row 1: Search and Challan Range */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search challan, transport, GST..."
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Challan From */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Challan From</label>
              <input
                type="text"
                value={challanFrom}
                onChange={(e) => setChallanFrom(e.target.value)}
                placeholder="e.g. 0152"
                className="w-full px-3 py-2.5 border-2 border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50"
              />
            </div>

            {/* Challan To */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Challan To</label>
              <input
                type="text"
                value={challanTo}
                onChange={(e) => setChallanTo(e.target.value)}
                placeholder="e.g. 0160"
                className="w-full px-3 py-2.5 border-2 border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50"
              />
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Row 2: Print Status and Clear Filters */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Printed Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Print Status</label>
                <select
                  value={filterPrinted}
                  onChange={(e) => setFilterPrinted(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Bills</option>
                  <option value="not_printed">Not Printed</option>
                  <option value="printed">Already Printed</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              {(challanFrom || challanTo || dateFrom || dateTo || searchQuery || filterPrinted !== 'all') && (
                <button
                  onClick={() => {
                    setChallanFrom('');
                    setChallanTo('');
                    setDateFrom('');
                    setDateTo('');
                    setSearchQuery('');
                    setFilterPrinted('all');
                  }}
                  className="mt-6 px-4 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm"
                >
                  Clear All Filters
                </button>
              )}
            </div>

            {/* Filter Summary */}
            <div className="text-sm text-gray-600 mt-6">
              {challanFrom && challanTo ? (
                <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-medium">
                  Challan: {challanFrom} → {challanTo}
                </span>
              ) : challanFrom ? (
                <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-medium">
                  From Challan: {challanFrom}
                </span>
              ) : challanTo ? (
                <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-medium">
                  Up to Challan: {challanTo}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Bill Date for PDF */}
        <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-lg p-4 border border-indigo-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700">Bill Date (for PDF)</label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="mt-1 px-3 py-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleOpenSettings}
              disabled={selectedBills.length === 0 || generating}
              className="group relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative z-10 flex items-center gap-2">
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Printer className="w-5 h-5" />
                    Generate Consolidated PDF
                    {selectedBills.length > 0 && ` (${selectedBills.length})`}
                  </>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Bills Selector */}
        <KaatBillSelector
          kaatBills={filteredBills}
          selectedBills={selectedBills}
          onToggleBill={handleToggleBill}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          loading={loading}
        />

        {/* Settings Modal */}
        <ConsolidatedSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onProceed={handleGeneratePDF}
          firstBill={selectedBills[0]}
          selectedBillsCount={selectedBills.length}
        />

        {/* PDF Preview Modal */}
        <ConsolidatedPDFPreview
          isOpen={showPreview}
          onClose={closePreview}
          pdfUrl={pdfUrl}
          selectedBillsCount={selectedBills.length}
          totalBilties={totalBilties}
          totalKaatAmount={totalKaatAmount}
          onDownload={handleDownloadPDF}
        />
      </div>
    </div>
  );
}
