'use client';

import { useState, useEffect, useCallback } from 'react';
import supabase from '@/app/utils/supabase';

export default function useChallanExpenseManagement(user) {
  const [challanExpenses, setChallanExpenses] = useState([]);
  const [challans, setChallans] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    challan_no: '',
    loading_labour: 0,
    unloading_labour: 0,
    driver_expense: 0,
    cell_tax: 0,
    grease: 200,
    uncle_g: 300,
    cc_other: 0,
    diesel: 0,
    crossing: 0,
    total_kaat: 0,
    total_pf: 0,
    total_profit: 0,
    remarks: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Fetch all challan expenses
  const fetchChallanExpenses = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('challan_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChallanExpenses(data || []);
    } catch (error) {
      console.error('Error fetching challan expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch all dispatched challans for dropdown
  const fetchChallans = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('challan_details')
        .select('id, challan_no, date, is_active, is_dispatched, dispatch_date')
        .eq('is_active', true)
        .eq('is_dispatched', true)
        .order('dispatch_date', { ascending: false });

      if (error) throw error;
      setChallans(data || []);
    } catch (error) {
      console.error('Error fetching challans:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchChallanExpenses();
      fetchChallans();
    }
  }, [user, fetchChallanExpenses, fetchChallans]);

  const handleOpenModal = () => {
    setEditingExpense(null);
    setFormData({
      challan_no: '',
      loading_labour: 0,
      unloading_labour: 0,
      driver_expense: 0,
      cell_tax: 0,
      grease: 200,
      uncle_g: 300,
      cc_other: 0,
      diesel: 0,
      crossing: 0,
      total_kaat: 0,
      total_pf: 0,
      total_profit: 0,
      remarks: ''
    });
    setFormErrors({});
    setShowExpenseModal(true);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setFormData({
      challan_no: expense.challan_no || '',
      loading_labour: expense.loading_labour || 0,
      unloading_labour: expense.unloading_labour || 0,
      driver_expense: expense.driver_expense || 0,
      cell_tax: expense.cell_tax || 0,
      grease: expense.grease || 200,
      uncle_g: expense.uncle_g || 300,
      cc_other: expense.cc_other || 0,
      diesel: expense.diesel || 0,
      crossing: expense.crossing || 0,
      total_kaat: expense.total_kaat || 0,
      total_pf: expense.total_pf || 0,
      total_profit: expense.total_profit || 0,
      remarks: expense.remarks || ''
    });
    setFormErrors({});
    setShowExpenseModal(true);
  };

  const handleCloseModal = () => {
    setShowExpenseModal(false);
    setEditingExpense(null);
    setFormData({
      challan_no: '',
      loading_labour: 0,
      unloading_labour: 0,
      driver_expense: 0,
      cell_tax: 0,
      grease: 200,
      uncle_g: 300,
      cc_other: 0,
      diesel: 0,
      crossing: 0,
      total_kaat: 0,
      total_pf: 0,
      total_profit: 0,
      remarks: ''
    });
    setFormErrors({});
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.challan_no?.trim()) {
      errors.challan_no = 'Challan number is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const expenseData = {
        challan_no: formData.challan_no.trim(),
        loading_labour: parseFloat(formData.loading_labour) || 0,
        unloading_labour: parseFloat(formData.unloading_labour) || 0,
        driver_expense: parseFloat(formData.driver_expense) || 0,
        cell_tax: parseFloat(formData.cell_tax) || 0,
        grease: parseFloat(formData.grease) || 0,
        uncle_g: parseFloat(formData.uncle_g) || 0,
        cc_other: parseFloat(formData.cc_other) || 0,
        diesel: parseFloat(formData.diesel) || 0,
        crossing: parseFloat(formData.crossing) || 0,
        total_kaat: parseFloat(formData.total_kaat) || 0,
        total_pf: parseFloat(formData.total_pf) || 0,
        total_profit: parseFloat(formData.total_profit) || 0,
        remarks: formData.remarks?.trim() || null,
        updated_at: new Date().toISOString()
      };

      if (editingExpense) {
        // Update existing expense
        expenseData.updated_by = user.id;

        const { error } = await supabase
          .from('challan_expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);

        if (error) throw error;
      } else {
        // Create new expense
        expenseData.created_by = user.id;
        expenseData.created_at = new Date().toISOString();

        const { error } = await supabase
          .from('challan_expenses')
          .insert([expenseData]);

        if (error) throw error;
      }

      await fetchChallanExpenses();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving challan expense:', error);
      alert('Failed to save challan expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('Are you sure you want to delete this expense record?')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('challan_expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      await fetchChallanExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return {
    challanExpenses,
    challans,
    showExpenseModal,
    editingExpense,
    formData,
    formErrors,
    loading,
    fetchChallanExpenses,
    fetchChallans,
    handleOpenModal,
    handleEditExpense,
    handleCloseModal,
    handleInputChange,
    handleSubmit,
    handleDeleteExpense
  };
}
