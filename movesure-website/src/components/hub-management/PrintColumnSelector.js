'use client';
import React, { useState } from 'react';
import { Lock, Plus, X, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { ALL_COLS } from './crossingBillsColumns';

export default function PrintColumnSelector({ selectedCols, onToggle, onMoveUp, onMoveDown }) {
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const required = ALL_COLS.filter(c => c.required);
  const optional = ALL_COLS.filter(c => !c.required);

  // Preserve selectedCols order - THIS IS THE FIX
  const selectedOptional = selectedCols
    .map(id => ALL_COLS.find(c => c.id === id))
    .filter(c => c && !c.required);

  const handleDragStart = (e, item, index) => {
    setDraggedItem({ item, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
  };

  const handleDragOver = (e, targetIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(targetIndex);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (!draggedItem) return;

    const { index: sourceIndex } = draggedItem;
    if (sourceIndex === targetIndex) {
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    // Calculate the direction and use move functions
    if (sourceIndex < targetIndex) {
      // Moving down - call onMoveDown multiple times
      for (let i = sourceIndex; i < targetIndex; i++) {
        onMoveDown(selectedOptional[i].id);
      }
    } else {
      // Moving up - call onMoveUp multiple times
      for (let i = sourceIndex; i > targetIndex; i--) {
        onMoveUp(selectedOptional[i].id);
      }
    }

    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
        Column Configuration
      </p>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-5">
        {/* Required columns */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2.5">Always shown (locked)</p>
          <div className="flex flex-wrap gap-2">
            {required.map(col => (
              <span
                key={col.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-xs font-semibold"
              >
                <Lock className="h-3.5 w-3.5" />
                {col.label}
              </span>
            ))}
          </div>
        </div>

        {/* Selected optional columns - with drag and drop + arrows */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase">
              Active columns ({selectedOptional.length})
            </p>
            {selectedOptional.length === 0 && (
              <span className="text-[10px] text-gray-400 italic">None selected</span>
            )}
          </div>
          {selectedOptional.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-300 p-3 space-y-0">
              {selectedOptional.map((col, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === selectedOptional.length - 1;
                const isDragging = draggedItem?.index === idx;
                const isDropZone = dropTarget === idx;

                return (
                  <div key={col.id}>
                    {/* Drop zone indicator - BEFORE this item */}
                    {isDropZone && !isDragging && (
                      <div className="h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent mb-1 rounded-full"></div>
                    )}

                    {/* Column item */}
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, col, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 transition-all ${
                        isDragging
                          ? 'bg-blue-100 border-blue-500 opacity-60 shadow-lg'
                          : isDropZone
                          ? 'bg-green-50 border-green-400'
                          : 'bg-gradient-to-r from-slate-50 to-slate-100 border-slate-300 hover:from-slate-100 hover:to-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {/* Drag handle */}
                      <div className="cursor-move">
                        <GripVertical className={`h-4 w-4 ${isDragging ? 'text-blue-600' : 'text-slate-500'}`} />
                      </div>

                      {/* Position number */}
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 text-white text-[10px] font-bold shrink-0">
                        {idx + 1}
                      </span>

                      {/* Column label */}
                      <span className="flex-1 text-sm font-semibold text-gray-800">
                        {col.label}
                      </span>

                      {/* Arrow buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onMoveUp(col.id)}
                          disabled={isFirst}
                          title="Move column up"
                          className={`p-1.5 rounded-lg transition-all ${
                            isFirst
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-600 hover:text-white hover:bg-blue-600 active:scale-95'
                          }`}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onMoveDown(col.id)}
                          disabled={isLast}
                          title="Move column down"
                          className={`p-1.5 rounded-lg transition-all ${
                            isLast
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-600 hover:text-white hover:bg-blue-600 active:scale-95'
                          }`}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => onToggle(col.id)}
                        title="Remove column"
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0 active:scale-95"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Drop zone indicator - AFTER last item */}
                    {isLast && dropTarget === selectedOptional.length && (
                      <div className="h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent mt-1 rounded-full"></div>
                    )}
                  </div>
                );
              })}

              {/* Drop zone after last item */}
              {selectedOptional.length > 0 && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropTarget(selectedOptional.length);
                  }}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, selectedOptional.length)}
                  className={`h-1 rounded-full transition-all ${
                    dropTarget === selectedOptional.length
                      ? 'bg-gradient-to-r from-transparent via-green-500 to-transparent'
                      : 'bg-transparent'
                  }`}
                />
              )}
            </div>
          )}
          {selectedOptional.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              <p className="text-[10px] text-gray-600">
                <span className="font-semibold">💡 Reorder options:</span>
              </p>
              <ul className="text-[10px] text-gray-500 space-y-0.5 ml-2">
                <li>• <span className="font-semibold">Drag & Drop:</span> Click grip handle and drag to new position</li>
                <li>• <span className="font-semibold">Up/Down Arrows:</span> Click arrows to move one position at a time</li>
              </ul>
            </div>
          )}
        </div>

        {/* Available optional columns - to add */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2.5">
            Available to add ({optional.length - selectedOptional.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {optional.map(col => {
              const on = selectedCols.includes(col.id);
              return !on ? (
                <button
                  key={col.id}
                  onClick={() => onToggle(col.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 bg-white border-gray-200 text-gray-500 hover:border-green-500 hover:bg-green-50 hover:text-green-700 transition-all active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {col.label}
                </button>
              ) : null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
