'use client';

import { useState } from 'react';
import { FileText, RefreshCw, Search, Filter } from 'lucide-react';
import { useAuth } from '@/app/utils/auth';
import { 
  RecentBillTable, 
  BillDetailsModal, 
  useRecentBills 
} from '@/components/company-ledger/recent-bill';

export default function RecentBillPage() {
  const { user } = useAuth();
  const { bills, loading, error, refreshBills, updateBillStatus, deleteBill } = useRecentBills();
  const [selectedBill, setSelectedBill] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deleting, setDeleting] = useState(false);

  // Filter bills
  const filteredBills = bills.filter(bill => {
    // Status filter
    if (statusFilter !== 'ALL' && bill.status !== statusFilter) return false;
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesBillNo = bill.bill_no?.toLowerCase().includes(term);
      const matchesCompany = bill.company?.company_name?.toLowerCase().includes(term);
      const matchesGst = bill.company?.gst_num?.toLowerCase().includes(term);
      if (!matchesBillNo && !matchesCompany && !matchesGst) return false;
    }
    
    return true;
  });

  const handleViewBill = (bill) => {
    setSelectedBill(bill);
  };

  const handleDeleteBill = async (billId) => {
    if (!window.confirm('Are you sure you want to delete this bill? This will also delete all bill items.')) {
      return;
    }
    
    setDeleting(true);
    const result = await deleteBill(billId);
    setDeleting(false);
    
    if (!result.success) {
      alert('Failed to delete bill: ' + result.error);
    }
  };

  const handleStatusChange = async (billId, newStatus) => {
    const result = await updateBillStatus(billId, newStatus, user?.id);
    if (!result.success) {
      alert('Failed to update status: ' + result.error);
    }
  };

  // Calculate summary stats
  const stats = {
    total: bills.length,
    pending: bills.filter(b => b.status === 'PENDING').length,
    final: bills.filter(b => b.status === 'FINAL').length,
    paid: bills.filter(b => b.status === 'PAID').length,
    toPay: bills.filter(b => b.status === 'TO-PAY').length,
    totalAmount: bills.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0)
  };

  return (
    <div className="p-4 w-full h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Recent Bills</h1>
            <p className="text-xs text-gray-500">View and manage monthly bills</p>
          </div>
        </div>

        <button
          onClick={refreshBills}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-3 mb-4 flex-shrink-0">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-white">
          <div className="text-xs opacity-80">Total Bills</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-3 text-white">
          <div className="text-xs opacity-80">Pending</div>
          <div className="text-2xl font-bold">{stats.pending}</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-3 text-white">
          <div className="text-xs opacity-80">Final</div>
          <div className="text-2xl font-bold">{stats.final}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 text-white">
          <div className="text-xs opacity-80">Paid</div>
          <div className="text-2xl font-bold">{stats.paid}</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-3 text-white">
          <div className="text-xs opacity-80">To Pay</div>
          <div className="text-2xl font-bold">{stats.toPay}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3 text-white">
          <div className="text-xs opacity-80">Total Amount</div>
          <div className="text-lg font-bold">₹{stats.totalAmount.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by bill no, company..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="FINAL">Final</option>
            <option value="PAID">Paid</option>
            <option value="TO-PAY">To Pay</option>
          </select>
        </div>

        <div className="text-sm text-gray-500">
          Showing {filteredBills.length} of {bills.length} bills
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex-shrink-0">
          Error: {error}
        </div>
      )}

      {/* Bills Table */}
      <div className="bg-white rounded-xl border border-gray-200 flex-1 flex flex-col overflow-hidden">
        <div className="overflow-auto flex-1">
          <RecentBillTable
            bills={filteredBills}
            loading={loading}
            onViewBill={handleViewBill}
            onDeleteBill={handleDeleteBill}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>

      {/* Bill Details Modal */}
      {selectedBill && (
        <BillDetailsModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
        />
      )}
    </div>
  );
}
