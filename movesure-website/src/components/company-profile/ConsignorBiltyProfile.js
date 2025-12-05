'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Loader2, Printer, ClipboardList, History } from 'lucide-react';
import supabase from '../../app/utils/supabase';

// Import sub-components
import ProfileFilters from './ProfileFilters';
import ProfileTable from './ProfileTable';
import ProfileFormModal from './ProfileFormModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import AlertMessages from './AlertMessages';
import RateListPDFGenerator from './RateListPDFGenerator';
import CompanyHistoryTab from './CompanyHistoryTab';

// Initial form state
const getInitialFormData = () => ({
  consignor_id: '',
  destination_station_id: '',
  city_code: '',
  city_name: '',
  transport_name: '',
  transport_gst: '',
  rate: 0,
  rate_unit: 'PER_KG',
  minimum_weight_kg: 0,
  freight_minimum_amount: 0,
  labour_rate: 0,
  labour_unit: 'PER_KG',
  dd_charge_per_kg: 0,
  dd_charge_per_nag: 0,
  dd_print_charge_per_kg: '',
  dd_print_charge_per_nag: '',
  receiving_slip_charge: 0,
  bilty_charge: 0,
  is_toll_tax_applicable: false,
  toll_tax_amount: 0,
  is_no_charge: false,
  effective_from: new Date().toISOString().split('T')[0],
  effective_to: '',
  is_active: true
});

const ConsignorBiltyProfile = ({ user }) => {
  // Data states
  const [profiles, setProfiles] = useState([]);
  const [consignors, setConsignors] = useState([]);
  const [cities, setCities] = useState([]);
  const [transports, setTransports] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConsignor, setSelectedConsignor] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('profiles'); // 'profiles' or 'history'

  // Form state
  const [formData, setFormData] = useState(getInitialFormData());

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [profilesRes, consignorsRes, citiesRes, transportsRes] = await Promise.all([
        supabase
          .from('consignor_bilty_profile')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('consignors')
          .select('id, company_name, company_add, number, gst_num')
          .order('company_name'),
        supabase
          .from('cities')
          .select('id, city_code, city_name')
          .order('city_name'),
        supabase
          .from('transports')
          .select('id, transport_name, city_id, city_name, gst_number, mob_number')
          .order('transport_name')
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (consignorsRes.error) throw consignorsRes.error;
      if (citiesRes.error) throw citiesRes.error;
      if (transportsRes.error) throw transportsRes.error;

      setProfiles(profilesRes.data || []);
      setConsignors(consignorsRes.data || []);
      setCities(citiesRes.data || []);
      setTransports(transportsRes.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  // Get consignor name by ID
  const getConsignorName = (consignorId) => {
    const consignor = consignors.find(c => c.id === consignorId);
    return consignor ? consignor.company_name : 'Unknown';
  };

  // Get city name by ID
  const getCityName = (cityId) => {
    const city = cities.find(c => c.id === cityId);
    return city ? city.city_name : 'Unknown';
  };

  // Filter profiles
  const filteredProfiles = profiles.filter(profile => {
    const consignorName = getConsignorName(profile.consignor_id).toLowerCase();
    const cityName = getCityName(profile.destination_station_id).toLowerCase();
    const transportName = (profile.transport_name || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = !searchQuery || 
      consignorName.includes(query) || 
      cityName.includes(query) || 
      transportName.includes(query);

    const matchesConsignor = !selectedConsignor || profile.consignor_id === selectedConsignor;
    const matchesCity = !selectedCity || profile.destination_station_id === selectedCity;
    const matchesActive = !showActiveOnly || profile.is_active;

    return matchesSearch && matchesConsignor && matchesCity && matchesActive;
  });

  // Open modal for new profile
  const handleAddNew = () => {
    setEditingProfile(null);
    setFormData(getInitialFormData());
    setShowModal(true);
  };

  // Open modal for editing
  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setFormData({
      consignor_id: profile.consignor_id || '',
      destination_station_id: profile.destination_station_id || '',
      city_code: profile.city_code || '',
      city_name: profile.city_name || '',
      transport_name: profile.transport_name || '',
      transport_gst: profile.transport_gst || '',
      rate: profile.rate || 0,
      rate_unit: profile.rate_unit || 'PER_KG',
      minimum_weight_kg: profile.minimum_weight_kg || 0,
      freight_minimum_amount: profile.freight_minimum_amount || 0,
      labour_rate: profile.labour_rate || 0,
      labour_unit: profile.labour_unit || 'PER_KG',
      dd_charge_per_kg: profile.dd_charge_per_kg || 0,
      dd_charge_per_nag: profile.dd_charge_per_nag || 0,
      dd_print_charge_per_kg: profile.dd_print_charge_per_kg ?? '',
      dd_print_charge_per_nag: profile.dd_print_charge_per_nag ?? '',
      receiving_slip_charge: profile.receiving_slip_charge || 0,
      bilty_charge: profile.bilty_charge || 0,
      is_toll_tax_applicable: profile.is_toll_tax_applicable || false,
      toll_tax_amount: profile.toll_tax_amount || 0,
      is_no_charge: profile.is_no_charge || false,
      effective_from: profile.effective_from || new Date().toISOString().split('T')[0],
      effective_to: profile.effective_to || '',
      is_active: profile.is_active !== false
    });
    setShowModal(true);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Validation
      if (!formData.consignor_id) {
        throw new Error('Please select a consignor');
      }
      if (!formData.destination_station_id) {
        throw new Error('Please select a destination city');
      }

      // Check for duplicate consignor + city combination
      const isDuplicate = profiles.some(profile => 
        profile.consignor_id === formData.consignor_id && 
        profile.destination_station_id === formData.destination_station_id &&
        (!editingProfile || profile.id !== editingProfile.id) // Exclude current profile when editing
      );

      if (isDuplicate) {
        const consignorName = getConsignorName(formData.consignor_id);
        const cityName = getCityName(formData.destination_station_id);
        throw new Error(`A rate profile for "${consignorName}" to "${cityName}" already exists. Please edit the existing profile instead.`);
      }

      const profileData = {
        consignor_id: formData.consignor_id,
        destination_station_id: formData.destination_station_id,
        city_code: formData.city_code,
        city_name: formData.city_name,
        transport_name: formData.transport_name || null,
        transport_gst: formData.transport_gst || null,
        rate: parseFloat(formData.rate) || 0,
        rate_unit: formData.rate_unit,
        minimum_weight_kg: formData.rate_unit === 'PER_KG' ? (parseFloat(formData.minimum_weight_kg) || 0) : 0,
        freight_minimum_amount: parseFloat(formData.freight_minimum_amount) || 0,
        labour_rate: parseFloat(formData.labour_rate) || 0,
        labour_unit: formData.labour_unit || null,
        dd_charge_per_kg: parseFloat(formData.dd_charge_per_kg) || 0,
        dd_charge_per_nag: parseFloat(formData.dd_charge_per_nag) || 0,
        dd_print_charge_per_kg: formData.dd_print_charge_per_kg !== '' ? parseFloat(formData.dd_print_charge_per_kg) : null,
        dd_print_charge_per_nag: formData.dd_print_charge_per_nag !== '' ? parseFloat(formData.dd_print_charge_per_nag) : null,
        receiving_slip_charge: parseFloat(formData.receiving_slip_charge) || 0,
        bilty_charge: parseFloat(formData.bilty_charge) || 0,
        is_toll_tax_applicable: formData.is_toll_tax_applicable,
        toll_tax_amount: formData.is_toll_tax_applicable ? (parseFloat(formData.toll_tax_amount) || 0) : 0,
        is_no_charge: formData.is_no_charge,
        effective_from: formData.effective_from,
        effective_to: formData.effective_to || null,
        is_active: formData.is_active,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString()
      };

      if (editingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('consignor_bilty_profile')
          .update(profileData)
          .eq('id', editingProfile.id);

        if (error) throw error;
        setSuccess('Profile updated successfully!');
      } else {
        // Create new profile
        profileData.created_by = user?.id || null;
        profileData.created_at = new Date().toISOString();

        const { error } = await supabase
          .from('consignor_bilty_profile')
          .insert([profileData]);

        if (error) throw error;
        setSuccess('Profile created successfully!');
      }

      setShowModal(false);
      loadInitialData();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (profileId) => {
    try {
      const { error } = await supabase
        .from('consignor_bilty_profile')
        .delete()
        .eq('id', profileId);

      if (error) throw error;

      setSuccess('Profile deleted successfully!');
      setShowDeleteConfirm(null);
      loadInitialData();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting profile:', err);
      setError('Failed to delete profile');
    }
  };

  // Handle duplicate profile
  const handleDuplicate = (profile) => {
    setEditingProfile(null);
    setFormData({
      consignor_id: profile.consignor_id || '',
      destination_station_id: '',
      city_code: '',
      city_name: '',
      transport_name: '',
      transport_gst: '',
      rate: profile.rate || 0,
      rate_unit: profile.rate_unit || 'PER_KG',
      minimum_weight_kg: profile.minimum_weight_kg || 0,
      freight_minimum_amount: profile.freight_minimum_amount || 0,
      labour_rate: profile.labour_rate || 0,
      labour_unit: profile.labour_unit || 'PER_KG',
      dd_charge_per_kg: profile.dd_charge_per_kg || 0,
      dd_charge_per_nag: profile.dd_charge_per_nag || 0,
      dd_print_charge_per_kg: profile.dd_print_charge_per_kg ?? '',
      dd_print_charge_per_nag: profile.dd_print_charge_per_nag ?? '',
      receiving_slip_charge: profile.receiving_slip_charge || 0,
      bilty_charge: profile.bilty_charge || 0,
      is_toll_tax_applicable: profile.is_toll_tax_applicable || false,
      toll_tax_amount: profile.toll_tax_amount || 0,
      is_no_charge: profile.is_no_charge || false,
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: '',
      is_active: true
    });
    setShowModal(true);
  };

  // Handle create or edit profile from history tab
  const handleCreateFromHistory = (historyData) => {
    // Check if profile already exists for this consignor + city combination
    const existingProfile = profiles.find(
      p => p.consignor_id === historyData.consignor_id && 
           p.destination_station_id === historyData.destination_station_id
    );

    if (existingProfile) {
      // Profile exists - open it for editing
      handleEdit(existingProfile);
    } else {
      // No profile exists - create new one with pre-filled data
      setEditingProfile(null);
      
      // Find city details
      const city = cities.find(c => c.id === historyData.destination_station_id);
      
      setFormData({
        ...getInitialFormData(),
        consignor_id: historyData.consignor_id || '',
        destination_station_id: historyData.destination_station_id || '',
        city_code: city?.city_code || historyData.city_code || '',
        city_name: city?.city_name || historyData.city_name || '',
        transport_name: historyData.transport_name || '',
        rate: parseFloat(historyData.rate) || 0,
        labour_rate: parseFloat(historyData.labour_rate) || 0
      });
      setShowModal(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Consignor Rate Profiles</h2>
          <p className="text-gray-600 mt-1">Manage freight rates for consignors by destination</p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'profiles' && selectedConsignor && (
            <button
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <Printer className="w-5 h-5 mr-2" />
              Print Rate List
            </button>
          )}
          {activeTab === 'profiles' && (
            <button
              onClick={handleAddNew}
              className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add New Profile
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('profiles')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'profiles'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            Rate Profiles
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
              {profiles.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <History className="w-5 h-5" />
            Company History
          </button>
        </div>
      </div>

      {/* Alerts */}
      <AlertMessages error={error} setError={setError} success={success} />

      {/* Tab Content */}
      {activeTab === 'profiles' ? (
        <>
          {/* Filters */}
          <ProfileFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedConsignor={selectedConsignor}
            setSelectedConsignor={setSelectedConsignor}
            selectedCity={selectedCity}
            setSelectedCity={setSelectedCity}
            showActiveOnly={showActiveOnly}
            setShowActiveOnly={setShowActiveOnly}
            consignors={consignors}
            cities={cities}
            onRefresh={loadInitialData}
          />

          {/* Profile Table */}
          <ProfileTable
            profiles={filteredProfiles}
            getConsignorName={getConsignorName}
            getCityName={getCityName}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={(id) => setShowDeleteConfirm(id)}
          />
        </>
      ) : (
        <CompanyHistoryTab
          consignors={consignors}
          cities={cities}
          onCreateProfile={handleCreateFromHistory}
          existingProfiles={profiles}
          getConsignorName={getConsignorName}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        onDelete={handleDelete}
      />

      {/* Add/Edit Modal */}
      <ProfileFormModal
        showModal={showModal}
        setShowModal={setShowModal}
        editingProfile={editingProfile}
        formData={formData}
        setFormData={setFormData}
        consignors={consignors}
        cities={cities}
        transports={transports}
        saving={saving}
        onSubmit={handleSubmit}
        getConsignorName={getConsignorName}
        getCityName={getCityName}
      />

      {/* Print Rate List Modal */}
      {showPrintModal && selectedConsignor && (
        <RateListPDFGenerator
          profiles={filteredProfiles}
          consignor={consignors.find(c => c.id === selectedConsignor)}
          getCityName={getCityName}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};

export default ConsignorBiltyProfile;
