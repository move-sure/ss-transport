'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/auth';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/dashboard/navbar';
import SettingsPopup from '../../components/ewb/settings-popup';
import GSTINSearchComponent from '../../components/ewb/gstin-search';
import TransportUpdateComponent from '../../components/ewb/transport-update';
import supabase from '../utils/supabase';
import { 
  Key, 
  Settings,
  User,
  Building,
  Clock,
  Search,
  Shield,
  BarChart3,
  FileText,
  Truck
} from 'lucide-react';

export default function EWBPage() {
  const { user, requireAuth, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    if (!authLoading && !requireAuth()) {
      return;
    }
    
    if (user) {
      fetchUserDetails();
    }
  }, [user, authLoading]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch user with branch details
      const { data: userData, error } = await supabase
        .from('users')
        .select(`
          *,
          branch:branches(
            branch_name,
            branch_code,
            address
          )
        `)
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user details:', error);
        setUserDetails(user); // Fallback to basic user data
      } else {
        setUserDetails(userData);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      setUserDetails(user); // Fallback to basic user data
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-white">
      <Navbar />
      
      <main className="w-full py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl shadow-2xl p-8 mb-8 border border-purple-200">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white bg-opacity-20 rounded-2xl mb-6">
                <Key className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">E-Way Bill Management Dashboard</h1>
              <p className="text-blue-100 text-lg font-medium">Comprehensive EWB token management and GSTIN verification system</p>
            </div>
          </div>

          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Shield className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-bold text-gray-900">Auth Tokens</h3>
                  <p className="text-sm text-blue-600 font-semibold">Active authentication</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <Key className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-bold text-gray-900">EWB Tokens</h3>
                  <p className="text-sm text-green-600 font-semibold">Active EWB tokens</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Truck className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-bold text-gray-900">Transport Update</h3>
                  <p className="text-sm text-purple-600 font-semibold">Update transporter ID</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <Search className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-bold text-gray-900">GSTIN Search</h3>
                  <p className="text-sm text-orange-600 font-semibold">Verify businesses</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - User Details */}
            <div className="lg:col-span-1 space-y-6">
              {/* User Details Card */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  User Information
                </h2>
                
                {/* User Profile */}
                <div className="flex items-start space-x-4 mb-6">
                  <div className="flex-shrink-0">
                    {userDetails?.image_url ? (
                      <img
                        src={userDetails.image_url}
                        alt={userDetails.name || userDetails.username}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {userDetails?.name || userDetails?.username}
                    </h3>
                    <p className="text-sm text-gray-600">@{userDetails?.username}</p>
                    {userDetails?.post && (
                      <p className="text-sm text-blue-600 font-medium">{userDetails.post}</p>
                    )}
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      Last login: {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Branch Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Building className="h-5 w-5 text-gray-600 mr-2" />
                    <h4 className="font-medium text-gray-900">Branch Details</h4>
                  </div>
                  {userDetails?.branch ? (
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-600">Branch Name:</span>
                        <p className="font-medium text-gray-900">{userDetails.branch.branch_name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Branch Code:</span>
                        <p className="font-medium text-gray-900">{userDetails.branch.branch_code}</p>
                      </div>
                      {userDetails.branch.address && (
                        <div>
                          <span className="text-sm text-gray-600">Address:</span>
                          <p className="text-sm text-gray-900">{userDetails.branch.address}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No branch assigned</p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                    <Settings className="h-5 w-5 text-white" />
                  </div>
                  Quick Actions
                </h3>
                <div className="space-y-4">                  <button
                    onClick={() => setShowSettingsPopup(true)}
                    className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                  >
                    <Settings className="h-6 w-6" />
                    <span className="font-bold">Token Settings</span>
                  </button>
                  
                  <button 
                    onClick={() => router.push('/ewb-consolidated')}
                    className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                  >
                    <Truck className="h-6 w-6" />
                    <span className="font-bold">Consolidated EWB</span>
                  </button>
                  
                  <button className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all shadow-md hover:shadow-lg transform hover:scale-105 font-semibold border border-gray-300">
                    <FileText className="h-6 w-6" />
                    <span className="font-bold">Generate Report</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Main Components */}
            <div className="lg:col-span-2 space-y-8">
              {/* Transport ID Update Component */}
              <TransportUpdateComponent userDetails={userDetails} />
              
              {/* GSTIN Search Component */}
              <GSTINSearchComponent />
            </div>
          </div>
        </div>
      </main>

      {/* Settings Popup */}
      <SettingsPopup 
        isOpen={showSettingsPopup} 
        onClose={() => setShowSettingsPopup(false)} 
      />
    </div>
  );
}