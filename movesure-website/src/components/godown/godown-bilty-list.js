'use client';

import React from 'react';
import { 
  Package, 
  MapPin, 
  Tag, 
  Building,
  AlertCircle,
  RefreshCw,
  Search,
  FileText,
  Weight,
  User,
  Users,
  Truck
} from 'lucide-react';
import GodownPagination from './godown-pagination';
import TransportInfo from './transport-info';

export default function GodownBiltyList({ 
  bilties, 
  loading, 
  error, 
  onRefresh,
  totalRecords,
  currentPage,
  totalPages,
  itemsPerPage,
  startRecord,
  endRecord,
  onPageChange,
  onPreviousPage,
  onNextPage
}) {
  // Format weight helper
  const formatWeight = (weight) => {
    if (!weight) return '-';
    const numWeight = parseFloat(weight);
    if (isNaN(numWeight)) return '-';
    return `${numWeight.toFixed(3)} kg`;
  };

  // Format date helper
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get source badge
  const getSourceBadge = (source) => {
    if (source === 'regular') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Building className="w-3 h-3 mr-1" />
          Regular
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <MapPin className="w-3 h-3 mr-1" />
          Manual
        </span>
      );
    }
  };

  // Bilties are already sorted and paginated from parent component
  const sortedBilties = bilties;

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">Loading Bilties...</h3>
          <p className="text-slate-500">Please wait while we fetch godown records</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-600 mb-2">Error Loading Bilties</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center gap-2 mx-auto transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (sortedBilties.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <div className="text-center">
          <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-2">No Bilties Found</h3>
          <p className="text-slate-500 mb-4">
            {totalRecords > 0 
              ? `No records found on page ${currentPage}. Try adjusting your search or going to a different page.`
              : 'No bilty records match your current filters.'
            }
          </p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 mx-auto transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Godown Bilty Records
          </h2>
          <div className="text-slate-200 text-sm">
            <div>Showing {startRecord}-{endRecord} of {totalRecords} records</div>
            <div className="text-xs opacity-75">Page {currentPage} of {totalPages}</div>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                GR Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Consignor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Consignee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Private Marks
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Destination (Code)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Transport
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                No of Bags
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Weight
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {sortedBilties.map((bilty) => (
              <tr key={`${bilty.source}-${bilty.id}`} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-slate-900">
                      {bilty.gr_no || 'N/A'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-slate-900">
                      {bilty.consignor_name || '-'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm text-slate-900">
                      {bilty.consignee_name || '-'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-slate-900">
                      {bilty.pvt_marks || '-'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-600" />
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-900 font-medium">
                        {bilty.destination || 'Unknown'}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({bilty.city_code || 'N/A'})
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <TransportInfo transports={bilty.transports} maxDisplay={2} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-slate-900">
                      {bilty.no_of_bags || '0'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Weight className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-slate-900">
                      {formatWeight(bilty.weight)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getSourceBadge(bilty.source)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {formatDate(bilty.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden">
        <div className="divide-y divide-slate-200">
          {sortedBilties.map((bilty) => (
            <div key={`${bilty.source}-${bilty.id}`} className="p-4 hover:bg-slate-50 transition-colors">
              
              {/* Header Row - GR Number and Source */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-slate-900 text-lg">
                    {bilty.gr_no || 'N/A'}
                  </span>
                </div>
                {getSourceBadge(bilty.source)}
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 gap-3">
                
                {/* Consigner */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-24 flex-shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-slate-500 uppercase">
                      Consignor
                    </span>
                  </div>
                  <span className="text-sm text-slate-900 font-medium">
                    {bilty.consignor_name || '-'}
                  </span>
                </div>

                {/* Consignee */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-24 flex-shrink-0">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-medium text-slate-500 uppercase">
                      Consignee
                    </span>
                  </div>
                  <span className="text-sm text-slate-900 font-medium">
                    {bilty.consignee_name || '-'}
                  </span>
                </div>

                {/* Private Marks */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-24 flex-shrink-0">
                    <Tag className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-slate-500 uppercase">
                      Pvt Marks
                    </span>
                  </div>
                  <span className="text-sm text-slate-900 font-medium">
                    {bilty.pvt_marks || '-'}
                  </span>
                </div>

                {/* Destination */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-24 flex-shrink-0">
                    <MapPin className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-medium text-slate-500 uppercase">
                      Destination
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-900 font-medium">
                      {bilty.destination || 'Unknown'}
                    </span>
                    <span className="text-xs text-slate-500">
                      Code: {bilty.city_code || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Transport */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 w-24 flex-shrink-0">
                    <span className="text-xs font-medium text-slate-500 uppercase">
                      Transport
                    </span>
                  </div>
                  <div className="flex-1">
                    <TransportInfo transports={bilty.transports} maxDisplay={3} showIcon={false} />
                  </div>
                </div>

                {/* Weight and Bags Row */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-bold text-slate-900">
                      {bilty.no_of_bags || '0'} Bags
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Weight className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-bold text-slate-900">
                      {formatWeight(bilty.weight)}
                    </span>
                  </div>
                </div>

                {/* Date Row */}
                <div className="flex items-center justify-center pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    {formatDate(bilty.created_at)}
                  </span>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Controls */}
      <GodownPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        startRecord={startRecord}
        endRecord={endRecord}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
      />

    </div>
  );
}
