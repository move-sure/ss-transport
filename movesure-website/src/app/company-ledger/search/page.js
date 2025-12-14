'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../utils/auth';
import supabase from '../../utils/supabase';
import {
  LedgerSearchFilters,
  LedgerSearchTable,
  SelectedBiltiesPanel,
  SearchPagination,
  SearchHeader,
  EmptySearchState,
  useBiltySearch,
  useBiltySelection
} from '../../../components/company-ledger/search';

export default function LedgerSearchPage() {
  const { user, requireAuth } = useAuth();
  const [cities, setCities] = useState([]);

  // Use custom hooks for search and selection logic
  const {
    loading,
    error,
    searchFilters,
    searchResults,
    hasSearched,
    currentPage,
    itemsPerPage,
    totalPages,
    handleFilterChange,
    handleClearFilters,
    performSearch,
    handlePageChange,
    handleItemsPerPageChange
  } = useBiltySearch(user);

  const {
    selectedBilties,
    selectedBiltiesData,
    showSelectedPanel,
    handleSelectBilty,
    handleSelectAll,
    handleRemoveBilty,
    handleClearAllSelected,
    toggleSelectedPanel,
    closeSelectedPanel,
    handleDownloadCSV,
    handleCopyToClipboard,
    handlePrint
  } = useBiltySelection();

  // Check authentication
  useEffect(() => {
    if (!requireAuth()) return;
  }, [requireAuth]);

  // Fetch cities on mount
  useEffect(() => {
    if (user) {
      supabase
        .from('cities')
        .select('*')
        .order('city_name')
        .then(({ data }) => setCities(data || []));
    }
  }, [user]);

  return (
    <div className="p-4 w-full h-full overflow-auto">
      <SearchHeader 
        selectedCount={selectedBilties.length}
        showSelectedPanel={showSelectedPanel}
        onTogglePanel={toggleSelectedPanel}
      />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <LedgerSearchFilters
        filters={searchFilters}
        onFilterChange={handleFilterChange}
        onSearch={performSearch}
        onClearFilters={handleClearFilters}
        cities={cities}
        loading={loading}
      />

      {hasSearched ? (
        <>
          <LedgerSearchTable
            data={searchResults}
            loading={loading}
            selectedBilties={selectedBilties}
            onSelectBilty={handleSelectBilty}
            onSelectAll={handleSelectAll}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
          />
          
          <SearchPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={searchResults.totalCount}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </>
      ) : !loading && (
        <EmptySearchState />
      )}

      {showSelectedPanel && (
        <SelectedBiltiesPanel
          selectedBilties={selectedBiltiesData}
          onRemove={handleRemoveBilty}
          onClearAll={handleClearAllSelected}
          onClose={closeSelectedPanel}
          onDownloadCSV={handleDownloadCSV}
          onCopyToClipboard={handleCopyToClipboard}
          onPrint={handlePrint}
        />
      )}
    </div>
  );
}
