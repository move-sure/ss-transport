'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../utils/auth';
import Navbar from '../../components/dashboard/navbar';
import ManualBiltyForm from '../../components/manual/manual-bilty-form';
import ManualBiltyTable from '../../components/manual/manual-bilty-table';
import ManualBiltyHeader from '../../components/manual/manual-bilty-header';
import ManualBiltySearch from '../../components/manual/manual-bilty-search';
import BiltyDeleteConfirmModal from '../../components/manual/bilty-delete-confirm-modal';
import ArchivedBiltyModal from '../../components/manual/archived-bilty-modal';
import useBiltyDeletion from '../../components/manual/use-bilty-deletion';
import { 
  useStationBiltySummary, 
  formatCurrency,
  formatWeight
} from '../../components/manual/manual-helper';

export default function StationBiltySummaryPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated, initialized } = useAuth();
    // Use the custom hook
  const {
    loading,
    saving,
    searching,
    summaryData,
    searchResults,
    searchTerm,
    editingId,
    formData,
    cities,
    loadingReferenceData,
    setFormData,
    setSearchTerm,
    loadSummaryData,
    searchSummaries,
    saveSummary,
    loadForEdit,
    resetForm,
    getSummaryStats,
    exportToCSV,
    advancedSearchSummaries
  } = useStationBiltySummary();

  // Use bilty deletion hook
  const { deleting, deleteBiltyWithArchive } = useBiltyDeletion();
  // Component state
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [recordsPerPage] = useState(20);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [biltyToDelete, setBiltyToDelete] = useState(null);
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  
  // Branch management state
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Authentication check
  useEffect(() => {
    if (initialized && !authLoading) {
      if (!isAuthenticated || !user) {
        console.log('Not authenticated, redirecting to login');
        router.push('/login');
      }
    }
  }, [initialized, authLoading, isAuthenticated, user, router]);
  
  // Load initial data
  useEffect(() => {
    if (user?.id) {
      handleLoadData();
    }
  }, [user?.id, currentPage]);
  
  // Search when searchTerm changes
  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchSummaries(searchTerm);
    } else if (searchTerm === '') {
      // Clear search results when search term is empty
      handleLoadData();
    }
  }, [searchTerm, searchSummaries]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt + N for new entry
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewRecord();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // Load branches and initialize default branch
  useEffect(() => {
    if (user?.id) {
      loadBranches();
    }
  }, [user?.id]);
  // Initialize default branch when branches are loaded
  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      initializeDefaultBranch();
    }
  }, [branches, user?.branch_id, user?.user_metadata?.branch_id]);
  // Update form branch_id when selected branch changes (if form is open)
  useEffect(() => {
    if (showForm && selectedBranch) {
      setFormData(prev => ({
        ...prev,
        branch_id: selectedBranch.id
      }));
    }
  }, [selectedBranch, showForm, setFormData]);

  // Debug user data structure
  useEffect(() => {
    if (user) {
      console.log('Manual Page - User data structure:', {
        id: user.id,
        branch_id: user.branch_id,
        user_metadata: user.user_metadata,
        full_user: user
      });
    }
  }, [user]);

  // Load branches from database
  const loadBranches = async () => {
    try {
      setLoadingBranches(true);
      const supabase = (await import('../utils/supabase')).default;
      
      const { data: branchesData, error } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('branch_name');

      if (error) {
        console.error('Error loading branches:', error);
        return;
      }

      setBranches(branchesData || []);
    } catch (error) {
      console.error('Error loading branches:', error);
    } finally {
      setLoadingBranches(false);
    }
  };
    // Initialize default branch from localStorage or user's branch
  const initializeDefaultBranch = () => {
    try {
      const savedBranchId = localStorage.getItem('selectedBranchId');
      if (savedBranchId) {
        const branch = branches.find(b => b.id === savedBranchId);
        if (branch) {
          setSelectedBranch(branch);
          return;
        }
      }
      
      // Fallback to user's branch - check both possible locations
      const userBranchId = user?.branch_id || user?.user_metadata?.branch_id;
      if (userBranchId) {
        const userBranch = branches.find(b => b.id === userBranchId);
        if (userBranch) {
          setSelectedBranch(userBranch);
          localStorage.setItem('selectedBranchId', userBranch.id);
          return;
        }
      }

      // If no match, select first available branch
      if (branches.length > 0) {
        setSelectedBranch(branches[0]);
        localStorage.setItem('selectedBranchId', branches[0].id);
      }
    } catch (error) {
      console.error('Error initializing default branch:', error);
      // Fallback to first branch if localStorage fails
      if (branches.length > 0) {
        setSelectedBranch(branches[0]);
      }
    }
  };
  
  // Handle branch selection
  const handleBranchSelect = (branch) => {
    setSelectedBranch(branch);
    setShowBranchDropdown(false);
    localStorage.setItem('selectedBranchId', branch.id);
    
    // Update form data if form is open
    if (showForm) {
      setFormData(prev => ({
        ...prev,
        branch_id: branch.id
      }));
    }
  };  // Handle new record
  const handleNewRecord = () => {
    resetForm();
    
    // Set staff_id and branch_id from user data - ensure proper assignment
    console.log('Setting up new record with user:', {
      userId: user?.id,
      userBranchId: user?.branch_id,
      selectedBranchId: selectedBranch?.id
    });
    
    setFormData(prev => ({
      ...prev,
      staff_id: user?.id || null,
      branch_id: selectedBranch?.id || user?.branch_id || null
    }));
    setShowForm(true);
    
    // Focus on GR number field after form opens
    setTimeout(() => {
      const grNumberInput = document.querySelector('[data-tab-target="gr_no"]');
      if (grNumberInput) {
        grNumberInput.focus();
      }
    }, 100);
  };
  // Load data with pagination
  const handleLoadData = async () => {
    try {
      setIsAdvancedSearch(false); // Clear advanced search state
      const offset = (currentPage - 1) * recordsPerPage;
      const result = await loadSummaryData(recordsPerPage, offset);
      setTotalRecords(result.count);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading data. Please try again.');
    }
  };

  // Load statistics
  const loadStats = async () => {
    // Stats functionality removed
  };
    // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Pass user data to saveSummary for proper staff_id and branch_id handling
      await saveSummary(user);
      setShowForm(false);
      alert(editingId ? 'Record updated successfully!' : 'Record added successfully!');
    } catch (error) {
      console.error('Error saving:', error);
      alert(`Error saving record: ${error.message}`);
    }
  };
  // Handle edit
  const handleEdit = (summary) => {
    loadForEdit(summary);
    
    // Ensure branch selection matches the record's branch
    if (summary.branch_id && branches.length > 0) {
      const recordBranch = branches.find(b => b.id === summary.branch_id);
      if (recordBranch && recordBranch.id !== selectedBranch?.id) {
        setSelectedBranch(recordBranch);
      }
    }
    
    setShowForm(true);
  };

  // Handle delete request - show confirmation modal
  const handleDeleteRequest = (bilty) => {
    setBiltyToDelete(bilty);
    setShowDeleteConfirm(true);
  };

  // Handle confirmed delete with archiving
  const handleConfirmDelete = async (biltyId, deleteReason) => {
    try {
      const result = await deleteBiltyWithArchive(biltyId, user?.id, deleteReason);
      
      if (result.success) {
        setShowDeleteConfirm(false);
        setBiltyToDelete(null);
        alert('Record deleted and archived successfully!');
        
        // Reload data
        await handleLoadData();
      } else {
        alert(`Error deleting record: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting record. Please try again.');
    }
  };

  // Handle close delete modal
  const handleCloseDeleteModal = () => {
    setShowDeleteConfirm(false);
    setBiltyToDelete(null);
  };

  // Handle export
  const handleExport = async () => {
    try {
      await exportToCSV();
      alert('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Error exporting data. Please try again.');
    }
  };  // Handle advanced search
  const handleAdvancedSearch = async (filters) => {
    try {
      console.log('handleAdvancedSearch called with filters:', filters);
      
      // If no filters are provided, clear search results and reload regular data
      if (!filters || Object.values(filters).every(value => value === '')) {
        console.log('Clearing advanced search - no active filters');
        setSearchTerm('');
        setIsAdvancedSearch(false);
        await handleLoadData();
        return;
      }
      
      console.log('Performing advanced search with filters:', filters);
      // Perform advanced search
      const results = await advancedSearchSummaries(filters);
      console.log('Advanced search completed, results:', results?.length || 0);
      
      // Clear the basic search term when using advanced search
      setSearchTerm('');
      setIsAdvancedSearch(true);
      
    } catch (error) {
      console.error('Error in advanced search:', error);
      alert('Error performing advanced search. Please try again.');
    }
  };

  // Calculate pagination info
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  // Show loading while auth is initializing
  if (!initialized || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Redirecting...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-white page-with-navbar">
      <Navbar />
      
      <main className="w-full max-w-full mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full">
          
          {/* Header Section */}
          <ManualBiltyHeader
            selectedBranch={selectedBranch}
            branches={branches}
            showBranchDropdown={showBranchDropdown}
            setShowBranchDropdown={setShowBranchDropdown}
            loadingBranches={loadingBranches}
            handleBranchSelect={handleBranchSelect}
            handleNewRecord={handleNewRecord}
            handleExport={handleExport}
            handleOpenArchive={() => setShowArchivedModal(true)}
            loading={loading}
          />

          {/* Search and Filter Section */}          <ManualBiltySearch
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            handleLoadData={handleLoadData}
            loading={loading}
            onAdvancedSearch={handleAdvancedSearch}
            totalRecords={totalRecords}
            branches={branches}
          />          {/* Data Table */}
          <ManualBiltyTable
            summaryData={summaryData}
            searchResults={searchResults}
            searchTerm={searchTerm}
            isAdvancedSearch={isAdvancedSearch}
            handleEdit={handleEdit}
            handleDeleteRequest={handleDeleteRequest}
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
            startRecord={startRecord}
            endRecord={endRecord}
            totalRecords={totalRecords}
          />

        </div>
      </main>

      {/* Add/Edit Form Modal */}
      <ManualBiltyForm
        showForm={showForm}
        setShowForm={setShowForm}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        saving={saving}
        selectedBranch={selectedBranch}
        branches={branches}
        onBranchChange={setSelectedBranch}
        cities={cities}
        loadingReferenceData={loadingReferenceData}
      />

      {/* Delete Confirmation Modal */}
      <BiltyDeleteConfirmModal
        showModal={showDeleteConfirm}
        biltyToDelete={biltyToDelete}
        onClose={handleCloseDeleteModal}
        onConfirmDelete={handleConfirmDelete}
        deleting={deleting}
      />

      {/* Archived Bilty Modal */}
      <ArchivedBiltyModal
        showModal={showArchivedModal}
        onClose={() => setShowArchivedModal(false)}
      />
    </div>
  );
}