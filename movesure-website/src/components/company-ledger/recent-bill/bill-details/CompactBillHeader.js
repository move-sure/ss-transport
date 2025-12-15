'use client';

import React from 'react';
import { 
  FileText, 
  Building2, 
  Calendar, 
  Phone,
  CheckCircle,
  Clock,
  CreditCard,
  Printer,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: Clock },
  FINAL: { label: 'Final', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: CheckCircle },
  PAID: { label: 'Paid', color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle },
  'TO-PAY': { label: 'To Pay', color: 'bg-orange-100 text-orange-700 border-orange-300', icon: CreditCard }
};

const STAKEHOLDER_COLORS = {
  CONSIGNOR: 'bg-blue-100 text-blue-700',
  CONSIGNEE: 'bg-green-100 text-green-700',
  TRANSPORT: 'bg-purple-100 text-purple-700'
};

export default function CompactBillHeader({ 
  bill, 
  onStatusChange
}) {
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

  const statusConfig = STATUS_CONFIG[bill?.status] || STATUS_CONFIG.PENDING;
  const company = bill?.company;

  if (!bill) return null;

  const otherCharges = parseFloat(bill.total_toll || 0) + parseFloat(bill.total_dd || 0) + parseFloat(bill.total_other || 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Compact Header Bar */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-3 py-2 flex items-center justify-between rounded-t-lg">
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 text-white" />
          <div>
            <span className="text-sm font-bold text-white">Bill #{bill.bill_no}</span>
            <span className="text-[10px] text-white/60 ml-2">
              {formatDate(bill.created_at)} by {bill.created_by_user?.name || 'Unknown'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Dropdown */}
          <select
            value={bill.status}
            onChange={(e) => onStatusChange?.(e.target.value)}
            className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${statusConfig.color}`}
          >
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs transition-colors"
          >
            <Printer className="h-3 w-3" />
            Print
          </button>
        </div>
      </div>

      {/* Compact Info Row */}
      <div className="px-3 py-2 flex items-center justify-between gap-4 text-xs">
        {/* Company */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          {company?.stakeholder_type && (
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium flex-shrink-0 ${STAKEHOLDER_COLORS[company.stakeholder_type] || 'bg-gray-100 text-gray-700'}`}>
              {company.stakeholder_type}
            </span>
          )}
          <span className="font-semibold text-gray-900 truncate">{company?.company_name || 'Unknown'}</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-500">GST: {company?.gst_num || 'N/A'}</span>
          {company?.mobile_number && (
            <>
              <span className="text-gray-400">|</span>
              <Phone className="h-3 w-3 text-gray-400" />
              <span className="text-gray-500">{company.mobile_number}</span>
            </>
          )}
        </div>

        {/* Dates */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Calendar className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-gray-600">{formatDate(bill.billing_start_date)}</span>
          <span className="text-gray-400">→</span>
          <span className="text-gray-600">{formatDate(bill.billing_end_date)}</span>
        </div>

        {/* Amounts - Compact */}
        <div className="flex items-center gap-3 flex-shrink-0 bg-gray-50 rounded px-2 py-1">
          <div className="text-center">
            <div className="text-[9px] text-gray-400 uppercase">Freight</div>
            <div className="font-semibold text-gray-700">{formatCurrency(bill.total_freight)}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-gray-400 uppercase">Labour</div>
            <div className="font-semibold text-gray-700">{formatCurrency(bill.total_labour)}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-gray-400 uppercase">Bill Ch</div>
            <div className="font-semibold text-gray-700">{formatCurrency(bill.total_bill_charge)}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-gray-400 uppercase">Other</div>
            <div className="font-semibold text-gray-700">{formatCurrency(otherCharges)}</div>
          </div>
          <div className="h-6 w-px bg-gray-300" />
          <div className="text-center">
            <div className="text-[9px] text-green-600 uppercase font-medium">Total</div>
            <div className="font-bold text-green-700 text-sm">{formatCurrency(bill.total_amount)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
