'use client';

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import { Truck, Users, Plus, Edit, Trash2, Search, Filter, Wrench, MapPin, Calendar, Phone, User, Zap, Shield, Fuel } from 'lucide-react';
import dynamic from 'next/dynamic';
import Navbar from '../../components/dashboard/navbar';

// Lazy load heavy components
const TruckForm = dynamic(() => import('../../components/truck-manager/add-truck'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>
});
const StaffForm = dynamic(() => import('../../components/truck-manager/add-staff'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>
});

// Debounce hook for search optimization
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Memoized truck card component
const TruckCard = memo(({ truck, onEdit, onDelete, onToggleStatus, getTruckIcon, getFuelIcon }) => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
    {/* Truck Header */}
    <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{truck.truck_number}</h3>
          <div className="flex items-center gap-2 mb-2">
            {getTruckIcon(truck)}
            <span className="text-sm text-gray-800">{truck.truck_type || 'N/A'}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(truck)}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(truck.id)}
            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>

    {/* Truck Details */}
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-gray-500" />
          <span className="text-gray-800">Brand:</span>
          <span className="font-medium">{truck.brand || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-2">
          {getFuelIcon(truck.fuel_type)}
          <span className="text-gray-800">Fuel:</span>
          <span className="font-medium capitalize">{truck.fuel_type || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded text-white text-xs flex items-center justify-center font-bold">T</div>
          <span className="text-gray-800">Capacity:</span>
          <span className="font-medium">{truck.loading_capacity || 'N/A'} tons</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-gray-800">Year:</span>
          <span className="font-medium">{truck.year_of_manufacturing || 'N/A'}</span>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-gray-500" />
          <span className="text-gray-800">Owner:</span>
          <span className="font-medium">{truck.owner?.name || 'Unassigned'}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-500" />
          <span className="text-gray-800">Location:</span>
          <span className="font-medium">{truck.current_location || 'N/A'}</span>
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          onClick={() => onToggleStatus(truck.id, truck.is_active, 'is_active')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            truck.is_active
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
        >
          {truck.is_active ? 'Active' : 'Inactive'}
        </button>
        <button
          onClick={() => onToggleStatus(truck.id, truck.is_available, 'is_available')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            truck.is_available
              ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
          }`}
        >
          {truck.is_available ? 'Available' : 'In Use'}
        </button>
      </div>
    </div>
  </div>
));

// Memoized staff card component
const StaffCard = memo(({ member, onEdit, onDelete, onToggleStatus, getPostIcon }) => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
    {/* Staff Header */}
    <div className="bg-gradient-to-r from-gray-50 to-green-50 p-6 border-b border-gray-200">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {member.image_url ? (
            <img
              src={member.image_url}
              alt={member.name}
              className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-gray-800 mb-2 truncate">{member.name}</h3>
          <div className="flex items-center gap-2 mb-2">
            {getPostIcon(member.post)}
            <span className="text-sm font-medium text-gray-800 capitalize">{member.post}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(member)}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(member.id)}
            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    {/* Staff Details */}
    <div className="p-6 space-y-4">
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <Phone className="w-4 h-4 text-gray-500" />
          <span className="text-gray-800">Mobile:</span>
          <span className="font-medium">{member.mobile_number || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-blue-500 rounded text-white text-xs flex items-center justify-center font-bold">L</div>
          <span className="text-gray-800">License:</span>
          <span className="font-medium text-xs">{member.license_number || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-green-500 rounded text-white text-xs flex items-center justify-center font-bold">A</div>
          <span className="text-gray-800">Aadhar:</span>
          <span className="font-medium text-xs">{member.aadhar_number || 'N/A'}</span>
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={() => onToggleStatus(member.id, member.is_active)}
          className={`w-full px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            member.is_active
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
        >
          {member.is_active ? 'Active Employee' : 'Inactive Employee'}
        </button>
      </div>
    </div>
  </div>
));

export default function TruckStaffManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('trucks');
  
  // Modal states
  const [showTruckForm, setShowTruckForm] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  
  // Data states
  const [trucks, setTrucks] = useState([]);
  const [staff, setStaff] = useState([]);
  
  // Search and filter states
  const [truckSearch, setTruckSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [truckFilter, setTruckFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');

  // Debounced search values for performance
  const debouncedTruckSearch = useDebounce(truckSearch, 300);
  const debouncedStaffSearch = useDebounce(staffSearch, 300);

  // Memoized filtered data
  const filteredTrucks = useMemo(() => {
    let filtered = trucks;

    // Apply search filter
    if (debouncedTruckSearch) {
      const searchLower = debouncedTruckSearch.toLowerCase();
      filtered = filtered.filter(truck =>
        truck.truck_number?.toLowerCase().includes(searchLower) ||
        truck.truck_type?.toLowerCase().includes(searchLower) ||
        truck.brand?.toLowerCase().includes(searchLower) ||
        truck.owner?.name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    switch (truckFilter) {
      case 'active':
        filtered = filtered.filter(truck => truck.is_active);
        break;
      case 'inactive':
        filtered = filtered.filter(truck => !truck.is_active);
        break;
      case 'available':
        filtered = filtered.filter(truck => truck.is_available);
        break;
      case 'unavailable':
        filtered = filtered.filter(truck => !truck.is_available);
        break;
    }

    return filtered;
  }, [trucks, debouncedTruckSearch, truckFilter]);

  const filteredStaff = useMemo(() => {
    let filtered = staff;

    // Apply search filter
    if (debouncedStaffSearch) {
      const searchLower = debouncedStaffSearch.toLowerCase();
      filtered = filtered.filter(member =>
        member.name?.toLowerCase().includes(searchLower) ||
        member.post?.toLowerCase().includes(searchLower) ||
        member.mobile_number?.toLowerCase().includes(searchLower) ||
        member.license_number?.toLowerCase().includes(searchLower)
      );
    }

    // Apply post filter
    if (staffFilter !== 'all') {
      filtered = filtered.filter(member => 
        member.post?.toLowerCase().includes(staffFilter.toLowerCase())
      );
    }

    return filtered;
  }, [staff, debouncedStaffSearch, staffFilter]);

  // Optimized load data function
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Only load essential fields for initial render
      const [trucksRes, staffRes] = await Promise.all([
        supabase
          .from('trucks')
          .select(`
            id, truck_number, truck_type, brand, fuel_type, loading_capacity, 
            year_of_manufacturing, current_location, is_active, is_available, 
            tyre_count, created_at,
            owner:staff(id, name, post, mobile_number)
          `)
          .order('created_at', { ascending: false })
          .limit(50), // Limit initial load
        supabase
          .from('staff')
          .select(`
            id, name, post, mobile_number, license_number, aadhar_number, 
            image_url, is_active, created_at
          `)
          .order('created_at', { ascending: false })
          .limit(50) // Limit initial load
      ]);

      if (trucksRes.error) throw trucksRes.error;
      if (staffRes.error) throw staffRes.error;

      setTrucks(trucksRes.data || []);
      setStaff(staffRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Memoized callback functions
  const handleTruckSaved = useCallback((savedTruck) => {
    if (editingTruck) {
      setTrucks(prev => prev.map(t => t.id === savedTruck.id ? savedTruck : t));
    } else {
      setTrucks(prev => [savedTruck, ...prev]);
    }
    setShowTruckForm(false);
    setEditingTruck(null);
  }, [editingTruck]);

  const handleStaffSaved = useCallback((savedStaff) => {
    if (editingStaff) {
      setStaff(prev => prev.map(s => s.id === savedStaff.id ? savedStaff : s));
    } else {
      setStaff(prev => [savedStaff, ...prev]);
    }
    setShowStaffForm(false);
    setEditingStaff(null);
  }, [editingStaff]);

  const handleEditTruck = useCallback((truck) => {
    setEditingTruck(truck);
    setShowTruckForm(true);
  }, []);

  const handleEditStaff = useCallback((staffMember) => {
    setEditingStaff(staffMember);
    setShowStaffForm(true);
  }, []);

  const handleDeleteTruck = useCallback(async (truckId) => {
    if (!confirm('Are you sure you want to delete this truck?')) return;

    try {
      const { error } = await supabase
        .from('trucks')
        .delete()
        .eq('id', truckId);

      if (error) throw error;

      setTrucks(prev => prev.filter(t => t.id !== truckId));
      alert('Truck deleted successfully');
    } catch (error) {
      console.error('Error deleting truck:', error);
      alert('Error deleting truck. Please try again.');
    }
  }, []);

  const handleDeleteStaff = useCallback(async (staffId) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffId);

      if (error) throw error;

      setStaff(prev => prev.filter(s => s.id !== staffId));
      alert('Staff member deleted successfully');
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Error deleting staff. Please try again.');
    }
  }, []);

  const toggleTruckStatus = useCallback(async (truckId, currentStatus, field) => {
    try {
      const { error } = await supabase
        .from('trucks')
        .update({ [field]: !currentStatus })
        .eq('id', truckId);

      if (error) throw error;

      setTrucks(prev => prev.map(t => 
        t.id === truckId ? { ...t, [field]: !currentStatus } : t
      ));
    } catch (error) {
      console.error(`Error updating truck ${field}:`, error);
      alert(`Error updating truck ${field}. Please try again.`);
    }
  }, []);

  const toggleStaffStatus = useCallback(async (staffId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('staff')
        .update({ is_active: !currentStatus })
        .eq('id', staffId);

      if (error) throw error;

      setStaff(prev => prev.map(s => 
        s.id === staffId ? { ...s, is_active: !currentStatus } : s
      ));
    } catch (error) {
      console.error('Error updating staff status:', error);
      alert('Error updating staff status. Please try again.');
    }
  }, []);

  // Memoized icon functions
  const getTruckIcon = useCallback((truck) => {
    const tyreCount = truck.tyre_count;
    if (tyreCount) {
      return (
        <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="7" cy="17" r="2"/>
            <circle cx="17" cy="17" r="2"/>
            <path d="M5 17h-2v-6l3-8h9l4 5h2v9h-2"/>
          </svg>
          {tyreCount}W
        </div>
      );
    }
    return null;
  }, []);

  const getFuelIcon = useCallback((fuelType) => {
    switch (fuelType?.toLowerCase()) {
      case 'electric':
        return <Zap className="w-4 h-4 text-green-600" />;
      case 'cng':
        return <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">G</div>;
      default:
        return <Fuel className="w-4 h-4 text-gray-800" />;
    }
  }, []);

  const getPostIcon = useCallback((post) => {
    if (post?.toLowerCase().includes('driver')) return <Truck className="w-4 h-4 text-blue-600" />;
    if (post?.toLowerCase().includes('mechanic')) return <Wrench className="w-4 h-4 text-orange-600" />;
    if (post?.toLowerCase().includes('owner')) return <Shield className="w-4 h-4 text-purple-600" />;
    return <User className="w-4 h-4 text-gray-800" />;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-xl font-semibold text-gray-700">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-6 pt-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 rounded-2xl shadow-2xl border border-blue-300 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  <Truck className="w-8 h-8" />
                </div>
                Fleet & Staff Management
              </h1>
              <p className="text-blue-100 mt-2">Manage your trucks and staff efficiently</p>
            </div>
            <div className="hidden md:flex items-center gap-6 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{trucks.length}</div>
                <div className="text-sm text-blue-200">Total Trucks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{staff.length}</div>
                <div className="text-sm text-blue-200">Total Staff</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-8 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('trucks')}
              className={`flex-1 px-8 py-6 font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                activeTab === 'trucks'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Truck className="w-6 h-6" />
              Trucks ({filteredTrucks.length})
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex-1 px-8 py-6 font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                activeTab === 'staff'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Users className="w-6 h-6" />
              Staff ({filteredStaff.length})
            </button>
          </div>

          {/* Trucks Tab */}
          {activeTab === 'trucks' && (
            <div className="p-8">
              {/* Truck Controls */}
              <div className="flex flex-wrap gap-4 mb-8">
                <button
                  onClick={() => {
                    setEditingTruck(null);
                    setShowTruckForm(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 flex items-center gap-2 shadow-lg transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Add New Truck
                </button>

                <div className="flex-1 flex gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={truckSearch}
                      onChange={(e) => setTruckSearch(e.target.value)}
                      placeholder="Search trucks..."
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <select
                    value={truckFilter}
                    onChange={(e) => setTruckFilter(e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="all">All Trucks</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
              </div>

              {/* Trucks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredTrucks.map((truck) => (
                  <TruckCard
                    key={truck.id}
                    truck={truck}
                    onEdit={handleEditTruck}
                    onDelete={handleDeleteTruck}
                    onToggleStatus={toggleTruckStatus}
                    getTruckIcon={getTruckIcon}
                    getFuelIcon={getFuelIcon}
                  />
                ))}
              </div>

              {filteredTrucks.length === 0 && (
                <div className="text-center py-16">
                  <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                    <Truck className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No trucks found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          )}

          {/* Staff Tab */}
          {activeTab === 'staff' && (
            <div className="p-8">
              {/* Staff Controls */}
              <div className="flex flex-wrap gap-4 mb-8">
                <button
                  onClick={() => {
                    setEditingStaff(null);
                    setShowStaffForm(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 flex items-center gap-2 shadow-lg transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Add New Staff
                </button>

                <div className="flex-1 flex gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      placeholder="Search staff..."
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <select
                    value={staffFilter}
                    onChange={(e) => setStaffFilter(e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="all">All Posts</option>
                    <option value="driver">Driver</option>
                    <option value="conductor">Conductor</option>
                    <option value="owner">Owner</option>
                    <option value="mechanic">Mechanic</option>
                  </select>
                </div>
              </div>

              {/* Staff Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredStaff.map((member) => (
                  <StaffCard
                    key={member.id}
                    member={member}
                    onEdit={handleEditStaff}
                    onDelete={handleDeleteStaff}
                    onToggleStatus={toggleStaffStatus}
                    getPostIcon={getPostIcon}
                  />
                ))}
              </div>

              {filteredStaff.length === 0 && (
                <div className="text-center py-16">
                  <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                    <Users className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No staff found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals - Only render when needed */}
      {showTruckForm && (
        <TruckForm
          truck={editingTruck}
          staff={staff.filter(s => s.is_active)}
          onSave={handleTruckSaved}
          onClose={() => {
            setShowTruckForm(false);
            setEditingTruck(null);
          }}
        />
      )}

      {showStaffForm && (
        <StaffForm
          staff={editingStaff}
          onSave={handleStaffSaved}
          onClose={() => {
            setShowStaffForm(false);
            setEditingStaff(null);
          }}
        />
      )}
    </div>
  );
}