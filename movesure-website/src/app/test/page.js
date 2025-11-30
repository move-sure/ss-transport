'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import Navbar from '../../components/dashboard/navbar';
import { Users, Save, Search, CheckCircle, XCircle, Shield, User, ChevronDown, ChevronUp, X, Check, ToggleLeft, ToggleRight } from 'lucide-react';

const AVAILABLE_MODULES = [
  { name: 'bilty', label: 'Bilty', description: 'Create and manage bilty documents' },
  { name: 'ewb', label: 'E-Way Bill', description: 'Generate and track e-way bills' },
  { name: 'challan', label: 'Challan', description: 'Create and manage challans' },
  { name: 'manual', label: 'Manual', description: 'Access user manual and documentation' },
  { name: 'challan-setting', label: 'Challan Settings', description: 'Configure challan settings' },
  { name: 'truck-management', label: 'Truck Management', description: 'Add and manage trucks' },
  { name: 'search', label: 'Search', description: 'Search bilty and documents' },
  { name: 'bill', label: 'Bill Search', description: 'Advanced bill search and management' },
  { name: 'tracking', label: 'Tracking', description: 'Track bilty and transit status' },
  { name: 'master', label: 'Master', description: 'Master data management' },
  { name: 'report', label: 'Reports', description: 'View reports and analytics' },
  { name: 'setting', label: 'Settings', description: 'Application settings' },
  { name: 'bilty-setting', label: 'Bilty Settings', description: 'Configure bilty settings' },
  { name: 'station-list', label: 'Station List', description: 'Manage station list' },
  { name: 'danger', label: 'Danger Zone', description: 'Critical bill book configuration' },
  { name: 'godown', label: 'Godown', description: 'Manage godown operations' },
  { name: 'crm', label: 'CRM', description: 'Customer relationship management' },
  { name: 'complains', label: 'Complaints', description: 'Manage customer complaints' },
  { name: 'available', label: 'Available', description: 'Available items management' },
  { name: 'fnance', label: 'Finance', description: 'Financial dashboard and reports' },
  { name: 'transit-finance', label: 'Transit Finance', description: 'Transit financial operations' },
  { name: 'analytics', label: 'Analytics', description: 'Business insights and metrics' }
];

export default function UserModulesPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [userModules, setUserModules] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [expandedUsers, setExpandedUsers] = useState({});

  useEffect(() => {
    if (!user) return;
    if (!user.is_staff) {
      window.location.href = '/dashboard';
      return;
    }
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      const { data: modulesData, error: modulesError } = await supabase
        .from('user_modules')
        .select('*');

      if (modulesError) throw modulesError;

      const modulesByUser = {};
      modulesData.forEach(module => {
        if (!modulesByUser[module.user_id]) {
          modulesByUser[module.user_id] = [];
        }
        modulesByUser[module.user_id].push(module.module_name);
      });

      setUsers(usersData);
      setUserModules(modulesByUser);
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('Error fetching data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleModuleToggle = (userId, moduleName) => {
    setUserModules(prev => {
      const userCurrentModules = prev[userId] || [];
      const newModules = userCurrentModules.includes(moduleName)
        ? userCurrentModules.filter(m => m !== moduleName)
        : [...userCurrentModules, moduleName];
      return { ...prev, [userId]: newModules };
    });
  };

  const toggleAllModules = (userId, selectAll) => {
    setUserModules(prev => ({
      ...prev,
      [userId]: selectAll ? AVAILABLE_MODULES.map(m => m.name) : []
    }));
  };

  const saveUserModules = async (userId) => {
    try {
      setSaving(true);
      const modulesToSave = userModules[userId] || [];

      const { error: deleteError } = await supabase
        .from('user_modules')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      if (modulesToSave.length > 0) {
        const modulesData = modulesToSave.map(moduleName => ({
          user_id: userId,
          module_name: moduleName
        }));

        const { error: insertError } = await supabase
          .from('user_modules')
          .insert(modulesData);

        if (insertError) throw insertError;
      }

      showNotification('Modules saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving modules:', error);
      showNotification('Error saving modules', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const toggleUserExpand = (userId) => {
    setExpandedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.post?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getModuleCount = (userId) => (userModules[userId] || []).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      
      {/* Toast Notification */}
      <div className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${
        notification.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}>
        <div className={`px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 ${
          notification.type === 'success' 
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
            : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          <span className="font-medium">{notification.message}</span>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Access Manager</h1>
                <p className="text-sm text-gray-500">{users.length} users • {AVAILABLE_MODULES.length} modules</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, username or post..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-3">
          {filteredUsers.map((userItem) => {
            const isExpanded = expandedUsers[userItem.id];
            const moduleCount = getModuleCount(userItem.id);
            const allSelected = moduleCount === AVAILABLE_MODULES.length;

            return (
              <div
                key={userItem.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                {/* User Row */}
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer select-none"
                  onClick={() => toggleUserExpand(userItem.id)}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden">
                      {userItem.image_url ? (
                        <img src={userItem.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-lg">
                          {(userItem.name || userItem.username || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    {userItem.is_active && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {userItem.name || userItem.username}
                      </h3>
                      {userItem.is_staff === true && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      @{userItem.username} {userItem.post && `• ${userItem.post}`}
                    </p>
                  </div>

                  {/* Module Counter */}
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${(moduleCount / AVAILABLE_MODULES.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-600 w-12">
                        {moduleCount}/{AVAILABLE_MODULES.length}
                      </span>
                    </div>
                    <div className={`p-2 rounded-xl transition-colors ${isExpanded ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      {isExpanded ? (
                        <ChevronUp className={`h-5 w-5 ${isExpanded ? 'text-blue-600' : 'text-gray-400'}`} />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Modules */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    {/* Quick Actions */}
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleAllModules(userItem.id, true); }}
                          className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" /> Select All
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleAllModules(userItem.id, false); }}
                          className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1"
                        >
                          <X className="h-3.5 w-3.5" /> Clear All
                        </button>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); saveUserModules(userItem.id); }}
                        disabled={saving}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm hover:shadow disabled:opacity-50 flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>

                    {/* Modules Grid */}
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {AVAILABLE_MODULES.map((module) => {
                        const isAssigned = (userModules[userItem.id] || []).includes(module.name);
                        return (
                          <button
                            key={module.name}
                            onClick={(e) => { e.stopPropagation(); handleModuleToggle(userItem.id, module.name); }}
                            className={`p-3 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3 ${
                              isAssigned
                                ? 'bg-blue-50 border-blue-500 shadow-sm'
                                : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isAssigned ? 'text-blue-900' : 'text-gray-700'}`}>
                                {module.label}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{module.description}</p>
                            </div>
                            <div className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center ${
                              isAssigned ? 'bg-blue-500' : 'bg-gray-200'
                            }`}>
                              {isAssigned && <Check className="h-3.5 w-3.5 text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredUsers.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No users found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try a different search term' : 'No users available'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}