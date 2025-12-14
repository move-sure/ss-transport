'use client';

import { useState, useEffect, useCallback } from 'react';
import supabase from '@/app/utils/supabase';

export default function useCompanyProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stakeholderFilter, setStakeholderFilter] = useState('ALL');

  // Fetch all profiles
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bill_company_profile')
        .select('*')
        .order('company_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter profiles based on search and stakeholder type
  useEffect(() => {
    let filtered = [...profiles];

    // Apply stakeholder filter
    if (stakeholderFilter !== 'ALL') {
      filtered = filtered.filter(p => p.stakeholder_type === stakeholderFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.company_name?.toLowerCase().includes(term) ||
        p.gst_num?.toLowerCase().includes(term) ||
        p.mobile_number?.includes(term) ||
        p.email?.toLowerCase().includes(term) ||
        p.city?.toLowerCase().includes(term)
      );
    }

    setFilteredProfiles(filtered);
  }, [profiles, searchTerm, stakeholderFilter]);

  // Create profile
  const createProfile = useCallback(async (profileData) => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('bill_company_profile')
        .insert([profileData])
        .select()
        .single();

      if (error) throw error;
      
      setProfiles(prev => [...prev, data].sort((a, b) => 
        a.company_name.localeCompare(b.company_name)
      ));
      
      return { success: true, data };
    } catch (err) {
      console.error('Error creating profile:', err);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, []);

  // Update profile
  const updateProfile = useCallback(async (id, profileData) => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('bill_company_profile')
        .update({
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setProfiles(prev => prev.map(p => p.id === id ? data : p));
      
      return { success: true, data };
    } catch (err) {
      console.error('Error updating profile:', err);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, []);

  // Delete profile
  const deleteProfile = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from('bill_company_profile')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setProfiles(prev => prev.filter(p => p.id !== id));
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting profile:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return {
    profiles: filteredProfiles,
    allProfiles: profiles,
    loading,
    saving,
    searchTerm,
    setSearchTerm,
    stakeholderFilter,
    setStakeholderFilter,
    createProfile,
    updateProfile,
    deleteProfile,
    refreshProfiles: fetchProfiles
  };
}
