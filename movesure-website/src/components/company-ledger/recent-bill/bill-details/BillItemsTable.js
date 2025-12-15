'use client';

import React from 'react';
import { Package } from 'lucide-react';
import useBillItemsTable, { ALL_COLUMNS, DEFAULT_VISIBLE_COLUMNS } from './useBillItemsTable';
import ColumnSelector from './ColumnSelector';
import ContextMenu from './ContextMenu';
import TableHeader from './TableHeader';
import TableBody from './TableBody';
import TableFooter from './TableFooter';

export default function BillItemsTable({ 
  items = [], 
  onRemoveItem,
  onEditItem,
  loading = false 
}) {
  const {
    visibleColumns,
    sortConfig,
    draggedColumn,
    contextMenu,
    columns,
    sortedItems,
    totals,
    setContextMenu,
    handleColumnChange,
    handleContextAction,
    handleContextMenu,
    handleSort,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    getColumnStyle,
  } = useBillItemsTable(items);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No Bill Items</h3>
        <p className="text-sm text-gray-500">This bill has no items yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      {/* Table Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <div className="text-xs text-gray-500">
          Showing {columns.length - 2} columns • {items.length} items
          {sortConfig.key && (
            <span className="ml-2 text-blue-600">
              Sorted by {ALL_COLUMNS.find(c => c.id === sortConfig.key)?.label} ({sortConfig.direction})
            </span>
          )}
          <span className="ml-2 text-gray-400">• Right-click column header for options</span>
        </div>
        <ColumnSelector
          visibleColumns={visibleColumns}
          onColumnChange={handleColumnChange}
          allColumns={ALL_COLUMNS}
          defaultColumns={DEFAULT_VISIBLE_COLUMNS}
        />
      </div>

      {/* Table - increased height */}
      <div className="overflow-auto flex-1" style={{ minHeight: '500px' }}>
        <table className="w-full">
          <TableHeader
            columns={columns}
            sortConfig={sortConfig}
            draggedColumn={draggedColumn}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onSort={handleSort}
            onContextMenu={handleContextMenu}
            getColumnStyle={getColumnStyle}
          />
          <TableBody
            items={sortedItems}
            columns={columns}
            getColumnStyle={getColumnStyle}
            onEditItem={onEditItem}
            onRemoveItem={onRemoveItem}
          />
        </table>
      </div>

      {/* Footer Totals */}
      <TableFooter totals={totals} itemCount={items.length} />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          columnId={contextMenu.columnId}
          columnLabel={ALL_COLUMNS.find(c => c.id === contextMenu.columnId)?.label}
          visibleColumns={visibleColumns}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}
    </div>
  );
}
