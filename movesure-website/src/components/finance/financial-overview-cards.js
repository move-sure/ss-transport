import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

export default function FinancialOverviewCards({ financialData, formatCurrency }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(financialData.totalRevenue)}</p>
          </div>
          <div className="p-3 bg-green-100 rounded-lg">
            <TrendingUp className="text-green-600" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Expenses</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(financialData.totalExpenses)}</p>
          </div>
          <div className="p-3 bg-red-100 rounded-lg">
            <TrendingDown className="text-red-600" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Net Profit</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(financialData.netProfit)}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
            <DollarSign className="text-blue-600" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Pending Payments</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(financialData.pendingPayments)}</p>
          </div>
          <div className="p-3 bg-yellow-100 rounded-lg">
            <Calendar className="text-yellow-600" size={24} />
          </div>
        </div>
      </div>
    </div>
  );
}
