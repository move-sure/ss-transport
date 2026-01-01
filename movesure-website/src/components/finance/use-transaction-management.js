import { useState } from 'react';
import supabase from '../../app/utils/supabase';

export default function useTransactionManagement(user) {
  const [transactions, setTransactions] = useState({ income: [], expense: [] });
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState('income'); // 'income' or 'expense'
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [transactionFormData, setTransactionFormData] = useState({
    branch_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    party_name: '',
    amount: '',
    payment_mode: 'cash',
    receiver: '',
    sender: '',
    description: ''
  });
  const [transactionFormErrors, setTransactionFormErrors] = useState({});
  const [transactionSubmitting, setTransactionSubmitting] = useState(false);

  // Fetch transactions - fetch all transactions with date range filter support
  const fetchTransactions = async (startDate = null, endDate = null) => {
    try {
      let incomeQuery = supabase.from('income_transactions').select('*');
      let expenseQuery = supabase.from('expense_transactions').select('*');

      // Apply date filters if provided
      if (startDate) {
        incomeQuery = incomeQuery.gte('transaction_date', startDate);
        expenseQuery = expenseQuery.gte('transaction_date', startDate);
      }
      if (endDate) {
        incomeQuery = incomeQuery.lte('transaction_date', endDate);
        expenseQuery = expenseQuery.lte('transaction_date', endDate);
      }

      // Order and set a high limit to fetch all records
      incomeQuery = incomeQuery.order('transaction_date', { ascending: false }).limit(10000);
      expenseQuery = expenseQuery.order('transaction_date', { ascending: false }).limit(10000);

      const [incomeRes, expenseRes] = await Promise.all([incomeQuery, expenseQuery]);

      if (incomeRes.error) throw incomeRes.error;
      if (expenseRes.error) throw expenseRes.error;

      setTransactions({
        income: incomeRes.data || [],
        expense: expenseRes.data || []
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      alert('Failed to load transactions');
    }
  };

  // Open modal for new transaction
  const handleOpenTransactionModal = (type) => {
    setTransactionType(type);
    setEditingTransaction(null);
    setTransactionFormData({
      branch_id: '',
      transaction_date: new Date().toISOString().split('T')[0],
      party_name: '',
      amount: '',
      payment_mode: 'cash',
      receiver: type === 'income' ? '' : '',
      sender: type === 'expense' ? '' : '',
      description: ''
    });
    setTransactionFormErrors({});
    setShowTransactionModal(true);
  };

  // Open modal for editing
  const handleEditTransaction = (transaction, type) => {
    setTransactionType(type);
    setEditingTransaction(transaction);
    setTransactionFormData({
      branch_id: transaction.branch_id,
      transaction_date: transaction.transaction_date,
      party_name: transaction.party_name,
      amount: transaction.amount.toString(),
      payment_mode: transaction.payment_mode,
      receiver: transaction.receiver || '',
      sender: transaction.sender || '',
      description: transaction.description || ''
    });
    setTransactionFormErrors({});
    setShowTransactionModal(true);
  };

  // Close modal
  const handleCloseTransactionModal = () => {
    setShowTransactionModal(false);
    setEditingTransaction(null);
    setTransactionFormData({
      branch_id: '',
      transaction_date: new Date().toISOString().split('T')[0],
      party_name: '',
      amount: '',
      payment_mode: 'cash',
      receiver: '',
      sender: '',
      description: ''
    });
    setTransactionFormErrors({});
  };

  // Handle form input changes
  const handleTransactionInputChange = (e) => {
    const { name, value } = e.target;
    setTransactionFormData(prev => ({ ...prev, [name]: value }));
    if (transactionFormErrors[name]) {
      setTransactionFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateTransactionForm = () => {
    const errors = {};
    
    if (!transactionFormData.branch_id) {
      errors.branch_id = 'Branch is required';
    }
    if (!transactionFormData.party_name.trim()) {
      errors.party_name = 'Party name is required';
    }
    if (!transactionFormData.amount || parseFloat(transactionFormData.amount) <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }
    if (transactionType === 'income' && !transactionFormData.receiver.trim()) {
      errors.receiver = 'Receiver is required';
    }
    if (transactionType === 'expense' && !transactionFormData.sender.trim()) {
      errors.sender = 'Sender is required';
    }
    
    setTransactionFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form
  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateTransactionForm()) return;
    
    setTransactionSubmitting(true);
    
    try {
      const table = transactionType === 'income' ? 'income_transactions' : 'expense_transactions';
      const data = {
        branch_id: transactionFormData.branch_id,
        transaction_date: transactionFormData.transaction_date,
        party_name: transactionFormData.party_name.trim(),
        amount: parseFloat(transactionFormData.amount),
        payment_mode: transactionFormData.payment_mode,
        description: transactionFormData.description.trim()
      };

      if (transactionType === 'income') {
        data.receiver = transactionFormData.receiver.trim();
      } else {
        data.sender = transactionFormData.sender.trim();
      }

      if (editingTransaction) {
        data.updated_by_staff_id = user.id;
        data.updated_at = new Date().toISOString();
        const { error } = await supabase.from(table).update(data).eq('id', editingTransaction.id);
        if (error) throw error;
        alert(`${transactionType === 'income' ? 'Income' : 'Expense'} updated successfully!`);
      } else {
        data.created_by_staff_id = user.id;
        const { error } = await supabase.from(table).insert([data]);
        if (error) throw error;
        alert(`${transactionType === 'income' ? 'Income' : 'Expense'} added successfully!`);
      }
      
      handleCloseTransactionModal();
      fetchTransactions();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Failed to save transaction: ' + error.message);
    } finally {
      setTransactionSubmitting(false);
    }
  };

  // Submit bulk transactions
  const handleBulkTransactionSubmit = async (bulkData) => {
    try {
      const table = bulkData.transactionType === 'income' ? 'income_transactions' : 'expense_transactions';
      
      const insertData = bulkData.transactions.map(t => {
        const baseData = {
          branch_id: bulkData.branch_id,
          transaction_date: bulkData.transaction_date,
          party_name: t.party_name,
          amount: t.amount,
          payment_mode: t.payment_mode,
          description: t.description,
          created_by_staff_id: user.id
        };

        // Add receiver for income, sender for expense
        if (bulkData.transactionType === 'income') {
          baseData.receiver = t.receiver;
        } else {
          baseData.sender = t.sender;
        }

        return baseData;
      });

      const { error } = await supabase.from(table).insert(insertData);
      if (error) throw error;

      alert(`${bulkData.transactions.length} ${bulkData.transactionType === 'income' ? 'income' : 'expense'} ${bulkData.transactions.length === 1 ? 'entry' : 'entries'} added successfully!`);
      fetchTransactions();
    } catch (error) {
      console.error('Error saving bulk transactions:', error);
      alert('Failed to save transactions: ' + error.message);
      throw error;
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (transactionId, type) => {
    if (!confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const table = type === 'income' ? 'income_transactions' : 'expense_transactions';
      const { error } = await supabase.from(table).delete().eq('id', transactionId);
      if (error) throw error;
      
      alert(`${type === 'income' ? 'Income' : 'Expense'} deleted successfully!`);
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction: ' + error.message);
    }
  };

  return {
    transactions,
    showTransactionModal,
    transactionType,
    editingTransaction,
    transactionFormData,
    transactionFormErrors,
    transactionSubmitting,
    fetchTransactions,
    handleOpenTransactionModal,
    handleEditTransaction,
    handleCloseTransactionModal,
    handleTransactionInputChange,
    handleTransactionSubmit,
    handleBulkTransactionSubmit,
    handleDeleteTransaction
  };
}
