'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Building2, Phone, Mail, MapPin, FileText, 
  Package, IndianRupee, Calendar, Edit2, Loader2,
  CreditCard, User, TrendingUp, TrendingDown, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import supabase from '@/app/utils/supabase';

export default function CompanyProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params['bill-company-profile'];

  const [profile, setProfile] = useState(null);
  const [bilties, setBilties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [biltiesLoading, setBiltiesLoading] = useState(true);

  // Fetch company profile
  useEffect(() => {
    if (!companyId) return;

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('bill_company_profile')
          .select('*')
          .eq('id', companyId)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [companyId]);

  // Fetch related bilties based on company name
  useEffect(() => {
    if (!profile) return;

    const fetchBilties = async () => {
      setBiltiesLoading(true);
      try {
        const companyName = profile.company_name;
        const isConsignor = profile.stakeholder_type === 'CONSIGNOR';

        // Fetch from bilty table
        let query = supabase
          .from('bilty')
          .select(`
            id, gr_no, bilty_date, consignor_name, consignee_name,
            no_of_pkg, wt, total, payment_mode, pvt_marks, challan_no,
            to_city:cities!bilty_to_city_fkey(city_name)
          `)
          .order('bilty_date', { ascending: false })
          .limit(100);

        if (isConsignor) {
          query = query.ilike('consignor_name', `%${companyName}%`);
        } else {
          query = query.ilike('consignee_name', `%${companyName}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        const formatted = (data || []).map(b => ({
          ...b,
          type: 'regular',
          to_city_name: b.to_city?.city_name || ''
        }));

        setBilties(formatted);
      } catch (err) {
        console.error('Error fetching bilties:', err);
      } finally {
        setBiltiesLoading(false);
      }
    };

    fetchBilties();
  }, [profile]);

  // Calculate statistics
  const stats = useMemo(() => {
    return bilties.reduce((acc, b) => {
      acc.totalBilties++;
      acc.totalPackages += parseInt(b.no_of_pkg || 0);
      acc.totalWeight += parseFloat(b.wt || 0);
      acc.totalAmount += parseFloat(b.total || 0);
      
      const mode = (b.payment_mode || '').toLowerCase();
      if (mode === 'paid' || mode === 'to pay') {
        acc.paymentModes[mode] = (acc.paymentModes[mode] || 0) + parseFloat(b.total || 0);
      }
      
      return acc;
    }, { 
      totalBilties: 0, 
      totalPackages: 0, 
      totalWeight: 0, 
      totalAmount: 0,
      paymentModes: {}
    });
  }, [bilties]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
  };

  const getStakeholderBadge = (type) => {
    const styles = {
      CONSIGNOR: 'bg-blue-100 text-blue-700',
      CONSIGNEE: 'bg-green-100 text-green-700',
      TRANSPORT: 'bg-purple-100 text-purple-700'
    };
    return styles[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700">Profile Not Found</h3>
        <button
          onClick={() => router.push('/company-ledger/company-profile')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Back to Profiles
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 w-full h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/company-ledger/company-profile')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          
          <div className="h-6 w-px bg-gray-300" />
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{profile.company_name}</h1>
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStakeholderBadge(profile.stakeholder_type)}`}>
                {profile.stakeholder_type}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push(`/company-ledger/company-profile?edit=${profile.id}`)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          <Edit2 className="h-4 w-4" />
          Edit Profile
        </button>
      </div>

      {/* Profile Details Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Company Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Company Info
          </h3>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500">Company Name</div>
              <div className="font-medium text-gray-900">{profile.company_name}</div>
            </div>
            {profile.gst_num && (
              <div>
                <div className="text-xs text-gray-500">GST Number</div>
                <div className="font-medium text-gray-900 font-mono">{profile.gst_num}</div>
              </div>
            )}
            {profile.pan && (
              <div>
                <div className="text-xs text-gray-500">PAN</div>
                <div className="font-medium text-gray-900 font-mono">{profile.pan}</div>
              </div>
            )}
            {profile.adhar && (
              <div>
                <div className="text-xs text-gray-500">Aadhar</div>
                <div className="font-medium text-gray-900 font-mono">{profile.adhar}</div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 flex items-center gap-2">
            <Phone className="h-4 w-4" /> Contact Details
          </h3>
          <div className="space-y-3">
            {profile.mobile_number && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">{profile.mobile_number}</span>
              </div>
            )}
            {profile.alternate_number && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">{profile.alternate_number}</span>
              </div>
            )}
            {profile.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">{profile.email}</span>
              </div>
            )}
            {profile.company_address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-gray-900">{profile.company_address}</div>
                  {(profile.city || profile.state) && (
                    <div className="text-sm text-gray-500">
                      {profile.city}{profile.state && `, ${profile.state}`} {profile.pincode}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ledger Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Ledger Info
          </h3>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500">Outstanding Amount</div>
              <div className={`text-2xl font-bold ${profile.outstanding_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(profile.outstanding_amount)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Created</div>
              <div className="text-gray-900">{formatDate(profile.created_at)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Last Updated</div>
              <div className="text-gray-900">{formatDate(profile.updated_at)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 opacity-80" />
            <span className="text-xs font-medium opacity-80">Total Bilties</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalBilties}</div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 opacity-80" />
            <span className="text-xs font-medium opacity-80">Total Packages</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalPackages}</div>
        </div>
        
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 opacity-80" />
            <span className="text-xs font-medium opacity-80">Total Weight</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalWeight.toFixed(1)} <span className="text-sm">kg</span></div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="h-4 w-4 opacity-80" />
            <span className="text-xs font-medium opacity-80">Total Amount</span>
          </div>
          <div className="text-2xl font-bold">₹{stats.totalAmount.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Recent Bilties */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" />
            Recent Bilties ({bilties.length})
          </h3>
        </div>

        {biltiesLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
            <p className="text-gray-500 mt-2">Loading bilties...</p>
          </div>
        ) : bilties.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No bilties found for this company</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">GR No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Consignor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Consignee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">City</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Pkgs</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Weight</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Payment</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bilties.map((bilty) => {
                  const paymentMode = (bilty.payment_mode || '').toLowerCase();
                  const paymentStyles = {
                    'paid': 'bg-green-100 text-green-700',
                    'to pay': 'bg-orange-100 text-orange-700',
                    'tbb': 'bg-blue-100 text-blue-700'
                  };

                  return (
                    <tr key={bilty.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-blue-600">{bilty.gr_no}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(bilty.bilty_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {bilty.consignor_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {bilty.consignee_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {bilty.to_city_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-900">
                        {bilty.no_of_pkg || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {bilty.wt || 0} kg
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${paymentStyles[paymentMode] || 'bg-gray-100 text-gray-600'}`}>
                          {(bilty.payment_mode || '-').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(bilty.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 font-medium">
                <tr>
                  <td colSpan="5" className="px-4 py-3 text-right text-sm text-gray-700">
                    <strong>Totals:</strong>
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-blue-600">
                    {stats.totalPackages}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-teal-600">
                    {stats.totalWeight.toFixed(1)} kg
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-green-600">
                    ₹{stats.totalAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
