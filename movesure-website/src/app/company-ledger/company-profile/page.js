'use client';

import React, { useState } from 'react';
import { Building2, Plus, Upload, Users } from 'lucide-react';
import {
  CompanyProfileSearch,
  CompanyProfileTable,
  CompanyProfileModal,
  ImportFromExisting,
  useCompanyProfiles
} from '@/components/company-ledger/company-profile';

export default function CompanyManagementPage() {
  const {
    profiles,
    allProfiles,
    loading,
    saving,
    searchTerm,
    setSearchTerm,
    stakeholderFilter,
    setStakeholderFilter,
    createProfile,
    updateProfile,
    deleteProfile
  } = useCompanyProfiles();

  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editProfile, setEditProfile] = useState(null);
  const [importData, setImportData] = useState(null);

  // Stats
  const stats = {
    total: allProfiles.length,
    consignors: allProfiles.filter(p => p.stakeholder_type === 'CONSIGNOR').length,
    consignees: allProfiles.filter(p => p.stakeholder_type === 'CONSIGNEE').length,
    transport: allProfiles.filter(p => p.stakeholder_type === 'TRANSPORT').length
  };

  const handleCreate = () => {
    setEditProfile(null);
    setImportData(null);
    setShowModal(true);
  };

  const handleEdit = (profile) => {
    setEditProfile(profile);
    setImportData(null);
    setShowModal(true);
  };

  const handleDelete = async (profile) => {
    if (window.confirm(`Delete "${profile.company_name}"? This cannot be undone.`)) {
      await deleteProfile(profile.id);
    }
  };

  const handleImportSelect = (data) => {
    setShowImportModal(false);
    setEditProfile(null);
    setImportData(data);
    setShowModal(true);
  };

  const handleSave = async (formData) => {
    let result;
    
    if (editProfile) {
      result = await updateProfile(editProfile.id, formData);
    } else {
      result = await createProfile(formData);
    }

    if (result.success) {
      setShowModal(false);
      setEditProfile(null);
      setImportData(null);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  return (
    <div className="p-6 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-lg">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Company Profile Management</h1>
            <p className="text-sm text-gray-500">Manage consignor, consignee and transport profiles</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import Existing
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Profile
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Users className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">Total Profiles</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.consignors}</div>
              <div className="text-xs text-gray-500">Consignors</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.consignees}</div>
              <div className="text-xs text-gray-500">Consignees</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{stats.transport}</div>
              <div className="text-xs text-gray-500">Transport</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mb-4">
        <CompanyProfileSearch
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          stakeholderFilter={stakeholderFilter}
          onFilterChange={setStakeholderFilter}
        />
      </div>

      {/* Results Count */}
      {!loading && (
        <div className="mb-3 text-sm text-gray-500">
          Showing {profiles.length} of {allProfiles.length} profiles
        </div>
      )}

      {/* Table */}
      <CompanyProfileTable
        profiles={profiles}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Create/Edit Modal */}
      <CompanyProfileModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditProfile(null);
          setImportData(null);
        }}
        onSave={handleSave}
        editProfile={editProfile}
        importData={importData}
        saving={saving}
      />

      {/* Import Modal */}
      <ImportFromExisting
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportSelect}
      />
    </div>
  );
}
