'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../utils/auth';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/dashboard/navbar';
import ConsignorBiltyProfile from '../../components/company-profile/ConsignorBiltyProfile';
import ConsignorListTab from '../../components/company-profile/ConsignorListTab';
import { Building2, FileText, Users, Settings } from 'lucide-react';

export default function CompanyProfilePage() {
  const { user, loading, isAuthenticated, initialized, requireAuth } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('rate-profiles');

  // Redirect if not authenticated
  useEffect(() => {
    if (initialized && !loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [initialized, loading, isAuthenticated, router]);

  if (loading || !initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const tabs = [
    { id: 'rate-profiles', label: 'Rate Profiles', icon: FileText },
    { id: 'consignor-list', label: 'Consignor List', icon: Users },
    // Future tabs can be added here
    // { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
              <p className="text-gray-600">Manage consignor rate profiles and configurations</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 mr-2 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'rate-profiles' && (
            <ConsignorBiltyProfile user={user} />
          )}
          {activeTab === 'consignor-list' && (
            <ConsignorListTab 
              onViewProfiles={(consignor) => {
                // Switch to rate profiles tab and set selected consignor
                setActiveTab('rate-profiles');
                // You can pass the consignor data to ConsignorBiltyProfile if needed
              }}
              onEditConsignor={(consignor) => {
                // Switch to rate profiles tab for editing
                setActiveTab('rate-profiles');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
