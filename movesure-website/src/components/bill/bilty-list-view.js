'use client';

import React, { useState } from 'react';
import { Save, Trash2, Edit2, X } from 'lucide-react';
import DraggableTableHeader from './draggable-table-header';

const BiltyListView = ({ billDetails, onSave, onDelete }) => {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  
  const [columns, setColumns] = useState([
    { key: 'serial', label: '#', align: 'left', fixed: false },
    { key: 'grno', label: 'GR No', align: 'left', fixed: false },
    { key: 'date', label: 'Date', align: 'left', fixed: false },
    { key: 'consignor', label: 'Consignor', align: 'left', fixed: false },
    { key: 'consignee', label: 'Consignee', align: 'left', fixed: false },
    { key: 'city', label: 'City', align: 'left', fixed: false },
    { key: 'packages', label: 'Pkgs', align: 'center', fixed: false },
    { key: 'weight', label: 'Weight', align: 'center', fixed: false },
    { key: 'pvt_marks', label: 'Pvt Marks', align: 'left', fixed: false },
    { key: 'delivery_type', label: 'Del Type', align: 'left', fixed: false },
    { key: 'pay_mode', label: 'Payment', align: 'left', fixed: false },
    { key: 'rate_by_kg', label: 'Rate/KG', align: 'right', fixed: false },
    { key: 'labour_rate', label: 'Lab Rate', align: 'right', fixed: false },
    { key: 'freight', label: 'Freight', align: 'right', fixed: false },
    { key: 'labour', label: 'Labour', align: 'right', fixed: false },
    { key: 'bill', label: 'Bill', align: 'right', fixed: false },
    { key: 'toll', label: 'Toll', align: 'right', fixed: false },
    { key: 'dd', label: 'DD', align: 'right', fixed: false },
    { key: 'pf', label: 'PF', align: 'right', fixed: false },
    { key: 'other', label: 'Other', align: 'right', fixed: false },
    { key: 'total', label: 'Total', align: 'right', fixed: false },
    { key: 'actions', label: 'Actions', align: 'center', fixed: true }
  ]);

  if (billDetails.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No bilties in this bill</p>
      </div>
    );
  }

  const handleEdit = (detail) => {
    setEditingId(detail.detail_id);
    setEditData({ ...detail });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleChange = (field, value) => {
    setEditData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate bilty total when charges change
      if (['freight_amount', 'labour_charge', 'bill_charge', 'toll_charge', 'dd_charge', 'pf_charge', 'other_charge'].includes(field)) {
        const freight = parseFloat(updated.freight_amount || 0);
        const labour = parseFloat(updated.labour_charge || 0);
        const bill = parseFloat(updated.bill_charge || 0);
        const toll = parseFloat(updated.toll_charge || 0);
        const dd = parseFloat(updated.dd_charge || 0);
        const pf = parseFloat(updated.pf_charge || 0);
        const other = parseFloat(updated.other_charge || 0);
        updated.bilty_total = freight + labour + bill + toll + dd + pf + other;
      }
      
      return updated;
    });
  };

  const handleSave = async () => {
    await onSave(editData);
    setEditingId(null);
    setEditData({});
  };

  const renderCellContent = (column, detail, isEditing, data, index) => {
    switch (column.key) {
      case 'serial':
        return (
          <span className="bg-blue-600 text-white rounded-lg px-3 py-1 font-bold text-sm">
            {index + 1}
          </span>
        );
      
      case 'grno':
        return isEditing ? (
          <input
            type="text"
            value={data.grno || ''}
            onChange={(e) => handleChange('grno', e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <span className="text-sm font-semibold text-gray-900">{detail.grno}</span>
        );
      
      case 'date':
        return isEditing ? (
          <input
            type="date"
            value={data.date || ''}
            onChange={(e) => handleChange('date', e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <span className="text-sm text-gray-600">{detail.date || 'N/A'}</span>
        );
      
      case 'consignor':
        return isEditing ? (
          <input
            type="text"
            value={data.consignor || ''}
            onChange={(e) => handleChange('consignor', e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <span className="text-sm text-gray-900 max-w-[150px] truncate block" title={detail.consignor}>
            {detail.consignor || 'N/A'}
          </span>
        );
      
      case 'consignee':
        return isEditing ? (
          <input
            type="text"
            value={data.consignee || ''}
            onChange={(e) => handleChange('consignee', e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <span className="text-sm text-gray-900 max-w-[150px] truncate block" title={detail.consignee}>
            {detail.consignee || 'N/A'}
          </span>
        );
      
      case 'city':
        return isEditing ? (
          <input
            type="text"
            value={data.city || ''}
            onChange={(e) => handleChange('city', e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
            {detail.city || 'N/A'}
          </span>
        );
      
      case 'packages':
        return isEditing ? (
          <input
            type="number"
            value={data.no_of_pckg || ''}
            onChange={(e) => handleChange('no_of_pckg', parseInt(e.target.value) || 0)}
            className="w-20 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 text-center"
          />
        ) : (
          <span className="text-sm font-bold text-blue-600">{detail.no_of_pckg || 0}</span>
        );
      
      case 'weight':
        return isEditing ? (
          <input
            type="number"
            step="0.01"
            value={data.wt || ''}
            onChange={(e) => handleChange('wt', parseFloat(e.target.value) || 0)}
            className="w-20 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 text-center"
          />
        ) : (
          <span className="text-sm font-bold text-green-600">{detail.wt || 0}</span>
        );
      
      case 'pvt_marks':
        return isEditing ? (
          <input
            type="text"
            value={data.pvt_marks || ''}
            onChange={(e) => handleChange('pvt_marks', e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <span className="text-sm text-gray-900">{detail.pvt_marks || 'N/A'}</span>
        );
      
      case 'delivery_type':
        return isEditing ? (
          <select
            value={data.delivery_type || ''}
            onChange={(e) => handleChange('delivery_type', e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select</option>
            <option value="door">Door</option>
            <option value="godown">Godown</option>
          </select>
        ) : (
          <span className="text-sm text-gray-900">{detail.delivery_type || 'N/A'}</span>
        );
      
      case 'pay_mode':
        return isEditing ? (
          <select
            value={data.pay_mode || ''}
            onChange={(e) => handleChange('pay_mode', e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select</option>
            <option value="paid">Paid</option>
            <option value="to-pay">To Pay</option>
          </select>
        ) : (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
            detail.pay_mode === 'paid' ? 'bg-green-100 text-green-800' :
            detail.pay_mode === 'to-pay' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {detail.pay_mode?.toUpperCase() || 'N/A'}
          </span>
        );
      
      case 'rate_by_kg':
        return isEditing ? (
          <input
            type="number"
            step="0.01"
            value={data.rate_by_kg || ''}
            onChange={(e) => handleChange('rate_by_kg', parseFloat(e.target.value) || 0)}
            className="w-24 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 text-right"
          />
        ) : (
          <span className="text-sm text-gray-900">₹{parseFloat(detail.rate_by_kg || 0).toFixed(2)}</span>
        );
      
      case 'labour_rate':
        return isEditing ? (
          <input
            type="number"
            step="0.01"
            value={data.labour_rate || ''}
            onChange={(e) => handleChange('labour_rate', parseFloat(e.target.value) || 0)}
            className="w-24 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 text-right"
          />
        ) : (
          <span className="text-sm text-gray-900">₹{parseFloat(detail.labour_rate || 0).toFixed(2)}</span>
        );
      
      case 'freight':
        return isEditing ? (
          <input
            type="number"
            step="0.01"
            value={data.freight_amount || ''}
            onChange={(e) => handleChange('freight_amount', parseFloat(e.target.value) || 0)}
            className="w-28 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 text-right"
          />
        ) : (
          <span className="text-sm font-semibold text-gray-900">
            ₹{parseFloat(detail.freight_amount || 0).toLocaleString('en-IN')}
          </span>
        );
      
      case 'labour':
        return isEditing ? (
          <input
            type="number"
            step="0.01"
            value={data.labour_charge || ''}
            onChange={(e) => handleChange('labour_charge', parseFloat(e.target.value) || 0)}
            className="w-28 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 text-right"
          />
        ) : (
          <span className="text-sm font-semibold text-gray-900">
            ₹{parseFloat(detail.labour_charge || 0).toLocaleString('en-IN')}
          </span>
        );
      
      case 'bill':
        return isEditing ? (
          <input
            type="number"
            step="0.01"
            value={data.bill_charge || ''}
            onChange={(e) => handleChange('bill_charge', parseFloat(e.target.value) || 0)}
            className="w-24 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 text-right"
          />
        ) : (
          <span className="text-sm font-semibold text-gray-900">
            ₹{parseFloat(detail.bill_charge || 0).toLocaleString('en-IN')}
          </span>
        );
      
      case 'toll':
        return isEditing ? (
          <input
            type="number"
            step="0.01"
            value={data.toll_charge || ''}
            onChange={(e) => handleChange('toll_charge', parseFloat(e.target.value) || 0)}
            className="w-24 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 text-right"
          />
        ) : (
          <span className="text-sm font-semibold text-gray-900">
            ₹{parseFloat(detail.toll_charge || 0).toLocaleString('en-IN')}
          </span>
        );
      
      case 'dd':
        return isEditing ? (
          <input
            type="number"
            step="0.01"
            value={data.dd_charge || ''}
            onChange={(e) => handleChange('dd_charge', parseFloat(e.target.value) || 0)}
            className="w-24 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 text-right"
          />
        ) : (
          <span className="text-sm font-semibold text-gray-900">
            ₹{parseFloat(detail.dd_charge || 0).toLocaleString('en-IN')}
          </span>
        );
      
      case 'pf':
        return isEditing ? (
          <input
            type="number"
            step="0.01"
            value={data.pf_charge || ''}
            onChange={(e) => handleChange('pf_charge', parseFloat(e.target.value) || 0)}
            className="w-24 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 text-right"
          />
        ) : (
          <span className="text-sm font-semibold text-gray-900">
            ₹{parseFloat(detail.pf_charge || 0).toLocaleString('en-IN')}
          </span>
        );
      
      case 'other':
        return isEditing ? (
          <input
            type="number"
            step="0.01"
            value={data.other_charge || ''}
            onChange={(e) => handleChange('other_charge', parseFloat(e.target.value) || 0)}
            className="w-24 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 text-right"
          />
        ) : (
          <span className="text-sm font-semibold text-gray-900">
            ₹{parseFloat(detail.other_charge || 0).toLocaleString('en-IN')}
          </span>
        );
      
      case 'total':
        return (
          <span className={`text-base font-bold ${isEditing ? 'text-green-600' : 'text-blue-600'}`}>
            ₹{parseFloat(data.bilty_total || 0).toLocaleString('en-IN')}
          </span>
        );
      
      case 'actions':
        return (
          <div className="flex items-center justify-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-600"
                  title="Save changes"
                >
                  <Save className="h-4 w-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-600"
                  title="Cancel edit"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleEdit(detail)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit bilty"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(detail.detail_id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete bilty"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderEditableRow = (detail, index) => {
    const isEditing = editingId === detail.detail_id;
    const data = isEditing ? editData : detail;

    return (
      <tr 
        key={detail.detail_id} 
        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isEditing ? 'bg-yellow-50 border-2 border-yellow-400' : 'hover:bg-blue-50'} transition-colors`}
      >
        {columns.map((column) => (
          <td 
            key={column.key}
            className={`px-3 py-3 whitespace-nowrap ${
              column.align === 'center' ? 'text-center' : 
              column.align === 'right' ? 'text-right' : ''
            } ${column.fixed ? 'sticky right-0 bg-inherit z-10' : ''}`}
            style={column.fixed ? { boxShadow: '-2px 0 5px rgba(0,0,0,0.1)' } : {}}
          >
            {renderCellContent(column, detail, isEditing, data, index)}
          </td>
        ))}

      </tr>
    );
  };

  return (
    <div className="relative">
      <div className="overflow-x-auto overflow-y-auto max-h-[600px] sticky-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 sticky top-0 z-20">
            <DraggableTableHeader 
              columns={columns} 
              onReorder={setColumns} 
            />
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {billDetails.map((detail, index) => renderEditableRow(detail, index))}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        .sticky-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #4F46E5 #E0E7FF;
        }
        .sticky-scrollbar::-webkit-scrollbar {
          height: 12px;
          width: 12px;
        }
        .sticky-scrollbar::-webkit-scrollbar-track {
          background: #E0E7FF;
          border-radius: 6px;
        }
        .sticky-scrollbar::-webkit-scrollbar-thumb {
          background: #4F46E5;
          border-radius: 6px;
        }
        .sticky-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4338CA;
        }
      `}</style>
    </div>
  );
};

export default BiltyListView;