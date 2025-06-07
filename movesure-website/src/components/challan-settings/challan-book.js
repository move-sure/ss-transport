'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';
import { X, Save, FileText } from 'lucide-react';

const ChallanBookForm = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editingBook, 
  userBranch, 
  branches 
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    prefix: '',
    from_number: 1,
    to_number: 100,
    digits: 4,
    postfix: '',
    from_branch_id: '',
    to_branch_id: '',
    branch_1: '',
    branch_2: '',
    branch_3: '',
    current_number: 1,
    is_fixed: false,
    auto_continue: false,
    is_active: true
  });

  useEffect(() => {
    if (userBranch) {
      setFormData(prev => ({
        ...prev,
        from_branch_id: userBranch.id,
        branch_1: userBranch.id,
        current_number: prev.from_number
      }));
    }
  }, [userBranch]);

  useEffect(() => {
    if (editingBook) {
      setFormData({
        prefix: editingBook.prefix || '',
        from_number: editingBook.from_number,
        to_number: editingBook.to_number,
        digits: editingBook.digits,
        postfix: editingBook.postfix || '',
        from_branch_id: editingBook.from_branch_id,
        to_branch_id: editingBook.to_branch_id,
        branch_1: editingBook.branch_1,
        branch_2: editingBook.branch_2 || '',
        branch_3: editingBook.branch_3 || '',
        current_number: editingBook.current_number,
        is_fixed: editingBook.is_fixed,
        auto_continue: editingBook.auto_continue,
        is_active: editingBook.is_active
      });
    }
  }, [editingBook]);

  useEffect(() => {
    // Update current_number when from_number changes
    setFormData(prev => ({
      ...prev,
      current_number: prev.from_number
    }));
  }, [formData.from_number]);

  const generatePreview = () => {
    const { prefix, current_number, digits, postfix } = formData;
    const paddedNumber = String(current_number).padStart(digits, '0');
    return `${prefix || ''}${paddedNumber}${postfix || ''}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!formData.to_branch_id) {
        alert('Please select a destination branch');
        return;
      }

      if (formData.from_branch_id === formData.to_branch_id) {
        alert('From and To branches must be different');
        return;
      }

      if (formData.from_number >= formData.to_number) {
        alert('To number must be greater than From number');
        return;
      }

      if (formData.current_number < formData.from_number || formData.current_number > formData.to_number) {
        alert('Current number must be within the range');
        return;
      }

      // Prepare data
      const saveData = {
        ...formData,
        created_by: user.id,
        branch_2: formData.branch_2 || null,
        branch_3: formData.branch_3 || null
      };

      let result;
      if (editingBook) {
        // Update existing
        result = await supabase
          .from('challan_books')
          .update(saveData)
          .eq('id', editingBook.id)
          .select()
          .single();
      } else {
        // Create new
        result = await supabase
          .from('challan_books')
          .insert([saveData])
          .select()
          .single();
      }

      if (result.error) throw result.error;

      alert(editingBook ? 'Challan book updated successfully!' : 'Challan book created successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error saving challan book:', error);
      alert('Error saving challan book: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter branches to exclude user's branch for to_branch
  const availableToBranches = branches.filter(b => b.id !== userBranch?.id);
  
  // Filter branches for branch_2 and branch_3 (exclude already selected)
  const availableSecondaryBranches = branches.filter(b => 
    b.id !== formData.branch_1 && b.id !== formData.branch_2
  );
  const availableTertiaryBranches = branches.filter(b => 
    b.id !== formData.branch_1 && b.id !== formData.branch_2 && b.id !== formData.branch_3
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 text-gray-900">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6" />
              <h2 className="text-xl font-bold">
                {editingBook ? 'Edit Challan Book' : 'Create New Challan Book'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Route Selection */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">Route Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Branch (Your Branch)
                </label>
                <input
                  type="text"
                  value={userBranch?.branch_name || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Branch *
                </label>
                <select
                  value={formData.to_branch_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, to_branch_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select destination branch</option>
                  {availableToBranches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.branch_name} ({branch.branch_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Number Configuration */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-4">Number Configuration</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prefix
                </label>
                <input
                  type="text"
                  value={formData.prefix}
                  onChange={(e) => setFormData(prev => ({ ...prev, prefix: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., CH"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Number *
                </label>
                <input
                  type="number"
                  value={formData.from_number}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    from_number: parseInt(e.target.value) || 1,
                    current_number: parseInt(e.target.value) || 1
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Number *
                </label>
                <input
                  type="number"
                  value={formData.to_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, to_number: parseInt(e.target.value) || 100 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={formData.from_number + 1}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Digits *
                </label>
                <input
                  type="number"
                  value={formData.digits}
                  onChange={(e) => setFormData(prev => ({ ...prev, digits: parseInt(e.target.value) || 4 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="10"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postfix
                </label>
                <input
                  type="text"
                  value={formData.postfix}
                  onChange={(e) => setFormData(prev => ({ ...prev, postfix: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., DEL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview
                </label>
                <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md font-bold text-lg text-center">
                  {generatePreview()}
                </div>
              </div>
            </div>
          </div>

          {/* Access Control */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">Branch Access Control</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Branch (Your Branch)
                </label>
                <input
                  type="text"
                  value={userBranch?.branch_name || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Branch (Optional)
                </label>
                <select
                  value={formData.branch_2}
                  onChange={(e) => setFormData(prev => ({ ...prev, branch_2: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select secondary branch</option>
                  {availableSecondaryBranches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.branch_name} ({branch.branch_code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tertiary Branch (Optional)
                </label>
                <select
                  value={formData.branch_3}
                  onChange={(e) => setFormData(prev => ({ ...prev, branch_3: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.branch_2}
                >
                  <option value="">Select tertiary branch</option>
                  {availableTertiaryBranches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.branch_name} ({branch.branch_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Number
                </label>
                <input
                  type="number"
                  value={formData.current_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_number: parseInt(e.target.value) || prev.from_number }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={formData.from_number}
                  max={formData.to_number}
                />
              </div>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.auto_continue}
                    onChange={(e) => setFormData(prev => ({ ...prev, auto_continue: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Auto continue from start when reaching end</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_fixed}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_fixed: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Fixed numbering sequence</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              disabled={loading}
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : editingBook ? 'Update Challan Book' : 'Create Challan Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChallanBookForm;