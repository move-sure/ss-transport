import React, { useState, useEffect } from 'react';
import { X, Archive, Search, Calendar, FileText, User, Package, Truck } from 'lucide-react';
import { formatCurrency, formatWeight } from './manual-helper';
import useBiltyDeletion from './use-bilty-deletion';

export default function ArchivedBiltyModal({ showModal, onClose }) {
  const { getDeletedBilties, searchDeletedBilties } = useBiltyDeletion();
  const [archivedData, setArchivedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [recordsPerPage] = useState(20);

  // Load archived bilties when modal opens
  useEffect(() => {
    if (showModal) {
      loadArchivedBilties();
    }
  }, [showModal, currentPage]);

  const loadArchivedBilties = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * recordsPerPage;
      const { data, count } = await getDeletedBilties(recordsPerPage, offset);
      setArchivedData(data);
      setTotalRecords(count);
    } catch (error) {
      console.error('Error loading archived bilties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadArchivedBilties();
      return;
    }

    try {
      setLoading(true);
      const results = await searchDeletedBilties(searchTerm);
      setArchivedData(results);
      setTotalRecords(results.length);
    } catch (error) {
      console.error('Error searching archived bilties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!showModal) return null;

  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden border-2 border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Archive size={28} />
            <div>
              <h2 className="text-2xl font-bold">Archived Bilty Records</h2>
              <p className="text-sm text-gray-200 mt-1">View deleted bilty records</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search by GR Number..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-800 transition-all font-semibold"
            >
              Search
            </button>
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  loadArchivedBilties();
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-auto max-h-[calc(90vh-280px)]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 font-semibold">Loading archived records...</p>
              </div>
            </div>
          ) : archivedData.length === 0 ? (
            <div className="text-center py-20 bg-white">
              <Archive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-semibold">
                {searchTerm ? 'No archived records found matching your search.' : 'No archived records found.'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">GR No</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Station</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Consignor</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Consignee</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Contents</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Packets</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Weight</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Deleted By</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Deleted At</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Reason</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {archivedData.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-indigo-600">{record.gr_no}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {record.station || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[150px] truncate">
                      {record.consignor || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[150px] truncate">
                      {record.consignee || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[150px] truncate">
                      {record.contents || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <Package size={14} className="text-gray-500" />
                        {record.no_of_packets || 0}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <Truck size={14} className="text-gray-500" />
                        {formatWeight(record.weight)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(record.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        record.payment_status === 'paid' 
                          ? 'bg-green-100 text-green-800'
                          : record.payment_status === 'to-pay'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {record.payment_status?.toUpperCase() || 'N/A'}
                        {record.delivery_type === 'door' && ' / DD'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <User size={14} className="text-gray-500" />
                        {record.deleted_by_user?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} className="text-gray-500" />
                        {new Date(record.deleted_at).toLocaleString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-[200px] truncate">
                      {record.delete_reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer with Pagination */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{startRecord}</span> to{' '}
              <span className="font-semibold">{endRecord}</span> of{' '}
              <span className="font-semibold">{totalRecords}</span> archived records
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <span className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-semibold">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
