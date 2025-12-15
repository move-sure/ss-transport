'use client';

import { useState, useMemo, useCallback } from 'react';

// All available columns for bill items - mapped to monthly_bill_items table
export const ALL_COLUMNS = [
  { id: 'sno', label: 'S.No', width: 'w-12', minWidth: 40, category: 'basic', sortable: false },
  { id: 'gr_no', label: 'GR No', width: 'w-24', minWidth: 80, category: 'basic', sortable: true },
  { id: 'type', label: 'Type', width: 'w-16', minWidth: 50, category: 'basic', sortable: true },
  { id: 'date', label: 'Date', width: 'w-24', minWidth: 80, category: 'basic', sortable: true },
  
  // Party Info (from bilty/station)
  { id: 'consignor', label: 'Consignor', width: 'w-36', minWidth: 120, category: 'party', sortable: true },
  { id: 'consignee', label: 'Consignee', width: 'w-36', minWidth: 120, category: 'party', sortable: true },
  
  // Package Info (from bilty/station) - fetched based on gr_no
  { id: 'pkgs', label: 'Pkgs', width: 'w-14', minWidth: 50, category: 'package', sortable: true },
  { id: 'weight', label: 'Weight', width: 'w-16', minWidth: 60, category: 'package', sortable: true },
  { id: 'contain', label: 'Contents', width: 'w-28', minWidth: 100, category: 'package', sortable: false },
  { id: 'pvt_marks', label: 'Pvt Marks', width: 'w-28', minWidth: 100, category: 'package', sortable: false },
  
  // Location (from bilty/station)
  { id: 'to_city', label: 'To City', width: 'w-24', minWidth: 80, category: 'location', sortable: true },
  { id: 'delivery_type', label: 'Delivery', width: 'w-20', minWidth: 70, category: 'location', sortable: true },
  
  // Invoice (from bilty)
  { id: 'invoice_no', label: 'Invoice No', width: 'w-24', minWidth: 80, category: 'invoice', sortable: true },
  { id: 'invoice_value', label: 'Inv Value', width: 'w-20', minWidth: 70, category: 'invoice', sortable: true },
  { id: 'e_way_bill', label: 'E-Way Bill', width: 'w-28', minWidth: 100, category: 'invoice', sortable: true },
  
  // Rates from monthly_bill_items
  { id: 'rate', label: 'Rate', width: 'w-18', minWidth: 60, category: 'charges', sortable: true },
  { id: 'labour_rate', label: 'Lab Rate', width: 'w-18', minWidth: 60, category: 'charges', sortable: true },
  
  // Charges from monthly_bill_items table
  { id: 'freight', label: 'Freight', width: 'w-20', minWidth: 70, category: 'charges', sortable: true },
  { id: 'labour', label: 'Labour', width: 'w-18', minWidth: 60, category: 'charges', sortable: true },
  { id: 'bill_charge', label: 'Bill Ch', width: 'w-16', minWidth: 55, category: 'charges', sortable: true },
  { id: 'toll', label: 'Toll', width: 'w-16', minWidth: 55, category: 'charges', sortable: true },
  { id: 'dd', label: 'DD', width: 'w-16', minWidth: 55, category: 'charges', sortable: true },
  { id: 'other', label: 'Other', width: 'w-16', minWidth: 55, category: 'charges', sortable: true },
  
  // Payment (from bilty/station)
  { id: 'payment', label: 'Payment', width: 'w-18', minWidth: 65, category: 'payment', sortable: true },
  { id: 'amount', label: 'Total', width: 'w-20', minWidth: 70, category: 'payment', sortable: true },
  
  // Actions - always at end
  { id: 'action', label: '', width: 'w-20', minWidth: 70, category: 'action', sortable: false }
];

// Updated default columns
export const DEFAULT_VISIBLE_COLUMNS = [
  'sno', 'gr_no', 'type', 'date', 'pkgs', 'weight', 'freight', 
  'bill_charge', 'toll', 'other', 'rate', 'labour_rate', 'amount', 'pvt_marks', 'action'
];

const STORAGE_KEY = 'bill_items_visible_columns';
const COLUMN_WIDTHS_KEY = 'bill_items_column_widths';

export default function useBillItemsTable(items = []) {
  const [visibleColumns, setVisibleColumns] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_VISIBLE_COLUMNS;
    }
    return DEFAULT_VISIBLE_COLUMNS;
  });
  
  const [columnWidths, setColumnWidths] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(COLUMN_WIDTHS_KEY);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  // Save column preferences - ensure action is always at the end
  const handleColumnChange = useCallback((newColumns) => {
    const withoutAction = newColumns.filter(id => id !== 'action');
    const finalColumns = [...withoutAction, 'action'];
    setVisibleColumns(finalColumns);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finalColumns));
    }
  }, []);

  // Save column widths
  const handleWidthChange = useCallback((columnId, delta) => {
    const currentWidth = columnWidths[columnId] || ALL_COLUMNS.find(c => c.id === columnId)?.minWidth || 60;
    const newWidth = Math.max(40, currentWidth + delta);
    const newWidths = { ...columnWidths, [columnId]: newWidth };
    setColumnWidths(newWidths);
    if (typeof window !== 'undefined') {
      localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(newWidths));
    }
  }, [columnWidths]);

  // Handle context menu actions
  const handleContextAction = useCallback((action, columnId) => {
    setContextMenu(null);
    
    switch (action) {
      case 'moveLeft': {
        const index = visibleColumns.indexOf(columnId);
        if (index > 1) {
          const newColumns = [...visibleColumns];
          [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
          handleColumnChange(newColumns);
        }
        break;
      }
      case 'moveRight': {
        const index = visibleColumns.indexOf(columnId);
        if (index < visibleColumns.length - 2) {
          const newColumns = [...visibleColumns];
          [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
          handleColumnChange(newColumns);
        }
        break;
      }
      case 'increaseWidth':
        handleWidthChange(columnId, 30);
        break;
      case 'decreaseWidth':
        handleWidthChange(columnId, -30);
        break;
      case 'hide':
        handleColumnChange(visibleColumns.filter(id => id !== columnId));
        break;
    }
  }, [visibleColumns, handleColumnChange, handleWidthChange]);

  // Handle right click on column header
  const handleContextMenu = useCallback((e, columnId) => {
    e.preventDefault();
    if (columnId === 'sno' || columnId === 'action') return;
    setContextMenu({ x: e.clientX, y: e.clientY, columnId });
  }, []);

  // Get column width style
  const getColumnStyle = useCallback((columnId) => {
    const customWidth = columnWidths[columnId];
    if (customWidth) {
      return { minWidth: `${customWidth}px`, width: `${customWidth}px` };
    }
    return {};
  }, [columnWidths]);

  // Get visible columns config
  const columns = useMemo(() => {
    return visibleColumns
      .map(id => ALL_COLUMNS.find(col => col.id === id))
      .filter(Boolean);
  }, [visibleColumns]);

  // Sort items - using monthly_bill_items fields
  const sortedItems = useMemo(() => {
    if (!sortConfig.key) return items;
    
    return [...items].sort((a, b) => {
      let aVal, bVal;
      const key = sortConfig.key;
      
      // Get value based on key - from bilty data
      if (['consignor', 'consignee', 'contain', 'pvt_marks', 'to_city', 'delivery_type', 'invoice_no', 'e_way_bill', 'payment', 'date'].includes(key)) {
        aVal = a.biltyData?.[key === 'consignor' ? 'consignor_name' : key === 'consignee' ? 'consignee_name' : key === 'payment' ? 'payment_mode' : key === 'date' ? 'bilty_date' : key] || '';
        bVal = b.biltyData?.[key === 'consignor' ? 'consignor_name' : key === 'consignee' ? 'consignee_name' : key === 'payment' ? 'payment_mode' : key === 'date' ? 'bilty_date' : key] || '';
      } else if (['pkgs', 'weight', 'invoice_value'].includes(key)) {
        aVal = parseFloat(a.biltyData?.[key === 'pkgs' ? 'no_of_pkg' : key === 'weight' ? 'wt' : key] || 0);
        bVal = parseFloat(b.biltyData?.[key === 'pkgs' ? 'no_of_pkg' : key === 'weight' ? 'wt' : key] || 0);
      } else if (key === 'freight') {
        aVal = parseFloat(a.freight_amount || 0);
        bVal = parseFloat(b.freight_amount || 0);
      } else if (key === 'labour') {
        aVal = parseFloat(a.labour_charge || 0);
        bVal = parseFloat(b.labour_charge || 0);
      } else if (key === 'toll') {
        aVal = parseFloat(a.toll_charge || 0);
        bVal = parseFloat(b.toll_charge || 0);
      } else if (key === 'dd') {
        aVal = parseFloat(a.dd_charge || 0);
        bVal = parseFloat(b.dd_charge || 0);
      } else if (key === 'other') {
        aVal = parseFloat(a.other_charge || 0);
        bVal = parseFloat(b.other_charge || 0);
      } else if (key === 'amount') {
        aVal = parseFloat(a.total_amount || 0);
        bVal = parseFloat(b.total_amount || 0);
      } else if (['rate', 'labour_rate', 'bill_charge'].includes(key)) {
        aVal = parseFloat(a[key] || 0);
        bVal = parseFloat(b[key] || 0);
      } else if (key === 'type') {
        aVal = (a.bilty_type || '').toLowerCase();
        bVal = (b.bilty_type || '').toLowerCase();
      } else {
        aVal = a[key] || '';
        bVal = b[key] || '';
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortConfig]);

  // Handle sort
  const handleSort = useCallback((columnId) => {
    const column = ALL_COLUMNS.find(c => c.id === columnId);
    if (!column?.sortable) return;

    setSortConfig(prev => ({
      key: columnId,
      direction: prev.key === columnId && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Drag handlers for column reordering
  const handleDragStart = useCallback((e, columnId) => {
    if (columnId === 'sno' || columnId === 'action') return;
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, targetColumnId) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnId) {
      setDraggedColumn(null);
      return;
    }
    if (targetColumnId === 'sno' || targetColumnId === 'action') {
      setDraggedColumn(null);
      return;
    }

    const newColumns = [...visibleColumns];
    const draggedIndex = newColumns.findIndex(id => id === draggedColumn);
    const targetIndex = newColumns.findIndex(id => id === targetColumnId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      newColumns.splice(draggedIndex, 1);
      newColumns.splice(targetIndex, 0, draggedColumn);
      handleColumnChange(newColumns);
    }
    setDraggedColumn(null);
  }, [draggedColumn, visibleColumns, handleColumnChange]);

  const handleDragEnd = useCallback(() => {
    setDraggedColumn(null);
  }, []);

  // Calculate totals - using monthly_bill_items fields
  const totals = useMemo(() => {
    return items.reduce((acc, item) => {
      // Fetch pkgs and weight from biltyData (from bilty table: no_of_pkg, wt)
      // or from station_bilty_summary table (no_of_packets, weight)
      acc.pkgs += parseInt(item.biltyData?.no_of_pkg || item.biltyData?.no_of_packets || 0);
      acc.weight += parseFloat(item.biltyData?.wt || item.biltyData?.weight || 0);
      acc.freight += parseFloat(item.freight_amount || 0);
      acc.labour += parseFloat(item.labour_charge || 0);
      acc.bill_charge += parseFloat(item.bill_charge || 0);
      acc.toll += parseFloat(item.toll_charge || 0);
      acc.dd += parseFloat(item.dd_charge || 0);
      acc.other += parseFloat(item.other_charge || 0);
      acc.amount += parseFloat(item.total_amount || 0);
      return acc;
    }, { pkgs: 0, weight: 0, freight: 0, labour: 0, bill_charge: 0, toll: 0, dd: 0, other: 0, amount: 0 });
  }, [items]);

  return {
    // State
    visibleColumns,
    columnWidths,
    sortConfig,
    draggedColumn,
    contextMenu,
    columns,
    sortedItems,
    totals,
    
    // Setters
    setContextMenu,
    
    // Handlers
    handleColumnChange,
    handleWidthChange,
    handleContextAction,
    handleContextMenu,
    handleSort,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    getColumnStyle,
  };
}
