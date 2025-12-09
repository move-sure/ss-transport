'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../utils/auth';
import Navbar from '@/components/dashboard/navbar';
import { Plus, TrendingUp, TrendingDown, DollarSign, ArrowLeft } from 'lucide-react';
import useChallanExpenseManagement from '@/components/challan-finance/use-challan-expense-management';
import ChallanExpenseFormModal from '@/components/challan-finance/challan-expense-form-modal';
import ChallanExpenseList from '@/components/challan-finance/challan-expense-list';

export default function ChallanFinancePage() {
  const router = useRouter();
  const { user } = useAuth();

  const {
    challanExpenses,
    challans,
    showExpenseModal,
    editingExpense,
    formData,
    formErrors,
    loading,
    handleOpenModal,
    handleEditExpense,
    handleCloseModal,
    handleInputChange,
    handleSubmit,
    handleDeleteExpense
  } = useChallanExpenseManagement(user);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate aggregate statistics
  const totalExpensesAmount = challanExpenses.reduce((sum, exp) => {
    return sum + (
      parseFloat(exp.loading_labour || 0) +
      parseFloat(exp.unloading_labour || 0) +
      parseFloat(exp.driver_expense || 0) +
      parseFloat(exp.cell_tax || 0) +
      parseFloat(exp.grease || 0) +
      parseFloat(exp.uncle_g || 0) +
      parseFloat(exp.cc_other || 0) +
      parseFloat(exp.diesel || 0) +
      parseFloat(exp.crossing || 0)
    );
  }, 0);

  const totalProfitAmount = challanExpenses.reduce((sum, exp) => sum + parseFloat(exp.total_profit || 0), 0);
  const totalKaatAmount = challanExpenses.reduce((sum, exp) => sum + parseFloat(exp.total_kaat || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />
      
      <div className="w-full px-2 sm:px-4 lg:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <button
                onClick={() => router.push('/fnance')}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-2 font-semibold transition-all"
              >
                <ArrowLeft size={20} />
                Back to Finance
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Challan Expense Management</h1>
              <p className="text-sm text-gray-600 mt-1">Track and manage challan-wise expenses</p>
            </div>
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-semibold shadow-lg"
            >
              <Plus size={20} />
              <span>Add Challan Expense</span>
            </button>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-semibold mb-1">Total Records</p>
                <p className="text-3xl font-bold text-slate-900">{challanExpenses.length}</p>
              </div>
              <div className="bg-slate-100 p-3 rounded-xl">
                <DollarSign size={32} className="text-slate-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-semibold mb-1">Total Expenses</p>
                <p className="text-2xl font-bold text-slate-700">{formatCurrency(totalExpensesAmount)}</p>
              </div>
              <div className="bg-slate-100 p-3 rounded-xl">
                <TrendingDown size={32} className="text-slate-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-semibold mb-1">Total Kaat</p>
                <p className="text-2xl font-bold text-slate-700">{formatCurrency(totalKaatAmount)}</p>
              </div>
              <div className="bg-slate-100 p-3 rounded-xl">
                <TrendingDown size={32} className="text-slate-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border-2 border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-semibold mb-1">Total Profit</p>
                <p className="text-2xl font-bold text-slate-700">{formatCurrency(totalProfitAmount)}</p>
              </div>
              <div className="bg-slate-100 p-3 rounded-xl">
                <TrendingUp size={32} className="text-slate-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Expense List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <ChallanExpenseList
            expenses={challanExpenses}
            loading={loading}
            onEditExpense={handleEditExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        </div>
      </div>

      {/* Expense Form Modal */}
      <ChallanExpenseFormModal
        showModal={showExpenseModal}
        editingExpense={editingExpense}
        formData={formData}
        formErrors={formErrors}
        loading={loading}
        challans={challans}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        onInputChange={handleInputChange}
      />
    </div>
  );
}
