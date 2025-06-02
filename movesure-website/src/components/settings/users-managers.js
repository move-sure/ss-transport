'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';

export default function UserManager() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    post: '',
    branch_id: '',
    image_url: '',
    is_active: true,
    is_staff: true
  });

  useEffect(() => {
    fetchUsers();
    fetchBranches();
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');
      
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Users error:', usersError);
        throw usersError;
      }

      if (!usersData || usersData.length === 0) {
        setUsers([]);
        return;
      }

      // Get branch data for users
      const branchIds = [...new Set(usersData.map(user => user.branch_id).filter(Boolean))];
      
      let branchesData = [];
      if (branchIds.length > 0) {
        const { data: fetchedBranches, error: branchesError } = await supabase
          .from('branches')
          .select('id, branch_name, branch_code')
          .in('id', branchIds);

        if (branchesError) {
          console.error('Branches fetch error:', branchesError);
        } else {
          branchesData = fetchedBranches || [];
        }
      }

      // Combine the data
      const enrichedUsers = usersData.map(user => ({
        ...user,
        branch: branchesData.find(branch => branch.id === user.branch_id) || null
      }));

      setUsers(enrichedUsers);

    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, branch_name, branch_code')
        .eq('is_active', true)
        .order('branch_name');

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
    }
  };

  const hashPassword = async (password) => {
    // Simple hash for demo - in production use proper bcrypt
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setFormData({ ...formData, image_url: base64String });
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, image_url: '' });
    setImagePreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let submitData = {
        username: formData.username.trim(),
        name: formData.name.trim(),
        post: formData.post.trim(),
        branch_id: formData.branch_id || null,
        image_url: formData.image_url || null,
        is_active: formData.is_active,
        is_staff: formData.is_staff
      };

      // Only hash password for new users or when password is changed
      if (!editingUser && formData.password) {
        submitData.password_hash = await hashPassword(formData.password);
      } else if (editingUser && formData.password) {
        submitData.password_hash = await hashPassword(formData.password);
      }

      console.log('Submitting user data:', submitData);

      if (editingUser) {
        const { data, error } = await supabase
          .from('users')
          .update(submitData)
          .eq('id', editingUser.id)
          .select();

        if (error) throw error;
        console.log('Updated user:', data);
      } else {
        // Check if username already exists
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('username')
          .eq('username', submitData.username)
          .single();

        if (existingUser) {
          alert('Username already exists');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('users')
          .insert([submitData])
          .select();

        if (error) throw error;
        console.log('Created user:', data);
      }

      await fetchUsers();
      setShowForm(false);
      setEditingUser(null);
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      name: '',
      post: '',
      branch_id: '',
      image_url: '',
      is_active: true,
      is_staff: true
    });
    setImagePreview('');
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // Don't show password
      name: user.name || '',
      post: user.post || '',
      branch_id: user.branch_id || '',
      image_url: user.image_url || '',
      is_active: user.is_active,
      is_staff: user.is_staff
    });
    setImagePreview(user.image_url || '');
    setShowForm(true);
  };

  const handleDelete = async (userId) => {
    if (userId === currentUser.id) {
      alert('Cannot delete your own account');
      return;
    }

    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user: ' + error.message);
    }
  };

  const toggleStatus = async (user) => {
    if (user.id === currentUser.id) {
      alert('Cannot deactivate your own account');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);

      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  if (loading && users.length === 0) {
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
          <h3 className="text-lg font-medium text-gray-900">User Management</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {showForm ? 'Cancel' : 'Add User'}
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h4>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Post/Designation
                </label>
                <input
                  type="text"
                  value={formData.post}
                  onChange={(e) => setFormData({ ...formData, post: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <select
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.branch_name} ({branch.branch_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile DP
                </label>
                <div className="space-y-2">
                  {imagePreview && (
                    <div className="flex items-center space-x-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove DP
                      </button>
                    </div>
                  )}
                  {!imagePreview && (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                  )}
                </div>
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_staff}
                    onChange={(e) => setFormData({ ...formData, is_staff: e.target.checked })}
                    className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Staff Member</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>

              <div className="md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {users.map((user) => (
            <div key={user.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="flex-shrink-0">
                    {user.image_url ? (
                      <img
                        src={user.image_url}
                        alt={user.name || user.username}
                        className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}&background=6366f1&color=ffffff&size=48`;
                        }}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-600 font-medium text-sm">
                          {(user.name || user.username).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {user.name || user.username}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                      @{user.username}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 mb-3">
                  {user.post && (
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Post:</span> {user.post}
                    </p>
                  )}
                  {user.branch && (
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Branch:</span> {user.branch.branch_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Created: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                    onClick={() => toggleStatus(user)}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {user.is_staff && (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      Staff
                    </span>
                  )}
                  {user.id === currentUser.id && (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                      You
                    </span>
                  )}
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-indigo-600 hover:text-indigo-900 text-xs font-medium"
                  >
                    Edit
                  </button>
                  {user.id !== currentUser.id && (
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:text-red-900 text-xs font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No users found. Create your first user to get started.
          </div>
        )}
      </div>
    </div>
  );
}