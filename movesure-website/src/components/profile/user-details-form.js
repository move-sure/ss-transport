'use client';

import { useState, useEffect } from 'react';
import { Mail, Phone, Calendar, User, Briefcase, MapPin, CreditCard, Save, Edit2, X } from 'lucide-react';
import supabase from '../../app/utils/supabase';

export default function UserDetailsForm({ userId }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasDetails, setHasDetails] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    employee_code: '',
    department: '',
    date_of_joining: '',
    address_line1: '',
    city: '',
    state: '',
    pincode: '',
    aadhar_number: '',
    pan_number: '',
    bank_name: '',
    account_number: '',
    ifsc_code: ''
  });

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_details')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user details:', error);
        return;
      }

      if (data) {
        setHasDetails(true);
        setFormData({
          email: data.email || '',
          phone: data.phone || '',
          date_of_birth: data.date_of_birth || '',
          gender: data.gender || '',
          employee_code: data.employee_code || '',
          department: data.department || '',
          date_of_joining: data.date_of_joining || '',
          address_line1: data.address_line1 || '',
          city: data.city || '',
          state: data.state || '',
          pincode: data.pincode || '',
          aadhar_number: data.aadhar_number || '',
          pan_number: data.pan_number || '',
          bank_name: data.bank_name || '',
          account_number: data.account_number || '',
          ifsc_code: data.ifsc_code || ''
        });
      } else {
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dataToSave = {
        user_id: userId,
        ...formData,
        salary_month: 0,
        updated_at: new Date().toISOString()
      };

      if (hasDetails) {
        const { error } = await supabase
          .from('user_details')
          .update(dataToSave)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_details')
          .insert([dataToSave]);
        if (error) throw error;
        setHasDetails(true);
      }

      setIsEditing(false);
      await fetchUserDetails();
    } catch (error) {
      console.error('Error saving user details:', error);
      alert('Failed to save details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">Personal Details</h3>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            <span>Edit Details</span>
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={() => { setIsEditing(false); fetchUserDetails(); }}
              disabled={isSaving}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {isSaving ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Email */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Mail className="h-4 w-4 mr-2 text-gray-400" />
              Email <span className="text-red-500 ml-1">*</span>
            </label>
            {isEditing ? (
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter email"
                required
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">{formData.email || 'Not provided'}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Phone className="h-4 w-4 mr-2 text-gray-400" />
              Phone <span className="text-red-500 ml-1">*</span>
            </label>
            {isEditing ? (
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter phone number"
                required
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">{formData.phone || 'Not provided'}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              Date of Birth
            </label>
            {isEditing ? (
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                {formData.date_of_birth ? new Date(formData.date_of_birth).toLocaleDateString('en-IN') : 'Not provided'}
              </p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 mr-2 text-gray-400" />
              Gender
            </label>
            {isEditing ? (
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">{formData.gender || 'Not provided'}</p>
            )}
          </div>

          {/* Employee Code */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
              Employee Code
            </label>
            {isEditing ? (
              <input
                type="text"
                name="employee_code"
                value={formData.employee_code}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter employee code"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">{formData.employee_code || 'Not provided'}</p>
            )}
          </div>

          {/* Department */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
              Department
            </label>
            {isEditing ? (
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter department"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">{formData.department || 'Not provided'}</p>
            )}
          </div>

          {/* Date of Joining */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              Date of Joining
            </label>
            {isEditing ? (
              <input
                type="date"
                name="date_of_joining"
                value={formData.date_of_joining}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                {formData.date_of_joining ? new Date(formData.date_of_joining).toLocaleDateString('en-IN') : 'Not provided'}
              </p>
            )}
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
              Address
            </label>
            {isEditing ? (
              <textarea
                name="address_line1"
                value={formData.address_line1}
                onChange={handleInputChange}
                rows="2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter address"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">{formData.address_line1 || 'Not provided'}</p>
            )}
          </div>

          {/* City */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
              City
            </label>
            {isEditing ? (
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter city"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">{formData.city || 'Not provided'}</p>
            )}
          </div>

          {/* State */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
              State
            </label>
            {isEditing ? (
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter state"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">{formData.state || 'Not provided'}</p>
            )}
          </div>

          {/* Pincode */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
              Pincode
            </label>
            {isEditing ? (
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleInputChange}
                maxLength="6"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter pincode"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">{formData.pincode || 'Not provided'}</p>
            )}
          </div>

          {/* Aadhar Number */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
              Aadhar Number
            </label>
            {isEditing ? (
              <input
                type="text"
                name="aadhar_number"
                value={formData.aadhar_number}
                onChange={handleInputChange}
                maxLength="12"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter aadhar number"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">{formData.aadhar_number || 'Not provided'}</p>
            )}
          </div>

          {/* PAN Number */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
              PAN Number
            </label>
            {isEditing ? (
              <input
                type="text"
                name="pan_number"
                value={formData.pan_number}
                onChange={handleInputChange}
                maxLength="10"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter PAN number"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">{formData.pan_number || 'Not provided'}</p>
            )}
          </div>

          {/* Bank Name */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
              Bank Name
            </label>
            {isEditing ? (
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter bank name"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">{formData.bank_name || 'Not provided'}</p>
            )}
          </div>

          {/* Account Number */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
              Account Number
            </label>
            {isEditing ? (
              <input
                type="text"
                name="account_number"
                value={formData.account_number}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter account number"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">{formData.account_number || 'Not provided'}</p>
            )}
          </div>

          {/* IFSC Code */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
              IFSC Code
            </label>
            {isEditing ? (
              <input
                type="text"
                name="ifsc_code"
                value={formData.ifsc_code}
                onChange={handleInputChange}
                maxLength="11"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter IFSC code"
              />
            ) : (
              <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">{formData.ifsc_code || 'Not provided'}</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
