'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../app/utils/auth';
import supabase from '../../app/utils/supabase';
import { X, Save, Truck, User, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

const ChallanForm = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editingChallan, 
  userBranch, 
  challanBooks,
  trucks,
  staff,
  branches
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    challan_no: '',
    branch_id: '',
    truck_id: '',
    owner_id: '',
    driver_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    total_bilty_count: 0,
    remarks: '',
    is_active: true,
    is_dispatched: false
  });
  const [selectedChallanBook, setSelectedChallanBook] = useState(null);
  const [availableBooks, setAvailableBooks] = useState([]);

  useEffect(() => {
    if (userBranch) {
      setFormData(prev => ({
        ...prev,
        branch_id: userBranch.id
      }));
    }
  }, [userBranch]);

  useEffect(() => {
    // Filter and set available challan books
    if (challanBooks && userBranch) {
      const filtered = challanBooks.filter(book => 
        book.branch_1 === userBranch.id || 
        book.branch_2 === userBranch.id || 
        book.branch_3 === userBranch.id
      );
      setAvailableBooks(filtered);
      
      // Auto-select first available book if not editing
      if (!editingChallan && filtered.length > 0) {
        const defaultBook = filtered[0];
        setSelectedChallanBook(defaultBook);
        const challanNo = generateChallanNumber(defaultBook);
        setFormData(prev => ({ ...prev, challan_no: challanNo }));
      }
    }
  }, [challanBooks, userBranch, editingChallan]);

  useEffect(() => {
    // Load editing data
    if (editingChallan) {
      setFormData({
        challan_no: editingChallan.challan_no,
        branch_id: editingChallan.branch_id,
        truck_id: editingChallan.truck_id || '',
        owner_id: editingChallan.owner_id || '',
        driver_id: editingChallan.driver_id || '',
        date: format(new Date(editingChallan.date), 'yyyy-MM-dd'),
        total_bilty_count: editingChallan.total_bilty_count,
        remarks: editingChallan.remarks || '',
        is_active: editingChallan.is_active,
        is_dispatched: editingChallan.is_dispatched
      });
    }
  }, [editingChallan]);

  const generateChallanNumber = (book) => {
    if (!book) return '';
    const { prefix, current_number, digits, postfix } = book;
    const paddedNumber = String(current_number).padStart(digits, '0');
    return `${prefix || ''}${paddedNumber}${postfix || ''}`;
  };

  const handleChallanBookChange = (bookId) => {
    const book = availableBooks.find(b => b.id === bookId);
    setSelectedChallanBook(book);
    if (book && !editingChallan) {
      const challanNo = generateChallanNumber(book);
      setFormData(prev => ({ ...prev, challan_no: challanNo }));
    }
  };

  const handleTruckChange = (truckId) => {
    setFormData(prev => ({ ...prev, truck_id: truckId }));
    
    // Auto-fill owner from truck data
    if (truckId) {
      const truck = trucks.find(t => t.id === truckId);
      if (truck && truck.owner_id) {
        setFormData(prev => ({ ...prev, owner_id: truck.owner_id }));
      } else {
        setFormData(prev => ({ ...prev, owner_id: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, owner_id: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!formData.challan_no) {
        alert('Challan number is required');
        return;
      }

      if (!selectedChallanBook && !editingChallan) {
        alert('Please select a challan book');
        return;
      }

      // Check for duplicate challan number (only for new challans)
      if (!editingChallan) {
        const { data: existingChallan } = await supabase
          .from('challan_details')
          .select('id')
          .eq('challan_no', formData.challan_no)
          .eq('is_active', true)
          .single();

        if (existingChallan) {
          alert('Challan number already exists! Please refresh and try again.');
          return;
        }
      }

      // Prepare data
      const saveData = {
        ...formData,
        created_by: user.id,
        truck_id: formData.truck_id || null,
        owner_id: formData.owner_id || null,
        driver_id: formData.driver_id || null,
        total_bilty_count: parseInt(formData.total_bilty_count) || 0
      };

      let result;
      if (editingChallan) {
        // Update existing challan
        result = await supabase
          .from('challan_details')
          .update(saveData)
          .eq('id', editingChallan.id)
          .select()
          .single();
      } else {
        // Create new challan
        result = await supabase
          .from('challan_details')
          .insert([saveData])
          .select()
          .single();

        // Update challan book current number
        if (selectedChallanBook) {
          let newCurrentNumber = selectedChallanBook.current_number + 1;
          
          if (newCurrentNumber > selectedChallanBook.to_number) {
            if (selectedChallanBook.auto_continue) {
              newCurrentNumber = selectedChallanBook.from_number;
            } else {
              await supabase
                .from('challan_books')
                .update({ is_completed: true, current_number: selectedChallanBook.to_number })
                .eq('id', selectedChallanBook.id);
              
              alert('Challan book completed. Please select a new challan book.');
              onSuccess();
              return;
            }
          }
          
          await supabase
            .from('challan_books')
            .update({ current_number: newCurrentNumber })
            .eq('id', selectedChallanBook.id);
        }
      }

      if (result.error) throw result.error;

      alert(editingChallan ? 'Challan updated successfully!' : 'Challan created successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error saving challan:', error);
      alert('Error saving challan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter staff for drivers only
  const drivers = staff.filter(s => 
    s.post && (s.post.toLowerCase().includes('driver') || s.license_number)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Truck className="w-6 h-6" />
              <h2 className="text-xl font-bold text-white">
                {editingChallan ? 'Edit Challan' : 'Create New Challan'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Challan Book Selection */}
          {!editingChallan && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">Challan Book Selection</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Select Challan Book *
                  </label>
                  <select
                    value={selectedChallanBook?.id || ''}
                    onChange={(e) => handleChallanBookChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  >
                    <option value="">Select challan book</option>
                    {availableBooks.map(book => (
                      <option key={book.id} value={book.id}>
                        {book.from_branch?.branch_name} → {book.to_branch?.branch_name} 
                        ({book.prefix || ''}{String(book.current_number).padStart(book.digits, '0')}{book.postfix || ''})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Generated Challan Number
                  </label>
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md font-bold text-lg text-center text-black">
                    {formData.challan_no || 'Select a book first'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {editingChallan && (
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Challan Number
                  </label>
                  <input
                    type="text"
                    value={formData.challan_no}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-black"
                    readOnly
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Total Bilty Count
                </label>
                <input
                  type="number"
                  value={formData.total_bilty_count}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_bilty_count: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  min="0"
                  placeholder="Number of bilties"
                />
              </div>
            </div>
          </div>

          {/* Vehicle and Personnel */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">Vehicle & Personnel Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  <Truck className="w-4 h-4 inline mr-1" />
                  Truck
                </label>
                <select
                  value={formData.truck_id}
                  onChange={(e) => handleTruckChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                >
                  <option value="">Select truck</option>
                  {trucks.map(truck => (
                    <option key={truck.id} value={truck.id}>
                      {truck.truck_number} - {truck.truck_type}
                      {truck.owner && ` (Owner: ${truck.owner.name})`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Driver
                </label>
                <select
                  value={formData.driver_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, driver_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                >
                  <option value="">Select driver</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} {driver.license_number ? `(${driver.license_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Owner Display (Auto-filled from truck) */}
            {formData.owner_id && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-black mb-2">
                  Owner (Auto-filled from Truck)
                </label>
                <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-black">
                  {staff.find(s => s.id === formData.owner_id)?.name || 'Unknown Owner'}
                </div>
              </div>
            )}
          </div>

          {/* Additional Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Details</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Remarks
                </label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  rows="3"
                  placeholder="Enter any additional remarks..."
                />
              </div>
              {editingChallan && (
                <div className="flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_dispatched}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_dispatched: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-black">Mark as Dispatched</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-black">Active</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-black hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              disabled={loading}
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : editingChallan ? 'Update Challan' : 'Create Challan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChallanForm;