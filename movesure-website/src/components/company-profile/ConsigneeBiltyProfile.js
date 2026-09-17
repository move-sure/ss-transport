'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Loader2, Printer, ClipboardList, ChevronDown, Zap } from 'lucide-react';
import supabase from '../../app/utils/supabase';

// Import sub-components
import ConsigneeProfileFilters from './ConsigneeProfileFilters';
import ConsigneeProfileTable from './ConsigneeProfileTable';
import ConsigneeProfileFormModal from './ConsigneeProfileFormModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import AlertMessages from './AlertMessages';
import RateListPDFGenerator from './RateListPDFGenerator';
import BulkRateModal from './BulkRateModal';

const API_URL = 'https://api.movesure.io';

// Initial form state
const getInitialFormData = () => ({
  consignee_id: '',
  destination_station_id: '',
  city_code: '',
  city_name: '',
  transport_name: '',
  transport_gst: '',
  rate: 0,
  rate_unit: 'PER_KG',
  minimum_weight_kg: 50,
  freight_minimum_amount: 0,
  labour_rate: 0,
  labour_unit: 'PER_NAG',
  dd_charge_per_kg: 0,
  dd_charge_per_nag: 0,
  dd_print_charge_per_kg: '',
  dd_print_charge_per_nag: '',
  receiving_slip_charge: 0,
  bilty_charge: 0,
  local_charge_per_nag: 0,
  default_payment_mode: 'to-pay',
  is_toll_tax_applicable: false,
  toll_tax_amount: 0,
  is_no_charge: false,
  effective_from: new Date().toISOString().split('T')[0],
  effective_to: '',
  is_active: true
});

// Pull the full consignee master list (paged) via the api.movesure.io backend,
// same endpoint the consignee master page uses, so the dropdown always matches the master data.
const fetchAllConsignees = async () => {
  const rows = [];
  let page = 1;
  const page_size = 200;
  while (true) {
    const params = new URLSearchParams({ page, page_size });
    const res = await fetch(`${API_URL}/api/bilty/master/consignees?${params}`);
    const result = await res.json();
    if (result.status !== 'success') throw new Error(result.message);
    rows.push(...(result.data.rows || []));
    if (!result.data.has_more) break;
    page += 1;
  }
  return rows.sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''));
};

const ConsigneeBiltyProfile = ({ user }) => {
  // Pagination constants
  const PAGE_SIZE = 50;

  // Data states
  const [profiles, setProfiles] = useState([]);
  const [consignees, setConsignees] = useState([]);
  const [cities, setCities] = useState([]);
  const [transports, setTransports] = useState([]);
  const [users, setUsers] = useState([]);
  const [totalProfileCount, setTotalProfileCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // UI states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConsignee, setSelectedConsignee] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState(getInitialFormData());

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load profiles when filters change
  useEffect(() => {
    if (!loading) {
      loadFilteredProfiles();
    }
  }, [selectedConsignee, selectedCity, showActiveOnly]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get total count first
      const { count: profileCount } = await supabase
        .from('consignee_bilty_profile')
        .select('*', { count: 'exact', head: true });

      const [profilesRes, consigneesRows, citiesRes, transportsRes, usersRes] = await Promise.all([
        supabase
          .from('consignee_bilty_profile')
          .select('*')
          .order('created_at', { ascending: false })
          .range(0, PAGE_SIZE - 1), // Load only first 50
        fetchAllConsignees(),
        supabase
          .from('cities')
          .select('id, city_code, city_name')
          .order('city_name'),
        supabase
          .from('transports')
          .select('id, transport_name, city_id, city_name, gst_number, mob_number')
          .order('transport_name'),
        supabase
          .from('users')
          .select('id, name, username, post, is_staff')
          .eq('is_active', true)
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (citiesRes.error) throw citiesRes.error;
      if (transportsRes.error) throw transportsRes.error;
      if (usersRes.error) throw usersRes.error;

      setProfiles(profilesRes.data || []);
      setTotalProfileCount(profileCount || 0);
      setConsignees(consigneesRows || []);
      setCities(citiesRes.data || []);
      setTransports(transportsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const loadFilteredProfiles = async () => {
    // If no filters are applied, load only first 50
    if (!selectedConsignee && !selectedCity && showActiveOnly) {
      // Already loaded in initial data, no need to reload
      if (profiles.length > 0) return;

      try {
        const { data, error, count } = await supabase
          .from('consignee_bilty_profile')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(0, PAGE_SIZE - 1);

        if (error) throw error;

        setProfiles(data || []);
        setTotalProfileCount(count || 0);
      } catch (err) {
        console.error('Error loading profiles:', err);
        setError('Failed to load profiles.');
      }
      return;
    }

    // If filters are applied, fetch ALL matching records
    setLoadingMore(true);
    try {
      let query = supabase
        .from('consignee_bilty_profile')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (selectedConsignee) {
        query = query.eq('consignee_id', selectedConsignee);
      }
      if (selectedCity) {
        query = query.eq('destination_station_id', selectedCity);
      }
      if (showActiveOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setProfiles(data || []);
      setTotalProfileCount(count || 0);
    } catch (err) {
      console.error('Error loading filtered profiles:', err);
      setError('Failed to load filtered profiles.');
    } finally {
      setLoadingMore(false);
    }
  };

  // Load more profiles
  const loadMoreProfiles = async () => {
    setLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('consignee_bilty_profile')
        .select('*')
        .order('created_at', { ascending: false })
        .range(profiles.length, profiles.length + PAGE_SIZE - 1);

      if (error) throw error;

      setProfiles(prev => [...prev, ...(data || [])]);
    } catch (err) {
      console.error('Error loading more profiles:', err);
      setError('Failed to load more profiles.');
    } finally {
      setLoadingMore(false);
    }
  };

  // Check if there are more profiles to load
  const hasMoreProfiles = !selectedConsignee && !selectedCity && profiles.length < totalProfileCount;

  // Get consignee name by ID
  const getConsigneeName = (consigneeId) => {
    const consignee = consignees.find(c => c.id === consigneeId);
    return consignee ? consignee.company_name : 'Unknown';
  };

  // Get city name by ID
  const getCityName = (cityId) => {
    const city = cities.find(c => c.id === cityId);
    return city ? city.city_name : 'Unknown';
  };

  // Get user details by ID
  const getUserDetails = (userId) => {
    if (!userId) return null;
    const user = users.find(u => u.id === userId);
    return user || null;
  };

  // Filter profiles
  const filteredProfiles = profiles.filter(profile => {
    const consigneeName = getConsigneeName(profile.consignee_id).toLowerCase();
    const cityName = getCityName(profile.destination_station_id).toLowerCase();
    const transportName = (profile.transport_name || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = !searchQuery ||
      consigneeName.includes(query) ||
      cityName.includes(query) ||
      transportName.includes(query);

    const matchesConsignee = !selectedConsignee || profile.consignee_id === selectedConsignee;
    const matchesCity = !selectedCity || profile.destination_station_id === selectedCity;
    const matchesActive = !showActiveOnly || profile.is_active;

    return matchesSearch && matchesConsignee && matchesCity && matchesActive;
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
      consignee_id: profile.consignee_id || '',
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
      local_charge_per_nag: profile.local_charge_per_nag || 0,
      default_payment_mode: profile.default_payment_mode || 'to-pay',
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
      if (!formData.consignee_id) {
        throw new Error('Please select a consignee');
      }
      if (!formData.destination_station_id) {
        throw new Error('Please select a destination city');
      }

      // Check for duplicate consignee + city combination
      const isDuplicate = profiles.some(profile =>
        profile.consignee_id === formData.consignee_id &&
        profile.destination_station_id === formData.destination_station_id &&
        (!editingProfile || profile.id !== editingProfile.id) // Exclude current profile when editing
      );

      if (isDuplicate) {
        const consigneeName = getConsigneeName(formData.consignee_id);
        const cityName = getCityName(formData.destination_station_id);
        throw new Error(`A rate profile for "${consigneeName}" to "${cityName}" already exists. Please edit the existing profile instead.`);
      }

      const profileData = {
        consignee_id: formData.consignee_id,
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
        local_charge_per_nag: parseFloat(formData.local_charge_per_nag) || 0,
        default_payment_mode: formData.default_payment_mode || 'to-pay',
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
        const { data, error } = await supabase
          .from('consignee_bilty_profile')
          .update(profileData)
          .eq('id', editingProfile.id)
          .select()
          .single();

        if (error) throw error;

        // Update local state without refetching
        setProfiles(prevProfiles =>
          prevProfiles.map(p => p.id === editingProfile.id ? data : p)
        );

        setSuccess('Profile updated successfully!');
      } else {
        // Create new profile
        profileData.created_by = user?.id || null;
        profileData.created_at = new Date().toISOString();

        const { data, error } = await supabase
          .from('consignee_bilty_profile')
          .insert([profileData])
          .select()
          .single();

        if (error) throw error;

        // Add to local state without refetching
        setProfiles(prevProfiles => [data, ...prevProfiles]);

        setSuccess('Profile created successfully!');
      }

      setShowModal(false);

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
        .from('consignee_bilty_profile')
        .delete()
        .eq('id', profileId);

      if (error) throw error;

      // Remove from local state without refetching
      setProfiles(prevProfiles => prevProfiles.filter(p => p.id !== profileId));

      setSuccess('Profile deleted successfully!');
      setShowDeleteConfirm(null);

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
      consignee_id: profile.consignee_id || '',
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
      local_charge_per_nag: profile.local_charge_per_nag || 0,
      default_payment_mode: profile.default_payment_mode || 'to-pay',
      is_toll_tax_applicable: profile.is_toll_tax_applicable || false,
      toll_tax_amount: profile.toll_tax_amount || 0,
      is_no_charge: profile.is_no_charge || false,
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: '',
      is_active: true
    });
    setShowModal(true);
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
          <h2 className="text-2xl font-bold text-gray-900">Consignee Rate Profiles</h2>
          <p className="text-gray-600 mt-1">Manage freight rates for consignees by destination</p>
        </div>
        <div className="flex gap-3">
          {selectedConsignee && (
            <button
              onClick={() => setShowBulkModal(true)}
              className="inline-flex items-center px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors shadow-sm"
            >
              <Zap className="w-5 h-5 mr-2" />
              Bulk Set Rate
            </button>
          )}
          {selectedConsignee && (
            <button
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <Printer className="w-5 h-5 mr-2" />
              Print Rate List
            </button>
          )}
          <button
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Profile
          </button>
        </div>
      </div>

      {/* Tab Navigation (single tab, kept for visual parity with consignor screen) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <div className="flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 border-blue-600 text-blue-600 bg-blue-50/50">
            <ClipboardList className="w-5 h-5" />
            Rate Profiles
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
              {profiles.length}
            </span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <AlertMessages error={error} setError={setError} success={success} />

      {/* Filters */}
      <ConsigneeProfileFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedConsignee={selectedConsignee}
        setSelectedConsignee={setSelectedConsignee}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        showActiveOnly={showActiveOnly}
        setShowActiveOnly={setShowActiveOnly}
        consignees={consignees}
        cities={cities}
        onRefresh={loadInitialData}
      />

      {/* Profile Table */}
      <ConsigneeProfileTable
        profiles={filteredProfiles}
        getConsigneeName={getConsigneeName}
        getCityName={getCityName}
        getUserDetails={getUserDetails}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onDelete={(id) => setShowDeleteConfirm(id)}
        totalCount={totalProfileCount}
      />

      {/* Load More Button */}
      {hasMoreProfiles && !searchQuery && (
        <div className="flex flex-col items-center gap-2 mt-4">
          <p className="text-sm text-gray-500">
            Showing {profiles.length} of {totalProfileCount} profiles
          </p>
          <button
            onClick={loadMoreProfiles}
            disabled={loadingMore}
            className="inline-flex items-center px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Load More ({Math.min(PAGE_SIZE, totalProfileCount - profiles.length)} more)
              </>
            )}
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        onDelete={handleDelete}
      />

      {/* Add/Edit Modal */}
      <ConsigneeProfileFormModal
        showModal={showModal}
        setShowModal={setShowModal}
        editingProfile={editingProfile}
        formData={formData}
        setFormData={setFormData}
        cities={cities}
        transports={transports}
        saving={saving}
        onSubmit={handleSubmit}
        getConsigneeName={getConsigneeName}
        getCityName={getCityName}
      />

      {/* Print Rate List Modal */}
      {showPrintModal && selectedConsignee && (
        <RateListPDFGenerator
          profiles={filteredProfiles}
          consignor={consignees.find(c => c.id === selectedConsignee)}
          getCityName={getCityName}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Bulk Set Rate Modal */}
      {showBulkModal && selectedConsignee && (
        <BulkRateModal
          partyType="consignee"
          partyId={selectedConsignee}
          partyName={getConsigneeName(selectedConsignee)}
          userId={user?.id}
          onClose={() => setShowBulkModal(false)}
          onApplied={() => {
            loadInitialData();
            setSuccess('Rate applied in bulk successfully!');
            setTimeout(() => setSuccess(null), 3000);
          }}
        />
      )}
    </div>
  );
};

export default ConsigneeBiltyProfile;
