'use client';

import React from 'react';
import { 
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

export default function GodownPagination({
  currentPage,
  totalPages,
  totalRecords,
  startRecord,
  endRecord,
  itemsPerPage,
  onPageChange,
  onPreviousPage,
  onNextPage
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="bg-slate-50 px-4 py-4 border-t border-slate-200">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Records Info */}
        <div className="text-sm text-slate-600">
          Showing <span className="font-medium">{startRecord}-{endRecord}</span> of{' '}
          <span className="font-medium">{totalRecords}</span> records
        </div>

        {/* Pagination Buttons */}
        <div className="flex items-center gap-2">
          
          {/* First Page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors"
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous Page */}
          <button
            onClick={onPreviousPage}
            disabled={currentPage === 1}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {(() => {
              const maxVisiblePages = 5;
              const halfVisible = Math.floor(maxVisiblePages / 2);
              let startPage = Math.max(1, currentPage - halfVisible);
              let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
              
              // Adjust startPage if we're near the end
              if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
              }

              const pages = [];
              
              // Show first page if not in range
              if (startPage > 1) {
                pages.push(
                  <button
                    key={1}
                    onClick={() => onPageChange(1)}
                    className="px-3 py-1 text-sm text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    1
                  </button>
                );
                if (startPage > 2) {
                  pages.push(
                    <span key="ellipsis1" className="px-2 text-slate-400">...</span>
                  );
                }
              }

              // Show visible page range
              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => onPageChange(i)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      i === currentPage
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {i}
                  </button>
                );
              }

              // Show last page if not in range
              if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                  pages.push(
                    <span key="ellipsis2" className="px-2 text-slate-400">...</span>
                  );
                }
                pages.push(
                  <button
                    key={totalPages}
                    onClick={() => onPageChange(totalPages)}
                    className="px-3 py-1 text-sm text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    {totalPages}
                  </button>
                );
              }

              return pages;
            })()}
          </div>

          {/* Next Page */}
          <button
            onClick={onNextPage}
            disabled={currentPage === totalPages}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last Page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors"
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>

        </div>

        {/* Items per page info */}
        <div className="text-sm text-slate-500">
          {itemsPerPage} items per page
        </div>

      </div>
    </div>
  );
}
