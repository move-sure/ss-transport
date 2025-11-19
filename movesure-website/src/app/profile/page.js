'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../utils/auth';
import Navbar from '../../components/dashboard/navbar';
import UserDetailsForm from '../../components/profile/user-details-form';
import ChangePasswordForm from '../../components/profile/change-password-form';
import supabase from '../utils/supabase';
import { User, Calendar, Shield, Briefcase } from 'lucide-react';
import Image from 'next/image';

export default function ProfilePage() {
  const { user, loading, isAuthenticated, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !loading) {
      if (!isAuthenticated || !user) {
        router.push('/login');
      }
    }
  }, [initialized, loading, isAuthenticated, user, router]);

  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="w-full py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-2">View and manage your account information</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Profile Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                
                {/* Profile Header with Image */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 h-32"></div>
                
                <div className="relative px-6 pb-6">
                  {/* Profile Picture */}
                  <div className="flex justify-center -mt-16 mb-4">
                    <div className="relative">
                      {user.image_url ? (
                        <Image
                          src={user.image_url}
                          alt="Profile"
                          width={128}
                          height={128}
                          className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg"
                        />
                      ) : (
                        <div className="h-32 w-32 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center">
                          <User className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 bg-green-500 h-6 w-6 rounded-full border-2 border-white"></div>
                    </div>
                  </div>

                  {/* User Name and Username */}
                  <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                      {user.name || user.username}
                    </h2>
                    <p className="text-gray-600">@{user.username}</p>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}>
                      {user.is_active ? '● Active' : '○ Inactive'}
                    </span>
                    {user.is_staff && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                        <Shield className="h-3 w-3 mr-1" />
                        Staff Member
                      </span>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Joined</span>
                        <span className="ml-auto font-medium text-gray-900">
                          {new Date(user.created_at).toLocaleDateString('en-IN', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Briefcase className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Role</span>
                        <span className="ml-auto font-medium text-gray-900">
                          {user.post || 'User'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Profile Details */}
            <div className="lg:col-span-2">
              {/* User Details Form */}
              <UserDetailsForm userId={user.id} />
              
              {/* Change Password Form */}
              <div className="mt-6">
                <ChangePasswordForm userId={user.id} />
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
