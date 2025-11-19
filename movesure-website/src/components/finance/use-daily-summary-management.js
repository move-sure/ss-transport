import { useState } from 'react';
import supabase from '../../app/utils/supabase';

export default function useDailySummaryManagement(user) {
  const [dailySummaries, setDailySummaries] = useState([]);
  const [showDailySummaryModal, setShowDailySummaryModal] = useState(false);
  const [editingSummary, setEditingSummary] = useState(null);
  const [summaryFormData, setSummaryFormData] = useState({
    branch_id: '',
    summary_date: new Date().toISOString().split('T')[0],
    opening_balance: '',
    total_income: '',
    total_expense: '',
    incomeTransactions: [],
    expenseTransactions: [],
    previousClosingDate: null // Track the date of the previous closing balance
  });
  const [summaryFormErrors, setSummaryFormErrors] = useState({});
  const [summarySubmitting, setSummarySubmitting] = useState(false);

  // Fetch previous day's closing balance
  const fetchPreviousDayClosingBalance = async (branchId, currentDate) => {
    try {
      const { data, error } = await supabase
        .from('daily_branch_summary')
        .select('closing_balance, summary_date')
        .eq('branch_id', branchId)
        .lt('summary_date', currentDate)
        .order('summary_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data ? { balance: data.closing_balance, date: data.summary_date } : null;
    } catch (error) {
      console.error('Error fetching previous day closing balance:', error);
      return null;
    }
  };

  // Fetch daily summaries
  const fetchDailySummaries = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_branch_summary')
        .select('*')
        .order('summary_date', { ascending: false });

      if (error) throw error;
      
      // Fetch branch details separately
      if (data && data.length > 0) {
        const branchIds = [...new Set(data.map(s => s.branch_id))];
        const { data: branches, error: branchError } = await supabase
          .from('branch_finance')
          .select('id, branch_name, location')
          .in('id', branchIds);

        if (branchError) throw branchError;

        // Map branch data to summaries
        const branchMap = {};
        branches.forEach(b => {
          branchMap[b.id] = { branch_name: b.branch_name, location: b.location };
        });

        const summariesWithBranches = data.map(s => ({
          ...s,
          branch_finance: branchMap[s.branch_id] || null
        }));

        setDailySummaries(summariesWithBranches);
      } else {
        setDailySummaries([]);
      }
    } catch (error) {
      console.error('Error fetching daily summaries:', error);
      alert('Failed to load daily summaries');
    }
  };

  // Open modal for new summary
  const handleOpenSummaryModal = () => {
    setEditingSummary(null);
    setSummaryFormData({
      branch_id: '',
      summary_date: new Date().toISOString().split('T')[0],
      opening_balance: '',
      total_income: '',
      total_expense: '',
      incomeTransactions: [],
      expenseTransactions: [],
      previousClosingDate: null
    });
    setSummaryFormErrors({});
    setShowDailySummaryModal(true);
  };

  // Open modal for editing
  const handleEditSummary = (summary) => {
    setEditingSummary(summary);
    setSummaryFormData({
      branch_id: summary.branch_id,
      summary_date: summary.summary_date,
      opening_balance: summary.opening_balance.toString(),
      total_income: summary.total_income.toString(),
      total_expense: summary.total_expense.toString()
    });
    setSummaryFormErrors({});
    setShowDailySummaryModal(true);
  };

  // Close modal
  const handleCloseSummaryModal = () => {
    setShowDailySummaryModal(false);
    setEditingSummary(null);
    setSummaryFormData({
      branch_id: '',
      summary_date: new Date().toISOString().split('T')[0],
      opening_balance: '',
      total_income: '',
      total_expense: '',
      incomeTransactions: [],
      expenseTransactions: [],
      previousClosingDate: null
    });
    setSummaryFormErrors({});
  };

  // Fetch transactions for a specific date and branch
  const fetchDayTransactions = async (branchId, date) => {
    try {
      const [incomeRes, expenseRes] = await Promise.all([
        supabase
          .from('income_transactions')
          .select('*')
          .eq('branch_id', branchId)
          .eq('transaction_date', date)
          .order('created_at', { ascending: true }),
        supabase
          .from('expense_transactions')
          .select('*')
          .eq('branch_id', branchId)
          .eq('transaction_date', date)
          .order('created_at', { ascending: true })
      ]);

      if (incomeRes.error) throw incomeRes.error;
      if (expenseRes.error) throw expenseRes.error;

      const incomeData = incomeRes.data || [];
      const expenseData = expenseRes.data || [];

      const totalIncome = incomeData.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      const totalExpense = expenseData.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      return {
        incomeTransactions: incomeData,
        expenseTransactions: expenseData,
        totalIncome,
        totalExpense
      };
    } catch (error) {
      console.error('Error fetching day transactions:', error);
      return {
        incomeTransactions: [],
        expenseTransactions: [],
        totalIncome: 0,
        totalExpense: 0
      };
    }
  };

  // Handle form input changes
  const handleSummaryInputChange = async (e) => {
    const { name, value } = e.target;
    setSummaryFormData(prev => ({ ...prev, [name]: value }));
    if (summaryFormErrors[name]) {
      setSummaryFormErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Auto-fetch previous day's closing balance and current day's transactions
    if (!editingSummary && (name === 'branch_id' || name === 'summary_date')) {
      const newBranchId = name === 'branch_id' ? value : summaryFormData.branch_id;
      const newDate = name === 'summary_date' ? value : summaryFormData.summary_date;
      
      if (newBranchId && newDate) {
        // Fetch previous day's closing balance
        const previousClosingData = await fetchPreviousDayClosingBalance(newBranchId, newDate);
        if (previousClosingData) {
          setSummaryFormData(prev => ({ 
            ...prev, 
            opening_balance: previousClosingData.balance.toString(),
            previousClosingDate: previousClosingData.date
          }));
        } else {
          // No previous day found, set opening balance to 0
          setSummaryFormData(prev => ({ 
            ...prev, 
            opening_balance: '0',
            previousClosingDate: null
          }));
        }

        // Fetch current day's transactions
        const dayTransactions = await fetchDayTransactions(newBranchId, newDate);
        setSummaryFormData(prev => ({
          ...prev,
          total_income: dayTransactions.totalIncome.toString(),
          total_expense: dayTransactions.totalExpense.toString(),
          incomeTransactions: dayTransactions.incomeTransactions,
          expenseTransactions: dayTransactions.expenseTransactions
        }));
      }
    }
  };

  // Validate form
  const validateSummaryForm = () => {
    const errors = {};
    
    if (!summaryFormData.branch_id) {
      errors.branch_id = 'Branch is required';
    }
    if (!summaryFormData.summary_date) {
      errors.summary_date = 'Date is required';
    }
    if (!summaryFormData.opening_balance || parseFloat(summaryFormData.opening_balance) < 0) {
      errors.opening_balance = 'Opening balance must be 0 or greater';
    }
    if (summaryFormData.total_income && parseFloat(summaryFormData.total_income) < 0) {
      errors.total_income = 'Total income cannot be negative';
    }
    if (summaryFormData.total_expense && parseFloat(summaryFormData.total_expense) < 0) {
      errors.total_expense = 'Total expense cannot be negative';
    }
    
    setSummaryFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form
  const handleSummarySubmit = async (e) => {
    e.preventDefault();
    
    if (!validateSummaryForm()) return;
    
    setSummarySubmitting(true);
    
    try {
      const data = {
        branch_id: summaryFormData.branch_id,
        summary_date: summaryFormData.summary_date,
        opening_balance: parseFloat(summaryFormData.opening_balance) || 0,
        total_income: parseFloat(summaryFormData.total_income) || 0,
        total_expense: parseFloat(summaryFormData.total_expense) || 0
      };

      if (editingSummary) {
        data.updated_by_staff_id = user.id;
        data.updated_at = new Date().toISOString();
        const { error } = await supabase
          .from('daily_branch_summary')
          .update(data)
          .eq('id', editingSummary.id);

        if (error) throw error;
        alert('Daily summary updated successfully!');
      } else {
        data.created_by_staff_id = user.id;
        const { error } = await supabase
          .from('daily_branch_summary')
          .insert([data]);

        if (error) {
          if (error.code === '23505') {
            setSummaryFormErrors({ 
              summary_date: 'A summary for this branch and date already exists' 
            });
            setSummarySubmitting(false);
            return;
          }
          throw error;
        }
        alert('Daily summary added successfully!');
      }
      
      handleCloseSummaryModal();
      fetchDailySummaries();
    } catch (error) {
      console.error('Error saving daily summary:', error);
      alert('Failed to save daily summary: ' + error.message);
    } finally {
      setSummarySubmitting(false);
    }
  };

  // Delete summary
  const handleDeleteSummary = async (summaryId, date) => {
    if (!confirm(`Are you sure you want to delete the summary for ${date}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('daily_branch_summary')
        .delete()
        .eq('id', summaryId);

      if (error) throw error;
      
      alert('Daily summary deleted successfully!');
      fetchDailySummaries();
    } catch (error) {
      console.error('Error deleting daily summary:', error);
      alert('Failed to delete daily summary: ' + error.message);
    }
  };

  return {
    dailySummaries,
    showDailySummaryModal,
    editingSummary,
    summaryFormData,
    summaryFormErrors,
    summarySubmitting,
    fetchDailySummaries,
    fetchPreviousDayClosingBalance,
    handleOpenSummaryModal,
    handleEditSummary,
    handleCloseSummaryModal,
    handleSummaryInputChange,
    handleSummarySubmit,
    handleDeleteSummary
  };
}
