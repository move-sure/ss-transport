'use client';

import React, { useState } from 'react';
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
  Truck,
  Edit,
  Info
} from 'lucide-react';
import GodownPagination from './godown-pagination';
import TransportInfo from './transport-info';
import ChallanDetailsModal from './challan-details-modal';
import EditBiltyModal from './edit-bilty-modal';
import EditRegularBiltyModal from './edit-regular-bilty-modal';
import BiltyInfoModal from './bilty-info-modal';

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
  // Modal state
  const [selectedChallanNo, setSelectedChallanNo] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBilty, setSelectedBilty] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [infoBilty, setInfoBilty] = useState(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // Handle challan click
  const handleChallanClick = (challanNo) => {
    setSelectedChallanNo(challanNo);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedChallanNo(null);
  };

  // Handle edit click
  const handleEditClick = (bilty) => {
    // Allow edit for both station bilties (manual source) and regular bilties
    setSelectedBilty(bilty);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedBilty(null);
    // Refresh data when modal closes
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleBiltyUpdate = (updatedBilty) => {
    // Close modal first
    handleCloseEditModal();
  };

  // Handle info click
  const handleInfoClick = (bilty) => {
    setInfoBilty(bilty);
    setIsInfoModalOpen(true);
  };

  const handleCloseInfoModal = () => {
    setIsInfoModalOpen(false);
    setInfoBilty(null);
  };

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

  // Get payment status badge
  const getPaymentBadge = (paymentStatus) => {
    if (!paymentStatus) return null;
    
    const statusLower = paymentStatus.toLowerCase();
    
    if (statusLower === 'paid') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 border border-green-300">
          PAID
        </span>
      );
    } else if (statusLower === 'to-pay' || statusLower === 'to pay') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700 border border-orange-300">
          TO-PAY
        </span>
      );
    } else if (statusLower === 'foc') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 border border-purple-300">
          FOC
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
        {paymentStatus.toUpperCase()}
      </span>
    );
  };

  // Get delivery type badge
  const getDeliveryTypeBadge = (deliveryType) => {
    if (!deliveryType) return null;
    
    const typeLower = deliveryType.toLowerCase();
    
    if (typeLower === 'door') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-300">
          DOOR
        </span>
      );
    } else if (typeLower === 'godown') {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-300">
          GODOWN
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
        {deliveryType.toUpperCase()}
      </span>
    );
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
                Challan No
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
                Payment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Delivery
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
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
                  {bilty.challan_no ? (
                    <button
                      onClick={() => handleChallanClick(bilty.challan_no)}
                      className="flex items-center gap-2 text-sm font-medium text-green-600 hover:text-green-800 hover:underline transition-colors cursor-pointer"
                    >
                      <Truck className="w-4 h-4" />
                      <span>{bilty.challan_no}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-400">-</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-slate-900">
                        {bilty.consignor_name || '-'}
                      </span>
                    </div>
                    {bilty.consignor_number && (
                      <a 
                        href={`tel:${bilty.consignor_number}`}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium ml-6"
                        onClick={(e) => e.stopPropagation()}
                      >
                        📞 {bilty.consignor_number}
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm text-slate-900">
                        {bilty.consignee_name || '-'}
                      </span>
                    </div>
                    {bilty.consignee_number && (
                      <a 
                        href={`tel:${bilty.consignee_number}`}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium ml-6"
                        onClick={(e) => e.stopPropagation()}
                      >
                        📞 {bilty.consignee_number}
                      </a>
                    )}
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
                  {getPaymentBadge(bilty.payment_status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getDeliveryTypeBadge(bilty.delivery_type)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getSourceBadge(bilty.source)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {formatDate(bilty.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleInfoClick(bilty)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-xs font-medium shadow-sm"
                    >
                      <Info className="w-3.5 h-3.5" />
                      Info
                    </button>
                    <button
                      onClick={() => handleEditClick(bilty)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-medium shadow-sm"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  </div>
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

              {/* Challan Number */}
              {bilty.challan_no && (
                <button
                  onClick={() => handleChallanClick(bilty.challan_no)}
                  className="flex items-center justify-between w-full mb-3 bg-green-50 p-3 rounded-lg border border-green-200 hover:bg-green-100 hover:border-green-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-slate-500 uppercase">
                      Challan No
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-700 font-bold">
                      {bilty.challan_no}
                    </span>
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              )}

              {/* Content Grid */}
              <div className="grid grid-cols-1 gap-3">
                
                {/* Consigner */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 w-24 flex-shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-slate-500 uppercase">
                      Consignor
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-slate-900 font-medium">
                      {bilty.consignor_name || '-'}
                    </span>
                    {bilty.consignor_number && (
                      <a 
                        href={`tel:${bilty.consignor_number}`}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        📞 {bilty.consignor_number}
                      </a>
                    )}
                  </div>
                </div>

                {/* Consignee */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 w-24 flex-shrink-0">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-medium text-slate-500 uppercase">
                      Consignee
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-slate-900 font-medium">
                      {bilty.consignee_name || '-'}
                    </span>
                    {bilty.consignee_number && (
                      <a 
                        href={`tel:${bilty.consignee_number}`}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        📞 {bilty.consignee_number}
                      </a>
                    )}
                  </div>
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

                {/* Payment and Delivery Row */}
                <div className="flex items-center justify-between pt-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">Payment</span>
                    {getPaymentBadge(bilty.payment_status)}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">Delivery</span>
                    {getDeliveryTypeBadge(bilty.delivery_type)}
                  </div>
                </div>

                {/* Date Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    {formatDate(bilty.created_at)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleInfoClick(bilty)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 active:bg-purple-700 transition-colors text-xs font-medium shadow-sm"
                    >
                      <Info className="w-3.5 h-3.5" />
                      Info
                    </button>
                    <button
                      onClick={() => handleEditClick(bilty)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors text-xs font-medium shadow-sm"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  </div>
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

      {/* Challan Details Modal */}
      <ChallanDetailsModal
        challanNo={selectedChallanNo}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* Edit Bilty Modal - For Station Bilties (manual source) */}
      {isEditModalOpen && selectedBilty && selectedBilty.source === 'manual' && (
        <EditBiltyModal
          bilty={selectedBilty}
          onClose={handleCloseEditModal}
          onUpdate={handleBiltyUpdate}
        />
      )}

      {/* Edit Regular Bilty Modal - For Regular Bilties (transit-bilty upload only) */}
      {isEditModalOpen && selectedBilty && selectedBilty.source === 'regular' && (
        <EditRegularBiltyModal
          bilty={selectedBilty}
          onClose={handleCloseEditModal}
          onUpdate={handleBiltyUpdate}
        />
      )}

      {/* Bilty Info Modal */}
      <BiltyInfoModal
        bilty={infoBilty}
        isOpen={isInfoModalOpen}
        onClose={handleCloseInfoModal}
        isTransit={infoBilty?.source !== 'manual'}
      />

    </div>
  );
}
