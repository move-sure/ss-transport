'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '../utils/supabase';
import { useAuth } from '../utils/auth';
import Navbar from '@/components/dashboard/navbar';
import ComplaintList from '@/components/complains/complaint-list';
import { Loader2, Plus } from 'lucide-react';

export default function ComplainsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchComplaints();
    }
  }, [user]);

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewComplaint = (complaint) => {
    // You can implement complaint detail view or edit functionality here
    console.log('View complaint:', complaint);
    alert(`Viewing complaint: ${complaint.complaint_no}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Loading complaints...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50 flex items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50">
      <Navbar />
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🚨 Complaints Management</h1>
            <p className="text-sm text-gray-600">Track and resolve customer complaints</p>
          </div>
          <button
            onClick={() => router.push('/complains/create')}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 font-bold text-white shadow-lg transition hover:bg-orange-700"
          >
            <Plus className="h-5 w-5" />
            New Complaint
          </button>
        </div>

        <ComplaintList complaints={complaints} onViewComplaint={handleViewComplaint} />
      </div>
    </div>
  );
}
