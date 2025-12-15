'use client';

import React from 'react';
import { 
  FileText, 
  Building2, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin,
  CheckCircle,
  Clock,
  CreditCard,
  Edit3,
  Printer
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

export default function BillHeader({ 
  bill, 
  onStatusChange, 
  onEdit,
  isEditing = false 
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
  const StatusIcon = statusConfig.icon;
  const company = bill?.company;

  if (!bill) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Bill #{bill.bill_no}</h2>
            <p className="text-xs text-white/70">
              Created on {formatDate(bill.created_at)} by {bill.created_by_user?.name || 'Unknown'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={bill.status}
              onChange={(e) => onStatusChange?.(e.target.value)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium cursor-pointer appearance-none pr-8 ${statusConfig.color}`}
              style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
            >
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {/* Bill Info Grid */}
      <div className="p-4">
        <div className="grid grid-cols-4 gap-4">
          {/* Company Info */}
          <div className="col-span-2 bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase">Company Details</span>
              {company?.stakeholder_type && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STAKEHOLDER_COLORS[company.stakeholder_type] || 'bg-gray-100 text-gray-700'}`}>
                  {company.stakeholder_type}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{company?.company_name || 'Unknown Company'}</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1.5 text-gray-600">
                <span className="text-xs text-gray-400">GST:</span>
                <span>{company?.gst_num || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <span className="text-xs text-gray-400">PAN:</span>
                <span>{company?.pan || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <Phone className="h-3 w-3 text-gray-400" />
                <span>{company?.mobile_number || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <Mail className="h-3 w-3 text-gray-400" />
                <span className="truncate">{company?.email || 'N/A'}</span>
              </div>
              <div className="col-span-2 flex items-start gap-1.5 text-gray-600">
                <MapPin className="h-3 w-3 text-gray-400 mt-0.5" />
                <span className="text-xs">{company?.company_address || ''} {company?.city || ''} {company?.state || ''} {company?.pincode || ''}</span>
              </div>
            </div>
          </div>

          {/* Bill Dates */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase">Bill Period</span>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-400">Bill Date</span>
                <p className="text-sm font-semibold text-gray-900">{formatDate(bill.bill_date)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-gray-400">From</span>
                  <p className="text-sm font-medium text-gray-700">{formatDate(bill.billing_start_date)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">To</span>
                  <p className="text-sm font-medium text-gray-700">{formatDate(bill.billing_end_date)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Amount Summary */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 text-white">
            <div className="text-xs opacity-80 mb-1">Total Amount</div>
            <div className="text-2xl font-bold mb-2">{formatCurrency(bill.total_amount)}</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="flex justify-between">
                <span className="opacity-70">Freight:</span>
                <span>{formatCurrency(bill.total_freight)}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Labour:</span>
                <span>{formatCurrency(bill.total_labour)}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Bill Ch:</span>
                <span>{formatCurrency(bill.total_bill_charge)}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Other:</span>
                <span>{formatCurrency(parseFloat(bill.total_toll || 0) + parseFloat(bill.total_dd || 0) + parseFloat(bill.total_other || 0))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Remark */}
        {bill.remark && (
          <div className="mt-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <span className="text-xs font-medium text-yellow-700">Remark: </span>
            <span className="text-sm text-yellow-800">{bill.remark}</span>
          </div>
        )}
      </div>
    </div>
  );
}
