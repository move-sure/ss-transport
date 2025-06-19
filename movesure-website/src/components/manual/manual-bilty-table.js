'use client';

import { 
  FileText, Edit2, Trash2, MapPin, Users, Package, Weight, Shield, Building2
} from 'lucide-react';
import { formatCurrency, formatWeight } from './manual-helper';

// Combined Payment and Delivery options
const COMBINED_OPTIONS = [
  { value: 'to-pay', label: 'TO PAY', payment_status: 'to-pay', delivery_type: 'godown' },
  { value: 'paid', label: 'PAID', payment_status: 'paid', delivery_type: 'godown' },
  { value: 'to-pay_door', label: 'TO PAY / DD', payment_status: 'to-pay', delivery_type: 'door' },
  { value: 'paid_door', label: 'PAID / DD', payment_status: 'paid', delivery_type: 'door' },
  { value: 'foc', label: 'FOC', payment_status: 'foc', delivery_type: 'godown' }
];

// Helper function to get combined value from payment status and delivery type
const getCombinedValue = (paymentStatus, deliveryType) => {
  const option = COMBINED_OPTIONS.find(opt => 
    opt.payment_status === paymentStatus && opt.delivery_type === deliveryType
  );
  return option ? option.value : 'to-pay';
};

// Helper function to get combined option color
const getCombinedOptionColor = (value) => {
  switch(value) {
    case 'paid':
    case 'paid_door':
      return 'bg-green-100 text-green-800';
    case 'to-pay':
    case 'to-pay_door':
      return 'bg-orange-100 text-orange-800';
    case 'foc':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const ManualBiltyTable = ({
  summaryData,
  searchResults,
  searchTerm,
  handleEdit,
  setShowDeleteConfirm,
  setFormData,
  setShowEwbValidator,
  currentPage,
  totalPages,
  setCurrentPage,
  startRecord,
  endRecord,
  totalRecords
}) => {
  const dataToShow = searchTerm ? searchResults : summaryData;

  return (
    <div className="w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Manual Bilty Records 
          {searchTerm && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              (Showing search results for {searchTerm})
            </span>
          )}
        </h3>
        {!searchTerm && totalRecords > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            Showing {startRecord} to {endRecord} of {totalRecords} records
          </p>
        )}
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manual/GR No</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consignor/Consignee</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contents/PVT Marks</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-way Bill</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Packages/Weight</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment & Delivery</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>          <tbody className="bg-white divide-y divide-gray-200">
            {dataToShow.map((summary) => (
              <tr key={summary.id} className="hover:bg-gray-50">                {/* Branch Column */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-500" />
                      {summary.branches?.branch_name || summary.branch?.branch_name || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Code: {summary.branches?.branch_code || summary.branch?.branch_code || 'N/A'}
                    </div>
                  </div>
                </td>
                
                {/* Manual/GR No Column */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {summary.station}
                    </div>
                    <div className="text-sm text-gray-500">GR: {summary.gr_no}</div>
                  </div>
                </td>
                
                {/* Consignor/Consignee Column */}
                <td className="px-4 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      {summary.consignor || '-'}
                    </div>
                    <div className="text-sm text-gray-500">To: {summary.consignee || '-'}</div>
                  </div>
                </td>                
                {/* Contents/PVT Marks Column */}
                <td className="px-4 py-4">
                  <div>
                    <div className="text-sm text-gray-900 font-medium">{summary.contents || '-'}</div>
                    {summary.pvt_marks && (
                      <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded mt-1 inline-block">
                        <span className="font-medium">PVT:</span> {summary.pvt_marks}
                      </div>
                    )}
                  </div>
                </td>
                
                {/* E-way Bill Column */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div>
                    {summary.e_way_bill ? (
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900 bg-blue-50 px-2 py-1 rounded border">
                          <span className="text-blue-600">EWB:</span> {summary.e_way_bill}
                        </div>
                        <button
                          onClick={() => {
                            setFormData(prev => ({ ...prev, e_way_bill: summary.e_way_bill }));
                            setShowEwbValidator(true);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="Validate E-way Bill"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No E-way Bill</span>
                    )}
                  </div>
                </td>
                
                {/* Packages/Weight Column */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{summary.no_of_packets} packages</div>
                  <div className="text-sm text-gray-500">{formatWeight(summary.weight)}</div>
                </td>
                
                {/* Payment & Delivery Column */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    getCombinedOptionColor(getCombinedValue(summary.payment_status, summary.delivery_type))
                  }`}>
                    {COMBINED_OPTIONS.find(opt => 
                      opt.payment_status === summary.payment_status && opt.delivery_type === summary.delivery_type
                    )?.label || `${summary.payment_status || 'N/A'} / ${summary.delivery_type || 'N/A'}`}
                  </span>
                </td>
                  {/* Amount Column */}
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(summary.amount)}
                </td>
                
                {/* Created Date Column */}
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {summary.created_at ? new Date(summary.created_at).toLocaleDateString('en-GB') : 'N/A'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {summary.created_at ? new Date(summary.created_at).toLocaleTimeString('en-GB', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }) : ''}
                    </span>
                  </div>
                </td>
                
                {/* Actions Column */}
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(summary)}
                      className="text-purple-600 hover:text-purple-900 p-1 hover:bg-purple-50 rounded"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(summary.id)}
                      className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {dataToShow.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'No records found matching your search.' : 'No records found. Add your first entry!'}
            </p>
          </div>
        )}
      </div>      {/* Pagination */}
      {!searchTerm && totalPages > 1 && (
        <div className="bg-white px-4 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startRecord}</span> to{' '}
                  <span className="font-medium">{endRecord}</span> of{' '}
                  <span className="font-medium">{totalRecords}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum <= totalPages) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-purple-50 border-purple-500 text-purple-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
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
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
