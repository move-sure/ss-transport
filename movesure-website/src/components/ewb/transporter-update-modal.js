import React, { useState } from 'react';
import { Truck, User, Send, X, Loader2, CheckCircle, AlertTriangle, Edit3 } from 'lucide-react';

const TransporterUpdateModal = ({ isOpen, onClose, grData, ewbNumbers }) => {
  const [formData, setFormData] = useState({
    user_gstin: '09COVPS5556J1ZT',
    eway_bill_number: '',
    transporter_id: '',
    transporter_name: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Enhanced validation with specific field checking
    const missingFields = [];
    if (!formData.eway_bill_number) missingFields.push('E-Way Bill Number');
    if (!formData.transporter_id) missingFields.push('Transporter ID');
    if (!formData.transporter_name) missingFields.push('Transporter Name');
    
    if (missingFields.length > 0) {
      setError(`Please fill the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    console.log('Form data before submission:', formData);
    setIsSubmitting(true);
    setError(null);
    
    try {
      const payload = {
        ...formData,
        eway_bill_number: formData.eway_bill_number.replace(/-/g, '') // Remove hyphens
      };

      console.log('Sending transporter update payload:', JSON.stringify(payload, null, 2));

      const response = await fetch('http://localhost:5000/api/transporter-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('Transporter Update API Response:', data);

      // Check for success response - updated to match actual API response format
      if (data.results?.status === 'Success' && data.results?.code === 200) {
        // Check if there's an error flag in the response
        if (data.results.message?.error === true) {
          throw new Error('API returned error flag: Update failed');
        }
        
        setResult({
          success: true,
          message: data.message || 'Transporter updated successfully!',
          ewbNumber: data.results.message?.ewayBillNo || formData.eway_bill_number,
          transporterId: data.results.message?.transporterId || formData.transporter_id,
          transporterName: formData.transporter_name,
          updateDate: data.results.message?.transUpdateDate,
          rawResponse: data
        });
      } else if (data.results?.status === 'No Content' || data.results?.code >= 400) {
        throw new Error(data.results?.message || `Error ${data.results?.code}: Failed to update transporter`);
      } else if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: Failed to update transporter`);
      } else {
        throw new Error('Unexpected response format from server');
      }
    } catch (err) {
      console.error('Transporter Update Error:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setFormData({
      user_gstin: '09COVPS5556J1ZT',
      eway_bill_number: '',
      transporter_id: '',
      transporter_name: ''
    });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Edit3 className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Update Transporter ID</h2>
              <p className="text-sm text-gray-600">
                GR Number: <span className="font-medium">{grData?.gr_no}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Success Result */}
          {result && result.success && (
            <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-800">Transporter Updated Successfully!</h3>
                  <p className="text-sm text-green-600">E-Way Bill transporter information has been updated</p>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-green-100">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-green-700">E-Way Bill Number</span>
                      <div className="text-sm font-mono font-bold text-green-900">{result.ewbNumber}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-blue-700">Transporter ID</span>
                      <div className="text-sm font-mono font-semibold text-blue-900">{result.transporterId}</div>
                    </div>
                    
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-purple-700">Transporter Name</span>
                      <div className="text-sm font-semibold text-purple-900">{result.transporterName}</div>
                    </div>
                  </div>

                  {result.updateDate && (
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <span className="text-sm font-medium text-yellow-700">Updated On</span>
                      <div className="text-sm font-semibold text-yellow-900">{result.updateDate}</div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Update Another
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>

              {/* Debug Information (for development) */}
              {process.env.NODE_ENV === 'development' && result.rawResponse && (
                <details className="mt-4">
                  <summary className="text-xs text-gray-500 cursor-pointer">Debug: Raw API Response</summary>
                  <pre className="text-xs text-gray-600 mt-2 p-3 bg-gray-100 rounded overflow-auto max-h-40">
                    {JSON.stringify(result.rawResponse, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-800 mb-1">Failed to Update Transporter</h4>
                  <p className="text-sm text-red-700">{error}</p>
                  
                  <div className="mt-3 p-3 bg-red-100 rounded-lg">
                    <p className="text-xs text-red-600 font-medium mb-1">Common Issues:</p>
                    <ul className="text-xs text-red-600 space-y-1">
                      <li>• Check if the E-Way Bill number is valid and active</li>
                      <li>• Ensure Transporter ID format is correct (e.g., 05AAAAU6537D1ZO)</li>
                      <li>• Verify Transporter Name matches the registered name</li>
                      <li>• Confirm all required fields are filled</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GR Information */}
          {grData && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">GR Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">GR Number:</span>
                  <span className="ml-2 text-gray-900">{grData.gr_no}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Consignor:</span>
                  <span className="ml-2 text-gray-900">{grData.bilty?.consignor_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">To:</span>
                  <span className="ml-2 text-gray-900">
                    {grData.toCity?.city_name || grData.bilty?.to_location || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">EWB Count:</span>
                  <span className="ml-2 text-gray-900">{ewbNumbers.length} EWB(s)</span>
                </div>
              </div>
            </div>
          )}

          {/* EWB Selection */}
          {ewbNumbers.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">
                Select E-Way Bill to Update *
                {!formData.eway_bill_number && (
                  <span className="text-red-500 text-sm ml-2">(Required)</span>
                )}
              </h3>
              <div className="space-y-2">
                {ewbNumbers.map((ewb, index) => (
                  <label key={index} className={`flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer ${
                    formData.eway_bill_number === ewb ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      name="ewb_selection"
                      value={ewb}
                      checked={formData.eway_bill_number === ewb}
                      onChange={(e) => handleInputChange('eway_bill_number', e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 font-mono text-sm font-medium text-gray-900">{ewb}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          {!result && (
            <div className="space-y-6">
              {/* Debug Information (for development) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-yellow-800 mb-2">Debug: Form Data</h4>
                  <pre className="text-xs text-yellow-700 whitespace-pre-wrap">
                    {JSON.stringify(formData, null, 2)}
                  </pre>
                  <div className="mt-2 text-xs text-yellow-600">
                    EWB Numbers available: {ewbNumbers.length} ({ewbNumbers.join(', ')})
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  Transporter Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* GSTIN */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      User GSTIN *
                    </label>
                    <input
                      type="text"
                      value={formData.user_gstin}
                      onChange={(e) => handleInputChange('user_gstin', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm shadow-sm"
                      placeholder="09COVPS5556J1ZT"
                    />
                  </div>

                  {/* Transporter ID */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      Transporter ID *
                      {!formData.transporter_id && (
                        <span className="text-red-500 text-sm ml-2">(Required)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.transporter_id}
                      onChange={(e) => handleInputChange('transporter_id', e.target.value.toUpperCase())}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm shadow-sm ${
                        !formData.transporter_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="05AAAAU6537D1ZO"
                    />
                  </div>

                  {/* Transporter Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Transporter Name *
                      {!formData.transporter_name && (
                        <span className="text-red-500 text-sm ml-2">(Required)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.transporter_name}
                      onChange={(e) => handleInputChange('transporter_name', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm ${
                        !formData.transporter_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="MS Uttarayan"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={handleClose}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.eway_bill_number || !formData.transporter_id || !formData.transporter_name}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center gap-2 shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Updating Transporter...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Update Transporter
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransporterUpdateModal;