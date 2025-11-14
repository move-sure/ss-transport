'use client';

import React from 'react';

const DraggableTableHeader = ({ columns, onReorder }) => {
  const [draggedIndex, setDraggedIndex] = React.useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newColumns = [...columns];
    const draggedColumn = newColumns[draggedIndex];
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(index, 0, draggedColumn);
    
    onReorder(newColumns);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <tr>
      {columns.map((column, index) => (
        <th
          key={column.key}
          draggable={!column.fixed}
          onDragStart={(e) => !column.fixed && handleDragStart(e, index)}
          onDragOver={(e) => !column.fixed && handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className={`px-3 py-3 text-xs font-bold text-white uppercase tracking-wider ${
            column.align === 'center' ? 'text-center' : 
            column.align === 'right' ? 'text-right' : 'text-left'
          } ${!column.fixed ? 'cursor-move hover:bg-blue-700' : ''} ${
            draggedIndex === index ? 'opacity-50' : ''
          } ${column.fixed ? 'sticky right-0 bg-gradient-to-r from-blue-600 to-indigo-600 z-10' : ''}`}
          style={column.fixed ? { boxShadow: '-2px 0 5px rgba(0,0,0,0.1)' } : {}}
        >
          {column.label}
        </th>
      ))}
    </tr>
  );
};

export default DraggableTableHeader;
