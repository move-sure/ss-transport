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
import PDFViewer from '../PDFViewer';
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



  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md border p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-300 border-t-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('loading')}...</h3>
            <p className="text-gray-600">{t('searchingFor')}: </p>
            <span className="font-mono font-semibold text-blue-600 bg-gray-100 px-3 py-1 rounded inline-block mt-2">{gr_no}</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md border border-red-200 p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="bg-red-50 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-600 mb-2">{t('notFound')}</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadBiltyData}
              className="px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              {t('tryAgain')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Directly show PDFViewer with bilty info - no separate info page
  if (biltyData && branchData) {
    return (
      <PDFViewer
        biltyData={biltyData}
        branchData={branchData}
        fromCityName={fromCityName}
        toCityName={toCityName}
        language={language}
        toggleLanguage={toggleLanguage}
        t={t}
      />
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
