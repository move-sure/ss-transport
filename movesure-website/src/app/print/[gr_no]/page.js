'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '../../../app/utils/supabase';
import { 
  ArrowLeft, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import PDFGenerator from '../../../components/bilty/pdf-generation';

export default function PrintBiltyPage() {
  const params = useParams();
  const router = useRouter();
  const { gr_no } = params;
  
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

  const handleGoBack = () => {
    router.back();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Loading Bilty...</h3>
            <p className="text-slate-500">Searching for GR Number: <span className="font-mono font-bold">{gr_no}</span></p>
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Public Access - No Login Required</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-red-600 mb-2">Bilty Not Found</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <div className="mb-4 flex items-center justify-center gap-2 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Public Access - No Login Required</span>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={loadBiltyData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={handleGoBack}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main content - Use PDFGenerator component directly
  if (biltyData && branchData) {
    return (
      <>
        {/* Public header with back button - only visible on screen, not in print */}
        <div className="bg-white shadow-lg border-b border-slate-200 print:hidden">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleGoBack}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Print Bilty</h1>
                  <p className="text-sm text-slate-600">
                    GR Number: <span className="font-mono font-bold text-blue-600">{gr_no}</span>
                  </p>
                </div>
              </div>
              
              {/* Public access indicator */}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Public Access</span>
              </div>
            </div>
          </div>
        </div>

        {/* Use PDFGenerator component directly for the main content */}
        <PDFGenerator
          biltyData={biltyData}
          branchData={branchData}
          fromCityName={fromCityName}
          toCityName={toCityName}
          onClose={handleGoBack}
        />
      </>
    );
  }

  return null;
}
