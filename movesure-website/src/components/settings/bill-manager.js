'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';

export default function BillBookManager() {
  const { user } = useAuth();
  const [billBooks, setBillBooks] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBillBook, setEditingBillBook] = useState(null);
  const [formData, setFormData] = useState({
    prefix: '',
    from_number: '',
    to_number: '',
    digits: 4,
    postfix: '',
    branch_id: '',
    consignor_id: '',
    is_fixed: false,
    auto_continue: false,
    is_active: true
  });

  useEffect(() => {
    fetchBillBooks();
    fetchBranches();
    fetchUsers();
  }, []);

  const fetchBillBooks = async () => {
    try {
      console.log('Fetching bill books...');
      
      // First, get bill books
      const { data: billBooksData, error: billBooksError } = await supabase
        .from('bill_books')
        .select('*')
        .order('created_at', { ascending: false });

      if (billBooksError) {
        console.error('Bill books error:', billBooksError);
        throw billBooksError;
      }

      console.log('Raw bill books data:', billBooksData);

      if (!billBooksData || billBooksData.length === 0) {
        setBillBooks([]);
        return;
      }

      // Get related data separately
      const userIds = [...new Set(billBooksData.map(book => book.created_by).filter(Boolean))];
      const branchIds = [...new Set(billBooksData.map(book => book.branch_id).filter(Boolean))];

      console.log('User IDs:', userIds);
      console.log('Branch IDs:', branchIds);

      // Fetch users
      let usersData = [];
      if (userIds.length > 0) {
        const { data: fetchedUsers, error: usersError } = await supabase
          .from('users')
          .select('id, name, username')
          .in('id', userIds);

        if (usersError) {
          console.error('Users fetch error:', usersError);
        } else {
          usersData = fetchedUsers || [];
        }
      }

      // Fetch branches
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

      console.log('Users data:', usersData);
      console.log('Branches data:', branchesData);

      // Combine the data
      const enrichedBillBooks = billBooksData.map(book => ({
        ...book,
        creator: usersData.find(user => user.id === book.created_by) || null,
        branch: branchesData.find(branch => branch.id === book.branch_id) || null
      }));

      console.log('Enriched bill books:', enrichedBillBooks);
      setBillBooks(enrichedBillBooks);

    } catch (error) {
      console.error('Error fetching bill books:', error);
      // Set empty array on error to prevent infinite loading
      setBillBooks([]);
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
      setUsers([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const fromNum = parseInt(formData.from_number);
      const toNum = parseInt(formData.to_number);

      if (fromNum >= toNum) {
        alert('From number must be less than to number');
        setLoading(false);
        return;
      }

      const submitData = {
        prefix: formData.prefix || null,
        from_number: fromNum,
        to_number: toNum,
        current_number: editingBillBook ? editingBillBook.current_number : fromNum,
        digits: parseInt(formData.digits),
        postfix: formData.postfix || null,
        branch_id: formData.branch_id || null,
        consignor_id: formData.consignor_id || null,
        is_fixed: formData.is_fixed,
        auto_continue: formData.auto_continue,
        is_active: formData.is_active,
        created_by: user.id
      };

      console.log('Submitting bill book data:', submitData);

      if (editingBillBook) {
        const { data, error } = await supabase
          .from('bill_books')
          .update(submitData)
          .eq('id', editingBillBook.id)
          .select();

        if (error) throw error;
        console.log('Updated bill book:', data);
      } else {
        const { data, error } = await supabase
          .from('bill_books')
          .insert([submitData])
          .select();

        if (error) throw error;
        console.log('Created bill book:', data);
      }

      await fetchBillBooks();
      setShowForm(false);
      setEditingBillBook(null);
      resetForm();
    } catch (error) {
      console.error('Error saving bill book:', error);
      alert('Error saving bill book: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      prefix: '',
      from_number: '',
      to_number: '',
      digits: 4,
      postfix: '',
      branch_id: '',
      consignor_id: '',
      is_fixed: false,
      auto_continue: false,
      is_active: true
    });
  };

  const handleEdit = (billBook) => {
    setEditingBillBook(billBook);
    setFormData({
      prefix: billBook.prefix || '',
      from_number: billBook.from_number.toString(),
      to_number: billBook.to_number.toString(),
      digits: billBook.digits,
      postfix: billBook.postfix || '',
      branch_id: billBook.branch_id || '',
      consignor_id: billBook.consignor_id || '',
      is_fixed: billBook.is_fixed,
      auto_continue: billBook.auto_continue,
      is_active: billBook.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (billBookId) => {
    if (!confirm('Are you sure you want to delete this bill book?')) return;

    try {
      const { error } = await supabase
        .from('bill_books')
        .delete()
        .eq('id', billBookId);

      if (error) throw error;
      await fetchBillBooks();
    } catch (error) {
      console.error('Error deleting bill book:', error);
      alert('Error deleting bill book: ' + error.message);
    }
  };

  const toggleStatus = async (billBook) => {
    try {
      const { error } = await supabase
        .from('bill_books')
        .update({ is_active: !billBook.is_active })
        .eq('id', billBook.id);

      if (error) throw error;
      await fetchBillBooks();
    } catch (error) {
      console.error('Error updating bill book status:', error);
    }
  };

  const formatBillNumber = (billBook, number) => {
    const paddedNumber = number.toString().padStart(billBook.digits, '0');
    return `${billBook.prefix || ''}${paddedNumber}${billBook.postfix || ''}`;
  };

  const getProgress = (billBook) => {
    const total = billBook.to_number - billBook.from_number + 1;
    const used = billBook.current_number - billBook.from_number;
    return Math.max(0, Math.min(100, Math.round((used / total) * 100)));
  };

  if (loading && billBooks.length === 0) {
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
          <h3 className="text-lg font-medium text-gray-900">Bill Book Management</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {showForm ? 'Cancel' : 'Add Bill Book'}
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h4 className="text-md font-medium text-gray-900 mb-4">
              {editingBillBook ? 'Edit Bill Book' : 'Add New Bill Book'}
            </h4>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prefix
                </label>
                <input
                  type="text"
                  value={formData.prefix}
                  onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., INV"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Number *
                </label>
                <input
                  type="number"
                  required
                  value={formData.from_number}
                  onChange={(e) => setFormData({ ...formData, from_number: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Number *
                </label>
                <input
                  type="number"
                  required
                  value={formData.to_number}
                  onChange={(e) => setFormData({ ...formData, to_number: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Digits *
                </label>
                <select
                  value={formData.digits}
                  onChange={(e) => setFormData({ ...formData, digits: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={3}>3 digits</option>
                  <option value={4}>4 digits</option>
                  <option value={5}>5 digits</option>
                  <option value={6}>6 digits</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postfix
                </label>
                <input
                  type="text"
                  value={formData.postfix}
                  onChange={(e) => setFormData({ ...formData, postfix: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., -24"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <select
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  Consignor
                </label>
                <select
                  value={formData.consignor_id}
                  onChange={(e) => setFormData({ ...formData, consignor_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Consignor</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.username}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 flex flex-wrap gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_fixed}
                    onChange={(e) => setFormData({ ...formData, is_fixed: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Fixed Numbers</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.auto_continue}
                    onChange={(e) => setFormData({ ...formData, auto_continue: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Auto Continue</span>
                </label>

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

              <div className="md:col-span-3 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingBillBook ? 'Update' : 'Create')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingBillBook(null);
                    resetForm();
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {billBooks.map((billBook) => (
            <div key={billBook.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {formatBillNumber(billBook, billBook.from_number)} - {formatBillNumber(billBook, billBook.to_number)}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {billBook.branch?.branch_name || 'No branch assigned'}
                  </p>
                </div>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer ${
                    billBook.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                  onClick={() => toggleStatus(billBook)}
                >
                  {billBook.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Current:</span>
                  <span className="font-medium">
                    {formatBillNumber(billBook, billBook.current_number)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Range:</span>
                  <span>{billBook.from_number} - {billBook.to_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Progress:</span>
                  <span>{getProgress(billBook)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getProgress(billBook)}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs mb-3">
                {billBook.is_fixed && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Fixed</span>
                )}
                {billBook.auto_continue && (
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">Auto Continue</span>
                )}
                {billBook.is_completed && (
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">Completed</span>
                )}
              </div>

              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  Created by: {billBook.creator?.name || billBook.creator?.username || 'Unknown'}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(billBook)}
                    className="text-indigo-600 hover:text-indigo-900 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(billBook.id)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {billBooks.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No bill books found. Create your first bill book to get started.
          </div>
        )}
      </div>
    </div>
  );
}