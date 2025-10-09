import React, { useState } from 'react';
import { Shield, Truck, FileText, Calendar, MapPin, Send, X, Loader2, CheckCircle, Download, ExternalLink, Copy } from 'lucide-react';

const ConsolidatedEwbModal = ({ isOpen, onClose, ewbNumbers, challanData }) => {
  const [formData, setFormData] = useState({
    userGstin: '09COVPS5556J1ZT',
    place_of_consignor: '',
    state_of_consignor: '',
    vehicle_number: '',
    mode_of_transport: '1',
    transporter_document_number: '',
    transporter_document_date: new Date().toISOString().split('T')[0],
    data_source: 'erp'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.vehicle_number || !formData.place_of_consignor || !formData.state_of_consignor) {
      setError('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const payload = {
        ...formData,
        transporter_document_date: formData.transporter_document_date.split('-').reverse().join('/'), // Convert to DD/MM/YYYY
        list_of_eway_bills: ewbNumbers.map(ewb => ({
          eway_bill_number: ewb.replace(/-/g, '') // Remove hyphens and format as object
        }))
      };

      console.log('Sending payload:', JSON.stringify(payload, null, 2));

      const response = await fetch('http://localhost:5000/api/consolidated-ewaybill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('API Response:', data);

      // Check for success response - the API returns success in results.status
      if (data.results?.status === 'Success' && data.results?.code === 200) {
        // Ensure URL is complete
        let pdfUrl = data.results.message?.url;
        if (pdfUrl && !pdfUrl.startsWith('http')) {
          pdfUrl = `https://${pdfUrl}`;
        }
        
        setResult({
          success: true,
          cEwbNo: data.results.message?.cEwbNo,
          cEwbDate: data.results.message?.cEwbDate,
          url: pdfUrl,
          message: `Consolidated EWB created successfully!`,
          rawResponse: data
        });
      } else if (data.results?.status === 'No Content' || data.results?.code >= 400) {
        // Handle API error responses
        throw new Error(data.results?.message || `Error ${data.results?.code}: Failed to create consolidated EWB`);
      } else if (!response.ok) {
        // Handle HTTP errors
        throw new Error(data.message || `HTTP ${response.status}: Failed to create consolidated EWB`);
      } else {
        // Handle unexpected response format
        throw new Error('Unexpected response format from server');
      }
    } catch (err) {
      console.error('Consolidated EWB Error:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setFormData({
      userGstin: '09COVPS5556J1ZT',
      place_of_consignor: '',
      state_of_consignor: '',
      vehicle_number: '',
      mode_of_transport: '1',
      transporter_document_number: '',
      transporter_document_date: new Date().toISOString().split('T')[0],
      data_source: 'erp'
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
            <Shield className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create Consolidated E-Way Bill</h2>
              <p className="text-sm text-gray-600">{ewbNumbers.length} EWB numbers selected</p>
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
                  <h3 className="text-lg font-semibold text-green-800">Consolidated EWB Created Successfully!</h3>
                  <p className="text-sm text-green-600">Your consolidated e-way bill has been generated</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Consolidated EWB Details */}
                <div className="bg-white rounded-lg p-4 border border-green-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.cEwbNo && (
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <span className="text-sm font-medium text-green-700">Consolidated EWB Number</span>
                          <div className="text-lg font-bold text-green-900 font-mono">{result.cEwbNo}</div>
                        </div>
                        <button 
                          onClick={() => navigator.clipboard.writeText(result.cEwbNo)}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                          title="Copy EWB Number"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    
                    {result.cEwbDate && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium text-blue-700">Generated On</span>
                        <div className="text-sm font-semibold text-blue-900">{result.cEwbDate}</div>
                      </div>
                    )}
                  </div>
                  
                  {result.url && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">PDF Download</span>
                          <div className="text-xs text-gray-500">Click to download the consolidated EWB PDF</div>
                        </div>
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Download PDF
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Success Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={reset}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Create Another
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                  >
                    Close
                  </button>
                  {result.url && (
                    <button
                      onClick={() => window.open(result.url, '_blank')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View PDF
                    </button>
                  )}
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
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <X className="w-6 h-6 text-red-600 mt-0.5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-800 mb-1">Failed to Create Consolidated EWB</h4>
                  <p className="text-sm text-red-700">{error}</p>
                  
                  {/* Common error hints */}
                  <div className="mt-3 p-3 bg-red-100 rounded-lg">
                    <p className="text-xs text-red-600 font-medium mb-1">Common Issues:</p>
                    <ul className="text-xs text-red-600 space-y-1">
                      <li>• Check if all EWB numbers are valid and active</li>
                      <li>• Ensure vehicle number format is correct (e.g., MH12AB1234)</li>
                      <li>• Verify transporter document date is not in future</li>
                      <li>• Confirm all required fields are filled</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EWB Numbers List */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Selected E-Way Bills</h3>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {ewbNumbers.length} EWBs
              </span>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ewbNumbers.map((ewb, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm border border-blue-100">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="text-sm font-mono font-medium text-gray-900">{ewb}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                <p className="text-xs text-blue-700">
                  💡 These EWB numbers will be consolidated into a single consolidated e-way bill for the specified vehicle.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          {!result && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  Transport Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* GSTIN */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      GSTIN *
                    </label>
                    <input
                      type="text"
                      value={formData.userGstin}
                      onChange={(e) => handleInputChange('userGstin', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm shadow-sm"
                      placeholder="09COVPS5556J1ZT"
                    />
                  </div>

                  {/* Vehicle Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Truck className="w-4 h-4 inline mr-1" />
                      Vehicle Number *
                    </label>
                    <input
                      type="text"
                      value={formData.vehicle_number}
                      onChange={(e) => handleInputChange('vehicle_number', e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm shadow-sm"
                      placeholder="MH12AB1234"
                    />
                  </div>

                  {/* Place of Consignor */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Place of Consignor *
                    </label>
                    <input
                      type="text"
                      value={formData.place_of_consignor}
                      onChange={(e) => handleInputChange('place_of_consignor', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                      placeholder="Mumbai"
                    />
                  </div>

                  {/* State of Consignor */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      State of Consignor *
                    </label>
                    <input
                      type="text"
                      value={formData.state_of_consignor}
                      onChange={(e) => handleInputChange('state_of_consignor', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                      placeholder="Maharashtra"
                    />
                  </div>

                  {/* Mode of Transport */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Mode of Transport
                    </label>
                    <select
                      value={formData.mode_of_transport}
                      onChange={(e) => handleInputChange('mode_of_transport', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                    >
                      <option value="1">Road</option>
                      <option value="2">Rail</option>
                      <option value="3">Air</option>
                      <option value="4">Ship</option>
                    </select>
                  </div>

                  {/* Transporter Document Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <FileText className="w-4 h-4 inline mr-1" />
                      Transporter Document Number
                    </label>
                    <input
                      type="text"
                      value={formData.transporter_document_number}
                      onChange={(e) => handleInputChange('transporter_document_number', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                      placeholder="TD002"
                    />
                  </div>

                  {/* Transporter Document Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Transporter Document Date
                    </label>
                    <input
                      type="date"
                      value={formData.transporter_document_date}
                      onChange={(e) => handleInputChange('transporter_document_date', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                    />
                  </div>

                  {/* Data Source */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Data Source
                    </label>
                    <select
                      value={formData.data_source}
                      onChange={(e) => handleInputChange('data_source', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                    >
                      <option value="erp">ERP</option>
                      <option value="manual">Manual</option>
                    </select>
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
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center gap-2 shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Consolidated EWB...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Create Consolidated EWB
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

export default ConsolidatedEwbModal;