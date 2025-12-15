'use client';

import React, { useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  X, 
  Maximize2, 
  Minimize2 
} from 'lucide-react';

export default function ContextMenu({ 
  x, 
  y, 
  columnId, 
  columnLabel,
  onClose, 
  onAction, 
  visibleColumns 
}) {
  const menuRef = useRef(null);
  const columnIndex = visibleColumns.indexOf(columnId);
  const canMoveLeft = columnIndex > 1; // Can't move before sno
  const canMoveRight = columnIndex < visibleColumns.length - 2; // Can't move after action

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (columnId === 'sno' || columnId === 'action') return null;

  // Adjust position if menu would go off screen
  const adjustedX = Math.min(x, window.innerWidth - 180);
  const adjustedY = Math.min(y, window.innerHeight - 250);

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[160px]"
      style={{ top: adjustedY, left: adjustedX }}
    >
      <div className="px-3 py-1.5 text-[10px] text-gray-400 uppercase font-semibold border-b border-gray-100">
        Column: {columnLabel}
      </div>
      
      {canMoveLeft && (
        <button
          onClick={() => onAction('moveLeft', columnId)}
          className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Move Left
        </button>
      )}
      
      {canMoveRight && (
        <button
          onClick={() => onAction('moveRight', columnId)}
          className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          Move Right
        </button>
      )}
      
      <div className="border-t border-gray-100 my-1" />
      
      <button
        onClick={() => onAction('increaseWidth', columnId)}
        className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
      >
        <Maximize2 className="h-3.5 w-3.5" />
        Increase Width
      </button>
      
      <button
        onClick={() => onAction('decreaseWidth', columnId)}
        className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
      >
        <Minimize2 className="h-3.5 w-3.5" />
        Decrease Width
      </button>
      
      <div className="border-t border-gray-100 my-1" />
      
      <button
        onClick={() => onAction('hide', columnId)}
        className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
      >
        <X className="h-3.5 w-3.5" />
        Hide Column
      </button>
    </div>
  );
}
