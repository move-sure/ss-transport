'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '../../app/utils/supabase';
import { useAuth } from '../utils/auth';
import Navbar from '@/components/dashboard/navbar';
import { Plus, Building2 } from 'lucide-react';
import BranchFormModal from '@/components/finance/branch-form-modal';
import BranchListModal from '@/components/finance/branch-list-modal';
import TransactionsList from '@/components/finance/transactions-list';
import TransactionFormModal from '@/components/finance/transaction-form-modal';
import useBranchManagement from '@/components/finance/use-branch-management';
import useTransactionManagement from '@/components/finance/use-transaction-management';

export default function FinancePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showBranchListModal, setShowBranchListModal] = useState(false);
  const [financialData, setFinancialData] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    pendingPayments: 0
  });
  const [dateRange, setDateRange] = useState('month');

  // Branch management hook
  const {
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
  } = useBranchManagement(user);

  // Transaction management hook
  const {
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
    handleDeleteTransaction
  } = useTransactionManagement(user);

  useEffect(() => {
    if (user) {
      fetchFinancialData();
      fetchBranches();
      fetchTransactions();
    }
  }, [user, dateRange]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch(dateRange) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      // Here you would fetch actual financial data from your database
      // For now, using mock data structure
      const { data: billData, error } = await supabase
        .from('bill_master')
        .select('*')
        .gte('bill_date', startDate.toISOString())
        .lte('bill_date', endDate.toISOString());

      if (error) throw error;

      // Calculate totals (this is mock calculation - adjust based on your schema)
      const totalRevenue = billData?.reduce((sum, bill) => sum + (parseFloat(bill.grand_total) || 0), 0) || 0;
      
      setFinancialData({
        totalRevenue: totalRevenue,
        totalExpenses: totalRevenue * 0.7, // Mock calculation
        netProfit: totalRevenue * 0.3, // Mock calculation
        pendingPayments: totalRevenue * 0.15 // Mock calculation
      });

    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading finance data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Finance Management</h1>
              <p className="text-sm text-gray-600 mt-1">Manage branches and financial operations</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBranchListModal(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all text-sm font-semibold shadow-md"
              >
                <Building2 size={16} />
                <span className="hidden sm:inline">View Branches</span> ({branches.length})
              </button>
              <button
                onClick={handleOpenModal}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-semibold shadow-md"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Create</span>
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Section */}
        <div>
          <TransactionsList
            transactions={transactions}
            formatCurrency={formatCurrency}
            onAddIncome={() => handleOpenTransactionModal('income')}
            onAddExpense={() => handleOpenTransactionModal('expense')}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        </div>
      </div>

      {/* Branch List Modal */}
      <BranchListModal
        showModal={showBranchListModal}
        branches={branches}
        onClose={() => setShowBranchListModal(false)}
        onToggleStatus={handleToggleStatus}
      />

      {/* Branch Form Modal */}
      <BranchFormModal
        showModal={showBranchModal}
        editingBranch={editingBranch}
        formData={formData}
        formErrors={formErrors}
        submitting={submitting}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        onInputChange={handleInputChange}
      />

      {/* Transaction Form Modal */}
      <TransactionFormModal
        showModal={showTransactionModal}
        transactionType={transactionType}
        editingTransaction={editingTransaction}
        formData={transactionFormData}
        formErrors={transactionFormErrors}
        submitting={transactionSubmitting}
        branches={branches}
        onClose={handleCloseTransactionModal}
        onSubmit={handleTransactionSubmit}
        onInputChange={handleTransactionInputChange}
      />
    </div>
  );
}