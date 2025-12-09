'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../utils/auth';
import Navbar from '@/components/dashboard/navbar';
import supabase from '../../utils/supabase';
import { 
  Building2, 
  ArrowLeft, 
  Printer, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  Loader2,
  Download
} from 'lucide-react';

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  
  const [company, setCompany] = useState(null);
  const [rateProfiles, setRateProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (params.companyId && user) {
      fetchCompanyDetails();
    }
  }, [params.companyId, user]);

  const fetchCompanyDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch company details
      const { data: companyData, error: companyError } = await supabase
        .from('consignors')
        .select('*')
        .eq('id', params.companyId)
        .single();

      if (companyError) throw companyError;

      // Fetch rate profiles for this company
      const { data: profilesData, error: profilesError } = await supabase
        .from('consignor_bilty_profile')
        .select('*')
        .eq('consignor_id', params.companyId)
        .eq('is_active', true)
        .order('city_name');

      if (profilesError) throw profilesError;

      setCompany(companyData);
      setRateProfiles(profilesData || []);
    } catch (err) {
      console.error('Error fetching company details:', err);
      setError('Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading company details...</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar />
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center">
            <p className="text-red-600 mb-4">{error || 'Company not found'}</p>
            <button
              onClick={() => router.push('/company-profile')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ArrowLeft size={20} />
              Back to Company Profiles
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area, #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="no-print">
          <Navbar />
        </div>
        
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          {/* Header - No Print */}
          <div className="mb-6 no-print">
            <button
              onClick={() => router.push('/company-profile')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 font-semibold transition-all"
            >
              <ArrowLeft size={20} />
              Back to Company Profiles
            </button>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{company.company_name}</h1>
                  <p className="text-gray-600">Rate Profile Details</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                >
                  <Printer size={20} />
                  Print Rate List
                </button>
              </div>
            </div>
          </div>

          {/* Printable Area */}
          <div id="printable-area" className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            {/* Print Header */}
            <div className="mb-8 pb-6 border-b-2 border-gray-200">
              <div className="text-center mb-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Rate Profile</h1>
                <p className="text-gray-600 text-sm">Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            {/* Company Information */}
            <div className="mb-8 bg-blue-50 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 size={24} className="text-blue-600" />
                Company Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Company Name</p>
                  <p className="font-semibold text-gray-900">{company.company_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">GST Number</p>
                  <p className="font-semibold text-gray-900">{company.gst_num || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Contact Number</p>
                  <p className="font-semibold text-gray-900">{company.number || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">PAN Number</p>
                  <p className="font-semibold text-gray-900">{company.pan || '-'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 mb-1">Address</p>
                  <p className="font-semibold text-gray-900">{company.company_add || '-'}</p>
                </div>
              </div>
            </div>

            {/* Rate Profiles Summary */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Rate Profiles ({rateProfiles.length} Destinations)
              </h2>
            </div>

            {/* Rate Profiles Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th className="px-3 py-3 text-left text-xs font-semibold border border-slate-600">S.No</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold border border-slate-600">City</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold border border-slate-600">Transport</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold border border-slate-600">Rate</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold border border-slate-600">Min Wt.</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold border border-slate-600">Min Freight</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold border border-slate-600">Labour</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold border border-slate-600">Bilty Chrg</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold border border-slate-600">Toll Tax</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold border border-slate-600">RS Chrg</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold border border-slate-600">DD /Nag</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold border border-slate-600">DD /KG</th>
                  </tr>
                </thead>
                <tbody>
                  {rateProfiles.map((profile, index) => (
                    <tr key={profile.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-sm text-black border border-gray-300">{index + 1}</td>
                      <td className="px-3 py-2.5 text-sm font-medium text-black border border-gray-300">
                        {profile.city_name}
                        {profile.city_code && <span className="text-black ml-1">({profile.city_code})</span>}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-black border border-gray-300">
                        {profile.transport_name || '-'}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-center font-semibold text-black border border-gray-300">
                        ₹{profile.rate}
                        <span className="text-xs text-black ml-1">/{profile.rate_unit === 'PER_KG' ? 'kg' : 'nag'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-center text-black border border-gray-300">
                        {profile.minimum_weight_kg || 0} kg
                      </td>
                      <td className="px-3 py-2.5 text-sm text-center text-black border border-gray-300">
                        ₹{profile.freight_minimum_amount || 0}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-center text-black border border-gray-300">
                        ₹{profile.labour_rate || 0}/nag
                      </td>
                      <td className="px-3 py-2.5 text-sm text-center text-black border border-gray-300">
                        ₹{profile.bilty_charge || 0}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-center text-black border border-gray-300">
                        {profile.is_toll_tax_applicable ? `₹${profile.toll_tax_amount || 0}` : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-center text-black border border-gray-300">
                        ₹{profile.receiving_slip_charge || 0}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-center text-black border border-gray-300">
                        ₹{profile.dd_charge_per_nag || 0}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-center text-black border border-gray-300">
                        ₹{profile.dd_charge_per_kg || 0}
                      </td>
                    </tr>
                  ))}
                  {rateProfiles.length === 0 && (
                    <tr>
                      <td colSpan="12" className="px-4 py-8 text-center text-black border border-gray-300">
                        No rate profiles found for this company
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
              <p>This is a computer-generated document and does not require a signature.</p>
              <p className="mt-1">For any queries, please contact the accounts department.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
