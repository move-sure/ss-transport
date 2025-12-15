'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Building2, 
  Calendar, 
  Eye, 
  Trash2, 
  ChevronDown,
  ChevronUp,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Edit3,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  FINAL: { label: 'Final', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  PAID: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  'TO-PAY': { label: 'To Pay', color: 'bg-orange-100 text-orange-700', icon: CreditCard }
};

const STAKEHOLDER_COLORS = {
  CONSIGNOR: 'bg-blue-100 text-blue-700',
  CONSIGNEE: 'bg-green-100 text-green-700',
  TRANSPORT: 'bg-purple-100 text-purple-700'
};

export default function RecentBillTable({ 
  bills = [], 
  onViewBill, 
  onDeleteBill,
  onStatusChange,
  loading = false 
}) {
  const router = useRouter();
  const [expandedBill, setExpandedBill] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActionMenu(null);
      }
    };

    if (actionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionMenu]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
  };

  const toggleExpand = (billId) => {
    setExpandedBill(expandedBill === billId ? null : billId);
  };

  const handleStatusChange = (billId, newStatus) => {
    if (onStatusChange) {
      onStatusChange(billId, newStatus);
    }
    setActionMenu(null);
  };

  const handleEditBill = (billId) => {
    router.push(`/company-ledger/recent-bill/${billId}`);
    setActionMenu(null);
  };

  const toggleActionMenu = (e, billId) => {
    e.stopPropagation();
    if (actionMenu === billId) {
      setActionMenu(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 160 // 160px is the menu width (w-40)
      });
      setActionMenu(billId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No Bills Found</h3>
        <p className="text-sm text-gray-500">Create bills from the search page to see them here</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-700 text-white">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold w-8"></th>
            <th className="px-3 py-2 text-left text-xs font-semibold">Bill No</th>
            <th className="px-3 py-2 text-left text-xs font-semibold">Company</th>
            <th className="px-3 py-2 text-left text-xs font-semibold">Bill Date</th>
            <th className="px-3 py-2 text-left text-xs font-semibold">Period</th>
            <th className="px-3 py-2 text-right text-xs font-semibold">Freight</th>
            <th className="px-3 py-2 text-right text-xs font-semibold">Labour</th>
            <th className="px-3 py-2 text-right text-xs font-semibold">Other</th>
            <th className="px-3 py-2 text-right text-xs font-semibold">Total</th>
            <th className="px-3 py-2 text-center text-xs font-semibold">Status</th>
            <th className="px-3 py-2 text-center text-xs font-semibold w-20">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {bills.map((bill, index) => {
            const statusConfig = STATUS_CONFIG[bill.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = statusConfig.icon;
            const company = bill.company;
            const otherCharges = parseFloat(bill.total_bill_charge || 0) + 
                                 parseFloat(bill.total_toll || 0) + 
                                 parseFloat(bill.total_dd || 0) + 
                                 parseFloat(bill.total_other || 0);

            return (
              <React.Fragment key={bill.id}>
                <tr className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                  {/* Expand Button */}
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggleExpand(bill.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {expandedBill === bill.id ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </td>

                  {/* Bill No */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-900">{bill.bill_no}</span>
                    </div>
                  </td>

                  {/* Company */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 truncate max-w-40">
                          {company?.company_name || 'Unknown'}
                        </div>
                        {company?.stakeholder_type && (
                          <span className={`inline-block px-1 py-0.5 rounded text-[10px] ${STAKEHOLDER_COLORS[company.stakeholder_type] || 'bg-gray-100 text-gray-700'}`}>
                            {company.stakeholder_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Bill Date */}
                  <td className="px-3 py-2">
                    <span className="text-sm text-gray-700">{formatDate(bill.bill_date)}</span>
                  </td>

                  {/* Period */}
                  <td className="px-3 py-2">
                    <div className="text-xs text-gray-600">
                      <span>{formatDate(bill.billing_start_date)}</span>
                      <span className="mx-1">-</span>
                      <span>{formatDate(bill.billing_end_date)}</span>
                    </div>
                  </td>

                  {/* Freight */}
                  <td className="px-3 py-2 text-right">
                    <span className="text-sm text-gray-700">{formatCurrency(bill.total_freight)}</span>
                  </td>

                  {/* Labour */}
                  <td className="px-3 py-2 text-right">
                    <span className="text-sm text-gray-700">{formatCurrency(bill.total_labour)}</span>
                  </td>

                  {/* Other */}
                  <td className="px-3 py-2 text-right">
                    <span className="text-sm text-gray-700">{formatCurrency(otherCharges)}</span>
                  </td>

                  {/* Total */}
                  <td className="px-3 py-2 text-right">
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(bill.total_amount)}</span>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={(e) => toggleActionMenu(e, bill.id)}
                      className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-500" />
                    </button>
                  </td>
                </tr>

                {/* Expanded Row */}
                {expandedBill === bill.id && (
                  <tr className="bg-slate-50">
                    <td colSpan={11} className="px-6 py-3">
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Remark:</span>
                          <p className="text-gray-900">{bill.remark || 'No remark'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Bill Charges:</span>
                          <p className="text-gray-900">{formatCurrency(bill.total_bill_charge)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Toll:</span>
                          <p className="text-gray-900">{formatCurrency(bill.total_toll)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">DD Charges:</span>
                          <p className="text-gray-900">{formatCurrency(bill.total_dd)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Created By:</span>
                          <p className="text-gray-900">{bill.created_by_user?.name || bill.created_by_user?.username || 'Unknown'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Created At:</span>
                          <p className="text-gray-900">{formatDate(bill.created_at)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Company GST:</span>
                          <p className="text-gray-900">{company?.gst_num || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Company City:</span>
                          <p className="text-gray-900">{company?.city || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Fixed Position Action Menu Portal */}
      {actionMenu && (
        <>
          {/* Backdrop to close menu */}
          <div 
            className="fixed inset-0 z-[100]" 
            onClick={() => setActionMenu(null)}
          />
          
          {/* Menu */}
          <div 
            ref={menuRef}
            className="fixed z-[101] w-44 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
            style={{ 
              top: `${menuPosition.top}px`, 
              left: `${menuPosition.left}px` 
            }}
          >
            {/* Edit / View Details */}
            <button
              onClick={() => handleEditBill(actionMenu)}
              className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2 font-medium"
            >
              <ExternalLink className="h-4 w-4 text-blue-500" />
              View / Edit Bill
            </button>
            
            <button
              onClick={() => { 
                const bill = bills.find(b => b.id === actionMenu);
                onViewBill?.(bill); 
                setActionMenu(null); 
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Quick View
            </button>
            
            {/* Status Section */}
            <div className="border-t border-gray-100">
              <div className="px-3 py-1.5 text-[10px] text-gray-400 uppercase font-semibold bg-gray-50">Change Status</div>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const currentBill = bills.find(b => b.id === actionMenu);
                return (
                  <button
                    key={key}
                    onClick={() => handleStatusChange(actionMenu, key)}
                    className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 ${
                      currentBill?.status === key ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <config.icon className="h-3.5 w-3.5" />
                    {config.label}
                    {currentBill?.status === key && (
                      <span className="ml-auto text-blue-500">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Delete */}
            <div className="border-t border-gray-100">
              <button
                onClick={() => { onDeleteBill?.(actionMenu); setActionMenu(null); }}
                className="w-full px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
              >
                <Trash2 className="h-4 w-4" />
                Delete Bill
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
