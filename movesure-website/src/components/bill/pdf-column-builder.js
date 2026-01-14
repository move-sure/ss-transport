'use client';

import { AVAILABLE_COLUMNS } from './print-column-selector';

/**
 * Builds column configuration for PDF generation based on selected columns
 * @param {Array} selectedColumnIds - Array of selected column IDs
 * @param {number} totalTableWidth - Total width available for the table
 * @returns {Object} Column configuration with widths, headers, and data accessors
 */
export const buildColumnConfig = (selectedColumnIds, totalTableWidth) => {
  // Filter selected columns and maintain order
  const selectedColumns = AVAILABLE_COLUMNS.filter(col => 
    selectedColumnIds.includes(col.id)
  );

  // Calculate total weight for proportional width distribution
  const totalWeight = selectedColumns.reduce((sum, col) => sum + col.width, 0);

  // Build column widths (proportionally adjusted)
  const columnWidths = selectedColumns.map(col => 
    (col.width / totalWeight) * totalTableWidth
  );

  // Build headers
  const headers = selectedColumns.map(col => col.label);

  // Build data accessors (functions to extract data from bill detail)
  const dataAccessors = selectedColumns.map(col => {
    switch (col.id) {
      case 'sno':
        return (detail, index) => (index + 1).toString();
      case 'date':
        return (detail) => formatDate(detail.date);
      case 'grno':
        return (detail) => (detail.grno || 'N/A').substring(0, 10);
      case 'consignor':
        return (detail) => (detail.consignor || 'N/A').substring(0, 15);
      case 'consignee':
        return (detail) => (detail.consignee || 'N/A').substring(0, 15);
      case 'city':
        return (detail) => (detail.city || 'N/A').substring(0, 12);
      case 'pvtMarks':
        return (detail) => (detail.pvt_marks || '-').substring(0, 8);
      case 'packages':
        return (detail) => parseInt(detail.no_of_pckg || 0).toString();
      case 'weight':
        return (detail) => parseFloat(detail.wt || 0).toFixed(1);
      case 'delType':
        return (detail) => {
          const delType = detail.delivery_type || 'N/A';
          return delType === 'door-delivery' ? 'DD' : delType === 'godown' ? 'GD' : delType.substring(0, 3).toUpperCase();
        };
      case 'payMode':
        return (detail) => {
          const payMode = detail.pay_mode || 'N/A';
          return payMode === 'to-pay' ? 'ToPay' : payMode === 'paid' ? 'Paid' : payMode.substring(0, 5);
        };
      case 'freight':
        return (detail) => formatCurrency(detail.freight_amount || 0);
      case 'labour':
        return (detail) => formatCurrency(detail.labour_charge || 0);
      case 'billCharge':
        return (detail) => formatCurrency(detail.bill_charge || 0);
      case 'toll':
        return (detail) => formatCurrency(detail.toll_charge || 0);
      case 'dd':
        return (detail) => formatCurrency(detail.dd_charge || 0);
      case 'pf':
        return (detail) => formatCurrency(detail.pf_charge || 0);
      case 'other':
        return (detail) => formatCurrency(detail.other_charge || 0);
      case 'total':
        return (detail) => formatCurrency(detail.bilty_total || 0);
      default:
        return () => '';
    }
  });

  // Build total calculators (functions to calculate column totals)
  const totalCalculators = selectedColumns.map(col => {
    switch (col.id) {
      case 'packages':
        return (details) => details.reduce((sum, d) => sum + parseInt(d.no_of_pckg || 0), 0).toString();
      case 'weight':
        return (details) => details.reduce((sum, d) => sum + parseFloat(d.wt || 0), 0).toFixed(1);
      case 'freight':
        return (details) => formatCurrency(details.reduce((sum, d) => sum + parseFloat(d.freight_amount || 0), 0));
      case 'labour':
        return (details) => formatCurrency(details.reduce((sum, d) => sum + parseFloat(d.labour_charge || 0), 0));
      case 'billCharge':
        return (details) => formatCurrency(details.reduce((sum, d) => sum + parseFloat(d.bill_charge || 0), 0));
      case 'toll':
        return (details) => formatCurrency(details.reduce((sum, d) => sum + parseFloat(d.toll_charge || 0), 0));
      case 'dd':
        return (details) => formatCurrency(details.reduce((sum, d) => sum + parseFloat(d.dd_charge || 0), 0));
      case 'pf':
        return (details) => formatCurrency(details.reduce((sum, d) => sum + parseFloat(d.pf_charge || 0), 0));
      case 'other':
        return (details) => formatCurrency(details.reduce((sum, d) => sum + parseFloat(d.other_charge || 0), 0));
      case 'total':
        return (details) => formatCurrency(details.reduce((sum, d) => sum + parseFloat(d.bilty_total || 0), 0));
      case 'sno':
        return () => 'TOTAL';
      default:
        return () => '';
    }
  });

  return {
    columns: selectedColumns,
    columnWidths,
    headers,
    dataAccessors,
    totalCalculators
  };
};

/**
 * Helper function to format currency
 */
const formatCurrency = (amount) => {
  if (!amount || amount === 0) return '0';
  const num = Math.round(parseFloat(amount));
  return num.toString();
};

/**
 * Helper function to format date
 */
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-IN');
  } catch {
    return 'N/A';
  }
};

/**
 * Calculate all totals from bill details for summary section
 */
export const calculateBillTotals = (billDetails) => {
  return billDetails.reduce((acc, detail) => {
    acc.freight += parseFloat(detail.freight_amount || 0);
    acc.labour += parseFloat(detail.labour_charge || 0);
    acc.billCharge += parseFloat(detail.bill_charge || 0);
    acc.toll += parseFloat(detail.toll_charge || 0);
    acc.dd += parseFloat(detail.dd_charge || 0);
    acc.pf += parseFloat(detail.pf_charge || 0);
    acc.other += parseFloat(detail.other_charge || 0);
    acc.total += parseFloat(detail.bilty_total || 0);
    acc.packages += parseInt(detail.no_of_pckg || 0);
    acc.weight += parseFloat(detail.wt || 0);
    
    if (detail.pay_mode?.toLowerCase() === 'paid') {
      acc.paid += parseFloat(detail.bilty_total || 0);
    } else if (detail.pay_mode?.toLowerCase() === 'to-pay') {
      acc.toPay += parseFloat(detail.bilty_total || 0);
    }
    
    return acc;
  }, { 
    freight: 0, labour: 0, billCharge: 0, toll: 0, dd: 0, pf: 0, other: 0,
    total: 0, packages: 0, weight: 0, paid: 0, toPay: 0
  });
};
