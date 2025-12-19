'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Building2, MapPin, FileText, Edit2, Eye, TrendingUp, Package, Calendar, Filter } from 'lucide-react';
import supabase from '../../app/utils/supabase';

const ConsignorListTab = ({ onViewProfiles, onEditConsignor }) => {
  const [consignors, setConsignors] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, profiles, recent
  const [filterType, setFilterType] = useState('all'); // all, with-profiles, without-profiles

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('Starting data load...');
      
      // Load all consignors (only columns that exist in the table)
      const { data: consignorsData, error: consignorsError } = await supabase
        .from('consignors')
        .select('id, company_name, company_add, number, gst_num, adhar, pan')
        .order('company_name');

      console.log('Consignors query result:', { data: consignorsData, error: consignorsError });

      if (consignorsError) {
        console.error('Consignors error:', consignorsError);
        throw consignorsError;
      }

      // Load all active profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('consignor_bilty_profile')
        .select('consignor_id, destination_station_id, city_name, created_at, updated_at, is_active')
        .eq('is_active', true);

      console.log('Profiles query result:', { data: profilesData, error: profilesError });

      if (profilesError) {
        console.error('Profiles error:', profilesError);
        throw profilesError;
      }

      console.log('Successfully loaded:', {
        consignors: consignorsData?.length || 0,
        profiles: profilesData?.length || 0
      });

      setConsignors(consignorsData || []);
      setProfiles(profilesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate profile count and stats for each consignor
  const consignorsWithStats = useMemo(() => {
    return consignors.map(consignor => {
      const consignorProfiles = profiles.filter(p => p.consignor_id === consignor.id);
      const uniqueStations = new Set(consignorProfiles.map(p => p.destination_station_id));
      
      return {
        ...consignor,
        profileCount: consignorProfiles.length,
        stationCount: uniqueStations.size,
        lastUpdated: consignorProfiles.length > 0 
          ? new Date(Math.max(...consignorProfiles.map(p => new Date(p.updated_at || p.created_at))))
          : null
      };
    });
  }, [consignors, profiles]);

  // Filter and sort consignors
  const filteredConsignors = useMemo(() => {
    let filtered = consignorsWithStats;

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.company_name.toLowerCase().includes(search) ||
        (c.gst_num && c.gst_num.toLowerCase().includes(search)) ||
        (c.number && c.number.includes(search)) ||
        (c.company_add && c.company_add.toLowerCase().includes(search))
      );
    }

    // Apply type filter
    if (filterType === 'with-profiles') {
      filtered = filtered.filter(c => c.profileCount > 0);
    } else if (filterType === 'without-profiles') {
      filtered = filtered.filter(c => c.profileCount === 0);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.company_name.localeCompare(b.company_name);
        case 'profiles':
          return b.profileCount - a.profileCount;
        case 'recent':
          if (!a.lastUpdated) return 1;
          if (!b.lastUpdated) return -1;
          return b.lastUpdated - a.lastUpdated;
        default:
          return 0;
      }
    });

    return filtered;
  }, [consignorsWithStats, searchTerm, sortBy, filterType]);

  // Statistics
  const stats = useMemo(() => {
    const withProfiles = consignorsWithStats.filter(c => c.profileCount > 0).length;
    const withoutProfiles = consignorsWithStats.filter(c => c.profileCount === 0).length;
    const totalProfiles = profiles.length;
    const avgProfilesPerConsignor = consignorsWithStats.length > 0 
      ? (totalProfiles / consignorsWithStats.length).toFixed(1)
      : 0;

    return {
      total: consignorsWithStats.length,
      withProfiles,
      withoutProfiles,
      totalProfiles,
      avgProfilesPerConsignor
    };
  }, [consignorsWithStats, profiles]);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Building2 className="w-4 h-4" />
            Total Consignors
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-green-200 p-4">
          <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
            <FileText className="w-4 h-4" />
            With Profiles
          </div>
          <div className="text-2xl font-bold text-green-700">{stats.withProfiles}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-4">
          <div className="flex items-center gap-2 text-orange-600 text-sm mb-1">
            <Package className="w-4 h-4" />
            Without Profiles
          </div>
          <div className="text-2xl font-bold text-orange-700">{stats.withoutProfiles}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-4">
          <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            Total Profiles
          </div>
          <div className="text-2xl font-bold text-blue-700">{stats.totalProfiles}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-purple-200 p-4">
          <div className="flex items-center gap-2 text-purple-600 text-sm mb-1">
            <MapPin className="w-4 h-4" />
            Avg Profiles
          </div>
          <div className="text-2xl font-bold text-purple-700">{stats.avgProfilesPerConsignor}</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, GST, phone, address..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter Type */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Consignors</option>
              <option value="with-profiles">With Profiles</option>
              <option value="without-profiles">Without Profiles</option>
            </select>
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="profiles">Sort by Profiles</option>
            <option value="recent">Sort by Recent</option>
          </select>
        </div>
      </div>

      {/* Consignors Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Company Details
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Profiles
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Stations
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Loading consignors...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredConsignors.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No consignors found</p>
                  </td>
                </tr>
              ) : (
                filteredConsignors.map((consignor, index) => (
                  <tr 
                    key={consignor.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{consignor.company_name}</div>
                        {consignor.gst_num && (
                          <div className="text-sm text-gray-500">GST: {consignor.gst_num}</div>
                        )}
                        {consignor.company_add && (
                          <div className="text-sm text-gray-500 truncate max-w-md">
                            {consignor.company_add}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {consignor.number && (
                        <div className="text-sm text-gray-900">{consignor.number}</div>
                      )}
                      {consignor.email && (
                        <div className="text-sm text-gray-500">{consignor.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {consignor.profileCount > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {consignor.profileCount} {consignor.profileCount === 1 ? 'Profile' : 'Profiles'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          No Profiles
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {consignor.stationCount > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-900">{consignor.stationCount}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {consignor.lastUpdated ? (
                        <div className="text-sm text-gray-600">
                          {consignor.lastUpdated.toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onViewProfiles(consignor)}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </button>
                        {consignor.profileCount > 0 && (
                          <button
                            onClick={() => onEditConsignor(consignor)}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results Summary */}
      {!loading && filteredConsignors.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {filteredConsignors.length} of {consignorsWithStats.length} consignors
        </div>
      )}
    </div>
  );
};

export default ConsignorListTab;
