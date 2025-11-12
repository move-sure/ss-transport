'use client';

import React, { useState } from 'react';
import { Phone, Edit3, Save, X } from 'lucide-react';
import supabase from '../../app/utils/supabase';

const MobileNumberEditor = ({ bilty, onUpdate }) => {
  const [isEditing, setIsEditing] = useState({
    consignor: false,
    consignee: false,
    transport: false
  });
  const [tempNumbers, setTempNumbers] = useState({
    consignor: bilty.consignor_number || '',
    consignee: bilty.consignee_number || '',
    transport: bilty.transport_number || ''
  });
  const [saving, setSaving] = useState(false);

  const handleEdit = (type) => {
    setIsEditing(prev => ({ ...prev, [type]: true }));
    setTempNumbers(prev => ({
      ...prev,
      [type]: type === 'consignor' ? bilty.consignor_number || '' :
              type === 'consignee' ? bilty.consignee_number || '' :
              bilty.transport_number || ''
    }));
  };

  const handleCancel = (type) => {
    setIsEditing(prev => ({ ...prev, [type]: false }));
    setTempNumbers(prev => ({
      ...prev,
      [type]: type === 'consignor' ? bilty.consignor_number || '' :
              type === 'consignee' ? bilty.consignee_number || '' :
              bilty.transport_number || ''
    }));
  };

  const handleSave = async (type) => {
    try {
      setSaving(true);
      const updateField = type === 'consignor' ? 'consignor_number' :
                         type === 'consignee' ? 'consignee_number' :
                         'transport_number';

      const { error } = await supabase
        .from('bilty')
        .update({ [updateField]: tempNumbers[type] })
        .eq('id', bilty.id);

      if (error) throw error;

      // Update parent component
      if (onUpdate) {
        onUpdate({
          ...bilty,
          [updateField]: tempNumbers[type]
        });
      }

      setIsEditing(prev => ({ ...prev, [type]: false }));
    } catch (error) {
      console.error('Error updating mobile number:', error);
      alert('Failed to update mobile number');
    } finally {
      setSaving(false);
    }
  };

  const MobileField = ({ label, type, value }) => {
    const isEditingField = isEditing[type];
    const tempValue = tempNumbers[type];

    return (
      <div className="inline-flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-gray-600 whitespace-nowrap">{label}:</span>
        {isEditingField ? (
          <div className="inline-flex items-center gap-1">
            <input
              type="tel"
              value={tempValue}
              onChange={(e) => setTempNumbers(prev => ({ ...prev, [type]: e.target.value }))}
              className="w-28 px-1.5 py-0.5 text-xs font-semibold text-gray-900 border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500"
              placeholder="Enter number"
              maxLength={20}
            />
            <button
              onClick={() => handleSave(type)}
              disabled={saving}
              className="p-0.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              title="Save"
            >
              <Save className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleCancel(type)}
              disabled={saving}
              className="p-0.5 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              title="Cancel"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1">
            <span className="text-xs font-bold text-gray-900">
              {value || 'Not Available'}
            </span>
            {(!value || value === '') && (
              <button
                onClick={() => handleEdit(type)}
                className="p-0.5 text-indigo-600 hover:bg-indigo-100 rounded"
                title="Add mobile number"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <Phone className="w-3 h-3 text-indigo-600 flex-shrink-0" />
      <MobileField 
        label="Consignor" 
        type="consignor" 
        value={bilty.consignor_number} 
      />
      <span className="text-gray-300">|</span>
      <MobileField 
        label="Consignee" 
        type="consignee" 
        value={bilty.consignee_number} 
      />
      {(bilty.transport_name || bilty.transport_gst) && (
        <>
          <span className="text-gray-300">|</span>
          <MobileField 
            label="Transport" 
            type="transport" 
            value={bilty.transport_number} 
          />
        </>
      )}
    </div>
  );
};

export default MobileNumberEditor;
