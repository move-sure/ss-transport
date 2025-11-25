'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../utils/auth';
import supabase from '../utils/supabase';
import Navbar from '../../components/dashboard/navbar';
import { Users, Plus, Trash2, Save, Search, CheckCircle, XCircle, Shield, User } from 'lucide-react';

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
  { name: 'danger', label: 'Danger Zone', description: 'Critical bill book configuration (USE WITH CAUTION)' },
  { name: 'godown', label: 'Godown', description: 'Manage godown operations' },
  { name: 'crm', label: 'CRM', description: 'Customer relationship management' },
  { name: 'complains', label: 'Complaints', description: 'Manage customer complaints' },
  { name: 'available', label: 'Available', description: 'Available items management' },
  { name: 'fnance', label: 'Finance', description: 'Financial dashboard and reports' },
  { name: 'transit-finance', label: 'Transit Finance', description: 'Transit financial operations and billing' },
  { name: 'analytics', label: 'Analytics', description: 'Business insights and performance metrics' }
];

export default function UserModulesPage() {
  const { user, requireAuth } = useAuth();
  const [users, setUsers] = useState([]);
  const [userModules, setUserModules] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Check auth on mount
  useEffect(() => {
    // Check if user is authenticated and is staff/admin
    if (!user) {
      return;
    }

    if (!user.is_staff) {
      // Not an admin, redirect to dashboard
      window.location.href = '/dashboard';
      return;
    }
    
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch all user modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('user_modules')
        .select('*');

      if (modulesError) throw modulesError;

      // Group modules by user_id
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
      
      return {
        ...prev,
        [userId]: newModules
      };
    });
  };

  const saveUserModules = async (userId) => {
    try {
      setSaving(true);
      const modulesToSave = userModules[userId] || [];

      // Delete existing modules for this user
      const { error: deleteError } = await supabase
        .from('user_modules')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new modules
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

      showNotification(`Modules updated successfully for user!`, 'success');
    } catch (error) {
      console.error('Error saving modules:', error);
      showNotification('Error saving modules', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveAllModules = async () => {
    try {
      setSaving(true);
      
      // Delete all existing modules
      const { error: deleteError } = await supabase
        .from('user_modules')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) throw deleteError;

      // Prepare all modules data
      const allModulesData = [];
      Object.entries(userModules).forEach(([userId, modules]) => {
        modules.forEach(moduleName => {
          allModulesData.push({
            user_id: userId,
            module_name: moduleName
          });
        });
      });

      // Insert all modules
      if (allModulesData.length > 0) {
        const { error: insertError } = await supabase
          .from('user_modules')
          .insert(allModulesData);

        if (insertError) throw insertError;
      }

      showNotification('All modules updated successfully!', 'success');
    } catch (error) {
      console.error('Error saving all modules:', error);
      showNotification('Error saving modules', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.post && u.post.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">User Modules Management</h1>
                <p className="text-gray-600">Assign modules and permissions to users</p>
              </div>
            </div>
            <button
              onClick={saveAllModules}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-20 right-6 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-2 ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? 
            <CheckCircle className="h-5 w-5" /> : 
            <XCircle className="h-5 w-5" />
          }
          <span>{notification.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by username, name, or post..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredUsers.map((userItem) => (
            <div key={userItem.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              {/* User Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    {userItem.image_url ? (
                      <img
                        src={userItem.image_url}
                        alt="Profile"
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {userItem.name || userItem.username}
                    </h3>
                    <p className="text-sm text-gray-500">@{userItem.username}</p>
                    {userItem.post && (
                      <p className="text-xs text-gray-500">{userItem.post}</p>
                    )}
                    <div className="flex items-center space-x-2 mt-1">
                      {userItem.is_staff && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <Shield className="h-3 w-3 mr-1" />
                          Staff
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        userItem.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {userItem.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modules Section */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Assigned Modules</h4>
                  <span className="text-sm text-gray-500">
                    {(userModules[userItem.id] || []).length} of {AVAILABLE_MODULES.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {AVAILABLE_MODULES.map((module) => {
                    const isAssigned = (userModules[userItem.id] || []).includes(module.name);
                    return (
                      <div key={module.name} className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => handleModuleToggle(userItem.id, module.name)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="ml-3">
                              <span className="text-sm font-medium text-gray-700">
                                {module.label}
                              </span>
                              <p className="text-xs text-gray-500">
                                {module.description}
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Save Button for Individual User */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => saveUserModules(userItem.id)}
                    disabled={saving}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Modules</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria.' : 'No users available.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}