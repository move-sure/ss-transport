import { useState, useEffect } from 'react';
import supabase from '../../app/utils/supabase';

export default function useSalaryManagement(user) {
  const [salaryPayments, setSalaryPayments] = useState([]);
  const [salaryAdvances, setSalaryAdvances] = useState([]);
  const [users, setUsers] = useState([]);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editingAdvance, setEditingAdvance] = useState(null);
  const [loading, setLoading] = useState(false);

  // Salary Payment Form
  const [paymentFormData, setPaymentFormData] = useState({
    user_id: '',
    salary_month: '',
    gross_salary: '',
    total_advance_deducted: '0',
    net_salary_paid: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'cash',
    notes: ''
  });
  const [paymentFormErrors, setPaymentFormErrors] = useState({});

  // Advance Form
  const [advanceFormData, setAdvanceFormData] = useState({
    user_id: '',
    advance_date: new Date().toISOString().split('T')[0],
    amount: '',
    reason: ''
  });
  const [advanceFormErrors, setAdvanceFormErrors] = useState({});

  // Fetch all data
  const fetchAllData = async () => {
    if (!user) return;
    await Promise.all([
      fetchSalaryPayments(),
      fetchSalaryAdvances(),
      fetchUsers()
    ]);
  };

  // Fetch Users
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .eq('is_staff', true)
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Fetch Salary Payments
  const fetchSalaryPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('salary_payments')
        .select(`
          *,
          users (
            id,
            name,
            username,
            post
          )
        `)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setSalaryPayments(data || []);
    } catch (error) {
      console.error('Error fetching salary payments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Salary Advances
  const fetchSalaryAdvances = async () => {
    try {
      const { data, error } = await supabase
        .from('salary_advances')
        .select(`
          *,
          users (
            id,
            name,
            username,
            post
          )
        `)
        .order('advance_date', { ascending: false });

      if (error) throw error;
      setSalaryAdvances(data || []);
    } catch (error) {
      console.error('Error fetching salary advances:', error);
    }
  };

  // Get unadjusted advances for a user
  const getUnadjustedAdvances = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('salary_advances')
        .select('*')
        .eq('user_id', userId)
        .is('salary_payment_id', null);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching unadjusted advances:', error);
      return [];
    }
  };

  // Payment Modal Handlers
  const handleOpenSalaryModal = () => {
    setEditingPayment(null);
    setPaymentFormData({
      user_id: '',
      salary_month: '',
      gross_salary: '',
      total_advance_deducted: '0',
      net_salary_paid: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'cash',
      notes: ''
    });
    setPaymentFormErrors({});
    setShowSalaryModal(true);
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setPaymentFormData({
      user_id: payment.user_id,
      salary_month: payment.salary_month,
      gross_salary: payment.gross_salary.toString(),
      total_advance_deducted: payment.total_advance_deducted.toString(),
      net_salary_paid: payment.net_salary_paid.toString(),
      payment_date: payment.payment_date,
      payment_mode: payment.payment_mode || 'cash',
      notes: payment.notes || ''
    });
    setPaymentFormErrors({});
    setShowSalaryModal(true);
  };

  const handleCloseSalaryModal = () => {
    setShowSalaryModal(false);
    setEditingPayment(null);
    setPaymentFormErrors({});
  };

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-calculate net salary
    if (name === 'gross_salary' || name === 'total_advance_deducted') {
      const gross = name === 'gross_salary' ? parseFloat(value) || 0 : parseFloat(paymentFormData.gross_salary) || 0;
      const advance = name === 'total_advance_deducted' ? parseFloat(value) || 0 : parseFloat(paymentFormData.total_advance_deducted) || 0;
      setPaymentFormData(prev => ({
        ...prev,
        net_salary_paid: (gross - advance).toFixed(2)
      }));
    }

    if (paymentFormErrors[name]) {
      setPaymentFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validatePaymentForm = () => {
    const errors = {};
    if (!paymentFormData.user_id) errors.user_id = 'Please select an employee';
    if (!paymentFormData.salary_month) errors.salary_month = 'Please select salary month';
    if (!paymentFormData.gross_salary || parseFloat(paymentFormData.gross_salary) <= 0) {
      errors.gross_salary = 'Please enter a valid gross salary';
    }
    if (!paymentFormData.payment_date) errors.payment_date = 'Please select payment date';
    return errors;
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const errors = validatePaymentForm();
    if (Object.keys(errors).length > 0) {
      setPaymentFormErrors(errors);
      return;
    }

    try {
      setLoading(true);
      const paymentData = {
        user_id: paymentFormData.user_id,
        salary_month: paymentFormData.salary_month,
        gross_salary: parseFloat(paymentFormData.gross_salary),
        total_advance_deducted: parseFloat(paymentFormData.total_advance_deducted) || 0,
        net_salary_paid: parseFloat(paymentFormData.net_salary_paid),
        payment_date: paymentFormData.payment_date,
        payment_mode: paymentFormData.payment_mode,
        notes: paymentFormData.notes
      };

      if (editingPayment) {
        const { error } = await supabase
          .from('salary_payments')
          .update(paymentData)
          .eq('id', editingPayment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('salary_payments')
          .insert([paymentData]);
        if (error) throw error;
      }

      await fetchSalaryPayments();
      handleCloseSalaryModal();
    } catch (error) {
      console.error('Error saving salary payment:', error);
      alert('Error saving salary payment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm('Are you sure you want to delete this salary payment?')) return;

    try {
      const { error } = await supabase
        .from('salary_payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;
      await fetchSalaryPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Error deleting payment: ' + error.message);
    }
  };

  // Advance Modal Handlers
  const handleOpenAdvanceModal = () => {
    setEditingAdvance(null);
    setAdvanceFormData({
      user_id: '',
      advance_date: new Date().toISOString().split('T')[0],
      amount: '',
      reason: ''
    });
    setAdvanceFormErrors({});
    setShowAdvanceModal(true);
  };

  const handleEditAdvance = (advance) => {
    setEditingAdvance(advance);
    setAdvanceFormData({
      user_id: advance.user_id,
      advance_date: advance.advance_date,
      amount: advance.amount.toString(),
      reason: advance.reason || ''
    });
    setAdvanceFormErrors({});
    setShowAdvanceModal(true);
  };

  const handleCloseAdvanceModal = () => {
    setShowAdvanceModal(false);
    setEditingAdvance(null);
    setAdvanceFormErrors({});
  };

  const handleAdvanceInputChange = (e) => {
    const { name, value } = e.target;
    setAdvanceFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (advanceFormErrors[name]) {
      setAdvanceFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateAdvanceForm = () => {
    const errors = {};
    if (!advanceFormData.user_id) errors.user_id = 'Please select an employee';
    if (!advanceFormData.advance_date) errors.advance_date = 'Please select advance date';
    if (!advanceFormData.amount || parseFloat(advanceFormData.amount) <= 0) {
      errors.amount = 'Please enter a valid amount';
    }
    return errors;
  };

  const handleAdvanceSubmit = async (e) => {
    e.preventDefault();
    const errors = validateAdvanceForm();
    if (Object.keys(errors).length > 0) {
      setAdvanceFormErrors(errors);
      return;
    }

    try {
      setLoading(true);
      const advanceData = {
        user_id: advanceFormData.user_id,
        advance_date: advanceFormData.advance_date,
        amount: parseFloat(advanceFormData.amount),
        reason: advanceFormData.reason
      };

      if (editingAdvance) {
        const { error } = await supabase
          .from('salary_advances')
          .update(advanceData)
          .eq('id', editingAdvance.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('salary_advances')
          .insert([advanceData]);
        if (error) throw error;
      }

      await fetchSalaryAdvances();
      handleCloseAdvanceModal();
    } catch (error) {
      console.error('Error saving salary advance:', error);
      alert('Error saving salary advance: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdvance = async (advanceId) => {
    if (!confirm('Are you sure you want to delete this advance?')) return;

    try {
      const { error } = await supabase
        .from('salary_advances')
        .delete()
        .eq('id', advanceId);

      if (error) throw error;
      await fetchSalaryAdvances();
    } catch (error) {
      console.error('Error deleting advance:', error);
      alert('Error deleting advance: ' + error.message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  return {
    salaryPayments,
    salaryAdvances,
    users,
    showSalaryModal,
    showAdvanceModal,
    editingPayment,
    editingAdvance,
    paymentFormData,
    paymentFormErrors,
    advanceFormData,
    advanceFormErrors,
    loading,
    handleOpenSalaryModal,
    handleEditPayment,
    handleCloseSalaryModal,
    handlePaymentInputChange,
    handlePaymentSubmit,
    handleDeletePayment,
    handleOpenAdvanceModal,
    handleEditAdvance,
    handleCloseAdvanceModal,
    handleAdvanceInputChange,
    handleAdvanceSubmit,
    handleDeleteAdvance,
    getUnadjustedAdvances,
    fetchAllData
  };
}
