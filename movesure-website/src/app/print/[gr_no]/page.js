'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '../../../app/utils/supabase';
import { 
  ArrowLeft, 
  AlertCircle,
  RefreshCw,
  Globe,
  FileText
} from 'lucide-react';
import PDFGenerator from '../../../components/bilty/pdf-generation';
import { LanguageProvider, useLanguage } from '../LanguageContext';

// Language-aware component
function PrintBiltyPageContent() {
  const params = useParams();
  const router = useRouter();
  const { gr_no } = params;
  const { language, toggleLanguage, t } = useLanguage();
  
  const [biltyData, setBiltyData] = useState(null);
  const [branchData, setBranchData] = useState(null);
  const [fromCityName, setFromCityName] = useState('');
  const [toCityName, setToCityName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [showPDF, setShowPDF] = useState(false);

  useEffect(() => {
    if (gr_no) {
      loadBiltyData();
    }
  }, [gr_no]);

  const loadBiltyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Only search in regular bilty table (removed station bilty logic)
      const { data: bilty, error: biltyError } = await supabase
        .from('bilty')
        .select(`
          *,
          transit_details(
            id,
            challan_no,
            gr_no
          )
        `)
        .eq('gr_no', gr_no)
        .eq('is_active', true)
        .single();

      if (!bilty || biltyError) {
        // Provide more specific error messages
        if (biltyError?.code === 'PGRST116') {
          throw new Error(`Bilty with GR Number "${gr_no}" not found or access denied`);
        } else if (biltyError?.message) {
          throw new Error(`Database error: ${biltyError.message}`);
        } else {
          throw new Error(`Bilty with GR Number "${gr_no}" not found`);
        }
      }

      setBiltyData(bilty);

      // Load branch data using the bilty's branch_id (no user authentication required)
      if (bilty.branch_id) {
        const { data: branch, error: branchError } = await supabase
          .from('branches')
          .select('*')
          .eq('id', bilty.branch_id)
          .single();

        if (branch && !branchError) {
          setBranchData(branch);
          
          // Load cities data for names using the branch data
          const { data: cities, error: citiesError } = await supabase
            .from('cities')
            .select('*');

          if (cities && !citiesError) {
            const fromCity = cities.find(c => c.city_code === branch.city_code);
            const toCity = cities.find(c => c.id?.toString() === bilty.to_city_id?.toString());
            
            setFromCityName(fromCity?.city_name || 'N/A');
            setToCityName(toCity?.city_name || 'N/A');
          }
        }
      }

    } catch (error) {
      console.error('Error loading bilty:', error);
      setError(error.message || 'Failed to load bilty data');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleOpenPDF = () => {
    setShowPDF(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('loading')}...</h3>
            <p className="text-gray-600">{t('searchingFor')}: <span className="font-mono font-semibold">{gr_no}</span></p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600 mb-2">{t('notFound')}</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={loadBiltyData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {t('tryAgain')}
              </button>
              <button
                onClick={handleGoBack}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('goBack')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show PDF when requested - Clean PDF viewer
  if (showPDF && biltyData && branchData) {
    return (
      <div className="min-h-screen bg-white">
        {/* Simple header for PDF view */}
        <div className="bg-white border-b print:hidden">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowPDF(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('goBack')}
              </button>
              
              <div className="text-center">
                <h1 className="text-xl font-bold text-gray-800">{t('welcome')}</h1>
                <p className="text-sm text-blue-600 font-semibold">{t('companyName')}</p>
              </div>
              
              <button
                onClick={toggleLanguage}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md font-medium transition-colors flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                {language === 'en' ? 'हिंदी' : 'English'}
              </button>
            </div>
          </div>
        </div>

        {/* PDF Component - No extra UI */}
        <div className="w-full">
          <PDFGenerator
            biltyData={biltyData}
            branchData={branchData}
            onClose={() => setShowPDF(false)}
          />
        </div>
      </div>
    );
  }

  // Main content - Clean professional bilty display
  if (biltyData && branchData) {
    return (
      <div className="min-h-screen bg-white">
        {/* Clean Header */}
        <div className="bg-white border-b print:hidden">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleGoBack}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('goBack')}
              </button>
              
              <button
                onClick={toggleLanguage}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md font-medium transition-colors flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                {language === 'en' ? 'हिंदी' : 'English'}
              </button>
            </div>
            
            {/* Company Branding */}
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">{t('welcome')}</h1>
              <h2 className="text-xl font-semibold text-blue-600">{t('companyName')}</h2>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Bilty Information Card */}
          <div className="bg-white border rounded-lg p-6 mb-6">
            {/* Header with GR Number and PDF Button */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{t('grNumber')}: {gr_no}</h3>
                <p className="text-gray-600 mt-1">{new Date(biltyData.bilty_date).toLocaleDateString()}</p>
              </div>
              <button
                onClick={handleOpenPDF}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                {t('openBilty')}
              </button>
            </div>

            {/* Key Information - Clean Layout */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{t('route')}</h4>
                  <p className="text-lg font-semibold text-gray-800 mt-1">{fromCityName} → {toCityName}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{t('consignor')}</h4>
                  <p className="text-lg font-semibold text-gray-800 mt-1">{biltyData.consignor_name}</p>
                  {biltyData.consignor_number && (
                    <p className="text-gray-600">{biltyData.consignor_number}</p>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{t('consignee')}</h4>
                  <p className="text-lg font-semibold text-gray-800 mt-1">{biltyData.consignee_name || 'N/A'}</p>
                  {biltyData.consignee_number && (
                    <p className="text-gray-600">{biltyData.consignee_number}</p>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {biltyData.transport_name && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{t('transport')}</h4>
                    <p className="text-lg font-semibold text-gray-800 mt-1">{biltyData.transport_name}</p>
                    {biltyData.transport_number && (
                      <p className="text-gray-600">{biltyData.transport_number}</p>
                    )}
                  </div>
                )}

                {biltyData.invoice_no && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{t('invoiceNo')}</h4>
                    <p className="text-lg font-semibold text-gray-800 mt-1">{biltyData.invoice_no}</p>
                    {biltyData.invoice_value && biltyData.invoice_value > 0 && (
                      <p className="text-gray-600">{t('rs')}{biltyData.invoice_value}</p>
                    )}
                  </div>
                )}

                {(biltyData.no_of_pkg > 0 || biltyData.wt > 0) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{t('packageWeight')}</h4>
                    <div className="flex gap-4 mt-1">
                      {biltyData.no_of_pkg > 0 && (
                        <span className="text-lg font-semibold text-gray-800">{biltyData.no_of_pkg} {t('packages')}</span>
                      )}
                      {biltyData.wt > 0 && (
                        <span className="text-lg font-semibold text-gray-800">{biltyData.wt} {t('kg')}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content if available */}
            {biltyData.contain && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{t('contents')}</h4>
                <p className="text-lg font-semibold text-gray-800 mt-1">{biltyData.contain}</p>
              </div>
            )}

            {/* Total Amount - Prominent Display */}
            {biltyData.total && biltyData.total > 0 && (
              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-medium text-gray-700">{t('totalAmount')}:</h4>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">{t('rs')}{biltyData.total}</p>
                    <p className="text-sm text-gray-600">
                      {biltyData.payment_mode === 'PAID' ? t('paid') : t('toPay')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Clean Footer */}
        <div className="bg-gray-50 border-t mt-12">
          <div className="max-w-4xl mx-auto px-4 py-6 text-center">
            <p className="text-gray-600 mb-1">{t('softwareCreatedBy')} <span className="font-semibold text-blue-600">movesure.io</span></p>
            <p className="text-gray-600">{t('contactOwner')} - <span className="font-semibold">7668291228, 7902122230</span></p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Main wrapper component with Language Provider
export default function PrintBiltyPage() {
  return (
    <LanguageProvider>
      <PrintBiltyPageContent />
    </LanguageProvider>
  );
}
