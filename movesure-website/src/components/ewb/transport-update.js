'use client';

import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Search
} from 'lucide-react';
import { getActiveEwbToken, updateTokenUsage } from './token-helper';

export default function TransportUpdateComponent({ userDetails }) {
  const [ewbNo, setEwbNo] = useState('');
  const [transporterId, setTransporterId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [ewbToken, setEwbToken] = useState(null);
  const [fetchingToken, setFetchingToken] = useState(false);  // Fetch active EWB token
  const fetchActiveEwbToken = async () => {
    try {
      setFetchingToken(true);
      setError('');

      // Get the GSTIN from user's branch or use a default GSTIN
      const gstin = userDetails?.gstin || userDetails?.branch?.gstin || '09COVPS5556J1ZT';

      console.log('Fetching EWB token for GSTIN:', gstin);
      console.log('User details:', userDetails);

      if (!gstin) {
        throw new Error('GSTIN not found in user details');
      }

      const result = await getActiveEwbToken(gstin);

      console.log('Token fetch result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch EWB token');
      }

      if (!result.data) {
        throw new Error(`No active EWB token found for GSTIN: ${gstin}`);
      }

      setEwbToken(result.data);
      console.log('EWB token set successfully:', result.data);
      return result.data;
    } catch (err) {
      console.error('Error fetching EWB token:', err);
      setError(err.message);
      return null;
    } finally {
      setFetchingToken(false);
    }
  };

  // Update transport ID
  const updateTransportId = async () => {
    if (!ewbNo || !transporterId) {
      setError('Please provide both EWB Number and Transporter ID');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResult(null);

      // Fetch token if not already available
      let token = ewbToken;
      if (!token) {
        token = await fetchActiveEwbToken();
        if (!token) return;
      }      // Update usage count and last used timestamp using token helper
      const updateResult = await updateTokenUsage('ewb_tokens', token.id);
      
      if (!updateResult.success) {
        console.warn('Failed to update token usage:', updateResult.error);
        // Continue with the request even if usage update fails
      }

      // Make the API request
      const options = {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          authorization: `${token.token_type} ${token.access_token}`,
          'x-api-key': 'key_live_ntAPuJY6MmlucPdCo2cwL7eIXZIAXO0j',
          'x-api-version': '1',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          ewbNo: parseInt(ewbNo),
          transporterId: transporterId.trim()
        })
      };

      const response = await fetch(
        `https://api.sandbox.co.in/gst/compliance/e-way-bill/transporter/bill/${ewbNo}/transporter`,
        options
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || `API Error: ${response.status}`);
      }

      setResult({
        success: true,
        data: responseData,
        message: 'Transport ID updated successfully'
      });

    } catch (err) {
      console.error('Error updating transport ID:', err);
      setError(err.message);
      setResult({
        success: false,
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };
  // Load token on component mount
  useEffect(() => {
    if (userDetails) {
      fetchActiveEwbToken();
    }
  }, [userDetails]);
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-8 hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center mb-8">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-4">
          <Truck className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Update Transport ID</h2>
      </div>      {/* Token Status */}
      <div className="mb-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-4 h-4 rounded-full mr-3 shadow-sm ${ewbToken ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-bold text-gray-800">
              EWB Token Status: <span className={ewbToken ? 'text-green-700' : 'text-red-700'}>{ewbToken ? 'Active & Ready' : 'Not Available'}</span>
            </span>
          </div>
          <button
            onClick={fetchActiveEwbToken}
            disabled={fetchingToken}
            className="flex items-center px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 shadow-md hover:shadow-lg transform hover:scale-105 font-semibold"
          >
            {fetchingToken ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </button>
        </div>
        {ewbToken && (
          <div className="mt-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="text-xs text-gray-600 space-y-1">
              <div><span className="font-semibold">GSTIN:</span> {ewbToken.gstin}</div>
              <div><span className="font-semibold">Expires:</span> {new Date(ewbToken.expires_at).toLocaleString()}</div>
              <div><span className="font-semibold">Environment:</span> <span className="uppercase font-medium">{ewbToken.environment || 'sandbox'}</span></div>
            </div>
          </div>
        )}
        {!ewbToken && !fetchingToken && (
          <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="text-xs text-red-600 font-medium">
              ⚠️ No active EWB token found. Please ensure you have a valid token in the database.
            </div>
          </div>
        )}
      </div>      {/* Form */}
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-3">
            E-Way Bill Number
          </label>
          <input
            type="text"
            value={ewbNo}
            onChange={(e) => setEwbNo(e.target.value)}
            placeholder="Enter EWB Number (e.g., 231010079649)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-lg text-black bg-white font-semibold focus:ring-3 focus:ring-blue-500 focus:border-blue-500 focus:shadow-xl transform focus:scale-105 transition-all duration-200 hover:border-blue-300"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-3">
            Transporter ID (GSTIN)
          </label>
          <input
            type="text"
            value={transporterId}
            onChange={(e) => setTransporterId(e.target.value)}
            placeholder="Enter Transporter GSTIN (e.g., 09COVPS5556J1ZT)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-lg text-black bg-white font-semibold focus:ring-3 focus:ring-blue-500 focus:border-blue-500 focus:shadow-xl transform focus:scale-105 transition-all duration-200 hover:border-blue-300"
          />
        </div>        <button
          onClick={updateTransportId}
          disabled={loading || !ewbToken || !ewbNo || !transporterId}
          className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 font-bold text-lg"
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin mr-3" />
          ) : (
            <RefreshCw className="h-6 w-6 mr-3" />
          )}
          {loading ? 'Updating Transport ID...' : 'Update Transport ID'}
        </button>
      </div>      {/* Error Display */}
      {error && (
        <div className="mt-6 p-6 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 rounded-xl shadow-lg">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center mr-4">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-800 mb-1">Error Occurred</h3>
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}      {/* Success/Result Display */}
      {result && (
        <div className={`mt-6 p-6 rounded-xl shadow-lg border-l-4 ${
          result.success 
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500' 
            : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-500'
        }`}>
          <div className="flex items-start">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${
              result.success ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {result.success ? (
                <CheckCircle className="h-6 w-6 text-white" />
              ) : (
                <AlertCircle className="h-6 w-6 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h3 className={`text-sm font-bold mb-1 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.success ? '✅ Success' : '❌ Failed'}
              </h3>
              <p className={`text-sm font-medium mb-3 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.message}
              </p>
              {result.success && result.data && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <h4 className="text-xs font-bold text-gray-800 mb-3">📊 Response Data:</h4>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded border">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}      {/* Usage Instructions */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-lg">
        <h4 className="text-sm font-bold text-blue-800 mb-4 flex items-center">
          <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center mr-2">
            <Search className="h-4 w-4 text-white" />
          </div>
          📋 Usage Instructions
        </h4>
        <ul className="text-sm text-blue-700 space-y-2 font-medium">
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            Ensure you have an active EWB token for the required GSTIN
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            Enter the valid E-Way Bill Number (12 digits)
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            Provide the correct Transporter GSTIN (15 characters)
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            The system will automatically use your active EWB token
          </li>
        </ul>
      </div>
    </div>
  );
}
