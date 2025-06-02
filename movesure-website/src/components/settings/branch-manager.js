'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';

export default function BranchManager() {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    branch_code: '',
    city_code: '',
    address: '',
    manager_id: '',
    branch_name: '',
    is_active: true
  });

  useEffect(() => {
    fetchBranches();
    fetchUsers();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select(`
          *,
          manager:users(id, name, username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, username')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        manager_id: formData.manager_id || null
      };

      if (editingBranch) {
        const { error } = await supabase
          .from('branches')
          .update(submitData)
          .eq('id', editingBranch.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('branches')
          .insert([submitData]);

        if (error) throw error;
      }

      await fetchBranches();
      setShowForm(false);
      setEditingBranch(null);
      setFormData({
        branch_code: '',
        city_code: '',
        address: '',
        manager_id: '',
        branch_name: '',
        is_active: true
      });
    } catch (error) {
      console.error('Error saving branch:', error);
      alert('Error saving branch: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      branch_code: branch.branch_code,
      city_code: branch.city_code,
      address: branch.address,
      manager_id: branch.manager_id || '',
      branch_name: branch.branch_name,
      is_active: branch.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (branchId) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;

    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branchId);

      if (error) throw error;
      await fetchBranches();
    } catch (error) {
      console.error('Error deleting branch:', error);
      alert('Error deleting branch: ' + error.message);
    }
  };

  const toggleStatus = async (branch) => {
    try {
      const { error } = await supabase
        .from('branches')
        .update({ is_active: !branch.is_active })
        .eq('id', branch.id);

      if (error) throw error;
      await fetchBranches();
    } catch (error) {
      console.error('Error updating branch status:', error);
    }
  };

  if (loading && branches.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Branch Management</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {showForm ? 'Cancel' : 'Add Branch'}
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h4 className="text-md font-medium text-gray-900 mb-4">
              {editingBranch ? 'Edit Branch' : 'Add New Branch'}
            </h4>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.branch_code}
                  onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.branch_name}
                  onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.city_code}
                  onChange={(e) => setFormData({ ...formData, city_code: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager
                </label>
                <select
                  value={formData.manager_id}
                  onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Manager</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.username}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>

              <div className="md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingBranch ? 'Update' : 'Create')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingBranch(null);
                    setFormData({
                      branch_code: '',
                      city_code: '',
                      address: '',
                      manager_id: '',
                      branch_name: '',
                      is_active: true
                    });
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {branches.map((branch) => (
                <tr key={branch.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {branch.branch_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Code: {branch.branch_code}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{branch.city_code}</div>
                    <div className="text-sm text-gray-500">{branch.address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {branch.manager?.name || branch.manager?.username || 'Not assigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer ${
                        branch.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                      onClick={() => toggleStatus(branch)}
                    >
                      {branch.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(branch)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(branch.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {branches.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No branches found. Create your first branch to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}