'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { ledgerApi } from './api';

/**
 * Debounced searchable ledger dropdown.
 * `value` is the currently selected ledger object (or null); `onChange` receives
 * the full ledger object so callers can read is_bill_wise etc. without a refetch.
 */
export default function LedgerPicker({ value, onChange, branchId, groupId, placeholder = 'Search ledger…', disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value?.name || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!open) setQuery(value?.name || '');
  }, [value, open]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = useCallback((text) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await ledgerApi.ledgers.list({
          search: text, is_active: true, branch_id: branchId, group_id: groupId, page: 1, page_size: 20,
        });
        setResults(res.data?.rows || []);
      } catch (_) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [branchId, groupId]);

  useEffect(() => {
    if (open) search(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  const handleFocus = () => {
    setOpen(true);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm border-gray-300 focus-within:ring-2 focus-within:ring-emerald-500 ${disabled ? 'bg-gray-100' : 'bg-white'}`}>
        <Search className="w-4 h-4 text-black flex-shrink-0" />
        <input
          type="text"
          disabled={disabled}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="flex-1 outline-none bg-transparent text-black disabled:cursor-not-allowed min-w-0"
        />
        {loading && <Loader2 className="w-4 h-4 text-black animate-spin flex-shrink-0" />}
      </div>

      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {results.length === 0 && !loading && (
            <div className="px-3 py-2 text-sm text-black">No ledgers found</div>
          )}
          {results.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => { onChange(l); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-black hover:bg-emerald-50 flex items-center justify-between gap-2"
            >
              <span className="truncate">{l.name}</span>
              {l.is_bill_wise && (
                <span className="text-[10px] text-emerald-600 font-semibold flex-shrink-0">bill-wise</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
