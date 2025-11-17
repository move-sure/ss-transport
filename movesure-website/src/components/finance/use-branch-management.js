import { useState } from 'react';
import supabase from '../../app/utils/supabase';

export default function useBranchManagement(user) {
  const [branches, setBranches] = useState([]);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    branch_name: '',
    location: '',
    contact_number: '',
    is_active: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch branches
  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branch_finance')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      alert('Failed to load branches');
    }
  };

  // Open modal for new branch
  const handleOpenModal = () => {
    setEditingBranch(null);
    setFormData({
      branch_name: '',
      location: '',
      contact_number: '',
      is_active: true
    });
    setFormErrors({});
    setShowBranchModal(true);
  };

  // Open modal for editing
  const handleEditBranch = (branch) => {
    setEditingBranch(branch);
    setFormData({
      branch_name: branch.branch_name,
      location: branch.location || '',
      contact_number: branch.contact_number || '',
      is_active: branch.is_active
    });
    setFormErrors({});
    setShowBranchModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowBranchModal(false);
    setEditingBranch(null);
    setFormData({
      branch_name: '',
      location: '',
      contact_number: '',
      is_active: true
    });
    setFormErrors({});
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.branch_name.trim()) {
      errors.branch_name = 'Branch name is required';
    }
    
    if (!formData.location.trim()) {
      errors.location = 'Location is required';
    }
    
    if (formData.contact_number && !/^\d{10}$/.test(formData.contact_number.replace(/[\s-]/g, ''))) {
      errors.contact_number = 'Please enter a valid 10-digit phone number';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    try {
      if (editingBranch) {
        // Update existing branch
        const { error } = await supabase
          .from('branch_finance')
          .update({
            branch_name: formData.branch_name.trim(),
            location: formData.location.trim(),
            contact_number: formData.contact_number.trim(),
            is_active: formData.is_active,
            updated_by_staff_id: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBranch.id);

        if (error) throw error;
        alert('Branch updated successfully!');
      } else {
        // Create new branch
        const { error } = await supabase
          .from('branch_finance')
          .insert([{
            branch_name: formData.branch_name.trim(),
            location: formData.location.trim(),
            contact_number: formData.contact_number.trim(),
            is_active: formData.is_active,
            created_by_staff_id: user.id
          }]);

        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            setFormErrors({ branch_name: 'This branch name already exists' });
            setSubmitting(false);
            return;
          }
          throw error;
        }
        alert('Branch created successfully!');
      }
      
      handleCloseModal();
      fetchBranches();
    } catch (error) {
      console.error('Error saving branch:', error);
      alert('Failed to save branch: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete branch
  const handleDeleteBranch = async (branchId, branchName) => {
    if (!confirm(`Are you sure you want to delete "${branchName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('branch_finance')
        .delete()
        .eq('id', branchId);

      if (error) throw error;
      
      alert('Branch deleted successfully!');
      fetchBranches();
    } catch (error) {
      console.error('Error deleting branch:', error);
      alert('Failed to delete branch: ' + error.message);
    }
  };

  // Toggle branch status
  const handleToggleStatus = async (branch) => {
    try {
      const { error } = await supabase
        .from('branch_finance')
        .update({ 
          is_active: !branch.is_active,
          updated_by_staff_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', branch.id);

      if (error) throw error;
      fetchBranches();
    } catch (error) {
      console.error('Error updating branch status:', error);
      alert('Failed to update branch status');
    }
  };

  return {
    branches,
    showBranchModal,
    editingBranch,
    formData,
    formErrors,
    submitting,
    fetchBranches,
    handleOpenModal,
    handleEditBranch,
    handleCloseModal,
    handleInputChange,
    handleSubmit,
    handleDeleteBranch,
    handleToggleStatus
  };
}
