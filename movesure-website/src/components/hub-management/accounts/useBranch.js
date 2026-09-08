'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { branchesApi } from './api';

const BranchContext = createContext(null);
const STORAGE_KEY = 'ledger.selectedBranchId'; // 'all' means "every branch" (owner only)

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (_) {
    return null;
  }
}

/**
 * One source of truth for "which branch am I looking at" — a real Context,
 * not a plain hook. A plain `useBranch()` with no Context gives every
 * component that calls it its own independent copy of the state: the header
 * dropdown and an "Add Expense" form would be two disconnected components,
 * each defaulting to the logged-in user's own branch and never finding out
 * about each other's changes. Mounting this Provider once, above every
 * screen, is what makes "select Kanpur in the header" actually reach every
 * form that reads branchId.
 */
export function BranchProvider({ defaultBranchId, children }) {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchIdState] = useState(() => readStored());

  useEffect(() => {
    branchesApi.list()
      .then((res) => {
        const list = res.data || [];
        setBranches(list);
        setBranchIdState((current) => current || defaultBranchId || list[0]?.id || null);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setBranchIdState((current) => current || defaultBranchId || null);
  }, [defaultBranchId]);

  const setBranch = useCallback((id) => {
    setBranchIdState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch (_) { /* ignore */ }
  }, []);

  const value = { branches, branchId, setBranch, isAllBranches: branchId === 'all' };
  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranch() must be used inside <BranchProvider>');
  return ctx;
}
