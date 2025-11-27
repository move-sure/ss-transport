import React, { useState } from 'react';
import { X, IndianRupee, CreditCard, Calendar, TrendingDown, Users } from 'lucide-react';

export default function SalaryManagementModal({
  showModal,
  salaryPayments,
  salaryAdvances,
  users,
  onClose,
  onOpenPaymentModal,
  onOpenAdvanceModal,
  onEditPayment,
  onDeletePayment,
  onEditAdvance,
  onDeleteAdvance
}) {
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' or 'advances'
  const [filterMonth, setFilterMonth] = useState('');

  if (!showModal) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown';
  };

  const filteredPayments = filterMonth
    ? salaryPayments.filter(p => p.salary_month.startsWith(filterMonth))
    : salaryPayments;

  const filteredAdvances = filterMonth
    ? salaryAdvances.filter(a => a.advance_date.startsWith(filterMonth))
    : salaryAdvances;

  const totalPaidThisMonth = filteredPayments.reduce((sum, p) => sum + parseFloat(p.net_salary_paid), 0);
  const totalAdvancesThisMonth = filteredAdvances.filter(a => !a.salary_payment_id).reduce((sum, a) => sum + parseFloat(a.amount), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <IndianRupee size={28} />
              Salary Management
            </h2>
            <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full transition-all">
              <X size={24} />
            </button>
          </div>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
                <Users size={16} />
                <span>Total Employees</span>
              </div>
              <div className="text-3xl font-bold">{users.length}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
                <IndianRupee size={16} />
                <span>Salaries Paid</span>
              </div>
              <div className="text-2xl font-bold">{formatCurrency(totalPaidThisMonth)}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
                <TrendingDown size={16} />
                <span>Pending Advances</span>
              </div>
              <div className="text-2xl font-bold">{formatCurrency(totalAdvancesThisMonth)}</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={onOpenPaymentModal}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold shadow-md"
            >
              <IndianRupee size={18} />
              Pay Salary
            </button>
            <button
              onClick={onOpenAdvanceModal}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all font-semibold shadow-md"
            >
              <CreditCard size={18} />
              Give Advance
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <Calendar size={18} className="text-gray-600" />
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b-2 border-gray-200">
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-6 py-3 font-semibold transition-all ${
                activeTab === 'payments'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-0.5'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Salary Payments ({filteredPayments.length})
            </button>
            <button
              onClick={() => setActiveTab('advances')}
              className={`px-6 py-3 font-semibold transition-all ${
                activeTab === 'advances'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-0.5'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Advances ({filteredAdvances.length})
            </button>
          </div>

          {/* Content */}
          {activeTab === 'payments' ? (
            <div className="space-y-3">
              {filteredPayments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <IndianRupee size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold">No salary payments found</p>
                </div>
              ) : (
                filteredPayments.map(payment => (
                  <div key={payment.id} className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 hover:shadow-lg transition-all">
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div className="flex-1 min-w-[200px]">
                        <h4 className="font-bold text-lg text-gray-900">
                          {payment.users?.name || getUserName(payment.user_id)}
                        </h4>
                        <p className="text-sm text-gray-600">{payment.users?.post || 'N/A'}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm">
                          <span className="text-gray-700">
                            <strong>Month:</strong> {new Date(payment.salary_month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>
                          <span className="text-gray-700">
                            <strong>Paid On:</strong> {new Date(payment.payment_date).toLocaleDateString()}
                          </span>
                          <span className="text-gray-700">
                            <strong>Mode:</strong> {payment.payment_mode || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">
                            Gross: <span className="font-semibold">{formatCurrency(payment.gross_salary)}</span>
                          </div>
                          <div className="text-sm text-orange-600">
                            Advance: <span className="font-semibold">-{formatCurrency(payment.total_advance_deducted)}</span>
                          </div>
                          <div className="text-xl font-bold text-green-700">
                            {formatCurrency(payment.net_salary_paid)}
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => onEditPayment(payment)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDeletePayment(payment.id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                    {payment.notes && (
                      <div className="mt-3 pt-3 border-t border-green-300">
                        <p className="text-sm text-gray-700"><strong>Notes:</strong> {payment.notes}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAdvances.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CreditCard size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold">No advances found</p>
                </div>
              ) : (
                filteredAdvances.map(advance => (
                  <div key={advance.id} className={`rounded-xl p-4 hover:shadow-lg transition-all border-2 ${
                    advance.salary_payment_id
                      ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300'
                      : 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200'
                  }`}>
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div className="flex-1 min-w-[200px]">
                        <h4 className="font-bold text-lg text-gray-900">
                          {advance.users?.name || getUserName(advance.user_id)}
                        </h4>
                        <p className="text-sm text-gray-600">{advance.users?.post || 'N/A'}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm">
                          <span className="text-gray-700">
                            <strong>Date:</strong> {new Date(advance.advance_date).toLocaleDateString()}
                          </span>
                          {advance.salary_payment_id && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              Adjusted
                            </span>
                          )}
                          {!advance.salary_payment_id && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-orange-700">
                          {formatCurrency(advance.amount)}
                        </div>
                        {!advance.salary_payment_id && (
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => onEditAdvance(advance)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onDeleteAdvance(advance.id)}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {advance.reason && (
                      <div className="mt-3 pt-3 border-t border-orange-300">
                        <p className="text-sm text-gray-700"><strong>Reason:</strong> {advance.reason}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
