'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import { Truck, Settings, List, Plus, Search, Filter, Calendar, Eye, RefreshCw } from 'lucide-react';

const API_URL = 'https://movesure-backend.onrender.com';

// Transform flat API challan row to nested objects for component compatibility
const transformChallanRow = (row) => ({
  ...row,
  truck: row.truck_id ? { id: row.truck_id, truck_number: row.truck_number, truck_type: row.truck_type } : null,
  driver: row.driver_id ? { id: row.driver_id, name: row.driver_name, mobile_number: row.driver_mobile_number, license_number: row.driver_license_number } : null,
  owner: row.owner_id ? { id: row.owner_id, name: row.owner_name, mobile_number: row.owner_mobile_number } : null,
  creator: row.created_by_name ? { name: row.created_by_name, username: row.created_by_name } : null,
});

// Transform flat API book row to nested objects using branches array
const transformBookRow = (row, branchesArr) => ({
  ...row,
  from_branch: branchesArr.find(b => b.id === row.from_branch_id) || null,
  to_branch: branchesArr.find(b => b.id === row.to_branch_id) || null,
  branch1: branchesArr.find(b => b.id === row.branch_1) || null,
  branch2: row.branch_2 ? branchesArr.find(b => b.id === row.branch_2) || null : null,
  branch3: row.branch_3 ? branchesArr.find(b => b.id === row.branch_3) || null : null,
  creator: row.created_by_name ? { name: row.created_by_name, username: row.created_by_name } : null,
});
import ChallanForm from '../../components/challan-settings/challanform';
import ChallanBookForm from '../../components/challan-settings/challan-book';
import ChallanDetailsTab from '../../components/challan-settings/challan-details-tab';
import ChallanBooksTab from '../../components/challan-settings/challan-books-tab';
import Navbar from '../../components/dashboard/navbar';

export default function ChallanManagementPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('challans');
  const [refreshing, setRefreshing] = useState(false);
  
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
      const loadedBranches = branchesRes.data || [];
      setBranches(loadedBranches);
      setTrucks(trucksRes.data || []);
      setStaff(staffRes.data || []);

      // Load challan books and challans from API
      await loadChallanBooks(loadedBranches);
      await loadChallans();
    } catch (error) {
      console.error('Error loading initial data:', error);
      alert('Error loading data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const loadChallanBooks = async (branchesData) => {
    try {
      const branchesArr = branchesData || branches;
      const res = await fetch(`${API_URL}/api/challan/books?branch_id=${user.branch_id}`);
      const result = await res.json();
      
      if (result.status !== 'success') throw new Error(result.message || 'Failed to load challan books');
      
      const books = (result.data?.rows || []).map(row => transformBookRow(row, branchesArr));
      setChallanBooks(books);
    } catch (error) {
      console.error('Error loading challan books:', error);
    }
  };

  const loadChallans = async (filters = {}) => {
    try {
      // Build API URL with supported filters
      let url = `${API_URL}/api/challan/list`;
      const params = new URLSearchParams();
      
      // Only apply branch filter for branches other than the admin one
      if (user.branch_id !== '0f128ce1-daab-4356-98b8-c58d62f825be') {
        params.set('branch_id', user.branch_id);
      }
      
      // Apply dispatch status filter via API
      if (filters.status && filters.status !== 'all') {
        params.set('is_dispatched', filters.status === 'dispatched' ? 'true' : 'false');
      }
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await fetch(url);
      const result = await res.json();
      
      if (result.status !== 'success') throw new Error(result.message || 'Failed to load challans');
      
      let challansData = (result.data?.rows || []).map(transformChallanRow);
      
      // Apply client-side filters that API doesn't support
      if (filters.date) {
        challansData = challansData.filter(c => c.date === filters.date);
      }
      
      setChallans(challansData);
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
    loadChallans();
  };

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadChallanBooks();
      await loadChallans();
    } finally {
      setRefreshing(false);
    }
  };

  // Stats calculations
  const stats = useMemo(() => {
    const totalChallans = challans.length;
    const pendingChallans = challans.filter(c => !c.is_dispatched).length;
    const dispatchedChallans = challans.filter(c => c.is_dispatched).length;
    const totalBilties = challans.reduce((sum, c) => sum + (c.total_bilty_count || 0), 0);
    const activeBooks = challanBooks.filter(b => b.is_active && !b.is_completed).length;

    return {
      totalChallans,
      pendingChallans,
      dispatchedChallans,
      totalBilties,
      activeBooks
    };
  }, [challans, challanBooks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-xl font-semibold text-gray-700">Loading Challan Management...</div>
            <div className="text-sm text-gray-500 mt-2">Please wait while we fetch your data</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white">
      <Navbar />
      
      {/* Full-width container */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Enhanced Header with Stats */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-xl shadow-2xl border border-blue-300 p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4 text-white">
              <div className="bg-white/20 p-3 rounded-lg">
                <Truck className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-1">Challan Management System</h1>
                <p className="text-blue-100 flex items-center gap-2">
                  <span>Branch: {branchData?.branch_name} ({branchData?.branch_code})</span>
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors border border-white/20 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              {activeTab === 'challans' && (
                <button
                  onClick={handleCreateNewChallan}
                  className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors border-2 border-blue-300 flex items-center gap-2 shadow-lg"
                  disabled={challanBooks.filter(book => book.is_active && !book.is_completed).length === 0}
                >
                  <Plus className="w-5 h-5" />
                  New Challan
                </button>
              )}
              {activeTab === 'books' && (
                <button
                  onClick={handleCreateNewBook}
                  className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors border-2 border-blue-300 flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  New Book
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{stats.totalChallans}</div>
              <div className="text-blue-100 text-sm">Total Challans</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-300">{stats.pendingChallans}</div>
              <div className="text-blue-100 text-sm">Pending</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-300">{stats.dispatchedChallans}</div>
              <div className="text-blue-100 text-sm">Dispatched</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-300">{stats.totalBilties}</div>
              <div className="text-blue-100 text-sm">Total Bilties</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-300">{stats.activeBooks}</div>
              <div className="text-blue-100 text-sm">Active Books</div>
            </div>
          </div>
        </div>

        {/* Enhanced Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-6 overflow-hidden">
          <div className="flex">
            <button
              onClick={() => handleTabChange('challans')}
              className={`flex-1 py-6 px-6 text-center font-semibold transition-all duration-200 relative ${
                activeTab === 'challans'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <List className="w-6 h-6" />
                <div>
                  <div className="font-bold">Challan Details</div>
                  <div className={`text-sm ${activeTab === 'challans' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {challans.length} entries
                  </div>
                </div>
              </div>
              {activeTab === 'challans' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-400"></div>
              )}
            </button>
            <button
              onClick={() => handleTabChange('books')}
              className={`flex-1 py-6 px-6 text-center font-semibold transition-all duration-200 relative ${
                activeTab === 'books'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <Settings className="w-6 h-6" />
                <div>
                  <div className="font-bold">Challan Books</div>
                  <div className={`text-sm ${activeTab === 'books' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {challanBooks.length} books
                  </div>
                </div>
              </div>
              {activeTab === 'books' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-400"></div>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content with Enhanced Styling */}
        <div className="min-h-[500px]">
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
      </div>

      {/* Form Modals with Enhanced Backdrop */}
      {(showChallanForm || showBookForm) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-auto">
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
        </div>
      )}
    </div>
  );
}