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
const TruckCard = memo(({ truck, onEdit, onDelete, onToggleStatus }) => (
  <div className="bg-white rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
    {/* Truck Header */}
    <div className="bg-gray-50 p-4 border-b border-gray-200">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-black mb-1">{truck.truck_number}</h3>
          <p className="text-sm text-gray-600">{truck.truck_type || 'N/A'}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(truck)}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(truck.id)}
            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    {/* Truck Details */}
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3 text-sm">
        {truck.brand && (
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-500" />
            <span className="text-black font-medium">{truck.brand}</span>
          </div>
        )}
        {truck.loading_capacity && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded text-white text-xs flex items-center justify-center font-bold">T</div>
            <span className="text-black font-medium">{truck.loading_capacity} tons</span>
          </div>
        )}
        {truck.fuel_type && (
          <div className="flex items-center gap-2">
            <Fuel className="w-4 h-4 text-gray-500" />
            <span className="text-black font-medium capitalize">{truck.fuel_type}</span>
          </div>
        )}
        {truck.year_of_manufacturing && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-black font-medium">{truck.year_of_manufacturing}</span>
          </div>
        )}
      </div>

      {(truck.owner?.name || truck.current_location) && (
        <div className="border-t pt-3 space-y-2">
          {truck.owner?.name && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-black">Owner: {truck.owner.name}</span>
            </div>
          )}
          {truck.current_location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-black">Location: {truck.current_location}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t">
        <button
          onClick={() => onToggleStatus(truck.id, truck.is_active, 'is_active')}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
            truck.is_active
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
        >
          {truck.is_active ? 'Active' : 'Inactive'}
        </button>
        <button
          onClick={() => onToggleStatus(truck.id, truck.is_available, 'is_available')}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
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

TruckCard.displayName = 'TruckCard';

// Memoized staff card component
const StaffCard = memo(({ member, onEdit, onDelete, onToggleStatus, getPostIcon }) => (
  <div className="bg-white rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
    {/* Staff Header */}
    <div className="bg-gray-50 p-4 border-b border-gray-200">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {member.image_url ? (
            <img
              src={member.image_url}
              alt={member.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
              loading="lazy"
            />
          ) : (
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-black mb-1 truncate">{member.name}</h3>
          <div className="flex items-center gap-2">
            {getPostIcon(member.post)}
            <span className="text-sm text-gray-600 capitalize">{member.post}</span>
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
    <div className="p-4 space-y-3">
      <div className="space-y-2 text-sm">
        {member.mobile_number && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-500" />
            <span className="text-black font-medium">{member.mobile_number}</span>
          </div>
        )}
        {member.license_number && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded text-white text-xs flex items-center justify-center font-bold">L</div>
            <span className="text-black font-medium text-xs">{member.license_number}</span>
          </div>
        )}
        {member.aadhar_number && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded text-white text-xs flex items-center justify-center font-bold">A</div>
            <span className="text-black font-medium text-xs">{member.aadhar_number}</span>
          </div>
        )}
      </div>

      <div className="pt-3 border-t">
        <button
          onClick={() => onToggleStatus(member.id, member.is_active)}
          className={`w-full px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
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

StaffCard.displayName = 'StaffCard';

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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="w-full px-6 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                Fleet & Staff Management
              </h1>
              <p className="text-gray-600 mt-1">Manage your trucks and staff efficiently</p>
            </div>
            <div className="hidden md:flex items-center gap-6 text-black">
              <div className="text-center">
                <div className="text-xl font-bold">{trucks.length}</div>
                <div className="text-sm text-gray-600">Total Trucks</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{staff.length}</div>
                <div className="text-sm text-gray-600">Total Staff</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('trucks')}
              className={`flex-1 px-6 py-4 font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === 'trucks'
                  ? 'bg-blue-600 text-white'
                  : 'text-black hover:bg-gray-50'
              }`}
            >
              <Truck className="w-5 h-5" />
              Trucks ({filteredTrucks.length})
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex-1 px-6 py-4 font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === 'staff'
                  ? 'bg-blue-600 text-white'
                  : 'text-black hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5" />
              Staff ({filteredStaff.length})
            </button>
          </div>

          {/* Trucks Tab */}
          {activeTab === 'trucks' && (
            <div className="p-6">
              {/* Truck Controls */}
              <div className="flex flex-wrap gap-4 mb-6">
                <button
                  onClick={() => {
                    setEditingTruck(null);
                    setShowTruckForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add New Truck
                </button>

                <div className="flex-1 flex gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={truckSearch}
                      onChange={(e) => setTruckSearch(e.target.value)}
                      placeholder="Search trucks..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    />
                  </div>

                  <select
                    value={truckFilter}
                    onChange={(e) => setTruckFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {filteredTrucks.map((truck) => (
                  <TruckCard
                    key={truck.id}
                    truck={truck}
                    onEdit={handleEditTruck}
                    onDelete={handleDeleteTruck}
                    onToggleStatus={toggleTruckStatus}
                  />
                ))}
              </div>

              {filteredTrucks.length === 0 && (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Truck className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-black mb-2">No trucks found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          )}

          {/* Staff Tab */}
          {activeTab === 'staff' && (
            <div className="p-6">
              {/* Staff Controls */}
              <div className="flex flex-wrap gap-4 mb-6">
                <button
                  onClick={() => {
                    setEditingStaff(null);
                    setShowStaffForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add New Staff
                </button>

                <div className="flex-1 flex gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      placeholder="Search staff..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    />
                  </div>

                  <select
                    value={staffFilter}
                    onChange={(e) => setStaffFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
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
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-black mb-2">No staff found</h3>
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