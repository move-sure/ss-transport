'use client';

import React, { useState } from 'react';
import { 
  Eye, 
  Printer, 
  FileText,
  Truck,
  Building,
  Calendar,
  DollarSign,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';

export default function BillSearchTable({ 
  regularBilties, 
  stationBilties, 
  loading, 
  onViewDetails, 
  onPrintBilty,
  biltyType 
}) {
  const [activeTab, setActiveTab] = useState('all');

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0.00';
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'paid': 'bg-green-100 text-green-800',
      'to-pay': 'bg-yellow-100 text-yellow-800',
      'foc': 'bg-blue-100 text-blue-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.toUpperCase() || 'N/A'}
      </span>
    );
  };

  const RegularBiltyRow = ({ bilty, index }) => (
    <tr key={`regular-${bilty.id}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <FileText className="h-5 w-5 text-blue-500 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">{bilty.gr_no}</div>
            <div className="text-xs text-gray-500">Regular</div>
          </div>
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{formatDate(bilty.bilty_date)}</div>
      </td>
      
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900 max-w-xs truncate" title={bilty.consignor_name}>
          {bilty.consignor_name || 'N/A'}
        </div>
      </td>
      
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900 max-w-xs truncate" title={bilty.consignee_name}>
          {bilty.consignee_name || 'N/A'}
        </div>
      </td>
      
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900 max-w-xs truncate" title={bilty.transport_name}>
          {bilty.transport_name || 'N/A'}
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center text-sm text-gray-900">
          <MapPin className="h-4 w-4 text-gray-400 mr-1" />
          <span className="truncate max-w-20" title={`${bilty.from_city_name || 'N/A'} → ${bilty.to_city_name || 'N/A'}`}>
            {bilty.from_city_name || 'N/A'} → {bilty.to_city_name || 'N/A'}
          </span>
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        {getStatusBadge(bilty.payment_mode)}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">
          {formatCurrency(bilty.total)}
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {bilty.e_way_bill || 'N/A'}
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewDetails(bilty)}
            className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50 transition-colors"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPrintBilty(bilty)}
            className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50 transition-colors"
            title="Print Bilty"
          >
            <Printer className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  const StationBiltyRow = ({ bilty, index }) => (
    <tr key={`station-${bilty.id}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <Building className="h-5 w-5 text-purple-500 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">{bilty.gr_no}</div>
            <div className="text-xs text-gray-500">Station Summary</div>
          </div>
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{formatDate(bilty.created_at)}</div>
      </td>
      
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900 max-w-xs truncate" title={bilty.consignor}>
          {bilty.consignor || 'N/A'}
        </div>
      </td>
      
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900 max-w-xs truncate" title={bilty.consignee}>
          {bilty.consignee || 'N/A'}
        </div>
      </td>
      
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900">
          {bilty.station || 'N/A'}
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          <span className="font-medium">{bilty.no_of_packets || 0}</span> pkts
          <div className="text-xs text-gray-500">{bilty.weight || 0} kg</div>
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        {getStatusBadge(bilty.payment_status)}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">
          {formatCurrency(bilty.amount)}
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {bilty.e_way_bill || 'N/A'}
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewDetails(bilty)}
            className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50 transition-colors"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  const renderTableContent = () => {
    let combinedData = [];
    
    // Combine data based on selected tab and biltyType filter
    if (biltyType === 'all' || biltyType === 'regular') {
      combinedData = [...combinedData, ...regularBilties.map(bilty => ({ ...bilty, type: 'regular' }))];
    }
    
    if (biltyType === 'all' || biltyType === 'station') {
      combinedData = [...combinedData, ...stationBilties.map(bilty => ({ ...bilty, type: 'station' }))];
    }

    // Sort by creation date (newest first)
    combinedData.sort((a, b) => {
      const dateA = new Date(a.created_at || a.bilty_date);
      const dateB = new Date(b.created_at || b.bilty_date);
      return dateB - dateA;
    });

    if (combinedData.length === 0) {
      return (
        <tr>
          <td colSpan="10" className="px-6 py-12 text-center">
            <div className="text-gray-500">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bilties found</h3>
              <p className="text-sm">Try adjusting your search filters to find what you are looking for.</p>
            </div>
          </td>
        </tr>
      );
    }

    return combinedData.map((bilty, index) => {
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
              Regular: {regularBilties.length}
            </span>
            <span className="flex items-center">
              <Building className="h-4 w-4 text-purple-500 mr-1" />
              Station: {stationBilties.length}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                GR Number
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Consignor
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Consignee
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Transport/Station
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Route/Packages
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                E-Way Bill
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
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
}
