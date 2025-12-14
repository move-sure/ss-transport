'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Trash2, Phone, Mail, MapPin, Building2, ExternalLink } from 'lucide-react';

export default function CompanyProfileTable({ 
  profiles, 
  loading, 
  onEdit, 
  onDelete 
}) {
  const router = useRouter();

  const getStakeholderBadge = (type) => {
    const styles = {
      CONSIGNOR: 'bg-blue-100 text-blue-700',
      CONSIGNEE: 'bg-green-100 text-green-700',
      TRANSPORT: 'bg-purple-100 text-purple-700'
    };
    return styles[type] || 'bg-gray-100 text-gray-700';
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading profiles...</span>
        </div>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Company Profiles</h3>
        <p className="text-gray-500 text-sm">Create your first company profile to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GST/PAN</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Outstanding</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {profiles.map((profile) => (
              <tr 
                key={profile.id} 
                className="hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={() => router.push(`/company-ledger/company-profile/${profile.id}`)}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    {profile.company_name}
                    <ExternalLink className="h-3 w-3 text-blue-500 opacity-0 group-hover:opacity-100" />
                  </div>
                  {profile.city && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {profile.city}{profile.state && `, ${profile.state}`}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStakeholderBadge(profile.stakeholder_type)}`}>
                    {profile.stakeholder_type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {profile.mobile_number && (
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <Phone className="h-3 w-3 text-gray-400" />
                      {profile.mobile_number}
                    </div>
                  )}
                  {profile.email && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Mail className="h-3 w-3" />
                      {profile.email}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {profile.gst_num && (
                    <div className="text-sm text-gray-700">GST: {profile.gst_num}</div>
                  )}
                  {profile.pan && (
                    <div className="text-xs text-gray-500">PAN: {profile.pan}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${profile.outstanding_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(profile.outstanding_amount)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/company-ledger/company-profile/${profile.id}`);
                      }}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(profile);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(profile);
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
