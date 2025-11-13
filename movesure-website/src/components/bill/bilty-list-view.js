'use client';

import React from 'react';
import { Save, Trash2 } from 'lucide-react';

const BiltyListView = ({ billDetails, onSave, onDelete }) => {
  if (billDetails.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No bilties in this bill</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 sticky top-0">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">#</th>
            <th className="px-3 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">GR No</th>
            <th className="px-3 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Date</th>
            <th className="px-3 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Consignor</th>
            <th className="px-3 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Consignee</th>
            <th className="px-3 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">City</th>
            <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Pkgs</th>
            <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Weight</th>
            <th className="px-3 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Payment</th>
            <th className="px-3 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">Freight</th>
            <th className="px-3 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">Labour</th>
            <th className="px-3 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">DD</th>
            <th className="px-3 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">Toll</th>
            <th className="px-3 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">PF</th>
            <th className="px-3 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">Other</th>
            <th className="px-3 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">Total</th>
            <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {billDetails.map((detail, index) => (
            <tr 
              key={detail.detail_id} 
              className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
            >
              <td className="px-3 py-3 whitespace-nowrap">
                <span className="bg-blue-600 text-white rounded-lg px-3 py-1 font-bold text-sm">
                  {index + 1}
                </span>
              </td>
              <td className="px-3 py-3 whitespace-nowrap">
                <span className="text-sm font-semibold text-gray-900">{detail.grno}</span>
              </td>
              <td className="px-3 py-3 whitespace-nowrap">
                <span className="text-sm text-gray-600">{detail.date || 'N/A'}</span>
              </td>
              <td className="px-3 py-3">
                <span className="text-sm text-gray-900 max-w-[150px] truncate block" title={detail.consignor}>
                  {detail.consignor || 'N/A'}
                </span>
              </td>
              <td className="px-3 py-3">
                <span className="text-sm text-gray-900 max-w-[150px] truncate block" title={detail.consignee}>
                  {detail.consignee || 'N/A'}
                </span>
              </td>
              <td className="px-3 py-3 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                  {detail.city || 'N/A'}
                </span>
              </td>
              <td className="px-3 py-3 text-center whitespace-nowrap">
                <span className="text-sm font-bold text-blue-600">{detail.no_of_pckg || 0}</span>
              </td>
              <td className="px-3 py-3 text-center whitespace-nowrap">
                <span className="text-sm font-bold text-green-600">{detail.wt || 0}</span>
              </td>
              <td className="px-3 py-3 whitespace-nowrap">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                  detail.pay_mode === 'paid' ? 'bg-green-100 text-green-800' :
                  detail.pay_mode === 'to-pay' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {detail.pay_mode?.toUpperCase() || 'N/A'}
                </span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className="text-sm font-semibold text-gray-900">
                  ₹{parseFloat(detail.freight_amount || 0).toLocaleString('en-IN')}
                </span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className="text-sm font-semibold text-gray-900">
                  ₹{parseFloat(detail.labour_charge || 0).toLocaleString('en-IN')}
                </span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className="text-sm font-semibold text-gray-900">
                  ₹{parseFloat(detail.dd_charge || 0).toLocaleString('en-IN')}
                </span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className="text-sm font-semibold text-gray-900">
                  ₹{parseFloat(detail.toll_charge || 0).toLocaleString('en-IN')}
                </span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className="text-sm font-semibold text-gray-900">
                  ₹{parseFloat(detail.pf_charge || 0).toLocaleString('en-IN')}
                </span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className="text-sm font-semibold text-gray-900">
                  ₹{parseFloat(detail.other_charge || 0).toLocaleString('en-IN')}
                </span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className="text-base font-bold text-blue-600">
                  ₹{parseFloat(detail.bilty_total || 0).toLocaleString('en-IN')}
                </span>
              </td>
              <td className="px-3 py-3 text-center whitespace-nowrap">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onSave(detail)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Save bilty"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(detail.detail_id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete bilty"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BiltyListView;
