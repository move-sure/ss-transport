'use client';

import React from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd MMM yy');
  } catch {
    return '-';
  }
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '-';
  return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
};

// Render cell value - using monthly_bill_items fields and bilty data
// biltyData contains: no_of_pkg, wt, pvt_marks (from bilty table)
// or: no_of_packets, weight, pvt_marks (from station_bilty_summary table)
const renderCellValue = (item, columnId, index, onEditItem, onRemoveItem) => {
  const bilty = item.biltyData || {};
  const biltyType = (item.bilty_type || '').toLowerCase();
  const isRegular = biltyType === 'regular';
  const paymentMode = (bilty.payment_mode || bilty.payment_status || '').toLowerCase();

  switch (columnId) {
    case 'sno':
      return <span className="text-xs text-gray-500">{index + 1}</span>;
    
    case 'gr_no':
      return <span className="text-xs font-medium text-blue-600">{item.gr_no}</span>;
    
    case 'type':
      return (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
          isRegular ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
        }`}>
          {isRegular ? 'REG' : 'STN'}
        </span>
      );
    
    case 'date':
      return <span className="text-xs text-gray-700">{formatDate(bilty.bilty_date || bilty.created_at)}</span>;
    
    case 'consignor':
      return <span className="text-xs text-gray-900 truncate block max-w-32">{bilty.consignor_name || bilty.consignor || '-'}</span>;
    
    case 'consignee':
      return <span className="text-xs text-gray-900 truncate block max-w-32">{bilty.consignee_name || bilty.consignee || '-'}</span>;
    
    // Packages: bilty table uses no_of_pkg, station_bilty_summary uses no_of_packets
    // After mapping in useBillDetails, station's no_of_packets is mapped to no_of_pkg
    case 'pkgs':
      const pkgValue = bilty.no_of_pkg ?? bilty.no_of_packets ?? null;
      return <span className="text-xs text-gray-700 text-center block">{pkgValue !== null ? pkgValue : '-'}</span>;
    
    // Weight: bilty table uses wt, station_bilty_summary uses weight
    // After mapping in useBillDetails, station's weight is mapped to wt
    case 'weight':
      const weightValue = bilty.wt ?? bilty.weight ?? null;
      return <span className="text-xs text-gray-700 text-center block">{weightValue !== null ? weightValue : '-'}</span>;
    
    case 'contain':
      return <span className="text-xs text-gray-600 truncate block max-w-24">{bilty.contain || bilty.contents || '-'}</span>;
    
    // Pvt marks: same field name in both tables
    case 'pvt_marks':
      return <span className="text-xs text-gray-600 truncate block max-w-20">{bilty.pvt_marks || '-'}</span>;
    
    case 'to_city':
      return <span className="text-xs text-gray-700">{bilty.to_city_name || bilty.station || '-'}</span>;
    
    case 'delivery_type':
      const dt = bilty.delivery_type?.toLowerCase();
      return dt ? (
        <span className={`px-1.5 py-0.5 rounded text-[10px] ${dt === 'door' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
          {dt === 'door' ? 'Door' : 'Godown'}
        </span>
      ) : <span className="text-xs text-gray-400">-</span>;
    
    case 'invoice_no':
      return <span className="text-xs text-gray-700">{bilty.invoice_no || '-'}</span>;
    
    case 'invoice_value':
      return <span className="text-xs text-gray-700 text-right block">{bilty.invoice_value ? formatCurrency(bilty.invoice_value) : '-'}</span>;
    
    case 'e_way_bill':
      return <span className="text-xs text-gray-700 truncate block max-w-24">{bilty.e_way_bill || '-'}</span>;
    
    case 'rate':
      return <span className="text-xs text-gray-700 text-right block">{formatCurrency(item.rate)}</span>;
    
    case 'labour_rate':
      return <span className="text-xs text-gray-700 text-right block">{formatCurrency(item.labour_rate)}</span>;
    
    case 'freight':
      // Use freight_amount from monthly_bill_items
      return <span className="text-xs text-gray-700 text-right block">{formatCurrency(item.freight_amount)}</span>;
    
    case 'labour':
      // Use labour_charge from monthly_bill_items
      return <span className="text-xs text-gray-700 text-right block">{formatCurrency(item.labour_charge)}</span>;
    
    case 'bill_charge':
      // Use bill_charge from monthly_bill_items
      return <span className="text-xs text-gray-700 text-right block">{formatCurrency(item.bill_charge)}</span>;
    
    case 'toll':
      // Use toll_charge from monthly_bill_items
      return <span className="text-xs text-gray-700 text-right block">{formatCurrency(item.toll_charge)}</span>;
    
    case 'dd':
      // Use dd_charge from monthly_bill_items
      return <span className="text-xs text-gray-700 text-right block">{formatCurrency(item.dd_charge)}</span>;
    
    case 'other':
      // Use other_charge from monthly_bill_items
      return <span className="text-xs text-gray-700 text-right block">{formatCurrency(item.other_charge)}</span>;
    
    case 'payment':
      return (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
          paymentMode === 'paid' ? 'bg-green-100 text-green-700' :
          paymentMode === 'to-pay' || paymentMode === 'to pay' ? 'bg-orange-100 text-orange-700' :
          paymentMode === 'foc' ? 'bg-gray-100 text-gray-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {paymentMode ? paymentMode.toUpperCase() : '-'}
        </span>
      );
    
    case 'amount':
      // Use total_amount from monthly_bill_items
      return <span className="text-xs font-bold text-gray-900 text-right block">{formatCurrency(item.total_amount)}</span>;
    
    case 'action':
      return (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onEditItem?.(item)}
            className="p-1 hover:bg-blue-100 rounded text-blue-500 hover:text-blue-700 transition-colors"
            title="Edit item"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onRemoveItem?.(item.id)}
            className="p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700 transition-colors"
            title="Remove from bill"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    
    default:
      return <span className="text-xs text-gray-400">-</span>;
  }
};

export default function TableBody({
  items,
  columns,
  getColumnStyle,
  onEditItem,
  onRemoveItem
}) {
  return (
    <tbody className="divide-y divide-gray-100">
      {items.map((item, index) => (
        <tr 
          key={item.id}
          className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}
        >
          {columns.map((column) => (
            <td 
              key={column.id} 
              style={getColumnStyle(column.id)}
              className={`px-2 py-2 ${
                ['pkgs', 'weight', 'action'].includes(column.id) ? 'text-center' : 
                ['freight', 'labour', 'bill_charge', 'toll', 'dd', 'other', 'amount', 'invoice_value', 'rate', 'labour_rate'].includes(column.id) ? 'text-right' : 
                'text-left'
              } whitespace-nowrap`}
            >
              {renderCellValue(item, column.id, index, onEditItem, onRemoveItem)}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// Export helper functions for external use
export { formatDate, formatCurrency, renderCellValue };
