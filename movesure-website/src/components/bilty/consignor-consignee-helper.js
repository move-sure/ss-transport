'use client';

import { useState, useCallback, useMemo } from 'react';
import supabase from '../../app/utils/supabase';

// Debounce hook for search optimization
const useDebounce = (callback, delay) => {
  const [debounceTimer, setDebounceTimer] = useState(null);

  const debouncedCallback = useCallback((...args) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    const newTimer = setTimeout(() => {
      callback(...args);
    }, delay);
    
    setDebounceTimer(newTimer);
  }, [callback, delay, debounceTimer]);

  return debouncedCallback;
};

// Efficient search functionality
export const useConsignorConsigneeSearch = () => {
  const [searchResults, setSearchResults] = useState({
    consignors: [],
    consignees: []
  });
  const [isSearching, setIsSearching] = useState(false);

  // Optimized search with prefix matching (only matches from start of company name)
  const searchDatabase = useCallback(async (searchTerm, type = 'both') => {
    if (!searchTerm || searchTerm.length < 1) {
      setSearchResults({ consignors: [], consignees: [] });
      return;
    }

    setIsSearching(true);
    try {
      const searches = [];
      
      if (type === 'both' || type === 'consignors') {
        searches.push(
          supabase
            .from('consignors')
            .select('id, company_name, gst_num, number')
            .ilike('company_name', `${searchTerm}%`)  // Prefix matching - only matches from start
            .order('company_name')
            .limit(20)
        );
      }

      if (type === 'both' || type === 'consignees') {
        searches.push(
          supabase
            .from('consignees')
            .select('id, company_name, gst_num, number')
            .ilike('company_name', `${searchTerm}%`)  // Prefix matching - only matches from start
            .order('company_name')
            .limit(20)
        );
      }

      const results = await Promise.all(searches);
      
      if (type === 'both') {
        setSearchResults({
          consignors: results[0]?.data || [],
          consignees: results[1]?.data || []
        });
      } else if (type === 'consignors') {
        setSearchResults(prev => ({
          ...prev,
          consignors: results[0]?.data || []
        }));
      } else if (type === 'consignees') {
        setSearchResults(prev => ({
          ...prev,
          consignees: results[0]?.data || []
        }));
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ consignors: [], consignees: [] });
    } finally {
      setIsSearching(false);
    }
  }, []);

  const debouncedSearch = useDebounce(searchDatabase, 100); // Reduced from 300ms to 100ms for faster response

  return {
    searchResults,
    isSearching,
    searchDatabase: debouncedSearch,
    clearResults: () => setSearchResults({ consignors: [], consignees: [] })
  };
};

// Efficient add/update functions
export const addNewConsignor = async (data) => {
  try {
    const { data: result, error } = await supabase
      .from('consignors')
      .insert([{
        company_name: data.company_name.trim(),
        company_add: data.company_add || 'address-not-yet-assigned',
        gst_num: data.gst_num?.trim() || null,
        number: data.number?.trim() || null
      }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error adding consignor:', error);
    return { success: false, error: error.message };
  }
};

export const addNewConsignee = async (data) => {
  try {
    const { data: result, error } = await supabase
      .from('consignees')
      .insert([{
        company_name: data.company_name.trim(),
        company_add: data.company_add || 'address-not-yet-assigned',
        gst_num: data.gst_num?.trim() || null,
        number: data.number?.trim() || null
      }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: result };
  } catch (error) {
    console.error('Error adding consignee:', error);
    return { success: false, error: error.message };
  }
};

// Update phone number for existing consignor/consignee
export const updateConsignorNumber = async (companyName, phoneNumber) => {
  try {
    const { data, error } = await supabase
      .from('consignors')
      .update({ number: phoneNumber.trim() })
      .eq('company_name', companyName)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating consignor number:', error);
    return { success: false, error: error.message };
  }
};

export const updateConsigneeNumber = async (companyName, phoneNumber) => {
  try {
    const { data, error } = await supabase
      .from('consignees')
      .update({ number: phoneNumber.trim() })
      .eq('company_name', companyName)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating consignee number:', error);
    return { success: false, error: error.message };
  }
};

// Update GST number for existing consignor/consignee
export const updateConsignorGST = async (companyName, gstNumber) => {
  try {
    const { data, error } = await supabase
      .from('consignors')
      .update({ gst_num: gstNumber?.trim() || null })
      .eq('company_name', companyName)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating consignor GST:', error);
    return { success: false, error: error.message };
  }
};

export const updateConsigneeGST = async (companyName, gstNumber) => {
  try {
    const { data, error } = await supabase
      .from('consignees')
      .update({ gst_num: gstNumber?.trim() || null })
      .eq('company_name', companyName)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating consignee GST:', error);
    return { success: false, error: error.message };
  }
};

// Check for duplicates efficiently
export const checkDuplicateConsignor = async (companyName) => {
  try {
    const { data, error } = await supabase
      .from('consignors')
      .select('id, company_name')
      .ilike('company_name', companyName.trim())
      .limit(1);

    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking duplicate consignor:', error);
    return false;
  }
};

export const checkDuplicateConsignee = async (companyName) => {
  try {
    const { data, error } = await supabase
      .from('consignees')
      .select('id, company_name')
      .ilike('company_name', companyName.trim())
      .limit(1);

    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking duplicate consignee:', error);
    return false;
  }
};

// Get suggestions for similar names
export const getSimilarConsignors = async (searchTerm, limit = 5) => {
  try {
    const { data, error } = await supabase
      .from('consignors')
      .select('id, company_name, gst_num, number')
      .ilike('company_name', `%${searchTerm}%`)
      .order('company_name')
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting similar consignors:', error);
    return [];
  }
};

export const getSimilarConsignees = async (searchTerm, limit = 5) => {
  try {
    const { data, error } = await supabase
      .from('consignees')
      .select('id, company_name, gst_num, number')
      .ilike('company_name', `%${searchTerm}%`)
      .order('company_name')
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting similar consignees:', error);
    return [];
  }
};

// Get the last city (to_city) for a consignee from their most recent bilty
export const getConsigneeLastCity = async (consigneeName) => {
  try {
    // Find the most recent bilty for this consignee
    const { data: biltyData, error: biltyError } = await supabase
      .from('bilty')
      .select('to_city_id')
      .ilike('consignee_name', consigneeName.trim())
      .eq('is_active', true)
      .order('bilty_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (biltyError || !biltyData?.to_city_id) {
      return null;
    }

    // Get the city name
    const { data: cityData, error: cityError } = await supabase
      .from('cities')
      .select('id, city_name, city_code')
      .eq('id', biltyData.to_city_id)
      .single();

    if (cityError) throw cityError;
    return cityData;
  } catch (error) {
    console.error('Error getting consignee last city:', error);
    return null;
  }
};