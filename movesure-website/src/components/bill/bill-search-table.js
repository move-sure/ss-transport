'use client';

import React, { memo, useCallback } from 'react';
import { 
  FileText,
  Building,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';

const BillSearchTable = memo(({ 
  paginatedData, 
  loading, 
  onSelectBilty,
  onSelectAll,
  selectedBilties = [],
  allBiltiesCount = 0
}) => {

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatDispatchDate = (dateString) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch (error) {
      return null;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0.00';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const RegularBiltyRow = memo(({ bilty, index }) => {
    const isSelected = selectedBilties.includes(`regular-${bilty.id}`);
    
    const handleRowClick = useCallback((e) => {
      if (e.target.type === 'checkbox') return;
      onSelectBilty({ ...bilty, type: 'regular' });
    }, [bilty]);
    
    const handleCheckboxChange = useCallback((e) => {
      e.stopPropagation();
      onSelectBilty({ ...bilty, type: 'regular' });
    }, [bilty]);
    
    return (
      <tr 
        onClick={handleRowClick}
        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
        } hover:bg-blue-100 cursor-pointer transition-colors`}
      >
        <td className="px-3 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
          />
        </td>
        
        <td className="px-3 py-2 whitespace-nowrap">
          <div className="flex items-center">
            <FileText className="h-4 w-4 text-blue-500 mr-1" />
            <div>
              <div className="text-xs font-medium text-gray-900">{bilty.gr_no}</div>
              <div className="text-xs text-gray-500">Regular</div>
            </div>
          </div>
        </td>
        
        <td className="px-3 py-2 whitespace-nowrap">
          <div className="text-xs text-gray-900">{formatDate(bilty.bilty_date)}</div>
        </td>
        
        <td className="px-3 py-2">
          <div className="text-xs text-gray-900 max-w-32 truncate" title={bilty.consignor_name}>
            {bilty.consignor_name || 'N/A'}
          </div>
        </td>
        
        <td className="px-3 py-2">
          <div className="text-xs text-gray-900 max-w-32 truncate" title={bilty.consignee_name}>
            {bilty.consignee_name || 'N/A'}
          </div>
        </td>
        
        <td className="px-3 py-2 whitespace-nowrap">
          <div className="flex items-center text-xs text-gray-900">
            <MapPin className="h-3 w-3 text-gray-400 mr-1" />
            <div className="text-center">
              <div className="font-medium">{bilty.to_city_name || 'N/A'}</div>
              <div className="text-xs text-gray-500">{bilty.to_city_code || 'N/A'}</div>
            </div>
          </div>
        </td>
        
        <td className="px-3 py-2 whitespace-nowrap">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            bilty.delivery_type === 'door-delivery' || bilty.delivery_type === 'door' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
          }`}>
            {bilty.delivery_type === 'door-delivery' || bilty.delivery_type === 'door' ? 'DD' : 'Godown'}
          </span>
        </td>
        
        <td className="px-3 py-2 whitespace-nowrap">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            bilty.payment_mode === 'paid' ? 'bg-green-100 text-green-800' :
            bilty.payment_mode === 'to-pay' ? 'bg-yellow-100 text-yellow-800' :
            bilty.payment_mode === 'foc' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {bilty.payment_mode?.toUpperCase() || 'N/A'}
          </span>
        </td>
        
        <td className="px-3 py-2 whitespace-nowrap">
          <div className="text-xs font-medium text-gray-900">
            {formatCurrency(bilty.total)}
          </div>
        </td>
        
        <td className="px-3 py-2">
          <div className="text-xs text-gray-900 max-w-24 truncate" title={bilty.pvt_marks}>
            {bilty.pvt_marks || 'N/A'}
          </div>
        </td>
        
        <td className="px-3 py-2 whitespace-nowrap">
          <div className="text-xs text-gray-900">
            <div className="font-medium">{bilty.challan_no || 'N/A'}</div>
            {bilty.dispatch_date && (
              <div className="text-xs text-gray-500">
                Dispatched: {formatDispatchDate(bilty.dispatch_date)}
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  });

  const StationBiltyRow = memo(({ bilty, index }) => {
    const isSelected = selectedBilties.includes(`station-${bilty.id}`);
    
    const handleRowClick = useCallback((e) => {
      if (e.target.type === 'checkbox') return;
      onSelectBilty({ ...bilty, type: 'station' });
    }, [bilty]);
    
    const handleCheckboxChange = useCallback((e) => {
      e.stopPropagation();
      onSelectBilty({ ...bilty, type: 'station' });
    }, [bilty]);
    
    return (
      <tr 
        onClick={handleRowClick}
        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
        } hover:bg-blue-100 cursor-pointer transition-colors`}
      >
        <td className="px-3 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
          />
        </td>
        
        <td className="px-3 py-2 whitespace-nowrap">
          <div className="flex items-center">
            <Building className="h-4 w-4 text-purple-500 mr-1" />
            <div>
              <div className="text-xs font-medium text-gray-900">{bilty.gr_no}</div>
              <div className="text-xs text-gray-500">Station Summary</div>
            </div>
          </div>
        </td>
        
        <td className="px-3 py-2 whitespace-nowrap">
          <div className="text-xs text-gray-900">{formatDate(bilty.created_at)}</div>
        </td>
        
        <td className="px-3 py-2">
          <div className="text-xs text-gray-900 max-w-32 truncate" title={bilty.consignor}>
            {bilty.consignor || 'N/A'}
          </div>
        </td>
        
        <td className="px-3 py-2">
          <div className="text-xs text-gray-900 max-w-32 truncate" title={bilty.consignee}>
            {bilty.consignee || 'N/A'}
          </div>
        </td>
        
        <td className="px-3 py-2 whitespace-nowrap">
          <div className="text-xs text-gray-900">
            <div className="font-medium">{bilty.station_city_name || bilty.station || 'N/A'}</div>
            <div className="text-xs text-gray-500">{bilty.no_of_packets || 0} pkts • {bilty.weight || 0} kg</div>
          </div>
        </td>
        
        <td className="px-3 py-2 whitespace-nowrap">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            bilty.delivery_type === 'door' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
          }`}>
            {bilty.delivery_type === 'door' ? 'DD' : 'Godown'}
          </span>
        </td>
        
        <td className="px-3 py-2 whitespace-nowrap">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            bilty.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
            bilty.payment_status === 'to-pay' ? 'bg-yellow-100 text-yellow-800' :
            bilty.payment_status === 'foc' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {bilty.payment_status?.toUpperCase() || 'N/A'}
          </span>
        </td>
        
        <td className="px-3 py-2 whitespace-nowrap">
          <div className="text-xs font-medium text-gray-900">
            {formatCurrency(bilty.amount)}
          </div>
        </td>
        
        <td className="px-3 py-2">
          <div className="text-xs text-gray-900 max-w-24 truncate" title={bilty.pvt_marks}>
            {bilty.pvt_marks || 'N/A'}
          </div>
        </td>
        
        <td className="px-3 py-2 whitespace-nowrap">
          <div className="text-xs text-gray-900">
            <div className="font-medium">{bilty.challan_no || 'N/A'}</div>
            {bilty.dispatch_date && (
              <div className="text-xs text-gray-500">
                Dispatched: {formatDispatchDate(bilty.dispatch_date)}
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  });

  const renderTableContent = () => {
    if (!paginatedData || paginatedData.length === 0) {
      return (
        <tr>
          <td colSpan="11" className="px-6 py-12 text-center">
            <div className="text-gray-500">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bilties found</h3>
              <p className="text-sm">Try adjusting your search filters to find what you are looking for.</p>
            </div>
          </td>
        </tr>
      );
    }

    return paginatedData.map((bilty, index) => {
      if (bilty.type === 'regular') {
        return <RegularBiltyRow key={`regular-${bilty.id}`} bilty={bilty} index={index} />;
      } else {
        return <StationBiltyRow key={`station-${bilty.id}`} bilty={bilty} index={index} />;
      }
    });
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Search Results</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className="flex items-center">
              <FileText className="h-4 w-4 text-blue-500 mr-1" />
              Total: {allBiltiesCount || paginatedData?.length || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedBilties.length > 0 && selectedBilties.length === allBiltiesCount}
                  onChange={onSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                GR Number
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Consignor
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Consignee
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Destination/Station
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Delivery Type
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Private Marks
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Challan No
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {renderTableContent()}
          </tbody>
        </table>
      </div>
    </div>
  );
});

BillSearchTable.displayName = 'BillSearchTable';

export default BillSearchTable;
