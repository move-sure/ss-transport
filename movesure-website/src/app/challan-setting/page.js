'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import { Truck, Settings, List } from 'lucide-react';
import ChallanForm from '../../components/challan-settings/challanform';
import ChallanBookForm from '../../components/challan-settings/challan-book';
import ChallanDetailsTab from '../../components/challan-settings/challan-details-tab';
import ChallanBooksTab from '../../components/challan-settings/challan-books-tab';
import Navbar from '../../components/dashboard/navbar';

export default function ChallanManagementPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('challans');
  
  // Form States
  const [showChallanForm, setShowChallanForm] = useState(false);
  const [showBookForm, setShowBookForm] = useState(false);
  const [editingChallan, setEditingChallan] = useState(null);
  const [editingBook, setEditingBook] = useState(null);
  
  // Data States
  const [challans, setChallans] = useState([]);
  const [challanBooks, setChallanBooks] = useState([]);
  const [branches, setBranches] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [branchData, setBranchData] = useState(null);

  useEffect(() => {
    if (user?.branch_id) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load basic data first
      const [branchRes, branchesRes, trucksRes, staffRes] = await Promise.all([
        supabase.from('branches').select('*').eq('id', user.branch_id).single(),
        supabase.from('branches').select('*').eq('is_active', true).order('branch_name'),
        supabase.from('trucks').select('*, owner:staff!trucks_owner_id_fkey(name, mobile_number)').eq('is_active', true).order('truck_number'),
        supabase.from('staff').select('*').eq('is_active', true).order('name')
      ]);

      if (branchRes.error) throw branchRes.error;
      if (branchesRes.error) throw branchesRes.error;
      if (trucksRes.error) throw trucksRes.error;
      if (staffRes.error) throw staffRes.error;

      setBranchData(branchRes.data);
      setBranches(branchesRes.data || []);
      setTrucks(trucksRes.data || []);
      setStaff(staffRes.data || []);

      // Load challan books
      await loadChallanBooks();
      
      // Load challans only if on challans tab
      if (activeTab === 'challans') {
        await loadChallans();
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      alert('Error loading data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const loadChallanBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('challan_books')
        .select(`
          *,
          from_branch:branches!challan_books_from_branch_id_fkey(branch_name, branch_code),
          to_branch:branches!challan_books_to_branch_id_fkey(branch_name, branch_code),
          branch1:branches!challan_books_branch_1_fkey(branch_name, branch_code),
          branch2:branches!challan_books_branch_2_fkey(branch_name, branch_code),
          branch3:branches!challan_books_branch_3_fkey(branch_name, branch_code),
          creator:users!challan_books_created_by_fkey(username, name)
        `)
        .or(`branch_1.eq.${user.branch_id},branch_2.eq.${user.branch_id},branch_3.eq.${user.branch_id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChallanBooks(data || []);
    } catch (error) {
      console.error('Error loading challan books:', error);
    }
  };

  const loadChallans = async (filters = {}) => {
    try {
      let query = supabase
        .from('challan_details')
        .select(`
          *,
          branch:branches(branch_name, branch_code),
          truck:trucks(truck_number, truck_type),
          owner:staff!challan_details_owner_id_fkey(name, mobile_number),
          driver:staff!challan_details_driver_id_fkey(name, mobile_number, license_number),
          creator:users(username, name)
        `)
        .eq('branch_id', user.branch_id)
        .eq('is_active', true);

      // Apply filters
      if (filters.date) {
        query = query.eq('date', filters.date);
      }

      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'dispatched') {
          query = query.eq('is_dispatched', true);
        } else if (filters.status === 'pending') {
          query = query.eq('is_dispatched', false);
        }
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      setChallans(data || []);
    } catch (error) {
      console.error('Error loading challans:', error);
      setChallans([]);
    }
  };

  // Form Handlers
  const handleCreateNewChallan = () => {
    setEditingChallan(null);
    setShowChallanForm(true);
  };

  const handleEditChallan = (challan) => {
    setEditingChallan(challan);
    setShowChallanForm(true);
  };

  const handleCreateNewBook = () => {
    setEditingBook(null);
    setShowBookForm(true);
  };

  const handleEditBook = (book) => {
    setEditingBook(book);
    setShowBookForm(true);
  };

  const handleFormSuccess = () => {
    setShowChallanForm(false);
    setShowBookForm(false);
    setEditingChallan(null);
    setEditingBook(null);
    
    // Reload data
    loadChallanBooks();
    if (activeTab === 'challans') {
      loadChallans();
    }
  };

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'challans' && challans.length === 0) {
      loadChallans();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-2xl font-bold text-black">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-xl border border-blue-300 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 text-white">
              <Truck className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Challan Management</h1>
                <p className="text-blue-100">Branch: {branchData?.branch_name} ({branchData?.branch_code})</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              {activeTab === 'challans' && (
                <button
                  onClick={handleCreateNewChallan}
                  className="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors border-2 border-blue-300 flex items-center gap-2"
                  disabled={challanBooks.filter(book => book.is_active && !book.is_completed).length === 0}
                >
                  <Truck className="w-5 h-5" />
                  Create New Challan
                </button>
              )}
              {activeTab === 'books' && (
                <button
                  onClick={handleCreateNewBook}
                  className="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors border-2 border-blue-300 flex items-center gap-2"
                >
                  <Settings className="w-5 h-5" />
                  Create New Book
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-lg border border-blue-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleTabChange('challans')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${
                activeTab === 'challans'
                  ? 'bg-blue-600 text-white'
                  : 'text-black hover:bg-blue-50'
              }`}
            >
              <List className="w-5 h-5 inline mr-2" />
              Challan Details ({challans.length})
            </button>
            <button
              onClick={() => handleTabChange('books')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition-colors ${
                activeTab === 'books'
                  ? 'bg-blue-600 text-white'
                  : 'text-black hover:bg-blue-50'
              }`}
            >
              <Settings className="w-5 h-5 inline mr-2" />
              Challan Books ({challanBooks.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'challans' ? (
          <ChallanDetailsTab
            challans={challans}
            challanBooks={challanBooks}
            onLoadChallans={loadChallans}
            onCreateNew={handleCreateNewChallan}
            onEdit={handleEditChallan}
            userBranch={branchData}
          />
        ) : (
          <ChallanBooksTab
            challanBooks={challanBooks}
            onCreateNew={handleCreateNewBook}
            onEdit={handleEditBook}
            onRefresh={loadChallanBooks}
            userBranch={branchData}
          />
        )}
      </div>

      {/* Form Modals */}
      {showChallanForm && (
        <ChallanForm
          isOpen={showChallanForm}
          onClose={() => {
            setShowChallanForm(false);
            setEditingChallan(null);
          }}
          onSuccess={handleFormSuccess}
          editingChallan={editingChallan}
          userBranch={branchData}
          challanBooks={challanBooks.filter(book => book.is_active && !book.is_completed)}
          trucks={trucks}
          staff={staff}
          branches={branches}
        />
      )}

      {showBookForm && (
        <ChallanBookForm
          isOpen={showBookForm}
          onClose={() => {
            setShowBookForm(false);
            setEditingBook(null);
          }}
          onSuccess={handleFormSuccess}
          editingBook={editingBook}
          userBranch={branchData}
          branches={branches}
        />
      )}
    </div>
  );
}