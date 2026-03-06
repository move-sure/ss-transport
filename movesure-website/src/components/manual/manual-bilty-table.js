'use client';

import { 
  FileText, Edit2, Trash2, Shield, MapPin
} from 'lucide-react';
import { formatCurrency, formatWeight, TRANSIT_STATUS_CONFIG } from './manual-helper';

// Combined Payment and Delivery options
const COMBINED_OPTIONS = [
  { value: 'to-pay', label: 'TO PAY', payment_status: 'to-pay', delivery_type: 'godown' },
  { value: 'paid', label: 'PAID', payment_status: 'paid', delivery_type: 'godown' },
  { value: 'to-pay_door', label: 'TO PAY / DD', payment_status: 'to-pay', delivery_type: 'door' },
  { value: 'paid_door', label: 'PAID / DD', payment_status: 'paid', delivery_type: 'door' },
  { value: 'foc', label: 'FOC', payment_status: 'foc', delivery_type: 'godown' }
];

const getCombinedValue = (paymentStatus, deliveryType) => {
  const option = COMBINED_OPTIONS.find(opt => 
    opt.payment_status === paymentStatus && opt.delivery_type === deliveryType
  );
  return option ? option.value : 'to-pay';
};

const getCombinedOptionColor = (value) => {
  switch(value) {
    case 'paid':
    case 'paid_door':
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'to-pay':
    case 'to-pay_door':
      return 'bg-orange-100 text-orange-800 border border-orange-200';
    case 'foc':
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
};

// Transit Badge — challan no + truck number + dispatch date
const TransitBadge = ({ summary }) => {
  const status = summary.transit_status || 'AVL';
  const config = TRANSIT_STATUS_CONFIG[status] || TRANSIT_STATUS_CONFIG['AVL'];
  const challanNo = summary.transit_challan_no;
  const dispatchDate = summary.transit_dispatch_date;
  const truckNumber = summary.transit_truck_number;

  return (
    <div className={`inline-flex flex-col items-start gap-0.5 px-2 py-1 rounded-lg text-[10px] font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      <div className="flex items-center gap-1">
        <span className="text-xs leading-none">{config.icon}</span>
        <span className="font-bold leading-tight text-[11px]">{challanNo || 'AVL'}</span>
      </div>
      {truckNumber && (
        <div className="text-[10px] opacity-80 font-semibold pl-5 leading-none flex items-center gap-0.5">
          🚛 {truckNumber}
        </div>
      )}
      {dispatchDate && (
        <div className="text-[10px] opacity-75 font-medium pl-5 leading-none">
          {new Date(dispatchDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}
        </div>
      )}
    </div>
  );
};

const ManualBiltyTable = ({
  summaryData,
  searchResults,
  searchTerm,
  handleEdit,
  handleDeleteRequest,
  currentPage,
  totalPages,
  setCurrentPage,
  startRecord,
  endRecord,
  totalRecords,
  isAdvancedSearch = false
}) => {
  const dataToShow = (searchTerm || isAdvancedSearch) ? searchResults : summaryData;
  const isShowingSearchResults = searchTerm || isAdvancedSearch;

  return (
    <div className="w-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50 px-6 py-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              📋 Manual Bilty Records
              {isShowingSearchResults && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  {searchTerm ? `(Search: "${searchTerm}")` : '(Advanced Filter Results)'}
                </span>
              )}
            </h3>
            {!isShowingSearchResults && totalRecords > 0 && (
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Showing {startRecord} to {endRecord} of {totalRecords} records
              </p>
            )}
            {isShowingSearchResults && (
              <p className="text-sm text-blue-600 mt-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                Found {dataToShow.length} record{dataToShow.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          
          {/* Summary badges */}
          <div className="flex items-center gap-2">
            {dataToShow.length > 0 && (() => {
              const avlCount = dataToShow.filter(d => d.transit_status === 'AVL').length;
              const transitCount = dataToShow.filter(d => d.transit_status && d.transit_status !== 'AVL' && d.transit_status !== 'DELIVERED').length;
              const deliveredCount = dataToShow.filter(d => d.transit_status === 'DELIVERED').length;
              return (
                <>
                  <div className="bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 hidden lg:flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-green-700 text-xs font-semibold">{avlCount} AVL</span>
                  </div>
                  <div className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 hidden lg:flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="text-blue-700 text-xs font-semibold">{transitCount} Transit</span>
                  </div>
                  <div className="bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hidden lg:flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    <span className="text-emerald-700 text-xs font-semibold">{deliveredCount} Dlvd</span>
                  </div>
                </>
              );
            })()}
            
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 backdrop-blur-sm px-4 py-2 rounded-xl border border-purple-200">
              <span className="text-purple-700 font-semibold">{dataToShow.length}</span>
              <span className="text-purple-600 text-sm ml-1">records</span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-gradient-to-r from-gray-50 via-purple-50 to-blue-50">
            <tr>
              <th className="px-2 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Branch</th>
              <th className="px-2 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Station/GR</th>
              <th className="px-2 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Consignor</th>
              <th className="px-1 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Consignee</th>
              <th className="px-1 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Contents</th>
              <th className="px-2 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Pkgs/Wt</th>
              <th className="px-2 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Payment</th>
              <th className="px-2 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Amt</th>
              <th className="px-1.5 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">User / Date</th>
              <th className="px-0.5 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Challan</th>
              <th className="px-0.5 py-2.5 text-center text-[10px] font-bold text-gray-600 uppercase tracking-wider">Act</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-100">
            {dataToShow.map((summary) => {
              const transitStatus = summary.transit_status || 'AVL';
              const rowBorderClass = transitStatus === 'AVL' 
                ? 'border-l-4 border-l-green-400' 
                : transitStatus === 'DELIVERED' 
                  ? 'border-l-4 border-l-emerald-400' 
                  : 'border-l-4 border-l-blue-400';

              return (
                <tr key={summary.id} className={`hover:bg-purple-50/40 transition-all duration-150 group ${rowBorderClass}`}>
                  {/* Branch */}
                  <td className="px-1.5 py-2.5 whitespace-nowrap">
                    <div className="text-[10px] font-semibold text-gray-800 truncate max-w-[70px]">
                      {summary.branch?.branch_name || 'N/A'}
                    </div>
                    <div className="text-[9px] text-gray-400 font-medium">
                      {summary.branch?.branch_code || ''}
                    </div>
                  </td>

                  {/* Station/GR */}
                  <td className="px-2 py-2.5 whitespace-nowrap">
                    <div className="text-[13px] font-bold text-gray-900 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-purple-500 shrink-0" />
                      <span className="truncate max-w-[80px]">{summary.station}</span>
                    </div>
                    <div className="text-[13px] text-indigo-600 font-mono font-extrabold mt-0.5">
                      {summary.gr_no}
                    </div>
                  </td>

                  {/* Consignor */}
                  <td className="px-2 py-2.5">
                    <div className="text-xs font-semibold text-gray-900 break-words leading-tight">
                      {summary.consignor || '-'}
                    </div>
                  </td>

                  {/* Consignee */}
                  <td className="px-1 py-2.5">
                    <div className="text-xs text-gray-700 break-words leading-tight">
                      {summary.consignee || '-'}
                    </div>
                  </td>

                  {/* Contents/EWB */}
                  <td className="px-1 py-1.5">
                    <div className="text-xs text-gray-900 font-medium truncate max-w-[130px] leading-none">
                      {summary.contents || '-'}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap mt-px">
                      {summary.pvt_marks && (
                        <span className="text-xs text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded font-bold border border-purple-200 leading-tight">
                          {summary.pvt_marks}
                        </span>
                      )}
                      {summary.e_way_bill ? (
                        <span className="text-[8px] text-blue-600 bg-blue-50 px-1 py-px rounded-full border border-blue-200 font-bold leading-tight" title={summary.e_way_bill}>
                          📄 EWB
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Packages/Weight */}
                  <td className="px-2 py-2.5 whitespace-nowrap">
                    <div className="text-xs text-gray-900 font-semibold">{summary.no_of_packets} <span className="font-normal text-gray-500">pkgs</span></div>
                    <div className="text-xs text-gray-900 font-semibold">{formatWeight(summary.weight)}</div>
                  </td>

                  {/* Payment */}
                  <td className="px-2 py-2.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      getCombinedOptionColor(getCombinedValue(summary.payment_status, summary.delivery_type))
                    }`}>
                      {COMBINED_OPTIONS.find(opt =>
                        opt.payment_status === summary.payment_status && opt.delivery_type === summary.delivery_type
                      )?.label || `${summary.payment_status || 'N/A'}`}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="px-2 py-2.5 whitespace-nowrap text-xs font-bold text-gray-900">
                    {formatCurrency(summary.amount)}
                  </td>
                  
                  {/* User / Date */}
                  <td className="px-1.5 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      {/* Created */}
                      <div className="text-[9px] text-gray-500 leading-tight">
                        <div className="font-semibold text-gray-700 break-words">{summary.creator?.name || summary.creator?.username || 'System'}</div>
                        <div className="text-gray-400">
                          {summary.created_at ? new Date(summary.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}
                        </div>
                      </div>
                      {/* Updated */}
                      {summary.updated_at && summary.updated_at !== summary.created_at ? (
                        <div className="text-[9px] text-blue-500 leading-tight border-t border-gray-100 pt-0.5 mt-0.5">
                          <div className="font-semibold break-words">{summary.updater?.name || summary.updater?.username || 'System'}</div>
                          <div className="text-blue-400">
                            {new Date(summary.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </td>

                  {/* Challan Column */}
                  <td className="px-0.5 py-2.5 whitespace-nowrap">
                    <TransitBadge summary={summary} />
                  </td>

                  {/* Actions */}
                  <td className="px-0.5 py-2.5 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        onClick={() => handleEdit(summary)}
                        className="text-purple-600 hover:text-white p-1.5 hover:bg-purple-500 rounded-lg transition-all border border-purple-200 hover:border-purple-500 hover:shadow-sm"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRequest(summary)}
                        className="text-red-500 hover:text-white p-1.5 hover:bg-red-500 rounded-lg transition-all border border-red-200 hover:border-red-500 hover:shadow-sm"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {dataToShow.length === 0 && (
          <div className="text-center py-12 bg-white">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'No records found matching your search.' : 'No records found. Add your first entry!'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isShowingSearchResults && totalPages > 1 && (
        <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50 px-4 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium text-purple-700">{startRecord}</span> to{' '}
                  <span className="font-medium text-purple-700">{endRecord}</span> of{' '}
                  <span className="font-medium text-purple-700">{totalRecords}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-purple-300 bg-white text-sm font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum <= totalPages) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'z-10 bg-purple-100 border-purple-400 text-purple-800'
                              : 'bg-white border-purple-300 text-purple-700 hover:bg-purple-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    return null;
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-purple-300 bg-white text-sm font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualBiltyTable;
