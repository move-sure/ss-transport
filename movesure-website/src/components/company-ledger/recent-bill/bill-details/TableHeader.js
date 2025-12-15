'use client';

import React from 'react';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

export default function TableHeader({
  columns,
  sortConfig,
  draggedColumn,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onSort,
  onContextMenu,
  getColumnStyle
}) {
  return (
    <thead className="bg-slate-700 text-white sticky top-0 z-10">
      <tr>
        {columns.map((column) => (
          <th
            key={column.id}
            draggable={column.id !== 'action' && column.id !== 'sno'}
            onDragStart={(e) => onDragStart(e, column.id)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, column.id)}
            onDragEnd={onDragEnd}
            onClick={() => onSort(column.id)}
            onContextMenu={(e) => onContextMenu(e, column.id)}
            style={getColumnStyle(column.id)}
            className={`px-2 py-2.5 text-left text-[11px] font-semibold ${
              column.id !== 'action' && column.id !== 'sno' ? 'cursor-grab active:cursor-grabbing' : ''
            } ${draggedColumn === column.id ? 'opacity-50 bg-slate-600' : ''} ${
              column.sortable ? 'hover:bg-slate-600 cursor-pointer' : ''
            } select-none whitespace-nowrap`}
          >
            <div className="flex items-center gap-1">
              {column.id !== 'action' && column.id !== 'sno' && (
                <GripVertical className="h-3 w-3 opacity-40" />
              )}
              <span className="flex-1">{column.label}</span>
              {column.sortable && sortConfig.key === column.id && (
                sortConfig.direction === 'asc' 
                  ? <ChevronUp className="h-3 w-3 text-yellow-300" />
                  : <ChevronDown className="h-3 w-3 text-yellow-300" />
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
}
