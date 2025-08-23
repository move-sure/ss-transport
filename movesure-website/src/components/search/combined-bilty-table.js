'use client';

import React, { memo } from 'react';
import { 
  FileText, 
  Calendar, 
  IndianRupee,
  RefreshCw,
  Edit,
  Printer,
  AlertCircle,
  Search,
  CheckSquare,
  Square,
  Package,
  MapPin,
  Building,
  Tag
} from 'lucide-react';

const CombinedBiltySearchTable = memo(({ 
  regularBilties,
  stationBilties, 
  loading, 
  error, 
  selectedBilties,
  selectAll,
  getCityName, 
  getFromCityName, 
  onSelectBilty,
  onSelectAll,
  onBiltyDoubleClick,
  onEdit, 
  onPrint, 
  onRefresh,
  currentPage = 1,
  itemsPerPage = 100
}) => {

  // Combine and paginate data
  const allBilties = [...regularBilties, ...stationBilties];
  const totalItems = allBilties.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Paginate the combined data
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBilties = allBilties.slice(startIndex, endIndex);

  // Format date helper
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  // Status badge component
  const getStatusBadge = (savingOption, isStation = false) => {
    if (isStation) {
      // Station bilty status based on payment_status
      switch (savingOption) {
        case 'paid':
          return (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              Paid
            </span>
          );
        case 'to-pay':
          return (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
              To-Pay
            </span>
          );
        case 'foc':
          return (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              FOC
            </span>
          );
        default:
          return (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
              {savingOption || 'Unknown'}
            </span>
          );
      }
    } else {
      // Regular bilty status
      switch (savingOption) {
        case 'DRAFT':
          return (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
              Draft
            </span>
          );
        case 'SAVE':
          return (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              Saved
            </span>
          );
        default:
          return (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
              {savingOption || 'Unknown'}
            </span>
          );
      }
    }
  };

  // Payment badge component
  const getPaymentBadge = (paymentMode, isStation = false) => {
    if (isStation) {
      const badges = {
        'to-pay': 'bg-orange-100 text-orange-800',
        'paid': 'bg-green-100 text-green-800',
        'foc': 'bg-blue-100 text-blue-800'
      };
      
      const colorClass = badges[paymentMode] || 'bg-gray-100 text-gray-800';
      
      return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
          {paymentMode?.replace('-', ' ').toUpperCase() || 'Unknown'}
        </span>
      );
    } else {
      const badges = {
        'to-pay': 'bg-orange-100 text-orange-800',
        'paid': 'bg-green-100 text-green-800',
        'freeofcost': 'bg-blue-100 text-blue-800'
      };
      
      const colorClass = badges[paymentMode] || 'bg-gray-100 text-gray-800';
      
      return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
          {paymentMode?.replace('-', ' ').toUpperCase() || 'Unknown'}
        </span>
      );
    }
  };

  // Handle row click for selection
  const handleRowClick = (e, biltyId) => {
    // Prevent selection if clicking on action buttons
    if (e.target.closest('.action-buttons')) {
      return;
    }
    onSelectBilty(biltyId);
  };

  // Combine and sort both types of bilties
  const combinedBilties = [
    ...regularBilties.map(b => ({ ...b, bilty_type: 'regular' })),
    ...stationBilties.map(b => ({ ...b, bilty_type: 'station' }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Paginate the combined data
  const displayBilties = paginatedBilties.length > 0 ? paginatedBilties : combinedBilties;

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">Loading Bilties...</h3>
          <p className="text-slate-500">Please wait while we fetch your records</p>
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
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (combinedBilties.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <div className="text-center">
          <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-2">No Bilties Found</h3>
          <p className="text-slate-500 mb-4">No bilty records match your current filters.</p>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>
    );
  }

  // Main table
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Table Header with Selection */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onSelectAll}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
            >
              {selectAll ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-sm font-medium text-slate-700">
                {selectAll ? 'Deselect All' : 'Select All'}
              </span>
            </button>
            
            {selectedBilties.size > 0 && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {selectedBilties.size} selected
              </span>
            )}
          </div>
          
          <div className="text-sm text-slate-600">
            {allBilties.length} bilties ({regularBilties.length} regular, {stationBilties.length} station) • Click to select • Double-click for details
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-700">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider w-16">
                Select
              </th>
              <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider w-20">
                Type
              </th>
              <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider w-32">
                GR & Date
              </th>
              <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider w-48">
                Consignor
              </th>
              <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider w-48">
                Consignee
              </th>
              <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider w-32">
                Content & Pvt Marks
              </th>
              <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider w-40">
                Route/Station
              </th>
              <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider w-32">
                Amount
              </th>
              <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider w-24">
                Status
              </th>
              <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider w-28">
                Challan Details
              </th>
              <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider w-32">
                Created By & Date
              </th>
              <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase tracking-wider w-20">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {displayBilties.map((bilty, index) => {
              const isSelected = selectedBilties.has(bilty.id);
              const isStation = bilty.bilty_type === 'station';
              
              return (
                <tr 
                  key={`${bilty.bilty_type}-${bilty.id}`} 
                  onClick={(e) => handleRowClick(e, bilty.id)}
                  onDoubleClick={() => onBiltyDoubleClick(bilty)}
                  className={`transition-all duration-200 cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-50 border-l-4 border-blue-500 shadow-sm' 
                      : index % 2 === 0 
                        ? 'bg-white hover:bg-slate-50' 
                        : 'bg-slate-25 hover:bg-slate-50'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center justify-center">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </td>

                  {/* Type Badge */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-bold rounded ${
                      isStation ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {isStation ? 'STN' : 'REG'}
                    </span>
                  </td>

                  {/* GR & Date */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3 text-blue-600" />
                        <span className="text-sm font-bold text-blue-600">{bilty.gr_no}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <Calendar className="w-3 h-3" />
                        {isStation ? formatDate(bilty.created_at) : formatDate(bilty.bilty_date)}
                      </div>
                    </div>
                  </td>

                  {/* Consignor */}
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-slate-900 truncate max-w-44" 
                           title={isStation ? bilty.consignor : bilty.consignor_name}>
                        {isStation ? (bilty.consignor || 'N/A') : bilty.consignor_name}
                      </div>
                      {!isStation && bilty.consignor_number && (
                        <div className="text-xs text-slate-600">{bilty.consignor_number}</div>
                      )}
                    </div>
                  </td>

                  {/* Consignee */}
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-slate-900 truncate max-w-44" 
                           title={isStation ? bilty.consignee : bilty.consignee_name}>
                        {isStation ? (bilty.consignee || 'N/A') : (bilty.consignee_name || 'N/A')}
                      </div>
                      {!isStation && bilty.consignee_number && (
                        <div className="text-xs text-slate-600">{bilty.consignee_number}</div>
                      )}
                    </div>
                  </td>

                  {/* Content & Pvt Marks */}
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      {/* Content field - handle both optimized search results and regular data */}
                      {(() => {
                        const contentValue = isStation 
                          ? (bilty.content_field || bilty.contents) 
                          : (bilty.content_field || bilty.contain);
                        return contentValue && (
                          <div className="text-sm font-medium text-slate-900 truncate max-w-32" 
                               title={`Content: ${contentValue}`}>
                            <div className="flex items-center gap-1">
                              <Package className="w-3 h-3 text-blue-600" />
                              <span className="text-blue-800 font-medium text-xs">
                                {contentValue}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Private Marks field */}
                      {bilty.pvt_marks && (
                        <div className="text-sm font-medium text-slate-900 truncate max-w-32" 
                             title={`Private Mark: ${bilty.pvt_marks}`}>
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3 text-purple-600" />
                            <span className="text-purple-800 font-medium text-xs">
                              {bilty.pvt_marks}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Show message when both are empty */}
                      {(() => {
                        const contentValue = isStation 
                          ? (bilty.content_field || bilty.contents) 
                          : (bilty.content_field || bilty.contain);
                        return !contentValue && !bilty.pvt_marks && (
                          <span className="text-slate-400 italic text-xs">No content/marks</span>
                        );
                      })()}
                    </div>
                  </td>

                  {/* Route/Station */}
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      {isStation ? (
                        <div className="flex items-center gap-1">
                          <Building className="w-3 h-3 text-purple-600" />
                          <span className="text-sm text-slate-900 font-medium">
                            {bilty.station || 'N/A'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-blue-600" />
                          <span className="text-sm text-slate-900 font-medium">
                            {getFromCityName()} → {getCityName(bilty.to_city_id)}
                          </span>
                        </div>
                      )}
                      {bilty.e_way_bill ? (
                        <span className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded">
                          E-Way
                        </span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">
                          No E-Way
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <IndianRupee className="w-3 h-3 text-green-600" />
                        <span className="text-sm font-bold text-green-600">
                          ₹{isStation ? (bilty.amount || 0) : (bilty.total || 0)}
                        </span>
                      </div>
                      <div>
                        {getPaymentBadge(isStation ? bilty.payment_status : bilty.payment_mode, isStation)}
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      <div>
                        {getStatusBadge(isStation ? bilty.payment_status : bilty.saving_option, isStation)}
                      </div>
                      {((isStation && bilty.no_of_packets > 0) || (!isStation && bilty.no_of_pkg > 0)) && (
                        <div className="text-xs text-slate-600">
                          {isStation ? bilty.no_of_packets : bilty.no_of_pkg} pkgs
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Challan Details */}
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      {bilty.transit_details && bilty.transit_details.length > 0 ? (
                        <div>
                          <span className="text-sm font-medium text-blue-600">
                            {bilty.transit_details[0].challan_no}
                          </span>
                          <div className="text-xs text-slate-500">
                            {bilty.transit_details[0].dispatch_date ? (
                              <div className="flex items-center gap-1">
                                <span className="text-green-600">Dispatched:</span>
                                <span>{formatDate(bilty.transit_details[0].dispatch_date)}</span>
                              </div>
                            ) : (
                              <span className="text-orange-600">Not Dispatched</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-green-600">
                          AVL
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Created By & Date */}
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-slate-900">
                        {bilty.created_by_user ? (bilty.created_by_user.name || bilty.created_by_user.username) : 'N/A'}
                      </div>
                      <div className="text-xs text-slate-600">
                        {formatDate(bilty.created_at)}
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex flex-col gap-1 action-buttons">
                      {/* Only show Edit and Print for regular bilties, not station bilties */}
                      {!isStation && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(bilty);
                            }}
                            className="inline-flex items-center px-2 py-1 border border-blue-300 rounded text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all text-xs font-medium"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPrint(bilty);
                            }}
                            className="inline-flex items-center px-2 py-1 border border-green-300 rounded text-green-700 bg-green-50 hover:bg-green-100 transition-all text-xs font-medium"
                          >
                            <Printer className="w-3 h-3 mr-1" />
                            Print
                          </button>
                        </>
                      )}
                      {isStation && (
                        <div className="flex items-center justify-center">
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                            <Building className="w-3 h-3 mr-1" />
                            Station Entry
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Table Footer with Pagination */}
      <div className="bg-slate-50 px-4 py-3 border-t border-slate-200">
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-600">
            <span>
              Showing {displayBilties.length} bilties ({regularBilties.length} regular, {stationBilties.length} station)
            </span>
            <div className="flex gap-4 mt-1">
              <span>Selected: {selectedBilties.size}</span>
              <span>
                Total: ₹{(
                  regularBilties.reduce((sum, b) => sum + (b.total || 0), 0) +
                  stationBilties.reduce((sum, b) => sum + (b.amount || 0), 0)
                ).toLocaleString()}
              </span>
            </div>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">
                Page {currentPage} of {totalPages} ({totalItems} total)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>  );
});

CombinedBiltySearchTable.displayName = 'CombinedBiltySearchTable';

export default CombinedBiltySearchTable;
