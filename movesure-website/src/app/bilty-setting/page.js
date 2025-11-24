'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import Navbar from '../../components/dashboard/navbar';
import CitiesComponent from '../../components/bilty-setting/cities-manage';
import TransportersComponent from '../../components/bilty-setting/transport-manage';
import ConsignorComponent from '../../components/bilty-setting/consignor-manage';
import ConsigneeComponent from '../../components/bilty-setting/consignee-manage';
import RatesComponent from '../../components/bilty-setting/rates-manager';
import PermanentDetailsComponent from '../../components/bilty-setting/permanent-details';
import ConsignorRatesSearch from '../../components/bilty-setting/consignor-rates-search';

const BiltySettingsPage = () => {
  const { user, requireAuth, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('cities');
  const [branchInfo, setBranchInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !requireAuth()) {
      return;
    }
    
    if (user) {
      fetchBranchInfo();
    }
  }, [user, authLoading]);

  const fetchBranchInfo = async () => {
    try {
      if (!user?.branch_id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', user.branch_id)
        .single();

      if (error) throw error;
      setBranchInfo(data);
    } catch (error) {
      console.error('Error fetching branch info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-lg text-gray-700 font-medium">Loading Bilty Settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'cities', name: 'Cities', icon: '🏙️', description: 'Manage city locations' },
    { id: 'transporters', name: 'Transporters', icon: '🚛', description: 'Transport companies' },
    { id: 'consignors', name: 'Consignors', icon: '📦', description: 'Shipping parties' },
    { id: 'consignees', name: 'Consignees', icon: '🏢', description: 'Receiving parties' },
    { id: 'rates', name: 'Rates', icon: '💰', description: 'Pricing management' },
    { id: 'company-rates', name: 'Company Rates', icon: '🔍', description: 'Search rates by company' },
    { id: 'permanent-details', name: 'Permanent Details', icon: '📋', description: 'Branch configurations' }
  ];

  const activeTabInfo = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      {/* Enhanced Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <span className="text-2xl">⚙️</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Bilty Settings</h1>
                <p className="text-gray-600 mt-1">
                  Configure and manage your transport billing system
                </p>
              </div>
            </div>
            
            {branchInfo && (
              <div className="bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-900">{branchInfo.branch_name}</p>
                  <p className="text-xs text-blue-700">{branchInfo.branch_code}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced User Info Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {user.image_url ? (
                  <img 
                    src={user.image_url} 
                    alt={user.name}
                    className="h-14 w-14 rounded-full object-cover border-2 border-blue-200"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg border-2 border-blue-200">
                    {user.name ? user.name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{user.name || user.username}</h3>
                <p className="text-gray-600">
                  {user.post} {branchInfo && `• ${branchInfo.branch_name}`}
                </p>
              </div>
            </div>
            
            {activeTabInfo && (
              <div className="text-right">
                <div className="flex items-center space-x-2 text-gray-600">
                  <span className="text-lg">{activeTabInfo.icon}</span>
                  <span className="text-sm font-medium">{activeTabInfo.description}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-8 border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
            <h2 className="text-lg font-semibold text-gray-900">Management Sections</h2>
          </div>
          <div className="p-2">
            <nav className="flex flex-wrap gap-2" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative px-4 py-3 rounded-lg font-medium text-sm flex items-center space-x-2 transition-all duration-200 min-w-0 flex-shrink-0
                    ${activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md transform scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="whitespace-nowrap">{tab.name}</span>
                  {activeTab === tab.id && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content with Enhanced Styling */}
        <div className="transition-all duration-300 ease-in-out">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{activeTabInfo?.icon}</span>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{activeTabInfo?.name}</h3>
                  <p className="text-gray-600 text-sm">{activeTabInfo?.description}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {activeTab === 'cities' && <CitiesComponent />}
              {activeTab === 'transporters' && <TransportersComponent />}
              {activeTab === 'consignors' && <ConsignorComponent />}
              {activeTab === 'consignees' && <ConsigneeComponent />}
              {activeTab === 'rates' && <RatesComponent />}
              {activeTab === 'company-rates' && <ConsignorRatesSearch />}
              {activeTab === 'permanent-details' && <PermanentDetailsComponent />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiltySettingsPage;