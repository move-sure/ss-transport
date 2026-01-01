import React, { useState, useMemo } from 'react';
import { Plus, TrendingUp, TrendingDown, Calendar, DollarSign, User, CreditCard, Edit, Trash2, FileText, Layers, Building2, Filter, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';

export default function TransactionsList({
  transactions,
  branches,
  formatCurrency,
  onAddIncome,
  onAddExpense,
  onAddBulkIncome,
  onAddBulkExpense,
  onEditTransaction,
  onDeleteTransaction,
  onSearchByDate
}) {
  const [activeTab, setActiveTab] = useState('income');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('transaction_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Handle sort toggle
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Get sort icon
  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-400" />;
    return sortDirection === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />;
  };

  // Filter and sort transactions
  const processTransactions = (transactionsList) => {
    let filtered = transactionsList.filter(transaction => {
      // Branch filter
      if (filterBranch && transaction.branch_id !== filterBranch) return false;
      
      // Date range filter
      if (filterStartDate) {
        const startDate = new Date(filterStartDate);
        const transDate = new Date(transaction.transaction_date);
        if (transDate < startDate) return false;
      }
      if (filterEndDate) {
        const endDate = new Date(filterEndDate);
        endDate.setHours(23, 59, 59, 999);
        const transDate = new Date(transaction.transaction_date);
        if (transDate > endDate) return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesParty = transaction.party_name?.toLowerCase().includes(query);
        const matchesAmount = transaction.amount?.toString().includes(query);
        const matchesDescription = transaction.description?.toLowerCase().includes(query);
        const matchesReceiver = transaction.receiver?.toLowerCase().includes(query);
        const matchesSender = transaction.sender?.toLowerCase().includes(query);
        const matchesMode = transaction.payment_mode?.toLowerCase().includes(query);
        
        if (!matchesParty && !matchesAmount && !matchesDescription && !matchesReceiver && !matchesSender && !matchesMode) {
          return false;
        }
      }
      
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case 'transaction_date':
          aVal = new Date(a.transaction_date);
          bVal = new Date(b.transaction_date);
          break;
        case 'amount':
          aVal = parseFloat(a.amount) || 0;
          bVal = parseFloat(b.amount) || 0;
          break;
        case 'party_name':
          aVal = (a.party_name || '').toLowerCase();
          bVal = (b.party_name || '').toLowerCase();
          break;
        case 'payment_mode':
          aVal = (a.payment_mode || '').toLowerCase();
          bVal = (b.payment_mode || '').toLowerCase();
          break;
        default:
          aVal = a[sortField];
          bVal = b[sortField];
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const filteredIncome = useMemo(() => processTransactions(transactions.income), 
    [transactions.income, filterBranch, filterStartDate, filterEndDate, searchQuery, sortField, sortDirection]);
  const filteredExpense = useMemo(() => processTransactions(transactions.expense), 
    [transactions.expense, filterBranch, filterStartDate, filterEndDate, searchQuery, sortField, sortDirection]);

  const currentTransactions = activeTab === 'income' ? filteredIncome : filteredExpense;
  
  // Pagination
  const totalPages = Math.ceil(currentTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = currentTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  const totalIncome = filteredIncome.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const totalExpense = filteredExpense.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  // Reset page when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterBranch('');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters = filterBranch || filterStartDate || filterEndDate || searchQuery;

  return (
    <div className="overflow-hidden">
      {/* Header with Summary */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex gap-2">
            <div className="flex gap-1">
              <button
                onClick={onAddIncome}
                className="flex items-center justify-center gap-1 px-2 sm:px-3 py-2 bg-emerald-600 text-white rounded-l-lg hover:bg-emerald-700 transition-all text-sm font-semibold shadow-md"
                title="Add Single Income"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Income</span>
              </button>
              <button
                onClick={onAddBulkIncome}
                className="flex items-center justify-center gap-1 px-2 py-2 bg-emerald-700 text-white rounded-r-lg hover:bg-emerald-800 transition-all text-sm font-semibold shadow-md border-l border-emerald-500"
                title="Add Multiple Income Entries"
              >
                <Layers size={16} />
              </button>
            </div>
            <div className="flex gap-1">
              <button
                onClick={onAddExpense}
                className="flex items-center justify-center gap-1 px-2 sm:px-3 py-2 bg-rose-600 text-white rounded-l-lg hover:bg-rose-700 transition-all text-sm font-semibold shadow-md"
                title="Add Single Expense"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Expense</span>
              </button>
              <button
                onClick={onAddBulkExpense}
                className="flex items-center justify-center gap-1 px-2 py-2 bg-rose-700 text-white rounded-r-lg hover:bg-rose-800 transition-all text-sm font-semibold shadow-md border-l border-rose-500"
                title="Add Multiple Expense Entries"
              >
                <Layers size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-4">
          {/* Search Bar */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by party name, amount, description, receiver/sender..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm text-gray-900"
            />
          </div>
          
          {/* Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                <Building2 size={14} className="inline mr-1" />
                Branch
              </label>
              <select
                value={filterBranch}
                onChange={(e) => { setFilterBranch(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm text-gray-900"
              >
                <option value="">All Branches</option>
                {branches && Array.isArray(branches) && branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                <Calendar size={14} className="inline mr-1" />
                From Date
              </label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => { setFilterStartDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                <Calendar size={14} className="inline mr-1" />
                To Date
              </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => { setFilterEndDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm text-gray-900"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => onSearchByDate && onSearchByDate(filterStartDate, filterEndDate)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold shadow-md flex items-center gap-1"
              >
                <Search size={16} />
                Search
              </button>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    clearFilters();
                    onSearchByDate && onSearchByDate(null, null);
                  }}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="text-emerald-600" size={16} />
              <span className="text-xs font-semibold text-emerald-700">Total Income</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-emerald-900">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-rose-50 rounded-lg p-3 border border-rose-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="text-rose-600" size={16} />
              <span className="text-xs font-semibold text-rose-700">Total Expense</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-rose-900">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="text-slate-600" size={16} />
              <span className="text-xs font-semibold text-slate-700">Net Balance</span>
            </div>
            <p className={`text-base sm:text-lg font-bold ${totalIncome - totalExpense >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
              {formatCurrency(totalIncome - totalExpense)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => handleTabChange('income')}
          className={`flex-1 px-4 sm:px-6 py-3 font-semibold transition-all text-sm sm:text-base ${
            activeTab === 'income'
              ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center justify-center gap-1 sm:gap-2">
            <TrendingUp size={16} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Income</span> ({filteredIncome.length})
          </span>
        </button>
        <button
          onClick={() => handleTabChange('expense')}
          className={`flex-1 px-4 sm:px-6 py-3 font-semibold transition-all text-sm sm:text-base ${
            activeTab === 'expense'
              ? 'text-rose-700 border-b-2 border-rose-600 bg-rose-50'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center justify-center gap-1 sm:gap-2">
            <TrendingDown size={16} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Expense</span> ({filteredExpense.length})
          </span>
        </button>
      </div>

      {/* Transactions Table */}
      {currentTransactions.length === 0 ? (
        <div className="text-center py-16">
          {activeTab === 'income' ? (
            <TrendingUp className="mx-auto text-gray-400 mb-4" size={48} />
          ) : (
            <TrendingDown className="mx-auto text-gray-400 mb-4" size={48} />
          )}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No {activeTab} transactions found
          </h3>
          <p className="text-gray-600 mb-6">
            {hasActiveFilters ? 'Try adjusting your filters or search query' : `Start by adding your first ${activeTab} transaction`}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all shadow-md"
            >
              Clear Filters
            </button>
          ) : (
            <button
              onClick={activeTab === 'income' ? onAddIncome : onAddExpense}
              className={`inline-flex items-center gap-2 px-6 py-3 text-white rounded-lg transition-all shadow-md ${
                activeTab === 'income' 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              <Plus size={20} />
              Add {activeTab === 'income' ? 'Income' : 'Expense'}
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  onClick={() => handleSort('transaction_date')}
                  className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Date {getSortIcon('transaction_date')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('party_name')}
                  className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Party {getSortIcon('party_name')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('amount')}
                  className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Amount {getSortIcon('amount')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('payment_mode')}
                  className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Mode {getSortIcon('payment_mode')}
                  </div>
                </th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {activeTab === 'income' ? 'Receiver' : 'Sender'}
                </th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Description</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center text-xs sm:text-sm text-gray-900">
                      <Calendar className="mr-1 sm:mr-2 text-gray-400" size={14} />
                      {new Date(transaction.transaction_date).toLocaleDateString('en-IN')}
                    </div>
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="mr-1 sm:mr-2 text-gray-400" size={14} />
                      <span className="text-xs sm:text-sm font-medium text-gray-900">{transaction.party_name}</span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <span className={`text-xs sm:text-sm font-bold ${
                      activeTab === 'income' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {formatCurrency(transaction.amount)}
                    </span>
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <CreditCard className="mr-1 sm:mr-2 text-gray-400" size={14} />
                      <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${
                        transaction.payment_mode === 'cash'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {transaction.payment_mode === 'cash' ? 'Cash' : 'Online'}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                    {transaction.receiver || transaction.sender || 'N/A'}
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-start max-w-xs">
                      {transaction.description ? (
                        <>
                          <FileText className="mr-1 sm:mr-2 text-gray-400 flex-shrink-0 mt-0.5" size={14} />
                          <span className="line-clamp-2">{transaction.description}</span>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">No description</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEditTransaction(transaction, activeTab)}
                        className="p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Transaction"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(transaction.id, activeTab)}
                        className="p-1.5 sm:p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Transaction"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {currentTransactions.length > 0 && (
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, currentTransactions.length)} of {currentTransactions.length} entries
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Last
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
