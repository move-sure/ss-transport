'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import { useRouter } from 'next/navigation';
import GodownHeader from '../../components/godown/godown-header';
import GodownBiltyList from '../../components/godown/godown-bilty-list';
import GodownSearchFilter from '../../components/godown/godown-search-filter';

export default function GodownPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [bilties, setBilties] = useState([]);
  const [stationBilties, setStationBilties] = useState([]);
  const [cities, setCities] = useState([]);
  const [branchData, setBranchData] = useState(null);
  const [error, setError] = useState(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  // Load initial data
  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  // Load all required data
  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchBilties(),
        fetchStationBilties(),
        fetchCities(),
        fetchBranchData()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load godown data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch regular bilties with required columns
  const fetchBilties = async () => {
    try {
      const { data, error } = await supabase
        .from('bilty')
        .select('id, gr_no, pvt_marks, to_city_id, no_of_bags, bilty_date, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBilties(data || []);
    } catch (err) {
      console.error('Error fetching bilties:', err);
      throw err;
    }
  };

  // Fetch station bilties with required columns
  const fetchStationBilties = async () => {
    try {
      const { data, error } = await supabase
        .from('station_summary')
        .select('id, gr_no, pvt_marks, station, no_of_bags, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStationBilties(data || []);
    } catch (err) {
      console.error('Error fetching station bilties:', err);
      throw err;
    }
  };

  // Fetch cities for destination names
  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id, city_name, city_code')
        .eq('user_id', user.id)
        .order('city_name');

      if (error) throw error;
      setCities(data || []);
    } catch (err) {
      console.error('Error fetching cities:', err);
      throw err;
    }
  };

  // Fetch branch data
  const fetchBranchData = async () => {
    try {
      const { data, error } = await supabase
        .from('branch_master')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setBranchData(data);
    } catch (err) {
      console.error('Error fetching branch data:', err);
      throw err;
    }
  };

  // Helper function to get city name by ID
  const getCityName = (cityId) => {
    const city = cities.find(c => c.id === cityId);
    return city ? city.city_name : 'Unknown';
  };

  // Combined and filtered bilties
  const filteredBilties = useMemo(() => {
    // Combine bilties from both tables
    const combinedBilties = [
      ...bilties.map(bilty => ({
        ...bilty,
        source: 'regular',
        destination: getCityName(bilty.to_city_id),
        station_destination: getCityName(bilty.to_city_id)
      })),
      ...stationBilties.map(bilty => ({
        ...bilty,
        source: 'station',
        destination: bilty.station || 'Unknown',
        station_destination: bilty.station || 'Unknown'
      }))
    ];

    // Apply search filter
    let filtered = combinedBilties;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(bilty => 
        bilty.gr_no?.toLowerCase().includes(query) ||
        bilty.pvt_marks?.toLowerCase().includes(query) ||
        bilty.station_destination?.toLowerCase().includes(query)
      );
    }

    // Apply station filter
    if (selectedStation) {
      filtered = filtered.filter(bilty => 
        bilty.station_destination?.toLowerCase().includes(selectedStation.toLowerCase())
      );
    }

    // Sort by created_at (newest first)
    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [bilties, stationBilties, cities, searchQuery, selectedStation]);

  // Get unique stations for filter
  const uniqueStations = useMemo(() => {
    const stations = new Set();
    bilties.forEach(bilty => {
      const cityName = getCityName(bilty.to_city_id);
      if (cityName !== 'Unknown') stations.add(cityName);
    });
    stationBilties.forEach(bilty => {
      if (bilty.station) stations.add(bilty.station);
    });
    return Array.from(stations).sort();
  }, [bilties, stationBilties, cities]);

  // Stats
  const stats = useMemo(() => {
    const totalBilties = bilties.length + stationBilties.length;
    const filteredCount = filteredBilties.length;
    const totalBags = filteredBilties.reduce((sum, bilty) => sum + (parseInt(bilty.no_of_bags) || 0), 0);
    
    return {
      totalBilties,
      filteredCount,
      totalBags,
      regularCount: bilties.length,
      stationCount: stationBilties.length
    };
  }, [bilties, stationBilties, filteredBilties]);

  // Handle refresh
  const handleRefresh = () => {
    loadInitialData();
  };

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        
        {/* Header */}
        <GodownHeader 
          stats={stats}
          onRefresh={handleRefresh}
          loading={loading}
        />

        {/* Search and Filter */}
        <GodownSearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStation={selectedStation}
          onStationChange={setSelectedStation}
          stations={uniqueStations}
        />

        {/* Bilty List */}
        <GodownBiltyList
          bilties={filteredBilties}
          loading={loading}
          error={error}
          onRefresh={handleRefresh}
        />

      </div>
    </div>
  );
}
